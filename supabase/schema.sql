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
  company_role text not null default 'member' check (company_role in ('admin', 'member')),
  created_at timestamptz not null default now()
);

-- 既存DBにも安全に追従できるよう(このテーブルが既にある環境向け)
alter table public.profiles add column if not exists is_admin boolean not null default false;
alter table public.profiles add column if not exists contact_name text;
alter table public.profiles add column if not exists phone_number text;
alter table public.profiles add column if not exists referral_code text;
alter table public.profiles add column if not exists referred_by uuid references public.profiles (id) on delete set null;
alter table public.profiles add column if not exists referral_reward_count integer not null default 0;
alter table public.profiles add column if not exists company_role text not null default 'member' check (company_role in ('admin', 'member'));

-- 既存行(referral_codeが未設定)に暫定コードを発番してから一意インデックスを張る
update public.profiles set referral_code = substr(replace(id::text, '-', ''), 1, 8) where referral_code is null;
create unique index if not exists profiles_referral_code_idx on public.profiles (referral_code);

-- 既存行のロール補正: フリーメール以外のドメインごとに、最も古い1アカウントのみ管理者にする
-- (社長/社員をis_admin(運営者権限)と混同しないための「企業内ロール」。以前の is_company_parent 単一フラグから
--  「管理者は複数OK・誰でも他人を管理者⇔一般に切替可」に仕様変更したため company_role に置き換えた)
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
set company_role = 'admin'
from ranked
where p.id = ranked.id and ranked.rn = 1;

-- 【注記】旧 is_company_parent カラムは company_role に統合済みで、以後コード上は参照しない。
-- カラム自体の削除(drop column)は既存データの完全消去にあたり自動実行がブロックされたため、
-- 未使用のまま残置している。実害はないが、気になる場合はSupabaseダッシュボードから手動削除可能。

alter table public.profiles enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own" on public.profiles
  for select using (auth.uid() = id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = id);

-- 新規ユーザー登録時に自動でprofilesを1行作る(トライアル14日間・紹介コードを自動セット)
-- company_role: 「管理者(社長側)/一般(社員側)」の初期割り当て。
--   非フリーメールドメインで、かつそのドメイン配下にまだ1件もアカウントが無い場合のみ'admin'(=そのドメインの初回登録者)。
--   フリーメールドメイン、または既に同ドメインの先行アカウントがある場合は'member'。
--   誤って社員が先に登録して管理者になった場合は、既存の管理者(いなければ運営者)が set_company_role() で是正できる。
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

  insert into public.profiles (id, email, referral_code, company_role)
  values (
    new.id,
    new.email,
    substr(replace(new.id::text, '-', ''), 1, 8),
    case when (not v_is_free_domain and v_is_first_in_domain) then 'admin' else 'member' end
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
-- 管理者(社長側)/一般(社員側)の横断閲覧・ロール管理
--   is_admin(運営者がサービス全顧客を見る権限。ボスのみ)とは完全に別物の「企業内ロール」。
--   管理者は複数人OK。管理者は同一法人内の他アカウントを管理者⇔一般に自由に切り替えられる。
--   同一法人の判定は「メールドメイン一致」。フリーメールドメインは対象外(会社名の自己申告一致では
--   他人になりすませてしまうため、紹介ボーナスのような低リスク用途と違い、他人の非公開データを
--   読める権限を渡すこの機能では採用しない)。
-- =========================================
create or replace function public.is_company_admin_of(p_target_user_id uuid)
returns boolean
language plpgsql
security definer set search_path = public
stable
as $$
declare
  v_requester_id uuid := auth.uid();
  v_requester_role text;
  v_requester_domain text;
  v_target_domain text;
  v_is_free_domain boolean;
begin
  if v_requester_id is null or v_requester_id = p_target_user_id then
    return false;
  end if;

  select company_role, split_part(email, '@', 2)
    into v_requester_role, v_requester_domain
  from public.profiles
  where id = v_requester_id;

  if v_requester_role is distinct from 'admin' then
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

grant execute on function public.is_company_admin_of(uuid) to authenticated;

-- 呼び出し元が指定ドメインの(フリーメールでない)管理者かどうか。SMS予算テーブルのRLSで使う。
create or replace function public.is_company_admin_of_domain(p_domain text)
returns boolean
language plpgsql
security definer set search_path = public
stable
as $$
declare
  v_requester_id uuid := auth.uid();
  v_requester_role text;
  v_requester_domain text;
  v_is_free_domain boolean;
begin
  if v_requester_id is null then
    return false;
  end if;

  select company_role, split_part(email, '@', 2)
    into v_requester_role, v_requester_domain
  from public.profiles
  where id = v_requester_id;

  v_is_free_domain := lower(v_requester_domain) in (
    'gmail.com', 'yahoo.co.jp', 'yahoo.com', 'outlook.com', 'hotmail.com',
    'icloud.com', 'me.com', 'live.com', 'qq.com', 'naver.com'
  );

  return v_requester_role = 'admin' and not v_is_free_domain and v_requester_domain = p_domain;
end;
$$;

grant execute on function public.is_company_admin_of_domain(text) to authenticated;

-- 管理者が同一法人内の他アカウントのロールを切り替える(管理者⇔一般)。
--   ・管理者なら誰でも実行可(ボス確認済み: 承認フローなし、シンプル優先)
--   ・自社ドメイン以外・フリーメールドメインは対象外
--   ・その法人の管理者が0人になる変更は拒否(誰も管理できなくなる事故を防ぐガード)
create or replace function public.set_company_role(p_target_user_id uuid, p_new_role text)
returns boolean
language plpgsql
security definer set search_path = public
as $$
declare
  v_requester_id uuid := auth.uid();
  v_requester_role text;
  v_requester_domain text;
  v_target_domain text;
  v_is_free_domain boolean;
  v_remaining_admins integer;
begin
  if p_new_role not in ('admin', 'member') then
    return false;
  end if;

  if v_requester_id is null or v_requester_id = p_target_user_id then
    return false;
  end if;

  select company_role, split_part(email, '@', 2)
    into v_requester_role, v_requester_domain
  from public.profiles
  where id = v_requester_id;

  if v_requester_role is distinct from 'admin' then
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

  if v_target_domain is distinct from v_requester_domain then
    return false;
  end if;

  if p_new_role = 'member' then
    select count(*) into v_remaining_admins
    from public.profiles
    where split_part(email, '@', 2) = v_requester_domain
      and company_role = 'admin'
      and id <> p_target_user_id;

    if v_remaining_admins = 0 then
      return false;
    end if;
  end if;

  update public.profiles set company_role = p_new_role where id = p_target_user_id;
  return true;
end;
$$;

grant execute on function public.set_company_role(uuid, text) to authenticated;

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

-- 管理者は同一法人内の他アカウントのデータを閲覧のみ可(書き込みは不可)
drop policy if exists "companies_parent_read" on public.companies;
drop policy if exists "companies_admin_read" on public.companies;
create policy "companies_admin_read" on public.companies
  for select using (public.is_company_admin_of(user_id));

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
drop policy if exists "email_sends_admin_read" on public.email_sends;
create policy "email_sends_admin_read" on public.email_sends
  for select using (public.is_company_admin_of(user_id));

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
drop policy if exists "sms_contacts_admin_read" on public.sms_contacts;
create policy "sms_contacts_admin_read" on public.sms_contacts
  for select using (public.is_company_admin_of(user_id));

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
drop policy if exists "sms_campaigns_admin_read" on public.sms_campaigns;
create policy "sms_campaigns_admin_read" on public.sms_campaigns
  for select using (public.is_company_admin_of(user_id));

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
drop policy if exists "sms_sends_admin_read" on public.sms_sends;
create policy "sms_sends_admin_read" on public.sms_sends
  for select using (public.is_company_admin_of(user_id));

-- =========================================
-- SMS予算(チャージ式)/ 社員への通数配分
--   各アカウントの個別無料枠(月10通)はこれまで通り維持。
--   管理者は追加でチャージ(円)し、その分を¥20/通換算でメッセージ数に変換してプールに積む。
--   プールから社員へ通数を配分する。配分を使い切ったら送信ブロック(管理者の再チャージ/再配分待ち)。
--   「チャージ式」= 管理者が都度チャージ / 毎月自動リセットあり。
--     → 月初(毎月1日 09:00 JST = 00:00 UTC)に pg_cron で balance_messages・各社員の
--       allocated_count/used_count を自動的に0へリセットする(reset_monthly_sms_budgets)。
--       繰越はしない。毎月「いくらチャージするか」を管理者が都度決める運用。
--       total_charged_yen は累計値としてリセットせず保持(過去のチャージ実績の参照用)。
--   ※ 実際の送信フロー側での残数チェック・ブロック処理は未実装(別途アプリ側の対応が必要)。
-- =========================================
create table if not exists public.company_sms_budgets (
  domain text primary key,
  balance_messages integer not null default 0 check (balance_messages >= 0),
  total_charged_yen integer not null default 0 check (total_charged_yen >= 0),
  updated_at timestamptz not null default now()
);

alter table public.company_sms_budgets enable row level security;

drop policy if exists "company_sms_budgets_admin_all" on public.company_sms_budgets;
create policy "company_sms_budgets_admin_all" on public.company_sms_budgets
  for all using (public.is_company_admin_of_domain(domain))
  with check (public.is_company_admin_of_domain(domain));

create table if not exists public.sms_allocations (
  id uuid primary key default gen_random_uuid(),
  domain text not null,
  user_id uuid not null references auth.users (id) on delete cascade,
  allocated_count integer not null default 0 check (allocated_count >= 0),
  used_count integer not null default 0 check (used_count >= 0),
  updated_at timestamptz not null default now(),
  unique (domain, user_id)
);

create index if not exists sms_allocations_user_id_idx on public.sms_allocations (user_id);

alter table public.sms_allocations enable row level security;

-- 管理者は同一法人内の配分行を全て読み書き可
drop policy if exists "sms_allocations_admin_all" on public.sms_allocations;
create policy "sms_allocations_admin_all" on public.sms_allocations
  for all using (public.is_company_admin_of_domain(domain))
  with check (public.is_company_admin_of_domain(domain));

-- 一般アカウントは自分の配分行を閲覧のみ可(残り通数の自己確認用)
drop policy if exists "sms_allocations_self_read" on public.sms_allocations;
create policy "sms_allocations_self_read" on public.sms_allocations
  for select using (auth.uid() = user_id);

-- 管理者がチャージする(円→¥20/通換算でプールに積む)
create or replace function public.charge_company_sms_budget(p_amount_yen integer)
returns integer
language plpgsql
security definer set search_path = public
as $$
declare
  v_requester_id uuid := auth.uid();
  v_requester_role text;
  v_requester_domain text;
  v_is_free_domain boolean;
  v_added_messages integer;
begin
  if p_amount_yen is null or p_amount_yen <= 0 then
    raise exception 'amount_yen must be positive';
  end if;

  select company_role, split_part(email, '@', 2)
    into v_requester_role, v_requester_domain
  from public.profiles
  where id = v_requester_id;

  if v_requester_role is distinct from 'admin' then
    raise exception 'only company admins can charge the SMS budget';
  end if;

  v_is_free_domain := lower(v_requester_domain) in (
    'gmail.com', 'yahoo.co.jp', 'yahoo.com', 'outlook.com', 'hotmail.com',
    'icloud.com', 'me.com', 'live.com', 'qq.com', 'naver.com'
  );

  if v_is_free_domain then
    raise exception 'free-mail domains are not eligible for company SMS budgets';
  end if;

  v_added_messages := p_amount_yen / 20;

  insert into public.company_sms_budgets (domain, balance_messages, total_charged_yen, updated_at)
  values (v_requester_domain, v_added_messages, p_amount_yen, now())
  on conflict (domain) do update
  set balance_messages = public.company_sms_budgets.balance_messages + excluded.balance_messages,
      total_charged_yen = public.company_sms_budgets.total_charged_yen + excluded.total_charged_yen,
      updated_at = now();

  return v_added_messages;
end;
$$;

grant execute on function public.charge_company_sms_budget(integer) to authenticated;

-- 管理者がプールから社員へ通数を配分する(不足していれば失敗)
create or replace function public.allocate_sms_to_member(p_target_user_id uuid, p_count integer)
returns boolean
language plpgsql
security definer set search_path = public
as $$
declare
  v_requester_id uuid := auth.uid();
  v_requester_role text;
  v_requester_domain text;
  v_target_domain text;
  v_is_free_domain boolean;
  v_balance integer;
begin
  if p_count is null or p_count < 0 then
    raise exception 'count must be zero or positive';
  end if;

  if v_requester_id is null or v_requester_id = p_target_user_id then
    return false;
  end if;

  select company_role, split_part(email, '@', 2)
    into v_requester_role, v_requester_domain
  from public.profiles
  where id = v_requester_id;

  if v_requester_role is distinct from 'admin' then
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

  if v_target_domain is distinct from v_requester_domain then
    return false;
  end if;

  select coalesce(allocated_count, 0) into v_balance
  from public.sms_allocations
  where domain = v_requester_domain and user_id = p_target_user_id;

  -- 追加で必要な分だけプール残高から引き当てる(既存配分より減らす場合は残高に払い戻す)
  update public.company_sms_budgets
  set balance_messages = balance_messages - (p_count - coalesce(v_balance, 0)),
      updated_at = now()
  where domain = v_requester_domain
    and balance_messages - (p_count - coalesce(v_balance, 0)) >= 0;

  if not found then
    return false;
  end if;

  insert into public.sms_allocations (domain, user_id, allocated_count, updated_at)
  values (v_requester_domain, p_target_user_id, p_count, now())
  on conflict (domain, user_id) do update
  set allocated_count = excluded.allocated_count, updated_at = now();

  return true;
end;
$$;

grant execute on function public.allocate_sms_to_member(uuid, integer) to authenticated;

-- 毎月の自動リセット本体(残高・全社員の配分/使用数を0に戻す。累計チャージ額は保持)
create or replace function public.reset_monthly_sms_budgets()
returns void
language plpgsql
security definer set search_path = public
as $$
begin
  update public.company_sms_budgets
  set balance_messages = 0,
      updated_at = now();

  update public.sms_allocations
  set allocated_count = 0,
      used_count = 0,
      updated_at = now();
end;
$$;

-- pg_cron: 毎月1日 09:00 JST(00:00 UTC)に自動実行。冪等にするため既存ジョブを一旦解除してから再登録。
create extension if not exists pg_cron with schema pg_catalog;

do $$
begin
  perform cron.unschedule('reset-sms-budgets-monthly');
exception when others then
  null;
end;
$$;

select cron.schedule(
  'reset-sms-budgets-monthly',
  '0 0 1 * *',
  $$select public.reset_monthly_sms_budgets();$$
);

-- =========================================
-- 6. api_keys: BYOK(ユーザー自身のGoogle Places / AI生成キー)
--    【2026-09対応済み】encrypted_key はアプリ側(lib/crypto.ts)でAES-256-GCM暗号化してから
--    保存している。鍵はDBに置かず環境変数 ENCRYPTION_KEY のみが握る(pgsodiumは不採用)。
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

-- =========================================
-- 7. email_templates: 用途別に使い回すメール文面テンプレート
--    企業ごとに毎回AI生成/手書きするのではなく、業種・用途別にあらかじめ用意しておき、
--    送信画面で企業を選ぶと {{会社名}} などのプレースホルダーが自動で差し込まれる。
--    AI生成はテンプレートの「叩き台を作る」用途として引き続き併用する想定(置き換えではない)。
-- =========================================
create table if not exists public.email_templates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  category text,
  subject text not null default '',
  body text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists email_templates_user_id_idx on public.email_templates (user_id);

alter table public.email_templates enable row level security;

drop policy if exists "email_templates_all_own" on public.email_templates;
create policy "email_templates_all_own" on public.email_templates
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- 管理者は同一法人内の他アカウントのテンプレートを閲覧のみ可(companiesと同じ方針。書き込み不可)
drop policy if exists "email_templates_admin_read" on public.email_templates;
create policy "email_templates_admin_read" on public.email_templates
  for select using (public.is_company_admin_of(user_id));

