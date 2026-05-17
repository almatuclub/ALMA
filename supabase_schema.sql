-- ============================================================
-- ALMA+ — Supabase schema  ·  v16
-- HOW TO APPLY:
--   1. Open your Supabase project dashboard
--   2. Go to SQL Editor → New Query
--   3. Paste this entire file and click Run
--   4. All policies use DROP IF EXISTS, so re-running is safe
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
  email      text,
  phone      text,
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

-- Add columns if the table already exists (safe migration — all idempotent)
alter table public.professional_listings add column if not exists email    text;
alter table public.professional_listings add column if not exists phone    text;

-- v13 availability & booking fields
alter table public.professional_listings add column if not exists availability              jsonb;
alter table public.professional_listings add column if not exists session_duration_minutes  integer default 60;
alter table public.professional_listings add column if not exists modality                  text    default 'online';
alter table public.professional_listings add column if not exists meeting_provider          text;
alter table public.professional_listings add column if not exists meeting_link              text;    -- private: not returned by public SELECT policy
alter table public.professional_listings add column if not exists location_address          text;

alter table public.professional_listings enable row level security;

-- Public view: approved listings only, meeting_link intentionally omitted via app logic
-- (RLS cannot column-mask; app queries use explicit column lists, not SELECT *)
drop policy if exists "Anyone can view approved listings." on professional_listings;
create policy "Anyone can view approved listings."
  on professional_listings for select using (status = 'approved');

-- Allow authenticated users to view their own listings (pending, rejected, approved)
drop policy if exists "Users can view own listings." on professional_listings;
create policy "Users can view own listings."
  on professional_listings for select using (auth.uid() = user_id);

drop policy if exists "Authenticated users can submit listings." on professional_listings;
create policy "Authenticated users can submit listings."
  on professional_listings for insert with check (auth.uid() is not null);

drop policy if exists "Owners can update own listings." on professional_listings;
create policy "Owners can update own listings."
  on professional_listings for update using (auth.uid() = user_id);

-- Admins can update any listing (approve / reject)
drop policy if exists "Admins can update any listing." on professional_listings;
create policy "Admins can update any listing."
  on professional_listings for update using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );


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

-- Add booking fields for scheduling (safe migration)
alter table public.bookings add column if not exists scheduled_at  timestamptz;
alter table public.bookings add column if not exists modality      text;
alter table public.bookings add column if not exists meeting_link  text;   -- shown to patient after confirmation

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


-- 5. MP_PAYMENTS — idempotency log for Mercado Pago webhooks
-- Only accessible via service role key (no public RLS policies)
-- ============================================================
create table if not exists public.mp_payments (
  payment_id   text primary key,
  user_id      uuid references auth.users on delete cascade,
  fichas       integer not null,
  status       text not null,
  processed_at timestamptz not null default now()
);

alter table public.mp_payments enable row level security;


-- ============================================================
-- v15 — Additional RLS policies for professional & admin access
-- Re-running this block is safe (DROP IF EXISTS + CREATE)
-- ============================================================

-- bookings: patient can cancel own booking
drop policy if exists "Patients can update own bookings." on bookings;
create policy "Patients can update own bookings."
  on bookings for update using (auth.uid() = patient_id);

-- bookings: professional sees bookings linked to their listing
drop policy if exists "Professionals can view own listing bookings." on bookings;
create policy "Professionals can view own listing bookings."
  on bookings for select using (
    exists (
      select 1 from public.professional_listings pl
      where pl.id = bookings.listing_id
        and pl.user_id = auth.uid()
    )
  );

-- bookings: professional can confirm / complete / cancel sessions
drop policy if exists "Professionals can update own listing bookings." on bookings;
create policy "Professionals can update own listing bookings."
  on bookings for update using (
    exists (
      select 1 from public.professional_listings pl
      where pl.id = bookings.listing_id
        and pl.user_id = auth.uid()
    )
  );

-- bookings: admin sees all
drop policy if exists "Admins can view all bookings." on bookings;
create policy "Admins can view all bookings."
  on bookings for select using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

-- bookings: admin can update any booking
drop policy if exists "Admins can update all bookings." on bookings;
create policy "Admins can update all bookings."
  on bookings for update using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

-- professional_listings: admin sees all statuses (pending, approved, rejected)
drop policy if exists "Admins can view all listings." on professional_listings;
create policy "Admins can view all listings."
  on professional_listings for select using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

-- profiles: admin sees all user profiles
drop policy if exists "Admins can view all profiles." on profiles;
create policy "Admins can view all profiles."
  on profiles for select using (
    exists (select 1 from public.profiles p2 where p2.id = auth.uid() and p2.role = 'admin')
  );

-- bookings: safe status column (idempotent)
-- Note: status check constraint cannot be added idempotently in old Postgres;
-- values used: 'pending' | 'confirmed' | 'completed' | 'cancelled'


-- ============================================================
-- v16 — Notifications, Messages, Onboarding, Profile extras
-- ============================================================

-- Profile additions (safe migration)
alter table public.profiles add column if not exists onboarding_complete boolean not null default false;
alter table public.profiles add column if not exists onboarding_data     jsonb;
alter table public.profiles add column if not exists bio                 text;
alter table public.profiles add column if not exists avatar_color        text default '#E53935';

-- Listing bio column
alter table public.professional_listings add column if not exists bio text;

-- 6. NOTIFICATIONS
-- ============================================================
create table if not exists public.notifications (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid references auth.users on delete cascade,
  type       text not null,
  title      text not null,
  body       text,
  link       text,
  read       boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.notifications enable row level security;

drop policy if exists "Users can view own notifications." on notifications;
create policy "Users can view own notifications."
  on notifications for select using (auth.uid() = user_id);

drop policy if exists "Users can update own notifications." on notifications;
create policy "Users can update own notifications."
  on notifications for update using (auth.uid() = user_id);

-- Triggers insert notifications (security definer) — no INSERT policy needed for users
-- But allow authenticated inserts as fallback for client-side creation:
drop policy if exists "Authenticated can insert notifications." on notifications;
create policy "Authenticated can insert notifications."
  on notifications for insert with check (auth.uid() is not null);

-- Trigger: notify on new booking
create or replace function public.handle_new_booking_notification()
returns trigger as $$
begin
  -- Notify patient
  insert into public.notifications (user_id, type, title, body, link)
  values (
    new.patient_id,
    'booking_created',
    'Reserva registrada',
    'Tu reserva con ' || new.pro_name || ' fue creada exitosamente.',
    'dashboard.html'
  );

  -- Notify professional (if listing_id is set)
  if new.listing_id is not null then
    insert into public.notifications (user_id, type, title, body, link)
    select
      pl.user_id,
      'new_booking',
      'Nueva solicitud de turno',
      'Tenés un nuevo turno solicitado para ' || coalesce(new.slot, 'una fecha próxima') || '.',
      'dashboard.html'
    from public.professional_listings pl
    where pl.id = new.listing_id;
  end if;

  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_booking_created on bookings;
create trigger on_booking_created
  after insert on bookings
  for each row execute procedure public.handle_new_booking_notification();

-- Trigger: notify on listing status change
create or replace function public.handle_listing_status_notification()
returns trigger as $$
begin
  if old.status = 'pending' and new.status = 'approved' then
    insert into public.notifications (user_id, type, title, body, link)
    values (
      new.user_id,
      'listing_approved',
      '¡Tu perfil fue aprobado!',
      'Ya aparecés en el directorio de profesionales de alma+.',
      'dashboard.html'
    );
  elsif old.status = 'pending' and new.status = 'rejected' then
    insert into public.notifications (user_id, type, title, body, link)
    values (
      new.user_id,
      'listing_rejected',
      'Perfil no aprobado',
      'Tu perfil no fue aprobado en esta revisión. Podés volver a enviarlo.',
      'apply.html'
    );
  end if;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_listing_status_changed on professional_listings;
create trigger on_listing_status_changed
  after update of status on professional_listings
  for each row execute procedure public.handle_listing_status_notification();


-- 7. MESSAGES (chat between patient and professional)
-- ============================================================
create table if not exists public.messages (
  id         uuid primary key default gen_random_uuid(),
  booking_id uuid references public.bookings on delete cascade,
  sender_id  uuid references auth.users on delete cascade,
  body       text not null,
  created_at timestamptz not null default now()
);

alter table public.messages enable row level security;

drop policy if exists "Chat participants can view messages." on messages;
create policy "Chat participants can view messages."
  on messages for select using (
    exists (
      select 1 from public.bookings b
      where b.id = messages.booking_id
        and (
          b.patient_id = auth.uid()
          or exists (
            select 1 from public.professional_listings pl
            where pl.id = b.listing_id and pl.user_id = auth.uid()
          )
        )
    )
  );

drop policy if exists "Chat participants can send messages." on messages;
create policy "Chat participants can send messages."
  on messages for insert with check (
    auth.uid() = sender_id
    and exists (
      select 1 from public.bookings b
      where b.id = messages.booking_id
        and (
          b.patient_id = auth.uid()
          or exists (
            select 1 from public.professional_listings pl
            where pl.id = b.listing_id and pl.user_id = auth.uid()
          )
        )
    )
  );
