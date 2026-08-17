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
  plan_type text not null default 'trial' check (plan_type in ('trial', 'monthly', 'annual')),
  trial_started_at timestamptz not null default now(),
  trial_ends_at timestamptz not null default (now() + interval '14 days'),
  contract_renews_at timestamptz,
  status text not null default 'trial' check (status in ('trial', 'active', 'expired', 'cancelled')),
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own" on public.profiles
  for select using (auth.uid() = id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = id);

-- 新規ユーザー登録時に自動でprofilesを1行作る(トライアル14日間を自動セット)
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email);
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

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
