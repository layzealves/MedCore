-- Create medical_records table (prontuários)
CREATE TABLE public.medical_records (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  record_number TEXT NOT NULL UNIQUE,
  patient_id UUID REFERENCES public.patients(id) ON DELETE CASCADE NOT NULL,
  primary_professional_id UUID REFERENCES public.professionals(id) ON DELETE SET NULL,
  primary_diagnosis TEXT,
  status TEXT NOT NULL DEFAULT 'ativo',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create medical_record_entries table (entradas do prontuário)
CREATE TABLE public.medical_record_entries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  medical_record_id UUID REFERENCES public.medical_records(id) ON DELETE CASCADE NOT NULL,
  professional_id UUID REFERENCES public.professionals(id) ON DELETE SET NULL,
  entry_type TEXT NOT NULL DEFAULT 'Consulta',
  description TEXT NOT NULL,
  entry_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.medical_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.medical_record_entries ENABLE ROW LEVEL SECURITY;

-- Create policies for medical_records
CREATE POLICY "Permitir leitura de prontuários" 
ON public.medical_records 
FOR SELECT 
USING (true);

CREATE POLICY "Permitir inserção de prontuários" 
ON public.medical_records 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Permitir atualização de prontuários" 
ON public.medical_records 
FOR UPDATE 
USING (true);

CREATE POLICY "Permitir exclusão de prontuários" 
ON public.medical_records 
FOR DELETE 
USING (true);

-- Create policies for medical_record_entries
CREATE POLICY "Permitir leitura de entradas" 
ON public.medical_record_entries 
FOR SELECT 
USING (true);

CREATE POLICY "Permitir inserção de entradas" 
ON public.medical_record_entries 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Permitir atualização de entradas" 
ON public.medical_record_entries 
FOR UPDATE 
USING (true);

CREATE POLICY "Permitir exclusão de entradas" 
ON public.medical_record_entries 
FOR DELETE 
USING (true);

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_medical_records_updated_at
BEFORE UPDATE ON public.medical_records
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes
CREATE INDEX idx_medical_records_patient ON public.medical_records(patient_id);
CREATE INDEX idx_medical_records_status ON public.medical_records(status);
CREATE INDEX idx_medical_record_entries_record ON public.medical_record_entries(medical_record_id);
CREATE INDEX idx_medical_record_entries_date ON public.medical_record_entries(entry_date);

-- Create function to generate record number
CREATE OR REPLACE FUNCTION public.generate_record_number()
RETURNS TRIGGER AS $$
DECLARE
  next_num INTEGER;
BEGIN
  SELECT COALESCE(MAX(CAST(SUBSTRING(record_number FROM 5) AS INTEGER)), 0) + 1
  INTO next_num
  FROM public.medical_records;
  
  NEW.record_number := 'PRO-' || LPAD(next_num::TEXT, 4, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create trigger to auto-generate record number
CREATE TRIGGER generate_medical_record_number
BEFORE INSERT ON public.medical_records
FOR EACH ROW
WHEN (NEW.record_number IS NULL OR NEW.record_number = '')
EXECUTE FUNCTION public.generate_record_number();