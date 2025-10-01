-- Storage bucket setup script
-- Run this script in your Supabase SQL editor after running the migration

-- Create storage buckets
INSERT INTO storage.buckets (id, name, public) VALUES
('photos', 'photos', false),
('labels', 'labels', false),
('receipts', 'receipts', false),
('docs', 'docs', false);

-- Create storage policies for each bucket
-- Photos bucket policies
CREATE POLICY "Authenticated users can upload photos" ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id = 'photos' AND 
        auth.role() = 'authenticated'
    );

CREATE POLICY "Authenticated users can view photos" ON storage.objects
    FOR SELECT USING (
        bucket_id = 'photos' AND 
        auth.role() = 'authenticated'
    );

CREATE POLICY "Authenticated users can update photos" ON storage.objects
    FOR UPDATE USING (
        bucket_id = 'photos' AND 
        auth.role() = 'authenticated'
    );

CREATE POLICY "Authenticated users can delete photos" ON storage.objects
    FOR DELETE USING (
        bucket_id = 'photos' AND 
        auth.role() = 'authenticated'
    );

-- Labels bucket policies
CREATE POLICY "Authenticated users can upload labels" ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id = 'labels' AND 
        auth.role() = 'authenticated'
    );

CREATE POLICY "Authenticated users can view labels" ON storage.objects
    FOR SELECT USING (
        bucket_id = 'labels' AND 
        auth.role() = 'authenticated'
    );

CREATE POLICY "Authenticated users can update labels" ON storage.objects
    FOR UPDATE USING (
        bucket_id = 'labels' AND 
        auth.role() = 'authenticated'
    );

CREATE POLICY "Authenticated users can delete labels" ON storage.objects
    FOR DELETE USING (
        bucket_id = 'labels' AND 
        auth.role() = 'authenticated'
    );

-- Receipts bucket policies
CREATE POLICY "Authenticated users can upload receipts" ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id = 'receipts' AND 
        auth.role() = 'authenticated'
    );

CREATE POLICY "Authenticated users can view receipts" ON storage.objects
    FOR SELECT USING (
        bucket_id = 'receipts' AND 
        auth.role() = 'authenticated'
    );

CREATE POLICY "Authenticated users can update receipts" ON storage.objects
    FOR UPDATE USING (
        bucket_id = 'receipts' AND 
        auth.role() = 'authenticated'
    );

CREATE POLICY "Authenticated users can delete receipts" ON storage.objects
    FOR DELETE USING (
        bucket_id = 'receipts' AND 
        auth.role() = 'authenticated'
    );

-- Docs bucket policies
CREATE POLICY "Authenticated users can upload docs" ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id = 'docs' AND 
        auth.role() = 'authenticated'
    );

CREATE POLICY "Authenticated users can view docs" ON storage.objects
    FOR SELECT USING (
        bucket_id = 'docs' AND 
        auth.role() = 'authenticated'
    );

CREATE POLICY "Authenticated users can update docs" ON storage.objects
    FOR UPDATE USING (
        bucket_id = 'docs' AND 
        auth.role() = 'authenticated'
    );

CREATE POLICY "Authenticated users can delete docs" ON storage.objects
    FOR DELETE USING (
        bucket_id = 'docs' AND 
        auth.role() = 'authenticated'
    );
