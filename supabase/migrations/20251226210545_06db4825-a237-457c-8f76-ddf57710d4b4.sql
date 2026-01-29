-- Create appointments table
CREATE TABLE public.appointments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  patient_id UUID REFERENCES public.patients(id) ON DELETE CASCADE NOT NULL,
  professional_id UUID REFERENCES public.professionals(id) ON DELETE CASCADE NOT NULL,
  appointment_date DATE NOT NULL,
  appointment_time TIME NOT NULL,
  duration INTEGER NOT NULL DEFAULT 30,
  type TEXT NOT NULL DEFAULT 'Consulta',
  is_video BOOLEAN NOT NULL DEFAULT false,
  status TEXT NOT NULL DEFAULT 'Agendado',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;

-- Create policies for appointments
CREATE POLICY "Permitir leitura de agendamentos" 
ON public.appointments 
FOR SELECT 
USING (true);

CREATE POLICY "Permitir inserção de agendamentos" 
ON public.appointments 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Permitir atualização de agendamentos" 
ON public.appointments 
FOR UPDATE 
USING (true);

CREATE POLICY "Permitir exclusão de agendamentos" 
ON public.appointments 
FOR DELETE 
USING (true);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_appointments_updated_at
BEFORE UPDATE ON public.appointments
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for better performance
CREATE INDEX idx_appointments_date ON public.appointments(appointment_date);
CREATE INDEX idx_appointments_professional ON public.appointments(professional_id);
CREATE INDEX idx_appointments_patient ON public.appointments(patient_id);