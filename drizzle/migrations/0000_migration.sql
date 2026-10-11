CREATE TYPE public.app_role AS ENUM ('admin', 'door');
CREATE TYPE public.gallery_access AS ENUM ('link', 'code', 'auth');
CREATE TYPE public.media_status AS ENUM ('pending_upload', 'pending_approval', 'approved', 'rejected', 'failed');

CREATE TABLE public.admin_users (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.admin_users TO authenticated;
GRANT ALL ON public.admin_users TO service_role;
ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = _user_id AND role = _role)
$$;
CREATE POLICY "own role readable" ON public.admin_users FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE DEFAULT 'derci-80',
  honoree text NOT NULL DEFAULT 'Derci',
  event_date date NOT NULL,
  event_time text NOT NULL,
  weekday_label text,
  location text NOT NULL,
  maps_url text,
  rsvp_open boolean NOT NULL DEFAULT true,
  phone_required boolean NOT NULL DEFAULT false,
  max_companions int NOT NULL DEFAULT 10 CHECK (max_companions BETWEEN 0 AND 30),
  gallery_enabled boolean NOT NULL DEFAULT true,
  gallery_access public.gallery_access NOT NULL DEFAULT 'link',
  gallery_code_hash text,
  moderation_required boolean NOT NULL DEFAULT true,
  uploads_enabled boolean NOT NULL DEFAULT true,
  max_image_mb int NOT NULL DEFAULT 25 CHECK (max_image_mb BETWEEN 1 AND 100),
  max_video_mb int NOT NULL DEFAULT 90 CHECK (max_video_mb BETWEEN 1 AND 100),
  uploads_per_hour int NOT NULL DEFAULT 60 CHECK (uploads_per_hour BETWEEN 1 AND 1000),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, UPDATE ON public.events TO authenticated;
GRANT ALL ON public.events TO service_role;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin read events" ON public.events FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY "admin update events" ON public.events FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'admin'));

INSERT INTO public.events (slug, honoree, event_date, event_time, weekday_label, location, maps_url)
VALUES ('derci-80', 'Derci', '2026-10-12', '13h', 'segunda-feira', 'Avenida Santa Marina, 1495',
 'https://www.google.com/maps/search/?api=1&query=Avenida+Santa+Marina+1495+S%C3%A3o+Paulo');

CREATE TABLE public.guest_groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  responsible_name text NOT NULL CHECK (char_length(responsible_name) BETWEEN 3 AND 120),
  normalized_name text NOT NULL,
  phone text CHECK (phone IS NULL OR char_length(phone) <= 30),
  attending boolean,
  notes text CHECK (notes IS NULL OR char_length(notes) <= 1000),
  edit_token_hash text,
  submission_id uuid UNIQUE,
  source text NOT NULL DEFAULT 'rsvp' CHECK (source IN ('rsvp','manual')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (event_id, normalized_name)
);
CREATE INDEX guest_groups_event_idx ON public.guest_groups(event_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.guest_groups TO authenticated;
GRANT ALL ON public.guest_groups TO service_role;
ALTER TABLE public.guest_groups ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin all groups" ON public.guest_groups FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TABLE public.guests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL REFERENCES public.guest_groups(id) ON DELETE CASCADE,
  full_name text NOT NULL CHECK (char_length(full_name) BETWEEN 3 AND 120),
  normalized_name text NOT NULL,
  is_responsible boolean NOT NULL DEFAULT false,
  position int NOT NULL DEFAULT 0,
  checked_in_at timestamptz,
  checked_in_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (group_id, normalized_name)
);
CREATE INDEX guests_group_idx ON public.guests(group_id);
CREATE INDEX guests_name_idx ON public.guests(normalized_name);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.guests TO authenticated;
GRANT ALL ON public.guests TO service_role;
ALTER TABLE public.guests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin all guests" ON public.guests FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TABLE public.check_in_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  guest_id uuid NOT NULL REFERENCES public.guests(id) ON DELETE CASCADE,
  action text NOT NULL CHECK (action IN ('check_in','undo')),
  performed_by uuid,
  performed_by_email text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX check_in_logs_created_idx ON public.check_in_logs(created_at DESC);
GRANT SELECT ON public.check_in_logs TO authenticated;
GRANT ALL ON public.check_in_logs TO service_role;
ALTER TABLE public.check_in_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin read logs" ON public.check_in_logs FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));

CREATE TABLE public.media_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('image','video')),
  mime_type text NOT NULL,
  size_bytes bigint NOT NULL CHECK (size_bytes > 0),
  original_name text NOT NULL,
  storage_path text UNIQUE,
  drive_file_id text UNIQUE,
  drive_status text NOT NULL DEFAULT 'pending' CHECK (drive_status IN ('pending','uploaded','failed','not_configured','synced')),
  drive_error text,
  drive_attempts int NOT NULL DEFAULT 0,
  status public.media_status NOT NULL DEFAULT 'pending_upload',
  uploader_name text,
  uploader_fingerprint text,
  client_upload_id uuid UNIQUE,
  source text NOT NULL DEFAULT 'app' CHECK (source IN ('app','drive_sync')),
  captured_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX media_status_idx ON public.media_files(event_id, status, created_at DESC);
CREATE INDEX media_fp_idx ON public.media_files(uploader_fingerprint, created_at DESC);
GRANT SELECT, UPDATE, DELETE ON public.media_files TO authenticated;
GRANT ALL ON public.media_files TO service_role;
ALTER TABLE public.media_files ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin all media" ON public.media_files FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TABLE public.integration_settings (
  key text PRIMARY KEY,
  value jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.integration_settings TO authenticated;
GRANT ALL ON public.integration_settings TO service_role;
ALTER TABLE public.integration_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin all integrations" ON public.integration_settings FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
INSERT INTO public.integration_settings(key, value) VALUES ('google_drive', '{}'::jsonb);