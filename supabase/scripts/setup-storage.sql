-- Create storage buckets
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
  ('photos', 'photos', false, 10485760, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']),
  ('labels', 'labels', false, 52428800, ARRAY['application/pdf']),
  ('receipts', 'receipts', false, 52428800, ARRAY['application/pdf']),
  ('docs', 'docs', false, 20971520, ARRAY['application/pdf', 'text/plain', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'])
ON CONFLICT (id) DO NOTHING;

-- Create storage policies for photos bucket
CREATE POLICY "Authenticated users can upload photos" ON storage.objects
FOR INSERT WITH CHECK (bucket_id = 'photos' AND (auth.role() = 'authenticated' OR auth.role() = 'service_role'));

CREATE POLICY "Authenticated users can view photos" ON storage.objects
FOR SELECT USING (bucket_id = 'photos' AND (auth.role() = 'authenticated' OR auth.role() = 'service_role'));

CREATE POLICY "Authenticated users can update photos" ON storage.objects
FOR UPDATE USING (bucket_id = 'photos' AND (auth.role() = 'authenticated' OR auth.role() = 'service_role'));

CREATE POLICY "Authenticated users can delete photos" ON storage.objects
FOR DELETE USING (bucket_id = 'photos' AND (auth.role() = 'authenticated' OR auth.role() = 'service_role'));

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