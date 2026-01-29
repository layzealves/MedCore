-- Create a table for institution settings
CREATE TABLE public.institution_settings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL DEFAULT 'Hospital Central de Saúde',
  cnpj text NOT NULL DEFAULT '00.000.000/0000-00',
  email text,
  phone text,
  address text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.institution_settings ENABLE ROW LEVEL SECURITY;

-- Create policies for access (allow all operations for now since there's no auth)
CREATE POLICY "Permitir leitura de configurações" 
ON public.institution_settings 
FOR SELECT 
USING (true);

CREATE POLICY "Permitir inserção de configurações" 
ON public.institution_settings 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Permitir atualização de configurações" 
ON public.institution_settings 
FOR UPDATE 
USING (true);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_institution_settings_updated_at
BEFORE UPDATE ON public.institution_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default settings
INSERT INTO public.institution_settings (name, cnpj, email, phone, address)
VALUES ('Hospital Central de Saúde', '12.345.678/0001-90', 'contato@hospitalcentral.com.br', '(11) 3456-7890', 'Av. Principal, 1000 - Centro, São Paulo - SP');