-- Drop existing problematic policies that reference auth.users
DROP POLICY IF EXISTS "professionals_read_assigned_admissions" ON admissions;
DROP POLICY IF EXISTS "professionals_read_own_appointments" ON appointments;
DROP POLICY IF EXISTS "professionals_read_assigned_entries" ON medical_record_entries;
DROP POLICY IF EXISTS "professionals_read_assigned_medical_records" ON medical_records;
DROP POLICY IF EXISTS "professionals_read_assigned_patients" ON patients;

-- Recreate policies using auth.jwt() instead of auth.users table
-- Policy for professionals to read their assigned admissions
CREATE POLICY "professionals_read_assigned_admissions" 
ON admissions 
FOR SELECT 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM professionals p
    WHERE p.id = admissions.professional_id 
    AND p.email = auth.jwt() ->> 'email'
  )
);

-- Policy for professionals to read their own appointments
CREATE POLICY "professionals_read_own_appointments" 
ON appointments 
FOR SELECT 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM professionals p
    WHERE p.id = appointments.professional_id 
    AND p.email = auth.jwt() ->> 'email'
  )
);

-- Policy for professionals to read assigned medical record entries
CREATE POLICY "professionals_read_assigned_entries" 
ON medical_record_entries 
FOR SELECT 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM medical_records mr
    JOIN professionals p ON p.id = mr.primary_professional_id
    WHERE mr.id = medical_record_entries.medical_record_id 
    AND p.email = auth.jwt() ->> 'email'
  )
);

-- Policy for professionals to read assigned medical records
CREATE POLICY "professionals_read_assigned_medical_records" 
ON medical_records 
FOR SELECT 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM professionals p
    WHERE p.id = medical_records.primary_professional_id 
    AND p.email = auth.jwt() ->> 'email'
  )
);

-- Policy for professionals to read assigned patients
CREATE POLICY "professionals_read_assigned_patients" 
ON patients 
FOR SELECT 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM professionals p
    WHERE p.id IN (
      SELECT a.professional_id FROM appointments a WHERE a.patient_id = patients.id
      UNION
      SELECT mr.primary_professional_id FROM medical_records mr WHERE mr.patient_id = patients.id
      UNION
      SELECT adm.professional_id FROM admissions adm WHERE adm.patient_id = patients.id
    ) 
    AND p.email = auth.jwt() ->> 'email'
  )
);