-- Create beds table
CREATE TABLE public.beds (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  bed_number TEXT NOT NULL UNIQUE,
  department TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'Disponível',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create admissions table (internações)
CREATE TABLE public.admissions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  patient_id UUID REFERENCES public.patients(id) ON DELETE CASCADE NOT NULL,
  bed_id UUID REFERENCES public.beds(id) ON DELETE CASCADE NOT NULL,
  professional_id UUID REFERENCES public.professionals(id) ON DELETE SET NULL,
  admission_date DATE NOT NULL DEFAULT CURRENT_DATE,
  discharge_date DATE,
  condition TEXT NOT NULL DEFAULT 'Estável',
  diagnosis TEXT,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'Ativa',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(bed_id, status) -- Garante que um leito só pode ter uma internação ativa
);

-- Enable Row Level Security
ALTER TABLE public.beds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admissions ENABLE ROW LEVEL SECURITY;

-- Create policies for beds
CREATE POLICY "Permitir leitura de leitos" 
ON public.beds 
FOR SELECT 
USING (true);

CREATE POLICY "Permitir inserção de leitos" 
ON public.beds 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Permitir atualização de leitos" 
ON public.beds 
FOR UPDATE 
USING (true);

CREATE POLICY "Permitir exclusão de leitos" 
ON public.beds 
FOR DELETE 
USING (true);

-- Create policies for admissions
CREATE POLICY "Permitir leitura de internações" 
ON public.admissions 
FOR SELECT 
USING (true);

CREATE POLICY "Permitir inserção de internações" 
ON public.admissions 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Permitir atualização de internações" 
ON public.admissions 
FOR UPDATE 
USING (true);

CREATE POLICY "Permitir exclusão de internações" 
ON public.admissions 
FOR DELETE 
USING (true);

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_beds_updated_at
BEFORE UPDATE ON public.beds
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_admissions_updated_at
BEFORE UPDATE ON public.admissions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes
CREATE INDEX idx_beds_department ON public.beds(department);
CREATE INDEX idx_beds_status ON public.beds(status);
CREATE INDEX idx_admissions_patient ON public.admissions(patient_id);
CREATE INDEX idx_admissions_bed ON public.admissions(bed_id);
CREATE INDEX idx_admissions_status ON public.admissions(status);

-- Insert some initial beds
INSERT INTO public.beds (bed_number, department, status) VALUES
('UTI-01', 'UTI', 'Disponível'),
('UTI-02', 'UTI', 'Disponível'),
('UTI-03', 'UTI', 'Disponível'),
('UTI-04', 'UTI', 'Disponível'),
('UTI-05', 'UTI', 'Disponível'),
('ENF-A01', 'Enfermaria A', 'Disponível'),
('ENF-A02', 'Enfermaria A', 'Disponível'),
('ENF-A03', 'Enfermaria A', 'Manutenção'),
('ENF-A04', 'Enfermaria A', 'Disponível'),
('ENF-A05', 'Enfermaria A', 'Disponível'),
('ENF-B01', 'Enfermaria B', 'Disponível'),
('ENF-B02', 'Enfermaria B', 'Disponível'),
('ENF-B03', 'Enfermaria B', 'Disponível'),
('PED-01', 'Pediatria', 'Disponível'),
('PED-02', 'Pediatria', 'Disponível'),
('PED-03', 'Pediatria', 'Disponível'),
('MAT-01', 'Maternidade', 'Disponível'),
('MAT-02', 'Maternidade', 'Disponível'),
('CC-01', 'Centro Cirúrgico', 'Disponível'),
('CC-02', 'Centro Cirúrgico', 'Disponível');