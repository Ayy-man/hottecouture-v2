-- Enable RLS on storage.objects if not already enabled
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Authenticated users can upload photos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can view photos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update photos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete photos" ON storage.objects;

DROP POLICY IF EXISTS "Authenticated users can upload labels" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can view labels" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update labels" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete labels" ON storage.objects;

DROP POLICY IF EXISTS "Authenticated users can upload receipts" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can view receipts" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update receipts" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete receipts" ON storage.objects;

DROP POLICY IF EXISTS "Authenticated users can upload docs" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can view docs" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update docs" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete docs" ON storage.objects;

-- Create storage policies for photos bucket
CREATE POLICY "Authenticated users can upload photos" ON storage.objects
FOR INSERT WITH CHECK (bucket_id = 'photos' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can view photos" ON storage.objects
FOR SELECT USING (bucket_id = 'photos' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update photos" ON storage.objects
FOR UPDATE USING (bucket_id = 'photos' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete photos" ON storage.objects
FOR DELETE USING (bucket_id = 'photos' AND auth.role() = 'authenticated');

-- Create storage policies for labels bucket
CREATE POLICY "Authenticated users can upload labels" ON storage.objects
FOR INSERT WITH CHECK (bucket_id = 'labels' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can view labels" ON storage.objects
FOR SELECT USING (bucket_id = 'labels' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update labels" ON storage.objects
FOR UPDATE USING (bucket_id = 'labels' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete labels" ON storage.objects
FOR DELETE USING (bucket_id = 'labels' AND auth.role() = 'authenticated');

-- Create storage policies for receipts bucket
CREATE POLICY "Authenticated users can upload receipts" ON storage.objects
FOR INSERT WITH CHECK (bucket_id = 'receipts' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can view receipts" ON storage.objects
FOR SELECT USING (bucket_id = 'receipts' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update receipts" ON storage.objects
FOR UPDATE USING (bucket_id = 'receipts' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete receipts" ON storage.objects
FOR DELETE USING (bucket_id = 'receipts' AND auth.role() = 'authenticated');

-- Create storage policies for docs bucket
CREATE POLICY "Authenticated users can upload docs" ON storage.objects
FOR INSERT WITH CHECK (bucket_id = 'docs' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can view docs" ON storage.objects
FOR SELECT USING (bucket_id = 'docs' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update docs" ON storage.objects
FOR UPDATE USING (bucket_id = 'docs' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete docs" ON storage.objects
FOR DELETE USING (bucket_id = 'docs' AND auth.role() = 'authenticated');
