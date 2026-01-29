import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  UserPlus,
  CalendarPlus,
  FileText,
  Video,
  Loader2,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";

const formatCPF = (value: string) => {
  const numbers = value.replace(/\D/g, "");
  return numbers
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d{1,2})/, "$1-$2")
    .replace(/(-\d{2})\d+?$/, "$1");
};

const formatPhone = (value: string) => {
  const numbers = value.replace(/\D/g, "");
  return numbers
    .replace(/(\d{2})(\d)/, "($1) $2")
    .replace(/(\d{5})(\d)/, "$1-$2")
    .replace(/(-\d{4})\d+?$/, "$1");
};

export function QuickActions() {
  const navigate = useNavigate();
  const [isPatientDialogOpen, setIsPatientDialogOpen] = useState(false);
  const [isAppointmentDialogOpen, setIsAppointmentDialogOpen] = useState(false);
  const [isMedicalRecordDialogOpen, setIsMedicalRecordDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  // Patient form state
  const [patientData, setPatientData] = useState({
    name: "",
    cpf: "",
    birth_date: "",
    phone: "",
    email: "",
  });

  // Appointment form state
  const [appointmentData, setAppointmentData] = useState({
    patient_id: "",
    professional_id: "",
    appointment_date: "",
    appointment_time: "",
    type: "Consulta",
    is_video: false,
  });

  // Medical record form state
  const [recordData, setRecordData] = useState({
    patient_id: "",
    primary_diagnosis: "",
    notes: "",
  });

  // Fetch patients for select
  const { data: patients = [] } = useQuery({
    queryKey: ["patients-select"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("patients")
        .select("id, name")
        .order("name");
      if (error) throw error;
      return data;
    },
  });

  // Fetch professionals for select
  const { data: professionals = [] } = useQuery({
    queryKey: ["professionals-select"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("professionals")
        .select("id, name, specialty")
        .eq("status", "Disponível")
        .order("name");
      if (error) throw error;
      return data;
    },
  });

  const handleCreatePatient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!patientData.name || !patientData.cpf || !patientData.birth_date) {
      toast.error("Preencha todos os campos obrigatórios.");
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase.from("patients").insert([{
        name: patientData.name,
        cpf: patientData.cpf,
        birth_date: patientData.birth_date,
        phone: patientData.phone || null,
        email: patientData.email || null,
        status: "Ativo",
      }]);

      if (error) throw error;

      toast.success("Paciente cadastrado com sucesso!");
      setIsPatientDialogOpen(false);
      setPatientData({ name: "", cpf: "", birth_date: "", phone: "", email: "" });
    } catch (error: any) {
      if (error.message?.includes("duplicate")) {
        toast.error("CPF já cadastrado no sistema.");
      } else {
        toast.error("Erro ao cadastrar paciente.");
      }
    } finally {
      setSaving(false);
    }
  };

  const handleCreateAppointment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!appointmentData.patient_id || !appointmentData.professional_id || 
        !appointmentData.appointment_date || !appointmentData.appointment_time) {
      toast.error("Preencha todos os campos obrigatórios.");
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase.from("appointments").insert([{
        patient_id: appointmentData.patient_id,
        professional_id: appointmentData.professional_id,
        appointment_date: appointmentData.appointment_date,
        appointment_time: appointmentData.appointment_time,
        type: appointmentData.type,
        is_video: appointmentData.is_video,
        status: "Agendado",
      }]);

      if (error) throw error;

      toast.success("Consulta agendada com sucesso!");
      setIsAppointmentDialogOpen(false);
      setAppointmentData({
        patient_id: "",
        professional_id: "",
        appointment_date: "",
        appointment_time: "",
        type: "Consulta",
        is_video: false,
      });
    } catch (error) {
      toast.error("Erro ao agendar consulta.");
    } finally {
      setSaving(false);
    }
  };

  const handleCreateMedicalRecord = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!recordData.patient_id) {
      toast.error("Selecione um paciente.");
      return;
    }

    setSaving(true);
    try {
      // Check if patient already has a record
      const { data: existing } = await supabase
        .from("medical_records")
        .select("id")
        .eq("patient_id", recordData.patient_id)
        .maybeSingle();

      if (existing) {
        toast.error("Este paciente já possui um prontuário.");
        setSaving(false);
        return;
      }

      // Generate next record number
      const { data: lastRecord } = await supabase
        .from("medical_records")
        .select("record_number")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      let nextNum = 1;
      if (lastRecord?.record_number) {
        const match = lastRecord.record_number.match(/PRO-(\d+)/);
        if (match) {
          nextNum = parseInt(match[1], 10) + 1;
        }
      }
      const recordNumber = `PRO-${nextNum.toString().padStart(4, "0")}`;

      const { error } = await supabase.from("medical_records").insert([{
        patient_id: recordData.patient_id,
        record_number: recordNumber,
        primary_diagnosis: recordData.primary_diagnosis || null,
        notes: recordData.notes || null,
        status: "ativo",
      }]);

      if (error) throw error;

      toast.success("Prontuário criado com sucesso!");
      setIsMedicalRecordDialogOpen(false);
      setRecordData({ patient_id: "", primary_diagnosis: "", notes: "" });
    } catch (error) {
      toast.error("Erro ao criar prontuário.");
    } finally {
      setSaving(false);
    }
  };

  const actions = [
    {
      label: "Novo Paciente",
      icon: UserPlus,
      variant: "default" as const,
      onClick: () => setIsPatientDialogOpen(true),
    },
    {
      label: "Agendar Consulta",
      icon: CalendarPlus,
      variant: "outline" as const,
      onClick: () => setIsAppointmentDialogOpen(true),
    },
    {
      label: "Novo Prontuário",
      icon: FileText,
      variant: "outline" as const,
      onClick: () => setIsMedicalRecordDialogOpen(true),
    },
    {
      label: "Teleconsulta",
      icon: Video,
      variant: "info" as const,
      onClick: () => navigate("/telemedicina"),
    },
  ];

  return (
    <>
      <Card variant="elevated" className="animate-slide-up" style={{ animationDelay: "50ms" }}>
        <CardHeader>
          <CardTitle className="text-lg">Ações Rápidas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {actions.map((action) => (
              <Button
                key={action.label}
                variant={action.variant}
                className="h-auto py-4 flex-col gap-2"
                onClick={action.onClick}
              >
                <action.icon className="w-5 h-5" />
                <span className="text-xs font-medium">{action.label}</span>
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* New Patient Dialog */}
      <Dialog open={isPatientDialogOpen} onOpenChange={setIsPatientDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Cadastrar Novo Paciente</DialogTitle>
            <DialogDescription>
              Preencha os dados do paciente para realizar o cadastro.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreatePatient}>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="patient-name">Nome Completo *</Label>
                <Input
                  id="patient-name"
                  value={patientData.name}
                  onChange={(e) => setPatientData({ ...patientData, name: e.target.value })}
                  placeholder="Digite o nome completo"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="patient-cpf">CPF *</Label>
                  <Input
                    id="patient-cpf"
                    value={patientData.cpf}
                    onChange={(e) => setPatientData({ ...patientData, cpf: formatCPF(e.target.value) })}
                    placeholder="000.000.000-00"
                    maxLength={14}
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="patient-birth">Data de Nascimento *</Label>
                  <Input
                    id="patient-birth"
                    type="date"
                    value={patientData.birth_date}
                    onChange={(e) => setPatientData({ ...patientData, birth_date: e.target.value })}
                    required
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="patient-phone">Telefone</Label>
                  <Input
                    id="patient-phone"
                    value={patientData.phone}
                    onChange={(e) => setPatientData({ ...patientData, phone: formatPhone(e.target.value) })}
                    placeholder="(00) 00000-0000"
                    maxLength={15}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="patient-email">E-mail</Label>
                  <Input
                    id="patient-email"
                    type="email"
                    value={patientData.email}
                    onChange={(e) => setPatientData({ ...patientData, email: e.target.value })}
                    placeholder="email@exemplo.com"
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsPatientDialogOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  "Cadastrar Paciente"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* New Appointment Dialog */}
      <Dialog open={isAppointmentDialogOpen} onOpenChange={setIsAppointmentDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Agendar Consulta</DialogTitle>
            <DialogDescription>
              Preencha os dados para agendar uma nova consulta.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateAppointment}>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="appointment-patient">Paciente *</Label>
                <Select
                  value={appointmentData.patient_id}
                  onValueChange={(value) => setAppointmentData({ ...appointmentData, patient_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o paciente" />
                  </SelectTrigger>
                  <SelectContent>
                    {patients.map((patient) => (
                      <SelectItem key={patient.id} value={patient.id}>
                        {patient.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="appointment-professional">Profissional *</Label>
                <Select
                  value={appointmentData.professional_id}
                  onValueChange={(value) => setAppointmentData({ ...appointmentData, professional_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o profissional" />
                  </SelectTrigger>
                  <SelectContent>
                    {professionals.map((prof) => (
                      <SelectItem key={prof.id} value={prof.id}>
                        {prof.name} - {prof.specialty}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="appointment-date">Data *</Label>
                  <Input
                    id="appointment-date"
                    type="date"
                    value={appointmentData.appointment_date}
                    onChange={(e) => setAppointmentData({ ...appointmentData, appointment_date: e.target.value })}
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="appointment-time">Horário *</Label>
                  <Input
                    id="appointment-time"
                    type="time"
                    value={appointmentData.appointment_time}
                    onChange={(e) => setAppointmentData({ ...appointmentData, appointment_time: e.target.value })}
                    required
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="appointment-type">Tipo</Label>
                  <Select
                    value={appointmentData.type}
                    onValueChange={(value) => setAppointmentData({ ...appointmentData, type: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Consulta">Consulta</SelectItem>
                      <SelectItem value="Retorno">Retorno</SelectItem>
                      <SelectItem value="Exame">Exame</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="appointment-video">Modalidade</Label>
                  <Select
                    value={appointmentData.is_video ? "video" : "presencial"}
                    onValueChange={(value) => setAppointmentData({ ...appointmentData, is_video: value === "video" })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="presencial">Presencial</SelectItem>
                      <SelectItem value="video">Teleconsulta</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsAppointmentDialogOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Agendando...
                  </>
                ) : (
                  "Agendar Consulta"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* New Medical Record Dialog */}
      <Dialog open={isMedicalRecordDialogOpen} onOpenChange={setIsMedicalRecordDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Criar Novo Prontuário</DialogTitle>
            <DialogDescription>
              Selecione um paciente para criar um novo prontuário.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateMedicalRecord}>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="record-patient">Paciente *</Label>
                <Select
                  value={recordData.patient_id}
                  onValueChange={(value) => setRecordData({ ...recordData, patient_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o paciente" />
                  </SelectTrigger>
                  <SelectContent>
                    {patients.map((patient) => (
                      <SelectItem key={patient.id} value={patient.id}>
                        {patient.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="record-diagnosis">Diagnóstico Principal</Label>
                <Input
                  id="record-diagnosis"
                  value={recordData.primary_diagnosis}
                  onChange={(e) => setRecordData({ ...recordData, primary_diagnosis: e.target.value })}
                  placeholder="Digite o diagnóstico principal"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="record-notes">Observações</Label>
                <Input
                  id="record-notes"
                  value={recordData.notes}
                  onChange={(e) => setRecordData({ ...recordData, notes: e.target.value })}
                  placeholder="Observações gerais"
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsMedicalRecordDialogOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Criando...
                  </>
                ) : (
                  "Criar Prontuário"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
