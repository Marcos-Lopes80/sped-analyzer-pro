-- 1. Table for parsed SPED file summaries
CREATE TABLE public.sped_files (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  storage_path TEXT NOT NULL,           -- path in sped-files bucket
  file_name TEXT NOT NULL,
  file_size BIGINT NOT NULL,
  layout TEXT NOT NULL,                 -- EFD_ICMS_IPI | EFD_Contrib | ECD | ECF | Unknown
  cnpj TEXT,
  company_name TEXT,
  uf TEXT,
  period_start TEXT,                    -- dd/mm/yyyy
  period_end TEXT,
  total_lines INTEGER NOT NULL DEFAULT 0,
  block_counts JSONB NOT NULL DEFAULT '{}'::jsonb,
  record_counts JSONB NOT NULL DEFAULT '{}'::jsonb,
  warnings JSONB NOT NULL DEFAULT '[]'::jsonb,
  duration_ms INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_sped_files_user_id ON public.sped_files(user_id);
CREATE INDEX idx_sped_files_created_at ON public.sped_files(created_at DESC);
CREATE INDEX idx_sped_files_layout ON public.sped_files(layout);

ALTER TABLE public.sped_files ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER update_sped_files_updated_at
BEFORE UPDATE ON public.sped_files
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- 2. RLS policies for sped_files
CREATE POLICY "Users view own SPED files"
ON public.sped_files FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Admins view all SPED files"
ON public.sped_files FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users insert own SPED files"
ON public.sped_files FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own SPED files"
ON public.sped_files FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users delete own SPED files"
ON public.sped_files FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Admins delete any SPED files"
ON public.sped_files FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- 3. Private storage bucket for original SPED files
INSERT INTO storage.buckets (id, name, public)
VALUES ('sped-files', 'sped-files', false)
ON CONFLICT (id) DO NOTHING;

-- 4. Storage policies — users can manage only their own folder (userId/...)
CREATE POLICY "Users read own SPED file objects"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'sped-files'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Admins read all SPED file objects"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'sped-files'
  AND public.has_role(auth.uid(), 'admin')
);

CREATE POLICY "Users upload to own SPED folder"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'sped-files'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users delete own SPED file objects"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'sped-files'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Admins delete any SPED file objects"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'sped-files'
  AND public.has_role(auth.uid(), 'admin')
);