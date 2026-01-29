-- =====================================================
-- CORREÇÃO DE SEGURANÇA: Restringir acesso a dados sensíveis de saúde
-- Médicos: só veem dados dos pacientes vinculados a eles
-- Enfermeiras/Admins: acesso total
-- =====================================================

-- 1. MEDICAL_RECORDS - Prontuários médicos
-- =====================================================
DROP POLICY IF EXISTS "authenticated_read_medical_records" ON public.medical_records;

-- Admins (enfermeiras) podem ver todos os prontuários
CREATE POLICY "admins_read_medical_records"
ON public.medical_records
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- Profissionais podem ver apenas prontuários onde são o profissional responsável
CREATE POLICY "professionals_read_assigned_medical_records"
ON public.medical_records
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.professionals p
    WHERE p.id = medical_records.primary_professional_id
    AND p.email = (SELECT email FROM auth.users WHERE id = auth.uid())
  )
);

-- 2. MEDICAL_RECORD_ENTRIES - Entradas dos prontuários
-- =====================================================
DROP POLICY IF EXISTS "authenticated_read_medical_record_entries" ON public.medical_record_entries;

-- Admins podem ver todas as entradas
CREATE POLICY "admins_read_medical_record_entries"
ON public.medical_record_entries
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- Profissionais podem ver entradas de prontuários que são responsáveis
CREATE POLICY "professionals_read_assigned_entries"
ON public.medical_record_entries
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.medical_records mr
    JOIN public.professionals p ON p.id = mr.primary_professional_id
    WHERE mr.id = medical_record_entries.medical_record_id
    AND p.email = (SELECT email FROM auth.users WHERE id = auth.uid())
  )
);

-- 3. APPOINTMENTS - Agendamentos
-- =====================================================
DROP POLICY IF EXISTS "authenticated_read_appointments" ON public.appointments;

-- Admins podem ver todos os agendamentos
CREATE POLICY "admins_read_appointments"
ON public.appointments
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- Profissionais podem ver apenas seus próprios agendamentos
CREATE POLICY "professionals_read_own_appointments"
ON public.appointments
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.professionals p
    WHERE p.id = appointments.professional_id
    AND p.email = (SELECT email FROM auth.users WHERE id = auth.uid())
  )
);

-- 4. ADMISSIONS - Internações
-- =====================================================
DROP POLICY IF EXISTS "authenticated_read_admissions" ON public.admissions;

-- Admins podem ver todas as internações
CREATE POLICY "admins_read_admissions"
ON public.admissions
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- Profissionais podem ver apenas internações onde são responsáveis
CREATE POLICY "professionals_read_assigned_admissions"
ON public.admissions
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.professionals p
    WHERE p.id = admissions.professional_id
    AND p.email = (SELECT email FROM auth.users WHERE id = auth.uid())
  )
);

-- 5. USER_PROFILES - Perfis de usuário
-- =====================================================
DROP POLICY IF EXISTS "authenticated_read_user_profiles" ON public.user_profiles;

-- Usuários podem ver apenas seu próprio perfil
CREATE POLICY "users_read_own_profile"
ON public.user_profiles
FOR SELECT
TO authenticated
USING (id = auth.uid());

-- Admins podem ver todos os perfis
CREATE POLICY "admins_read_all_profiles"
ON public.user_profiles
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));