-- ═══════════════════════════════════════════════════════════════════════════
-- supabase_migration_v19.sql  ·  alma+
-- SAFE migration — all statements use IF NOT EXISTS / IF EXISTS guards.
-- Run this in your Supabase project → SQL Editor → New Query → Run.
-- It is safe to run multiple times (idempotent).
-- ═══════════════════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────────────────────
-- 1. profiles — add optional v16 columns
-- ─────────────────────────────────────────────────────────────────────────
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS bio                text,
  ADD COLUMN IF NOT EXISTS avatar_color       text,
  ADD COLUMN IF NOT EXISTS onboarding_complete boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS onboarding_data    jsonb;

-- ─────────────────────────────────────────────────────────────────────────
-- 2. professional_listings — add optional v16 columns
-- ─────────────────────────────────────────────────────────────────────────
ALTER TABLE public.professional_listings
  ADD COLUMN IF NOT EXISTS bio                      text,
  ADD COLUMN IF NOT EXISTS modality                 text DEFAULT 'online',
  ADD COLUMN IF NOT EXISTS meeting_link             text,
  ADD COLUMN IF NOT EXISTS availability             jsonb,
  ADD COLUMN IF NOT EXISTS session_duration_minutes integer DEFAULT 60,
  ADD COLUMN IF NOT EXISTS location_address         text;

-- ─────────────────────────────────────────────────────────────────────────
-- 3. bookings — add optional columns used by dashboard
-- ─────────────────────────────────────────────────────────────────────────
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS scheduled_at  timestamptz,
  ADD COLUMN IF NOT EXISTS modality      text,
  ADD COLUMN IF NOT EXISTS meeting_link  text,
  ADD COLUMN IF NOT EXISTS fichas_spent  integer DEFAULT 0;

-- ─────────────────────────────────────────────────────────────────────────
-- 4. notifications table (v16 feature — create if missing)
-- ─────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.notifications (
  id         uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id    uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  type       text NOT NULL DEFAULT 'info',
  title      text NOT NULL,
  body       text,
  link       text,
  read       boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- RLS for notifications
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'notifications' AND policyname = 'Users can read own notifications'
  ) THEN
    CREATE POLICY "Users can read own notifications"
      ON public.notifications FOR SELECT
      USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'notifications' AND policyname = 'Users can update own notifications'
  ) THEN
    CREATE POLICY "Users can update own notifications"
      ON public.notifications FOR UPDATE
      USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'notifications' AND policyname = 'Service role can insert notifications'
  ) THEN
    CREATE POLICY "Service role can insert notifications"
      ON public.notifications FOR INSERT
      WITH CHECK (true);
  END IF;
END $$;

-- ─────────────────────────────────────────────────────────────────────────
-- 5. messages table (v16 feature — create if missing)
-- ─────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.messages (
  id         uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  booking_id uuid REFERENCES public.bookings(id) ON DELETE CASCADE NOT NULL,
  sender_id  uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  body       text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- RLS for messages
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'messages' AND policyname = 'Booking participants can read messages'
  ) THEN
    CREATE POLICY "Booking participants can read messages"
      ON public.messages FOR SELECT
      USING (
        auth.uid() = sender_id
        OR auth.uid() IN (
          SELECT patient_id FROM public.bookings WHERE id = booking_id
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'messages' AND policyname = 'Booking participants can insert messages'
  ) THEN
    CREATE POLICY "Booking participants can insert messages"
      ON public.messages FOR INSERT
      WITH CHECK (
        auth.uid() = sender_id
        AND auth.uid() IN (
          SELECT patient_id FROM public.bookings WHERE id = booking_id
          UNION
          SELECT pl.user_id FROM public.bookings b
          JOIN public.professional_listings pl ON pl.id = b.listing_id
          WHERE b.id = booking_id
        )
      );
  END IF;
END $$;

-- ─────────────────────────────────────────────────────────────────────────
-- 6. Verify — show column list for key tables
-- ─────────────────────────────────────────────────────────────────────────
SELECT 'profiles columns:' AS info, column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'profiles'
ORDER BY ordinal_position;

SELECT 'professional_listings columns:' AS info, column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'professional_listings'
ORDER BY ordinal_position;

SELECT 'notifications exists:' AS info, COUNT(*) AS tables
FROM information_schema.tables
WHERE table_schema = 'public' AND table_name = 'notifications';

SELECT 'messages exists:' AS info, COUNT(*) AS tables
FROM information_schema.tables
WHERE table_schema = 'public' AND table_name = 'messages';
