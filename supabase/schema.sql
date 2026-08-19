-- カイタク(KAITAKU) データベーススキーマ
-- Supabaseダッシュボードの「SQL Editor」に貼り付けて実行してください。
-- 何度実行してもエラーにならないよう、可能な範囲で IF NOT EXISTS / OR REPLACE を使っています。

-- =========================================
-- 1. profiles: ユーザーごとのプラン・契約情報
--    (契約管理画面が「トライアル終了日」「契約更新日」を表示するための元データ)
-- =========================================
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  company_name text,
  contact_name text,
  phone_number text,
  plan_type text not null default 'trial' check (plan_type in ('trial', 'monthly', 'annual')),
  trial_started_at timestamptz not null default now(),
  trial_ends_at timestamptz not null default (now() + interval '14 days'),
  contract_renews_at timestamptz,
  status text not null default 'trial' check (status in ('trial', 'active', 'expired', 'cancelled')),
  is_admin boolean not null default false,
  referral_code text,
  referred_by uuid references public.profiles (id) on delete set null,
  referral_reward_count integer not null default 0,
  is_company_parent boolean not null default false,
  created_at timestamptz not null default now()
);

-- 既存DBにも安全に追従できるよう(このテーブルが既にある環境向け)
alter table public.profiles add column if not exists is_admin boolean not null default false;
alter table public.profiles add column if not exists contact_name text;
alter table public.profiles add column if not exists phone_number text;
alter table public.profiles add column if not exists referral_code text;
alter table public.profiles add column if not exists referred_by uuid references public.profiles (id) on delete set null;
alter table public.profiles add column if not exists referral_reward_count integer not null default 0;
alter table public.profiles add column if not exists is_company_parent boolean not null default false;

-- 既存行(referral_codeが未設定)に暫定コードを発番してから一意インデックスを張る
update public.profiles set referral_code = substr(replace(id::text, '-', ''), 1, 8) where referral_code is null;
create unique index if not exists profiles_referral_code_idx on public.profiles (referral_code);

-- 既存行の親アカウント補正: フリーメール以外のドメインごとに、最も古い1アカウントのみ親にする
with ranked as (
  select id,
         row_number() over (
           partition by split_part(email, '@', 2)
           order by created_at asc
         ) as rn
  from public.profiles
  where lower(split_part(email, '@', 2)) not in (
    'gmail.com', 'yahoo.co.jp', 'yahoo.com', 'outlook.com', 'hotmail.com',
    'icloud.com', 'me.com', 'live.com', 'qq.com', 'naver.com'
  )
)
update public.profiles p
set is_company_parent = true
from ranked
where p.id = ranked.id and ranked.rn = 1;

alter table public.profiles enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own" on public.profiles
  for select using (auth.uid() = id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = id);

-- 新規ユーザー登録時に自動でprofilesを1行作る(トライアル14日間・紹介コードを自動セット)
-- is_company_parent: 「社長=親アカウント、社員=子アカウント」を判定するための自動割り当て。
--   非フリーメールドメインで、かつそのドメイン配下にまだ1件もアカウントが無い場合のみtrue(=そのドメインの初回登録者が親)。
--   フリーメールドメイン、または既に同ドメインの先行アカウントがある場合はfalse(=子)。
--   誤って社員が先に登録して親になってしまうケースの手動是正手段は未実装(将来の管理UI課題)。
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  v_domain text := split_part(new.email, '@', 2);
  v_is_free_domain boolean;
  v_is_first_in_domain boolean;
begin
  v_is_free_domain := lower(v_domain) in (
    'gmail.com', 'yahoo.co.jp', 'yahoo.com', 'outlook.com', 'hotmail.com',
    'icloud.com', 'me.com', 'live.com', 'qq.com', 'naver.com'
  );

  select not exists (
    select 1 from public.profiles where split_part(email, '@', 2) = v_domain
  ) into v_is_first_in_domain;

  insert into public.profiles (id, email, referral_code, is_company_parent)
  values (
    new.id,
    new.email,
    substr(replace(new.id::text, '-', ''), 1, 8),
    (not v_is_free_domain and v_is_first_in_domain)
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- =========================================
-- 紹介プログラム: 紹介された新規ユーザーが初回登録時に呼ぶ
-- 「法人単位」で計算する: 紹介者と同じ法人とみなせる全アカウントに一律+7日を付与する。
--   同一法人の判定は「メールドメイン一致」を優先し、フリーメール(gmail.com等)の場合のみ
--   自己申告のcompany_nameの完全一致にフォールバックする(この場合はなりすまし余地あり、既知の制約)。
--   トライアル中の対象者はtrial_ends_at、契約中の対象者はcontract_renews_atをそれぞれ延長する。
-- 濫用防止のため、1紹介者あたりのボーナス発動回数は暫定で最大4回まで。上限は運用状況を見て見直す。
-- =========================================
create or replace function public.apply_referral(p_referral_code text)
returns boolean
language plpgsql
security definer set search_path = public
as $$
declare
  v_referrer_id uuid;
  v_new_user_id uuid := auth.uid();
  v_referrer_domain text;
  v_referrer_company text;
  v_is_free_domain boolean;
  v_reward_count integer;
begin
  if v_new_user_id is null then
    return false;
  end if;

  select id, split_part(email, '@', 2), company_name, referral_reward_count
    into v_referrer_id, v_referrer_domain, v_referrer_company, v_reward_count
  from public.profiles
  where referral_code = p_referral_code
    and id <> v_new_user_id;

  if v_referrer_id is null then
    return false;
  end if;

  -- 紹介元が未設定の初回のみ紐付ける(二重付与防止)
  update public.profiles
  set referred_by = v_referrer_id
  where id = v_new_user_id
    and referred_by is null;

  if not found then
    return false;
  end if;

  if v_reward_count >= 4 then
    return true;
  end if;

  v_is_free_domain := lower(v_referrer_domain) in (
    'gmail.com', 'yahoo.co.jp', 'yahoo.com', 'outlook.com', 'hotmail.com',
    'icloud.com', 'me.com', 'live.com', 'qq.com', 'naver.com'
  );

  -- 同一法人(ドメイン一致、フリーメールはcompany_name一致)の全アカウントに一律+7日
  update public.profiles p
  set trial_ends_at = case when p.status = 'trial'
        then p.trial_ends_at + interval '7 days' else p.trial_ends_at end,
      contract_renews_at = case when p.status = 'active'
        then coalesce(p.contract_renews_at, now()) + interval '7 days' else p.contract_renews_at end
  where (not v_is_free_domain and split_part(p.email, '@', 2) = v_referrer_domain)
     or (v_is_free_domain and p.company_name is not null and p.company_name = v_referrer_company);

  update public.profiles
  set referral_reward_count = referral_reward_count + 1
  where id = v_referrer_id;

  return true;
end;
$$;

grant execute on function public.apply_referral(text) to authenticated;

-- =========================================
-- 親アカウント/子アカウントの横断閲覧
--   「社長が親アカウント、社員が子アカウント」を実現するための判定関数。
--   is_admin(運営者がサービス全顧客を見る権限)とは完全に別物。
--   is_parent_of(target): 呼び出し元が target と同一法人(同ドメイン)の親アカウントである場合のみtrueを返す。
--   フリーメールドメインは対象外(会社名の自己申告一致では他人になりすませてしまうため、
--   紹介ボーナスのような低リスク用途と違い、他人の非公開データを読める権限を渡すこの機能では採用しない)。
-- =========================================
create or replace function public.is_parent_of(p_target_user_id uuid)
returns boolean
language plpgsql
security definer set search_path = public
stable
as $$
declare
  v_requester_id uuid := auth.uid();
  v_requester_is_parent boolean;
  v_requester_domain text;
  v_target_domain text;
  v_is_free_domain boolean;
begin
  if v_requester_id is null or v_requester_id = p_target_user_id then
    return false;
  end if;

  select is_company_parent, split_part(email, '@', 2)
    into v_requester_is_parent, v_requester_domain
  from public.profiles
  where id = v_requester_id;

  if v_requester_is_parent is not true then
    return false;
  end if;

  v_is_free_domain := lower(v_requester_domain) in (
    'gmail.com', 'yahoo.co.jp', 'yahoo.com', 'outlook.com', 'hotmail.com',
    'icloud.com', 'me.com', 'live.com', 'qq.com', 'naver.com'
  );

  if v_is_free_domain then
    return false;
  end if;

  select split_part(email, '@', 2) into v_target_domain
  from public.profiles
  where id = p_target_user_id;

  return v_target_domain = v_requester_domain;
end;
$$;

grant execute on function public.is_parent_of(uuid) to authenticated;

-- =========================================
-- 2. companies: 企業リスト(法人向けチャネル)
-- =========================================
create table if not exists public.companies (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  industry text,
  address text,
  phone text,
  email text,
  has_website boolean default false,
  status text not null default '未接触' check (status in ('未接触', '送信済み', '開封済み', '返信あり')),
  source text not null default 'manual' check (source in ('manual', 'google_places', 'csv')),
  notes text,
  created_at timestamptz not null default now()
);

create index if not exists companies_user_id_idx on public.companies (user_id);

alter table public.companies enable row level security;

drop policy if exists "companies_all_own" on public.companies;
create policy "companies_all_own" on public.companies
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- 親アカウントは同一法人の子アカウントのデータを閲覧のみ可(書き込みは不可)
drop policy if exists "companies_parent_read" on public.companies;
create policy "companies_parent_read" on public.companies
  for select using (public.is_parent_of(user_id));

-- =========================================
-- 3. email_sends: 送信メールの履歴・開封トラッキング
-- =========================================
create table if not exists public.email_sends (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  company_id uuid references public.companies (id) on delete set null,
  subject text,
  body text,
  status text not null default 'draft' check (status in ('draft', 'sent', 'opened', 'replied')),
  sent_at timestamptz,
  opened_at timestamptz,
  replied_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists email_sends_user_id_idx on public.email_sends (user_id);

alter table public.email_sends enable row level security;

drop policy if exists "email_sends_all_own" on public.email_sends;
create policy "email_sends_all_own" on public.email_sends
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "email_sends_parent_read" on public.email_sends;
create policy "email_sends_parent_read" on public.email_sends
  for select using (public.is_parent_of(user_id));

-- =========================================
-- 4. sms_contacts: 個人向けSMS配信の連絡先
--    consent_confirmed が false の連絡先には絶対に送信しない(全社ガードレール)
-- =========================================
create table if not exists public.sms_contacts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text,
  phone_number text not null,
  consent_confirmed boolean not null default false,
  consent_note text,
  created_at timestamptz not null default now()
);

create index if not exists sms_contacts_user_id_idx on public.sms_contacts (user_id);

alter table public.sms_contacts enable row level security;

drop policy if exists "sms_contacts_all_own" on public.sms_contacts;
create policy "sms_contacts_all_own" on public.sms_contacts
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "sms_contacts_parent_read" on public.sms_contacts;
create policy "sms_contacts_parent_read" on public.sms_contacts
  for select using (public.is_parent_of(user_id));

-- =========================================
-- 5. sms_campaigns / sms_sends
-- =========================================
create table if not exists public.sms_campaigns (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  body text,
  created_at timestamptz not null default now()
);

alter table public.sms_campaigns enable row level security;

drop policy if exists "sms_campaigns_all_own" on public.sms_campaigns;
create policy "sms_campaigns_all_own" on public.sms_campaigns
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "sms_campaigns_parent_read" on public.sms_campaigns;
create policy "sms_campaigns_parent_read" on public.sms_campaigns
  for select using (public.is_parent_of(user_id));

create table if not exists public.sms_sends (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  campaign_id uuid references public.sms_campaigns (id) on delete set null,
  contact_id uuid references public.sms_contacts (id) on delete set null,
  status text not null default 'sent' check (status in ('sent', 'failed')),
  sent_at timestamptz default now()
);

alter table public.sms_sends enable row level security;

drop policy if exists "sms_sends_all_own" on public.sms_sends;
create policy "sms_sends_all_own" on public.sms_sends
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "sms_sends_parent_read" on public.sms_sends;
create policy "sms_sends_parent_read" on public.sms_sends
  for select using (public.is_parent_of(user_id));

-- =========================================
-- 6. api_keys: BYOK(ユーザー自身のGoogle Places / AI生成キー)
--    【重要・未完了】encrypted_key は現状ただのtext列です。
--    本番投入前に、pgsodium等でのアプリ側/DB側暗号化を必ず実装してください。
--    平文のままではaiman-oneと同じ「キー漏えいリスク」の再発になります。
--    【意図的に親アカウント閲覧の対象外】社員個々のBYOKキーは社長からも読めない設計。
--    他のテーブルと違い parent_read ポリシーを追加していない。
-- =========================================
create table if not exists public.api_keys (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  provider text not null check (provider in ('google_places', 'gemini', 'openai', 'anthropic')),
  encrypted_key text not null,
  created_at timestamptz not null default now(),
  unique (user_id, provider)
);

alter table public.api_keys enable row level security;

drop policy if exists "api_keys_all_own" on public.api_keys;
create policy "api_keys_all_own" on public.api_keys
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
