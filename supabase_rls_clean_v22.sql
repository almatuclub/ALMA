/* ═══════════════════════════════════════════════════════════════════════════
   supabase_rls_clean_v22.sql  ·  alma+
   ───────────────────────────────────────────────────────────────────────────
   Clean, idempotent RLS reset for all 5 tables:
     profiles · professional_listings · bookings · notifications · messages

   HOW TO USE:
     1. Open Supabase Dashboard → SQL Editor → New query
     2. Paste this entire file and click RUN
     3. Safe to run multiple times (all statements are DROP IF EXISTS + CREATE)

   WHAT IT DOES:
     • Drops ALL existing policies on each table (clean slate — no duplicates)
     • Creates SECURITY DEFINER helper functions to prevent RLS recursion
     • Re-creates clean, non-overlapping policies with standardised names
     • Creates notifications + messages tables if they don't exist yet
   ═══════════════════════════════════════════════════════════════════════════ */


/* ───────────────────────────────────────────────────────────────────────────
   STEP 0 — HELPER FUNCTIONS  (SECURITY DEFINER prevents RLS recursion)
   ───────────────────────────────────────────────────────────────────────────
   Problem: if a policy on `profiles` calls a function that queries `profiles`,
   the query triggers the same policy → infinite recursion → stack overflow.

   Fix: SECURITY DEFINER makes the function execute with the DEFINER's
   privileges (postgres superuser), bypassing RLS entirely on that query.
   The SET search_path = public prevents search_path injection attacks.
   ─────────────────────────────────────────────────────────────────────────── */

DROP FUNCTION IF EXISTS public.is_admin();
DROP FUNCTION IF EXISTS public.is_professional();

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id   = auth.uid()
      AND role = 'admin'
  );
$$;

CREATE OR REPLACE FUNCTION public.is_professional()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id   = auth.uid()
      AND role = 'pro'
  );
$$;

-- Allow authenticated and anon roles to call these functions
GRANT EXECUTE ON FUNCTION public.is_admin()        TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.is_professional() TO authenticated, anon;


/* ═══════════════════════════════════════════════════════════════════════════
   TABLE 1 — PROFILES
   ═══════════════════════════════════════════════════════════════════════════ */

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Drop ALL existing policies (prevents conflicts / duplicates)
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'profiles'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.profiles', r.policyname);
  END LOOP;
END $$;

-- SELECT: users see their own row; admins see all rows
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (
    id = auth.uid()
    OR public.is_admin()
  );

-- INSERT: users can only create their own profile row
CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (id = auth.uid());

-- UPDATE: users update their own row; admins update any row
CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING    (id = auth.uid() OR public.is_admin())
  WITH CHECK (id = auth.uid() OR public.is_admin());


/* ═══════════════════════════════════════════════════════════════════════════
   TABLE 2 — PROFESSIONAL_LISTINGS
   ═══════════════════════════════════════════════════════════════════════════ */

ALTER TABLE public.professional_listings ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'professional_listings'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.professional_listings', r.policyname);
  END LOOP;
END $$;

-- SELECT: approved listings are public; owners see their own; admins see all
CREATE POLICY "Anyone can view approved listings"
  ON public.professional_listings FOR SELECT
  USING (
    status = 'approved'
    OR user_id = auth.uid()
    OR public.is_admin()
  );

-- INSERT: authenticated users can submit their own listing
CREATE POLICY "Users can insert own listing"
  ON public.professional_listings FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- UPDATE: owners update their own listing; admins update any (for approve/reject)
CREATE POLICY "Users can update own listing"
  ON public.professional_listings FOR UPDATE
  USING    (user_id = auth.uid() OR public.is_admin())
  WITH CHECK (user_id = auth.uid() OR public.is_admin());

-- DELETE: admins only
CREATE POLICY "Admins can delete listings"
  ON public.professional_listings FOR DELETE
  USING (public.is_admin());


/* ═══════════════════════════════════════════════════════════════════════════
   TABLE 3 — BOOKINGS
   ═══════════════════════════════════════════════════════════════════════════ */

ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'bookings'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.bookings', r.policyname);
  END LOOP;
END $$;

-- SELECT: patients see own bookings; pros see bookings where they are the pro; admins see all
CREATE POLICY "Users can view own bookings"
  ON public.bookings FOR SELECT
  USING (
    user_id = auth.uid()
    OR pro_id = auth.uid()
    OR public.is_admin()
  );

-- INSERT: authenticated patients create bookings for themselves
CREATE POLICY "Users can insert own bookings"
  ON public.bookings FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- UPDATE: patients update their own; pros update bookings assigned to them; admins update any
CREATE POLICY "Users can update own bookings"
  ON public.bookings FOR UPDATE
  USING (
    user_id = auth.uid()
    OR pro_id = auth.uid()
    OR public.is_admin()
  )
  WITH CHECK (
    user_id = auth.uid()
    OR pro_id = auth.uid()
    OR public.is_admin()
  );


/* ═══════════════════════════════════════════════════════════════════════════
   TABLE 4 — NOTIFICATIONS
   ═══════════════════════════════════════════════════════════════════════════ */

-- Create table if it doesn't exist yet
CREATE TABLE IF NOT EXISTS public.notifications (
  id         uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id    uuid        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title      text        NOT NULL,
  body       text,
  type       text        DEFAULT 'info',    -- 'info' | 'booking' | 'system'
  read       boolean     DEFAULT false,
  link       text,                          -- optional deep-link
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS notifications_user_id_idx ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS notifications_created_at_idx ON public.notifications(created_at DESC);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'notifications'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.notifications', r.policyname);
  END LOOP;
END $$;

-- SELECT: users see only their own notifications
CREATE POLICY "Users can view own notifications"
  ON public.notifications FOR SELECT
  USING (user_id = auth.uid());

-- INSERT: only admins (or backend service role) can create notifications
--         Users cannot self-insert — notifications are system-generated
CREATE POLICY "Admins can insert notifications"
  ON public.notifications FOR INSERT
  WITH CHECK (public.is_admin());

-- UPDATE: users can mark their own notifications as read
CREATE POLICY "Users can update own notifications"
  ON public.notifications FOR UPDATE
  USING    (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- DELETE: users can delete their own notifications
CREATE POLICY "Users can delete own notifications"
  ON public.notifications FOR DELETE
  USING (user_id = auth.uid());


/* ═══════════════════════════════════════════════════════════════════════════
   TABLE 5 — MESSAGES
   ═══════════════════════════════════════════════════════════════════════════ */

-- Create table if it doesn't exist yet
CREATE TABLE IF NOT EXISTS public.messages (
  id          uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  booking_id  uuid        REFERENCES public.bookings(id) ON DELETE CASCADE,
  sender_id   uuid        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  receiver_id uuid        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  body        text        NOT NULL,
  read        boolean     DEFAULT false,
  created_at  timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS messages_sender_idx   ON public.messages(sender_id);
CREATE INDEX IF NOT EXISTS messages_receiver_idx ON public.messages(receiver_id);
CREATE INDEX IF NOT EXISTS messages_booking_idx  ON public.messages(booking_id);

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'messages'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.messages', r.policyname);
  END LOOP;
END $$;

-- SELECT: users see messages they sent or received
CREATE POLICY "Users can view own messages"
  ON public.messages FOR SELECT
  USING (
    sender_id   = auth.uid()
    OR receiver_id = auth.uid()
  );

-- INSERT: authenticated users can send messages (must be the sender)
CREATE POLICY "Users can send messages"
  ON public.messages FOR INSERT
  WITH CHECK (sender_id = auth.uid());

-- UPDATE: users can mark messages they received as read
CREATE POLICY "Users can update received messages"
  ON public.messages FOR UPDATE
  USING    (receiver_id = auth.uid())
  WITH CHECK (receiver_id = auth.uid());


/* ═══════════════════════════════════════════════════════════════════════════
   STEP 6 — VERIFY
   Run this final SELECT to confirm all policies are in place.
   ═══════════════════════════════════════════════════════════════════════════ */

SELECT
  tablename,
  policyname,
  cmd,
  permissive,
  roles
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN (
    'profiles',
    'professional_listings',
    'bookings',
    'notifications',
    'messages'
  )
ORDER BY tablename, cmd, policyname;
