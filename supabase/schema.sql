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
  created_at timestamptz not null default now()
);

-- 既存DBにも安全に追従できるよう(このテーブルが既にある環境向け)
alter table public.profiles add column if not exists is_admin boolean not null default false;
alter table public.profiles add column if not exists contact_name text;
alter table public.profiles add column if not exists phone_number text;
alter table public.profiles add column if not exists referral_code text;
alter table public.profiles add column if not exists referred_by uuid references public.profiles (id) on delete set null;
alter table public.profiles add column if not exists referral_reward_count integer not null default 0;

-- 既存行(referral_codeが未設定)に暫定コードを発番してから一意インデックスを張る
update public.profiles set referral_code = substr(replace(id::text, '-', ''), 1, 8) where referral_code is null;
create unique index if not exists profiles_referral_code_idx on public.profiles (referral_code);

alter table public.profiles enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own" on public.profiles
  for select using (auth.uid() = id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = id);

-- 新規ユーザー登録時に自動でprofilesを1行作る(トライアル14日間・紹介コードを自動セット)
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, referral_code)
  values (new.id, new.email, substr(replace(new.id::text, '-', ''), 1, 8))
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
-- 紹介者(referrer)の期間を7日延長する(トライアル中ならtrial_ends_at、契約中ならcontract_renews_at)。
-- 濫用防止のため、1紹介者あたりの延長は暫定で最大4回(28日)まで。上限は運用状況を見て見直す。
-- =========================================
create or replace function public.apply_referral(p_referral_code text)
returns boolean
language plpgsql
security definer set search_path = public
as $$
declare
  v_referrer_id uuid;
  v_new_user_id uuid := auth.uid();
  v_status text;
  v_reward_count integer;
begin
  if v_new_user_id is null then
    return false;
  end if;

  select id, status, referral_reward_count
    into v_referrer_id, v_status, v_reward_count
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

  if v_status = 'trial' then
    update public.profiles
    set trial_ends_at = trial_ends_at + interval '7 days',
        referral_reward_count = referral_reward_count + 1
    where id = v_referrer_id;
  elsif v_status = 'active' then
    update public.profiles
    set contract_renews_at = coalesce(contract_renews_at, now()) + interval '7 days',
        referral_reward_count = referral_reward_count + 1
    where id = v_referrer_id;
  end if;

  return true;
end;
$$;

grant execute on function public.apply_referral(text) to authenticated;

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

-- =========================================
-- 6. api_keys: BYOK(ユーザー自身のGoogle Places / AI生成キー)
--    【重要・未完了】encrypted_key は現状ただのtext列です。
--    本番投入前に、pgsodium等でのアプリ側/DB側暗号化を必ず実装してください。
--    平文のままではaiman-oneと同じ「キー漏えいリスク」の再発になります。
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
