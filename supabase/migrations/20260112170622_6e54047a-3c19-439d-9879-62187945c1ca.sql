-- ============================================
-- FIX WARN: Patients table - restrict write to admins
-- ============================================

DROP POLICY IF EXISTS "authenticated_insert_patients" ON public.patients;
DROP POLICY IF EXISTS "authenticated_update_patients" ON public.patients;
DROP POLICY IF EXISTS "authenticated_delete_patients" ON public.patients;

CREATE POLICY "admins_insert_patients"
ON public.patients FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "admins_update_patients"
ON public.patients FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "admins_delete_patients"
ON public.patients FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- ============================================
-- FIX WARN: Medical Records table - restrict write to admins
-- ============================================

DROP POLICY IF EXISTS "authenticated_insert_medical_records" ON public.medical_records;
DROP POLICY IF EXISTS "authenticated_update_medical_records" ON public.medical_records;
DROP POLICY IF EXISTS "authenticated_delete_medical_records" ON public.medical_records;

CREATE POLICY "admins_insert_medical_records"
ON public.medical_records FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "admins_update_medical_records"
ON public.medical_records FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "admins_delete_medical_records"
ON public.medical_records FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- ============================================
-- FIX WARN: Medical Record Entries table - restrict write to admins
-- ============================================

DROP POLICY IF EXISTS "authenticated_insert_medical_record_entries" ON public.medical_record_entries;
DROP POLICY IF EXISTS "authenticated_update_medical_record_entries" ON public.medical_record_entries;
DROP POLICY IF EXISTS "authenticated_delete_medical_record_entries" ON public.medical_record_entries;

CREATE POLICY "admins_insert_medical_record_entries"
ON public.medical_record_entries FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "admins_update_medical_record_entries"
ON public.medical_record_entries FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "admins_delete_medical_record_entries"
ON public.medical_record_entries FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- ============================================
-- FIX WARN: Appointments table - restrict write to admins
-- ============================================

DROP POLICY IF EXISTS "authenticated_insert_appointments" ON public.appointments;
DROP POLICY IF EXISTS "authenticated_update_appointments" ON public.appointments;
DROP POLICY IF EXISTS "authenticated_delete_appointments" ON public.appointments;

CREATE POLICY "admins_insert_appointments"
ON public.appointments FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "admins_update_appointments"
ON public.appointments FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "admins_delete_appointments"
ON public.appointments FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- ============================================
-- FIX WARN: Admissions table - restrict write to admins
-- ============================================

DROP POLICY IF EXISTS "authenticated_insert_admissions" ON public.admissions;
DROP POLICY IF EXISTS "authenticated_update_admissions" ON public.admissions;
DROP POLICY IF EXISTS "authenticated_delete_admissions" ON public.admissions;

CREATE POLICY "admins_insert_admissions"
ON public.admissions FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "admins_update_admissions"
ON public.admissions FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "admins_delete_admissions"
ON public.admissions FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- ============================================
-- FIX WARN: Professionals table - restrict write to admins
-- ============================================

DROP POLICY IF EXISTS "authenticated_insert_professionals" ON public.professionals;
DROP POLICY IF EXISTS "authenticated_update_professionals" ON public.professionals;
DROP POLICY IF EXISTS "authenticated_delete_professionals" ON public.professionals;

CREATE POLICY "admins_insert_professionals"
ON public.professionals FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "admins_update_professionals"
ON public.professionals FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "admins_delete_professionals"
ON public.professionals FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- ============================================
-- FIX WARN: User Profiles table - restrict write
-- ============================================

DROP POLICY IF EXISTS "authenticated_insert_user_profiles" ON public.user_profiles;
DROP POLICY IF EXISTS "authenticated_update_user_profiles" ON public.user_profiles;

-- Users can only insert/update their own profile
CREATE POLICY "users_insert_own_profile"
ON public.user_profiles FOR INSERT
TO authenticated
WITH CHECK (id = auth.uid());

CREATE POLICY "users_update_own_profile"
ON public.user_profiles FOR UPDATE
TO authenticated
USING (id = auth.uid());