-- Secure the avatars bucket: change to non-public and add proper RLS policies

-- Keep bucket public for read but restrict write operations to authenticated users with user ID path
-- This allows avatars to be displayed publicly but only modified by their owners

-- Drop existing overly permissive policies
DROP POLICY IF EXISTS "Avatar images are publicly accessible" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can upload avatars" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can update avatars" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can delete avatars" ON storage.objects;

-- Allow public read for avatars (necessary for displaying avatars to other users)
CREATE POLICY "public_read_avatars"
ON storage.objects FOR SELECT
USING (bucket_id = 'avatars');

-- Allow authenticated users to upload to their own folder
CREATE POLICY "users_upload_own_avatar"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'avatars'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow users to update their own avatars
CREATE POLICY "users_update_own_avatar"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'avatars'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow users to delete their own avatars
CREATE POLICY "users_delete_own_avatar"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'avatars'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Update is_authenticated to use SECURITY INVOKER (safer, still works the same)
CREATE OR REPLACE FUNCTION public.is_authenticated()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY INVOKER
AS $$
  SELECT auth.role() = 'authenticated'
$$;

-- Add security documentation comments
COMMENT ON FUNCTION public.has_role IS 'SECURITY DEFINER: Used to check user roles in RLS policies. Always call with auth.uid() only. DO NOT accept client-supplied user IDs in policies.';
COMMENT ON FUNCTION public.is_authenticated IS 'SECURITY INVOKER: Safe function to check if current user is authenticated.';