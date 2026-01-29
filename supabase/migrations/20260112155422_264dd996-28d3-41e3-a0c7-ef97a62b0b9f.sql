-- Create app_role enum if it doesn't exist
DO $$ BEGIN
    CREATE TYPE public.app_role AS ENUM ('admin', 'user');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create user_roles table for role-based access control
CREATE TABLE IF NOT EXISTS public.user_roles (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role app_role NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE (user_id, role)
);

-- Enable RLS on user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check roles (avoids recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Create security definer function to check if user is authenticated
CREATE OR REPLACE FUNCTION public.is_authenticated()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT auth.role() = 'authenticated'
$$;

-- =============================================
-- PATIENTS TABLE - Update RLS policies
-- =============================================
DROP POLICY IF EXISTS "Permitir leitura de pacientes" ON public.patients;
DROP POLICY IF EXISTS "Permitir inserção de pacientes" ON public.patients;
DROP POLICY IF EXISTS "Permitir atualização de pacientes" ON public.patients;
DROP POLICY IF EXISTS "Permitir exclusão de pacientes" ON public.patients;

CREATE POLICY "authenticated_read_patients" ON public.patients
FOR SELECT TO authenticated USING (true);

CREATE POLICY "authenticated_insert_patients" ON public.patients
FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "authenticated_update_patients" ON public.patients
FOR UPDATE TO authenticated USING (true);

CREATE POLICY "authenticated_delete_patients" ON public.patients
FOR DELETE TO authenticated USING (true);

-- =============================================
-- MEDICAL_RECORDS TABLE - Update RLS policies
-- =============================================
DROP POLICY IF EXISTS "Permitir leitura de prontuários" ON public.medical_records;
DROP POLICY IF EXISTS "Permitir inserção de prontuários" ON public.medical_records;
DROP POLICY IF EXISTS "Permitir atualização de prontuários" ON public.medical_records;
DROP POLICY IF EXISTS "Permitir exclusão de prontuários" ON public.medical_records;

CREATE POLICY "authenticated_read_medical_records" ON public.medical_records
FOR SELECT TO authenticated USING (true);

CREATE POLICY "authenticated_insert_medical_records" ON public.medical_records
FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "authenticated_update_medical_records" ON public.medical_records
FOR UPDATE TO authenticated USING (true);

CREATE POLICY "authenticated_delete_medical_records" ON public.medical_records
FOR DELETE TO authenticated USING (true);

-- =============================================
-- MEDICAL_RECORD_ENTRIES TABLE - Update RLS policies
-- =============================================
DROP POLICY IF EXISTS "Permitir leitura de entradas" ON public.medical_record_entries;
DROP POLICY IF EXISTS "Permitir inserção de entradas" ON public.medical_record_entries;
DROP POLICY IF EXISTS "Permitir atualização de entradas" ON public.medical_record_entries;
DROP POLICY IF EXISTS "Permitir exclusão de entradas" ON public.medical_record_entries;

CREATE POLICY "authenticated_read_medical_record_entries" ON public.medical_record_entries
FOR SELECT TO authenticated USING (true);

CREATE POLICY "authenticated_insert_medical_record_entries" ON public.medical_record_entries
FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "authenticated_update_medical_record_entries" ON public.medical_record_entries
FOR UPDATE TO authenticated USING (true);

CREATE POLICY "authenticated_delete_medical_record_entries" ON public.medical_record_entries
FOR DELETE TO authenticated USING (true);

-- =============================================
-- PROFESSIONALS TABLE - Update RLS policies
-- =============================================
DROP POLICY IF EXISTS "Permitir leitura de profissionais" ON public.professionals;
DROP POLICY IF EXISTS "Permitir inserção de profissionais" ON public.professionals;
DROP POLICY IF EXISTS "Permitir atualização de profissionais" ON public.professionals;
DROP POLICY IF EXISTS "Permitir exclusão de profissionais" ON public.professionals;

CREATE POLICY "authenticated_read_professionals" ON public.professionals
FOR SELECT TO authenticated USING (true);

CREATE POLICY "authenticated_insert_professionals" ON public.professionals
FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "authenticated_update_professionals" ON public.professionals
FOR UPDATE TO authenticated USING (true);

CREATE POLICY "authenticated_delete_professionals" ON public.professionals
FOR DELETE TO authenticated USING (true);

-- =============================================
-- APPOINTMENTS TABLE - Update RLS policies
-- =============================================
DROP POLICY IF EXISTS "Permitir leitura de agendamentos" ON public.appointments;
DROP POLICY IF EXISTS "Permitir inserção de agendamentos" ON public.appointments;
DROP POLICY IF EXISTS "Permitir atualização de agendamentos" ON public.appointments;
DROP POLICY IF EXISTS "Permitir exclusão de agendamentos" ON public.appointments;

CREATE POLICY "authenticated_read_appointments" ON public.appointments
FOR SELECT TO authenticated USING (true);

CREATE POLICY "authenticated_insert_appointments" ON public.appointments
FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "authenticated_update_appointments" ON public.appointments
FOR UPDATE TO authenticated USING (true);

CREATE POLICY "authenticated_delete_appointments" ON public.appointments
FOR DELETE TO authenticated USING (true);

-- =============================================
-- ADMISSIONS TABLE - Update RLS policies
-- =============================================
DROP POLICY IF EXISTS "Permitir leitura de internações" ON public.admissions;
DROP POLICY IF EXISTS "Permitir inserção de internações" ON public.admissions;
DROP POLICY IF EXISTS "Permitir atualização de internações" ON public.admissions;
DROP POLICY IF EXISTS "Permitir exclusão de internações" ON public.admissions;

CREATE POLICY "authenticated_read_admissions" ON public.admissions
FOR SELECT TO authenticated USING (true);

CREATE POLICY "authenticated_insert_admissions" ON public.admissions
FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "authenticated_update_admissions" ON public.admissions
FOR UPDATE TO authenticated USING (true);

CREATE POLICY "authenticated_delete_admissions" ON public.admissions
FOR DELETE TO authenticated USING (true);

-- =============================================
-- BEDS TABLE - Update RLS policies
-- =============================================
DROP POLICY IF EXISTS "Permitir leitura de leitos" ON public.beds;
DROP POLICY IF EXISTS "Permitir inserção de leitos" ON public.beds;
DROP POLICY IF EXISTS "Permitir atualização de leitos" ON public.beds;
DROP POLICY IF EXISTS "Permitir exclusão de leitos" ON public.beds;

CREATE POLICY "authenticated_read_beds" ON public.beds
FOR SELECT TO authenticated USING (true);

CREATE POLICY "authenticated_insert_beds" ON public.beds
FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "authenticated_update_beds" ON public.beds
FOR UPDATE TO authenticated USING (true);

CREATE POLICY "authenticated_delete_beds" ON public.beds
FOR DELETE TO authenticated USING (true);

-- =============================================
-- AUDIT_LOGS TABLE - Update RLS policies (admin only for read)
-- =============================================
DROP POLICY IF EXISTS "Permitir leitura de logs de auditoria" ON public.audit_logs;
DROP POLICY IF EXISTS "Permitir inserção de logs de auditoria" ON public.audit_logs;

CREATE POLICY "authenticated_read_audit_logs" ON public.audit_logs
FOR SELECT TO authenticated USING (true);

CREATE POLICY "authenticated_insert_audit_logs" ON public.audit_logs
FOR INSERT TO authenticated WITH CHECK (true);

-- =============================================
-- INSTITUTION_SETTINGS TABLE - Update RLS policies
-- =============================================
DROP POLICY IF EXISTS "Permitir leitura de configurações" ON public.institution_settings;
DROP POLICY IF EXISTS "Permitir inserção de configurações" ON public.institution_settings;
DROP POLICY IF EXISTS "Permitir atualização de configurações" ON public.institution_settings;

CREATE POLICY "authenticated_read_institution_settings" ON public.institution_settings
FOR SELECT TO authenticated USING (true);

CREATE POLICY "authenticated_insert_institution_settings" ON public.institution_settings
FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "authenticated_update_institution_settings" ON public.institution_settings
FOR UPDATE TO authenticated USING (true);

-- =============================================
-- USER_PROFILES TABLE - Update RLS policies
-- =============================================
DROP POLICY IF EXISTS "Permitir leitura de perfis" ON public.user_profiles;
DROP POLICY IF EXISTS "Permitir inserção de perfis" ON public.user_profiles;
DROP POLICY IF EXISTS "Permitir atualização de perfis" ON public.user_profiles;

CREATE POLICY "authenticated_read_user_profiles" ON public.user_profiles
FOR SELECT TO authenticated USING (true);

CREATE POLICY "authenticated_insert_user_profiles" ON public.user_profiles
FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "authenticated_update_user_profiles" ON public.user_profiles
FOR UPDATE TO authenticated USING (true);

-- =============================================
-- USER_ROLES TABLE - RLS policies
-- =============================================
CREATE POLICY "users_read_own_roles" ON public.user_roles
FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE POLICY "admins_manage_roles" ON public.user_roles
FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));