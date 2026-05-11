-- ============================================================
-- ALMA — Supabase schema (run this in the SQL Editor)
-- ============================================================

-- 1. PROFILES — extends auth.users with role + fichas
-- ============================================================
create table if not exists public.profiles (
  id         uuid primary key references auth.users on delete cascade,
  username   text unique not null,
  full_name  text,
  role       text not null default 'patient'
               check (role in ('patient', 'pro', 'admin')),
  fichas     integer not null default 0,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

drop policy if exists "Profiles are viewable by everyone." on profiles;
create policy "Profiles are viewable by everyone."
  on profiles for select using (true);

drop policy if exists "Users can insert their own profile." on profiles;
create policy "Users can insert their own profile."
  on profiles for insert with check (auth.uid() = id);

drop policy if exists "Users can update own profile." on profiles;
create policy "Users can update own profile."
  on profiles for update using (auth.uid() = id);

-- Trigger: auto-create profile row on auth.users insert
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, username, full_name, role, fichas)
  values (
    new.id,
    coalesce(
      new.raw_user_meta_data->>'username',
      new.raw_user_meta_data->>'full_name',
      split_part(new.email, '@', 1)
    ),
    coalesce(
      new.raw_user_meta_data->>'full_name',
      new.raw_user_meta_data->>'username'
    ),
    coalesce(new.raw_user_meta_data->>'role', 'patient'),
    0
  ) on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();


-- 2. PROFESSIONAL_LISTINGS — map professionals (apply.html + admin modal)
-- ============================================================
create table if not exists public.professional_listings (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid references auth.users on delete set null,
  name       text not null,
  spec       text not null,
  svc_id     text not null default 'otro',
  barrio     text,
  price      integer not null default 6,
  lat        double precision,
  lng        double precision,
  color      text default '#455A64',
  icon       text default '➕',
  uyu        text,
  schedule   text[],
  status     text not null default 'pending'
               check (status in ('pending', 'approved', 'rejected')),
  created_at timestamptz not null default now()
);

alter table public.professional_listings enable row level security;

drop policy if exists "Anyone can view approved listings." on professional_listings;
create policy "Anyone can view approved listings."
  on professional_listings for select using (status = 'approved');

drop policy if exists "Authenticated users can submit listings." on professional_listings;
create policy "Authenticated users can submit listings."
  on professional_listings for insert with check (auth.uid() is not null);

drop policy if exists "Owners can update own listings." on professional_listings;
create policy "Owners can update own listings."
  on professional_listings for update using (auth.uid() = user_id);


-- 3. BOOKINGS — confirmed session reservations
-- ============================================================
create table if not exists public.bookings (
  id           uuid primary key default gen_random_uuid(),
  patient_id   uuid references auth.users on delete cascade,
  listing_id   uuid references public.professional_listings on delete set null,
  pro_name     text not null,
  slot         text not null,
  fichas_spent integer not null default 0,
  status       text not null default 'confirmed',
  created_at   timestamptz not null default now()
);

alter table public.bookings enable row level security;

drop policy if exists "Patients can view own bookings." on bookings;
create policy "Patients can view own bookings."
  on bookings for select using (auth.uid() = patient_id);

drop policy if exists "Authenticated users can insert bookings." on bookings;
create policy "Authenticated users can insert bookings."
  on bookings for insert with check (auth.uid() = patient_id);


-- 4. DONATIONS — fichas donated to the pool
-- ============================================================
create table if not exists public.donations (
  id         uuid primary key default gen_random_uuid(),
  donor_id   uuid references auth.users on delete cascade,
  fichas     integer not null,
  created_at timestamptz not null default now()
);

alter table public.donations enable row level security;

drop policy if exists "Donors can view own donations." on donations;
create policy "Donors can view own donations."
  on donations for select using (auth.uid() = donor_id);

drop policy if exists "Authenticated users can donate." on donations;
create policy "Authenticated users can donate."
  on donations for insert with check (auth.uid() = donor_id);
