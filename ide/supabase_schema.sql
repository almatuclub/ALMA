-- 1. Tabla "profiles" que extiende auth.users
create table if not exists public.profiles (
  id uuid references auth.users not null primary key,
  username text unique not null,
  role text not null check (role in ('patient', 'pro', 'admin')),
  full_name text,
  fichas integer default 0
);

-- Habilitar Row Level Security (RLS)
alter table public.profiles enable row level security;

-- Políticas para profiles
drop policy if exists "Public profiles are viewable by everyone." on profiles;
create policy "Public profiles are viewable by everyone."
  on profiles for select
  using ( true );

drop policy if exists "Users can insert their own profile." on profiles;
create policy "Users can insert their own profile."
  on profiles for insert
  with check ( auth.uid() = id );

drop policy if exists "Users can update own profile." on profiles;
create policy "Users can update own profile."
  on profiles for update
  using ( auth.uid() = id );

-- 2. Función Trigger para crear el perfil automáticamente tras el registro
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, username, role, full_name, fichas)
  values (
    new.id, 
    new.raw_user_meta_data->>'username', 
    new.raw_user_meta_data->>'role', 
    new.raw_user_meta_data->>'full_name', 
    0
  ) on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

-- 3. Trigger que llama a la función al insertar en auth.users
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- 4. Tabla "professionals"
create table if not exists public.professionals (
  id uuid references public.profiles(id) not null primary key,
  specialty text not null,
  city text not null,
  bio text,
  availability text,
  price_fichas integer default 1,
  rating numeric(3,1) default 5.0
);

alter table public.professionals enable row level security;

drop policy if exists "Professionals are viewable by everyone." on professionals;
create policy "Professionals are viewable by everyone."
  on professionals for select
  using ( true );

drop policy if exists "Pros can insert their own details." on professionals;
create policy "Pros can insert their own details."
  on professionals for insert
  with check ( auth.uid() = id );

drop policy if exists "Pros can update their own details." on professionals;
create policy "Pros can update their own details."
  on professionals for update
  using ( auth.uid() = id );

-- Insertar datos de prueba para profesionales (opcional)
-- Nota: esto requiere UUIDs reales de usuarios creados, 
-- por lo que es mejor que registres algunos desde la interfaz y luego modifiques las tablas.
