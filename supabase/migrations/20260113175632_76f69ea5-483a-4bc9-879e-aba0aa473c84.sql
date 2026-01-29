-- Remove a política permissiva atual
DROP POLICY IF EXISTS "authenticated_read_patients" ON public.patients;

-- Política: Admins podem ver todos os pacientes
CREATE POLICY "admins_read_all_patients"
ON public.patients
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- Política: Profissionais podem ver pacientes vinculados a eles via agendamentos
CREATE POLICY "professionals_read_assigned_patients"
ON public.patients
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.professionals p
    WHERE p.id IN (
      SELECT a.professional_id FROM public.appointments a WHERE a.patient_id = patients.id
      UNION
      SELECT mr.primary_professional_id FROM public.medical_records mr WHERE mr.patient_id = patients.id
      UNION
      SELECT adm.professional_id FROM public.admissions adm WHERE adm.patient_id = patients.id
    )
    AND p.email = (SELECT email FROM auth.users WHERE id = auth.uid())
  )
);