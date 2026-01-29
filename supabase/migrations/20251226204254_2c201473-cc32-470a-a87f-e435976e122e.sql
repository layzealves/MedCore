-- Create professionals table
CREATE TABLE public.professionals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  specialty TEXT NOT NULL,
  registration_number TEXT NOT NULL, -- CRM, COREN, etc.
  registration_type TEXT NOT NULL DEFAULT 'CRM', -- CRM, COREN, CRF, etc.
  status TEXT NOT NULL DEFAULT 'Disponível',
  next_available TEXT,
  rating NUMERIC(2,1) DEFAULT 5.0,
  patients_count INTEGER DEFAULT 0,
  phone TEXT,
  email TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.professionals ENABLE ROW LEVEL SECURITY;

-- Create policies for public access (since no auth yet)
CREATE POLICY "Permitir leitura de profissionais"
ON public.professionals
FOR SELECT
USING (true);

CREATE POLICY "Permitir inserção de profissionais"
ON public.professionals
FOR INSERT
WITH CHECK (true);

CREATE POLICY "Permitir atualização de profissionais"
ON public.professionals
FOR UPDATE
USING (true);

CREATE POLICY "Permitir exclusão de profissionais"
ON public.professionals
FOR DELETE
USING (true);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_professionals_updated_at
BEFORE UPDATE ON public.professionals
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();