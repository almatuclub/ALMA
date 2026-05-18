/* ═══════════════════════════════════════════════════════════════════════════
   supabase_rls_clean_v23.sql  ·  alma+
   ───────────────────────────────────────────────────────────────────────────
   Corrige supabase_rls_clean_v22.sql usando las columnas REALES verificadas
   con information_schema.columns.

   ERRORES CORREGIDOS vs v22:
     ✗ bookings.user_id          → bookings.patient_id      (42703)
     ✗ bookings.pro_id           → bookings.professional_id  (42703)
     ✗ messages.receiver_id      → columna no existía        (42703)
     ✗ messages.read             → columna no existía        (42703)
     ✓ professional_listings.user_id    — ya era correcto
     ✓ notifications.user_id            — ya era correcto
     ✓ profiles.id                      — ya era correcto

   SCHEMA REAL VERIFICADO (información_schema):
     profiles              → id (PK/auth FK), username, role, full_name, fichas,
                             onboarding_complete, onboarding_data, bio, avatar_color
     professional_listings → id, user_id, name, spec, svc_id, status, ...
     bookings              → id, patient_id, professional_id, listing_id,
                             professional_name, session_datetime, scheduled_at,
                             modality, meeting_link, fichas_spent, status, ...
     notifications         → id, user_id, type, title, body, link, read, created_at
     messages              → id, booking_id, sender_id, body, created_at
                             (receiver_id y read se agregan abajo con IF NOT EXISTS)

   HOW TO USE:
     1. Supabase Dashboard → SQL Editor → New query
     2. Pegá este archivo completo → RUN
     3. Safe re-run: DROP IF EXISTS + CREATE everywhere
   ═══════════════════════════════════════════════════════════════════════════ */


/* ───────────────────────────────────────────────────────────────────────────
   PASO 0 — FUNCIONES HELPER  (SECURITY DEFINER evita recursión RLS)
   ───────────────────────────────────────────────────────────────────────────
   Si una policy en `profiles` llama a is_admin() y is_admin() consulta
   `profiles`, se produce recursión infinita.
   SECURITY DEFINER ejecuta la función con privilegios del DEFINER (postgres),
   saltando RLS en esa consulta interna.
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

GRANT EXECUTE ON FUNCTION public.is_admin()        TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.is_professional() TO authenticated, anon;


/* ═══════════════════════════════════════════════════════════════════════════
   TABLA 1 — PROFILES
   PK: id  (= auth.uid() del usuario dueño de la fila)
   Sin columna user_id — el vínculo con auth es directamente `id`
   ═══════════════════════════════════════════════════════════════════════════ */

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Borra TODAS las policies existentes (pizarra limpia, sin duplicados)
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN
    SELECT policyname FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'profiles'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.profiles', r.policyname);
  END LOOP;
END $$;

-- SELECT: cada usuario ve su propia fila; admins ven todas
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (
    id = auth.uid()
    OR public.is_admin()
  );

-- INSERT: cada usuario sólo puede crear su propia fila
CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (id = auth.uid());

-- UPDATE: usuarios editan su fila; admins editan cualquiera
CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING    (id = auth.uid() OR public.is_admin())
  WITH CHECK (id = auth.uid() OR public.is_admin());


/* ═══════════════════════════════════════════════════════════════════════════
   TABLA 2 — PROFESSIONAL_LISTINGS
   FK de owner: user_id  (uuid, nullable — correcto en schema real)
   ═══════════════════════════════════════════════════════════════════════════ */

ALTER TABLE public.professional_listings ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN
    SELECT policyname FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'professional_listings'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.professional_listings', r.policyname);
  END LOOP;
END $$;

-- SELECT: listings aprobados son públicos; dueños ven el suyo; admins ven todo
CREATE POLICY "Anyone can view approved listings"
  ON public.professional_listings FOR SELECT
  USING (
    status = 'approved'
    OR user_id = auth.uid()
    OR public.is_admin()
  );

-- INSERT: usuarios autenticados envían su propio listing
CREATE POLICY "Users can insert own listing"
  ON public.professional_listings FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- UPDATE: dueños editan el suyo; admins editan cualquiera (approve/reject)
CREATE POLICY "Users can update own listing"
  ON public.professional_listings FOR UPDATE
  USING    (user_id = auth.uid() OR public.is_admin())
  WITH CHECK (user_id = auth.uid() OR public.is_admin());

-- DELETE: solo admins
CREATE POLICY "Admins can delete listings"
  ON public.professional_listings FOR DELETE
  USING (public.is_admin());


/* ═══════════════════════════════════════════════════════════════════════════
   TABLA 3 — BOOKINGS
   ── CORRECCIÓN v22→v23 ──────────────────────────────────────────────────
   v22 usaba:  user_id        → ERROR 42703 (columna no existe)
               pro_id         → ERROR 42703 (columna no existe)
   v23 usa:    patient_id     → columna real (uuid, NOT NULL)
               professional_id → columna real (uuid, nullable)
   ═══════════════════════════════════════════════════════════════════════════ */

ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN
    SELECT policyname FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'bookings'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.bookings', r.policyname);
  END LOOP;
END $$;

-- SELECT: pacientes ven sus reservas; profesionales ven donde son el pro; admins ven todo
CREATE POLICY "Users can view own bookings"
  ON public.bookings FOR SELECT
  USING (
    patient_id      = auth.uid()
    OR professional_id = auth.uid()
    OR public.is_admin()
  );

-- INSERT: pacientes crean reservas para sí mismos
CREATE POLICY "Users can insert own bookings"
  ON public.bookings FOR INSERT
  WITH CHECK (patient_id = auth.uid());

-- UPDATE: pacientes y profesionales actualizan sus reservas; admins actualizan cualquiera
CREATE POLICY "Users can update own bookings"
  ON public.bookings FOR UPDATE
  USING (
    patient_id      = auth.uid()
    OR professional_id = auth.uid()
    OR public.is_admin()
  )
  WITH CHECK (
    patient_id      = auth.uid()
    OR professional_id = auth.uid()
    OR public.is_admin()
  );


/* ═══════════════════════════════════════════════════════════════════════════
   TABLA 4 — NOTIFICATIONS
   FK: user_id  (uuid, nullable — correcto, no cambió de v22)
   ═══════════════════════════════════════════════════════════════════════════ */

-- Asegurar que la tabla existe (idempotente)
CREATE TABLE IF NOT EXISTS public.notifications (
  id         uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id    uuid        REFERENCES public.profiles(id) ON DELETE CASCADE,
  type       text        NOT NULL DEFAULT 'info',
  title      text        NOT NULL,
  body       text,
  link       text,
  read       boolean     NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS notifications_user_id_idx   ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS notifications_created_idx   ON public.notifications(created_at DESC);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN
    SELECT policyname FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'notifications'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.notifications', r.policyname);
  END LOOP;
END $$;

-- SELECT: cada usuario ve sólo sus notificaciones
CREATE POLICY "Users can view own notifications"
  ON public.notifications FOR SELECT
  USING (user_id = auth.uid());

-- INSERT: solo admins (o service_role desde backend) crean notificaciones
CREATE POLICY "Admins can insert notifications"
  ON public.notifications FOR INSERT
  WITH CHECK (public.is_admin());

-- UPDATE: usuarios pueden marcar sus notificaciones como leídas
CREATE POLICY "Users can update own notifications"
  ON public.notifications FOR UPDATE
  USING    (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- DELETE: usuarios pueden borrar sus propias notificaciones
CREATE POLICY "Users can delete own notifications"
  ON public.notifications FOR DELETE
  USING (user_id = auth.uid());


/* ═══════════════════════════════════════════════════════════════════════════
   TABLA 5 — MESSAGES
   ── CORRECCIÓN v22→v23 ──────────────────────────────────────────────────
   Schema real sólo tenía: id, booking_id, sender_id, body, created_at
   v22 usaba receiver_id y read → ERROR 42703 (columnas no existían)

   FIX:
   a) ALTER TABLE ADD COLUMN IF NOT EXISTS para receiver_id y read
      (necesario para que el chat funcione correctamente)
   b) SELECT policy usa sender_id ó join con bookings (no receiver_id)
      hasta que la columna exista; una vez migrado usa receiver_id también
   c) UPDATE policy restaurada para marcar mensajes como leídos
   ─────────────────────────────────────────────────────────────────────────
   NOTA: los ADD COLUMN son seguros (IF NOT EXISTS) y no rompen el frontend
   — las columnas nuevas son nullable con default, nunca NOT NULL sin default.
   ═══════════════════════════════════════════════════════════════════════════ */

-- Agregar columnas que faltaban (safe re-run con IF NOT EXISTS)
ALTER TABLE public.messages
  ADD COLUMN IF NOT EXISTS receiver_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS read        boolean NOT NULL DEFAULT false;

-- Crear tabla si por algún motivo no existiera (idempotente)
CREATE TABLE IF NOT EXISTS public.messages (
  id          uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  booking_id  uuid        REFERENCES public.bookings(id) ON DELETE CASCADE,
  sender_id   uuid        REFERENCES public.profiles(id) ON DELETE CASCADE,
  receiver_id uuid        REFERENCES public.profiles(id) ON DELETE CASCADE,
  body        text        NOT NULL,
  read        boolean     NOT NULL DEFAULT false,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS messages_sender_idx   ON public.messages(sender_id);
CREATE INDEX IF NOT EXISTS messages_receiver_idx ON public.messages(receiver_id);
CREATE INDEX IF NOT EXISTS messages_booking_idx  ON public.messages(booking_id);

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN
    SELECT policyname FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'messages'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.messages', r.policyname);
  END LOOP;
END $$;

-- SELECT: sender o receiver ven el mensaje.
--         Si receiver_id es NULL (mensajes viejos sin migrar) también aplica
--         el fallback vía booking_id para que nadie pierda acceso.
CREATE POLICY "Users can view own messages"
  ON public.messages FOR SELECT
  USING (
    sender_id   = auth.uid()
    OR receiver_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.bookings b
      WHERE b.id             = messages.booking_id
        AND (b.patient_id    = auth.uid()
             OR b.professional_id = auth.uid())
    )
  );

-- INSERT: el emisor sólo puede enviar mensajes donde él es el sender
CREATE POLICY "Users can send messages"
  ON public.messages FOR INSERT
  WITH CHECK (sender_id = auth.uid());

-- UPDATE: el receptor puede marcar como leído
CREATE POLICY "Users can mark messages read"
  ON public.messages FOR UPDATE
  USING    (receiver_id = auth.uid())
  WITH CHECK (receiver_id = auth.uid());


/* ═══════════════════════════════════════════════════════════════════════════
   VERIFICACIÓN FINAL
   Muestra todas las policies creadas — correlo al final para confirmar.
   ═══════════════════════════════════════════════════════════════════════════ */

SELECT
  tablename,
  policyname,
  cmd,
  permissive
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
