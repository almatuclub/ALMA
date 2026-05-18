/* ═══════════════════════════════════════════════════════════════════════════
   supabase_rls_clean_v24.sql  ·  alma+
   ───────────────────────────────────────────────────────────────────────────
   CORRIGE supabase_rls_clean_v23.sql:

   ERROR CORREGIDO vs v23:
     ✗ DROP FUNCTION IF EXISTS is_admin()  → ERROR 2BP01: cannot drop function
       because other objects depend on it  (policies ya la referencian)

   SOLUCIÓN:
     ✓ Nunca se dropean las funciones helper.
     ✓ CREATE OR REPLACE FUNCTION reemplaza el cuerpo in-place sin tocar
       las policies que ya dependen de ellas.
     ✓ DROP FUNCTION ... CASCADE queda explícitamente PROHIBIDO — borraría
       todas las policies que referencian la función, sin aviso.

   ESTRATEGIA SAFE RE-RUN:
     1. CREATE OR REPLACE FUNCTION is_admin()        ← no toca dependencias
     2. CREATE OR REPLACE FUNCTION is_professional() ← ídem
     3. Por cada tabla: DO $$ loop borra TODAS las policies existentes
     4. Recrea policies limpias con nombres canónicos
     ──────────────────────────────────────────────────────────────────────
     El DO $$ loop de policies ES seguro porque las policies no tienen
     objetos que dependan de ellas. Solo las FUNCIONES tienen dependencias.

   SCHEMA REAL VERIFICADO (information_schema.columns):
     profiles              → id (PK = auth.uid()), username, role, full_name,
                             fichas, onboarding_complete, onboarding_data,
                             bio, avatar_color
     professional_listings → id, user_id, name, spec, svc_id, status, ...
     bookings              → id, patient_id, professional_id, listing_id,
                             professional_name, session_datetime, scheduled_at,
                             modality, meeting_link, fichas_spent, status, ...
     notifications         → id, user_id, type, title, body, link, read,
                             created_at
     messages              → id, booking_id, sender_id, body, created_at
                             (receiver_id y read se agregan con ADD COLUMN
                              IF NOT EXISTS — safe re-run)

   HOW TO USE:
     1. Supabase Dashboard → SQL Editor → New query
     2. Pegá este archivo completo → RUN
     3. Safe re-run: podés correrlo N veces sin errores
   ═══════════════════════════════════════════════════════════════════════════ */


/* ───────────────────────────────────────────────────────────────────────────
   PASO 0 — FUNCIONES HELPER
   ───────────────────────────────────────────────────────────────────────────
   IMPORTANTE: usamos CREATE OR REPLACE, NUNCA DROP + CREATE.
   Motivo: si ya existen policies que referencian is_admin(), un DROP falla
   con ERROR 2BP01. CREATE OR REPLACE reemplaza el cuerpo de la función
   preservando todas las dependencias (policies, grants, etc.).

   SECURITY DEFINER: ejecuta la función con privilegios del owner (postgres),
   saltando RLS en la consulta interna a `profiles`. Sin esto, is_admin()
   llamada desde una policy en `profiles` produciría recursión infinita.
   ─────────────────────────────────────────────────────────────────────────── */

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

-- Asegurar permisos (idempotente)
GRANT EXECUTE ON FUNCTION public.is_admin()        TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.is_professional() TO authenticated, anon;


/* ═══════════════════════════════════════════════════════════════════════════
   TABLA 1 — PROFILES
   PK: id  (= auth.uid() — no existe columna user_id separada)
   ═══════════════════════════════════════════════════════════════════════════ */

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Limpieza idempotente: borra TODAS las policies actuales de la tabla
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
CREATE POLICY "profiles_select"
  ON public.profiles FOR SELECT
  USING (
    id = auth.uid()
    OR public.is_admin()
  );

-- INSERT: cada usuario solo puede crear su propia fila
CREATE POLICY "profiles_insert"
  ON public.profiles FOR INSERT
  WITH CHECK (id = auth.uid());

-- UPDATE: usuarios editan su fila; admins editan cualquiera
CREATE POLICY "profiles_update"
  ON public.profiles FOR UPDATE
  USING    (id = auth.uid() OR public.is_admin())
  WITH CHECK (id = auth.uid() OR public.is_admin());


/* ═══════════════════════════════════════════════════════════════════════════
   TABLA 2 — PROFESSIONAL_LISTINGS
   FK de owner: user_id  (uuid, nullable — verificado en schema real)
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

-- SELECT: listings aprobados son públicos; el dueño ve el suyo; admins ven todo
CREATE POLICY "listings_select"
  ON public.professional_listings FOR SELECT
  USING (
    status = 'approved'
    OR user_id = auth.uid()
    OR public.is_admin()
  );

-- INSERT: usuario autenticado crea su propio listing
CREATE POLICY "listings_insert"
  ON public.professional_listings FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- UPDATE: dueño edita el suyo; admins aprueban/rechazan cualquiera
CREATE POLICY "listings_update"
  ON public.professional_listings FOR UPDATE
  USING    (user_id = auth.uid() OR public.is_admin())
  WITH CHECK (user_id = auth.uid() OR public.is_admin());

-- DELETE: solo admins
CREATE POLICY "listings_delete"
  ON public.professional_listings FOR DELETE
  USING (public.is_admin());


/* ═══════════════════════════════════════════════════════════════════════════
   TABLA 3 — BOOKINGS
   Columnas reales: patient_id (NOT NULL), professional_id (nullable)
   NO existen: user_id, pro_id  (causaban ERROR 42703 en v22)
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

-- SELECT: paciente ve sus reservas; profesional ve donde él es el pro; admins ven todo
CREATE POLICY "bookings_select"
  ON public.bookings FOR SELECT
  USING (
    patient_id      = auth.uid()
    OR professional_id = auth.uid()
    OR public.is_admin()
  );

-- INSERT: solo el paciente crea la reserva para sí mismo
CREATE POLICY "bookings_insert"
  ON public.bookings FOR INSERT
  WITH CHECK (patient_id = auth.uid());

-- UPDATE: paciente o profesional actualizan su reserva; admins cualquiera
CREATE POLICY "bookings_update"
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
   FK: user_id  (uuid, nullable — correcto en schema real)
   ═══════════════════════════════════════════════════════════════════════════ */

-- Crear tabla solo si no existe (idempotente — no toca datos existentes)
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

CREATE INDEX IF NOT EXISTS notifications_user_id_idx ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS notifications_created_idx ON public.notifications(created_at DESC);

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

-- SELECT: cada usuario ve solo sus notificaciones
CREATE POLICY "notifications_select"
  ON public.notifications FOR SELECT
  USING (user_id = auth.uid());

-- INSERT: solo admins (o service_role desde backend) crean notificaciones
CREATE POLICY "notifications_insert"
  ON public.notifications FOR INSERT
  WITH CHECK (public.is_admin());

-- UPDATE: usuario puede marcar como leída
CREATE POLICY "notifications_update"
  ON public.notifications FOR UPDATE
  USING    (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- DELETE: usuario puede borrar sus propias notificaciones
CREATE POLICY "notifications_delete"
  ON public.notifications FOR DELETE
  USING (user_id = auth.uid());


/* ═══════════════════════════════════════════════════════════════════════════
   TABLA 5 — MESSAGES
   Schema original: id, booking_id, sender_id, body, created_at
   receiver_id y read NO existían → se agregan con ADD COLUMN IF NOT EXISTS
   ═══════════════════════════════════════════════════════════════════════════ */

-- Agregar columnas faltantes (safe re-run: IF NOT EXISTS nunca falla)
-- nullable / con default → no rompe filas existentes ni el frontend
ALTER TABLE public.messages
  ADD COLUMN IF NOT EXISTS receiver_id uuid    REFERENCES public.profiles(id) ON DELETE CASCADE,
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
--         Fallback via booking JOIN para mensajes viejos sin receiver_id.
CREATE POLICY "messages_select"
  ON public.messages FOR SELECT
  USING (
    sender_id   = auth.uid()
    OR receiver_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.bookings b
      WHERE b.id = messages.booking_id
        AND (b.patient_id      = auth.uid()
             OR b.professional_id = auth.uid())
    )
  );

-- INSERT: solo el sender puede enviar mensajes donde él es el sender
CREATE POLICY "messages_insert"
  ON public.messages FOR INSERT
  WITH CHECK (sender_id = auth.uid());

-- UPDATE: solo el receptor puede marcar como leído
CREATE POLICY "messages_update"
  ON public.messages FOR UPDATE
  USING    (receiver_id = auth.uid())
  WITH CHECK (receiver_id = auth.uid());


/* ═══════════════════════════════════════════════════════════════════════════
   VERIFICACIÓN FINAL
   Ejecutar esta query al final para confirmar que todo se creó correctamente.
   Resultado esperado: 15 policies (3 profiles + 4 listings + 3 bookings +
                                     4 notifications + 3 messages)
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
