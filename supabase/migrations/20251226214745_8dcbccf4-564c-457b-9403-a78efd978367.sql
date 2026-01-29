-- Create audit_logs table for tracking system activities
CREATE TABLE public.audit_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  user_name TEXT NOT NULL,
  action TEXT NOT NULL,
  resource TEXT NOT NULL,
  resource_id TEXT,
  ip_address TEXT DEFAULT '0.0.0.0',
  status TEXT NOT NULL DEFAULT 'sucesso',
  log_type TEXT NOT NULL DEFAULT 'sistema',
  details TEXT
);

-- Enable RLS
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Create policies for audit logs (read-only for most, insert for system)
CREATE POLICY "Permitir leitura de logs de auditoria"
ON public.audit_logs
FOR SELECT
USING (true);

CREATE POLICY "Permitir inserção de logs de auditoria"
ON public.audit_logs
FOR INSERT
WITH CHECK (true);

-- Create index for faster queries
CREATE INDEX idx_audit_logs_created_at ON public.audit_logs(created_at DESC);
CREATE INDEX idx_audit_logs_log_type ON public.audit_logs(log_type);
CREATE INDEX idx_audit_logs_status ON public.audit_logs(status);

-- Insert sample audit data based on existing activities
INSERT INTO public.audit_logs (user_name, action, resource, status, log_type, created_at) VALUES
('Sistema', 'Criação de paciente', 'Pacientes', 'sucesso', 'escrita', now() - interval '2 hours'),
('Sistema', 'Agendamento de consulta', 'Agendamentos', 'sucesso', 'escrita', now() - interval '1 hour'),
('Sistema', 'Criação de prontuário', 'Prontuários', 'sucesso', 'escrita', now() - interval '30 minutes'),
('Sistema', 'Acesso ao prontuário', 'Prontuários', 'sucesso', 'leitura', now() - interval '25 minutes'),
('Sistema', 'Emissão de receita', 'Prontuários', 'sucesso', 'escrita', now() - interval '20 minutes'),
('Sistema', 'Início de teleconsulta', 'Telemedicina', 'sucesso', 'sistema', now() - interval '15 minutes'),
('Sistema', 'Atualização de status', 'Agendamentos', 'sucesso', 'escrita', now() - interval '10 minutes');