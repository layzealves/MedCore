-- Fix Function Search Path Mutable warning
CREATE OR REPLACE FUNCTION public.is_authenticated()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT auth.role() = 'authenticated'
$$;

-- ============================================
-- FIX WARN: Beds table - restrict write to admins
-- ============================================

-- Drop overly permissive policies
DROP POLICY IF EXISTS "authenticated_insert_beds" ON public.beds;
DROP POLICY IF EXISTS "authenticated_update_beds" ON public.beds;
DROP POLICY IF EXISTS "authenticated_delete_beds" ON public.beds;

-- Create admin-only write policies for beds
CREATE POLICY "admins_insert_beds"
ON public.beds FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "admins_update_beds"
ON public.beds FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "admins_delete_beds"
ON public.beds FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- ============================================
-- FIX WARN: Institution Settings - restrict write to admins
-- ============================================

-- Drop overly permissive policies
DROP POLICY IF EXISTS "authenticated_insert_institution_settings" ON public.institution_settings;
DROP POLICY IF EXISTS "authenticated_update_institution_settings" ON public.institution_settings;

-- Create admin-only write policies for institution_settings
CREATE POLICY "admins_insert_institution_settings"
ON public.institution_settings FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "admins_update_institution_settings"
ON public.institution_settings FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- ============================================
-- FIX WARN: Audit Logs - restrict read/insert to admins
-- ============================================

-- Drop overly permissive policies
DROP POLICY IF EXISTS "authenticated_read_audit_logs" ON public.audit_logs;
DROP POLICY IF EXISTS "authenticated_insert_audit_logs" ON public.audit_logs;

-- Create admin-only policies for audit_logs
CREATE POLICY "admins_read_audit_logs"
ON public.audit_logs FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Audit log inserts should happen via server-side functions only
-- For now, allow admin inserts but in production this should be a service role function
CREATE POLICY "admins_insert_audit_logs"
ON public.audit_logs FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));