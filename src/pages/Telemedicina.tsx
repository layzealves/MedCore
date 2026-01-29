import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Video,
  VideoOff,
  Mic,
  MicOff,
  Phone,
  MessageSquare,
  FileText,
  Calendar,
  Clock,
  User,
  Monitor,
  Settings,
  Loader2,
  PhoneCall,
  CheckCircle,
  XCircle,
  Pill,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format, isToday, addDays } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Appointment {
  id: string;
  patient_id: string;
  professional_id: string;
  appointment_date: string;
  appointment_time: string;
  duration: number;
  type: string;
  is_video: boolean;
  status: string;
  notes: string | null;
  patient: { name: string } | null;
  professional: { name: string; specialty: string } | null;
}

export default function Telemedicina() {
  const [isVideoOn, setIsVideoOn] = useState(true);
  const [isMicOn, setIsMicOn] = useState(true);
  const [selectedCall, setSelectedCall] = useState<Appointment | null>(null);
  const [isInCall, setIsInCall] = useState(false);
  const [callStartTime, setCallStartTime] = useState<Date | null>(null);
  
  // Quick actions dialogs state
  const [isReturnDialogOpen, setIsReturnDialogOpen] = useState(false);
  const [isPrescriptionDialogOpen, setIsPrescriptionDialogOpen] = useState(false);
  const [isMedicalRecordDialogOpen, setIsMedicalRecordDialogOpen] = useState(false);
  const [returnDate, setReturnDate] = useState("");
  const [returnTime, setReturnTime] = useState("09:00");
  const [returnNotes, setReturnNotes] = useState("");
  const [prescriptionMedication, setPrescriptionMedication] = useState("");
  const [prescriptionDosage, setPrescriptionDosage] = useState("");
  const [prescriptionInstructions, setPrescriptionInstructions] = useState("");

  const queryClient = useQueryClient();

  // Fetch upcoming video appointments (today and future)
  const { data: upcomingCalls = [], isLoading: isLoadingUpcoming } = useQuery({
    queryKey: ["appointments", "teleconsultas", "upcoming"],
    queryFn: async () => {
      const today = format(new Date(), "yyyy-MM-dd");
      const { data, error } = await supabase
        .from("appointments")
        .select(`
          *,
          patient:patients(name),
          professional:professionals(name, specialty)
        `)
        .eq("is_video", true)
        .gte("appointment_date", today)
        .in("status", ["Agendado", "Confirmado"])
        .order("appointment_date", { ascending: true })
        .order("appointment_time", { ascending: true });
      if (error) throw error;
      return data as Appointment[];
    },
  });

  // Fetch recent/past video appointments
  const { data: recentCalls = [], isLoading: isLoadingRecent } = useQuery({
    queryKey: ["appointments", "teleconsultas", "recent"],
    queryFn: async () => {
      const today = format(new Date(), "yyyy-MM-dd");
      const { data, error } = await supabase
        .from("appointments")
        .select(`
          *,
          patient:patients(name),
          professional:professionals(name, specialty)
        `)
        .eq("is_video", true)
        .or(`appointment_date.lt.${today},status.in.(Concluído,Cancelado)`)
        .order("appointment_date", { ascending: false })
        .order("appointment_time", { ascending: false })
        .limit(10);
      if (error) throw error;
      return data as Appointment[];
    },
  });

  // Update appointment status
  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase
        .from("appointments")
        .update({ status })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["appointments"] });
    },
    onError: (error) => {
      toast.error("Erro ao atualizar status: " + error.message);
    },
  });

  const getInitials = (name: string | undefined) => {
    if (!name) return "??";
    return name
      .split(" ")
      .map((n) => n[0])
      .slice(0, 2)
      .join("")
      .toUpperCase();
  };

  const startCall = (appointment: Appointment) => {
    setSelectedCall(appointment);
    setIsInCall(true);
    setCallStartTime(new Date());
    updateStatus.mutate({ id: appointment.id, status: "Em atendimento" });
    toast.success("Teleconsulta iniciada!");
  };

  const endCall = () => {
    if (selectedCall) {
      updateStatus.mutate({ id: selectedCall.id, status: "Concluído" });
      toast.success("Teleconsulta finalizada!");
    }
    setIsInCall(false);
    setSelectedCall(null);
    setCallStartTime(null);
  };

  const cancelCall = (appointment: Appointment) => {
    updateStatus.mutate({ id: appointment.id, status: "Cancelado" });
    toast.info("Consulta cancelada");
  };

  // Create return appointment mutation
  const createReturnAppointment = useMutation({
    mutationFn: async () => {
      if (!selectedCall) throw new Error("Nenhuma consulta selecionada");
      const { error } = await supabase.from("appointments").insert({
        patient_id: selectedCall.patient_id,
        professional_id: selectedCall.professional_id,
        appointment_date: returnDate,
        appointment_time: returnTime,
        type: "Retorno",
        is_video: true,
        status: "Agendado",
        notes: returnNotes || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["appointments"] });
      toast.success("Retorno agendado com sucesso!");
      setIsReturnDialogOpen(false);
      setReturnDate("");
      setReturnTime("09:00");
      setReturnNotes("");
    },
    onError: (error) => {
      toast.error("Erro ao agendar retorno: " + error.message);
    },
  });

  // Fetch medical record for selected patient
  const { data: patientMedicalRecord, refetch: refetchMedicalRecord } = useQuery({
    queryKey: ["medical_record", selectedCall?.patient_id],
    queryFn: async () => {
      if (!selectedCall) return null;
      const { data, error } = await supabase
        .from("medical_records")
        .select(`
          *,
          entries:medical_record_entries(
            id,
            entry_type,
            entry_date,
            description,
            created_at,
            professional:professionals(name)
          )
        `)
        .eq("patient_id", selectedCall.patient_id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!selectedCall && isMedicalRecordDialogOpen,
  });

  // Open patient's medical record dialog
  const openMedicalRecord = () => {
    if (!selectedCall) {
      toast.error("Selecione uma consulta primeiro");
      return;
    }
    setIsMedicalRecordDialogOpen(true);
    refetchMedicalRecord();
  };

  // Open return dialog
  const openReturnDialog = () => {
    if (!selectedCall) {
      toast.error("Selecione uma consulta primeiro");
      return;
    }
    // Set default date to 7 days from now
    const defaultDate = format(addDays(new Date(), 7), "yyyy-MM-dd");
    setReturnDate(defaultDate);
    setIsReturnDialogOpen(true);
  };

  // Open prescription dialog
  const openPrescriptionDialog = () => {
    if (!selectedCall) {
      toast.error("Selecione uma consulta primeiro");
      return;
    }
    setIsPrescriptionDialogOpen(true);
  };

  // Save prescription as medical record entry
  const savePrescription = useMutation({
    mutationFn: async () => {
      if (!selectedCall) throw new Error("Nenhuma consulta selecionada");
      
      // Check if patient has medical record, create if not
      let { data: record } = await supabase
        .from("medical_records")
        .select("id")
        .eq("patient_id", selectedCall.patient_id)
        .maybeSingle();

      if (!record) {
        // record_number is auto-generated by trigger, but we need a placeholder for insert
        const { data: newRecord, error: createError } = await supabase
          .from("medical_records")
          .insert([{
            patient_id: selectedCall.patient_id,
            primary_professional_id: selectedCall.professional_id,
            status: "ativo",
            record_number: "TEMP", // Will be replaced by trigger
          }])
          .select("id")
          .single();
        if (createError) throw createError;
        record = newRecord;
      }

      // Add prescription as entry
      const prescriptionText = `Medicamento: ${prescriptionMedication}\nPosologia: ${prescriptionDosage}\nInstruções: ${prescriptionInstructions}`;
      const { error } = await supabase.from("medical_record_entries").insert({
        medical_record_id: record.id,
        professional_id: selectedCall.professional_id,
        entry_type: "Prescrição",
        description: prescriptionText,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["medical_records"] });
      toast.success("Receita emitida com sucesso!");
      setIsPrescriptionDialogOpen(false);
      setPrescriptionMedication("");
      setPrescriptionDosage("");
      setPrescriptionInstructions("");
    },
    onError: (error) => {
      toast.error("Erro ao emitir receita: " + error.message);
    },
  });

  // Calculate call duration
  const getCallDuration = () => {
    if (!callStartTime) return "00:00";
    const now = new Date();
    const diff = Math.floor((now.getTime() - callStartTime.getTime()) / 1000);
    const mins = Math.floor(diff / 60);
    const secs = diff % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  // Stats
  const todaysCalls = upcomingCalls.filter((c) => isToday(new Date(c.appointment_date + "T12:00:00")));
  const completedToday = recentCalls.filter(
    (c) => c.status === "Concluído" && isToday(new Date(c.appointment_date + "T12:00:00"))
  ).length;

  return (
    <MainLayout
      title="Telemedicina"
      subtitle="Consultas e atendimentos online"
    >
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Video Area */}
        <Card variant="elevated" className="lg:col-span-2">
          <CardContent className="p-0">
            {/* Video Preview */}
            <div className="relative aspect-video bg-foreground/5 rounded-t-xl overflow-hidden">
              {isInCall && selectedCall ? (
                <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-primary/5">
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center">
                      <Avatar className="w-32 h-32 mx-auto mb-4 border-4 border-primary/30">
                        <AvatarFallback className="bg-primary/20 text-primary text-4xl font-bold">
                          {getInitials(selectedCall.patient?.name)}
                        </AvatarFallback>
                      </Avatar>
                      <h3 className="text-xl font-semibold text-foreground mb-1">
                        {selectedCall.patient?.name}
                      </h3>
                      <p className="text-sm text-muted-foreground mb-2">
                        {selectedCall.type}
                      </p>
                      <Badge variant="success" className="animate-pulse">
                        <PhoneCall className="w-3 h-3 mr-1" />
                        Em chamada - {getCallDuration()}
                      </Badge>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center">
                    <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                      <Video className="w-12 h-12 text-primary" />
                    </div>
                    <h3 className="text-lg font-semibold text-foreground mb-2">
                      Pronto para iniciar
                    </h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Selecione uma consulta para iniciar o atendimento
                    </p>
                    {todaysCalls.length > 0 && (
                      <Button
                        variant="default"
                        size="lg"
                        className="gap-2"
                        onClick={() => startCall(todaysCalls[0])}
                      >
                        <Video className="w-5 h-5" />
                        Iniciar Próxima Consulta
                      </Button>
                    )}
                  </div>
                </div>
              )}

              {/* Self Video Preview */}
              <div className="absolute bottom-4 right-4 w-32 h-24 bg-card rounded-lg border border-border shadow-lg overflow-hidden">
                <div className="w-full h-full flex items-center justify-center bg-muted">
                  {isVideoOn ? (
                    <User className="w-8 h-8 text-muted-foreground" />
                  ) : (
                    <VideoOff className="w-8 h-8 text-muted-foreground" />
                  )}
                </div>
              </div>

              {/* Call info overlay */}
              {isInCall && selectedCall && (
                <div className="absolute top-4 left-4 bg-background/80 backdrop-blur-sm rounded-lg p-3 border">
                  <p className="text-xs text-muted-foreground">Médico</p>
                  <p className="text-sm font-medium text-foreground">
                    {selectedCall.professional?.name}
                  </p>
                </div>
              )}
            </div>

            {/* Video Controls */}
            <div className="p-4 border-t border-border">
              <div className="flex items-center justify-center gap-4">
                <Button
                  variant={isMicOn ? "secondary" : "destructive"}
                  size="icon"
                  className="rounded-full w-12 h-12"
                  onClick={() => setIsMicOn(!isMicOn)}
                >
                  {isMicOn ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
                </Button>
                <Button
                  variant={isVideoOn ? "secondary" : "destructive"}
                  size="icon"
                  className="rounded-full w-12 h-12"
                  onClick={() => setIsVideoOn(!isVideoOn)}
                >
                  {isVideoOn ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
                </Button>
                <Button
                  variant="destructive"
                  size="icon"
                  className="rounded-full w-14 h-14"
                  onClick={endCall}
                  disabled={!isInCall}
                >
                  <Phone className="w-6 h-6" />
                </Button>
                <Button variant="secondary" size="icon" className="rounded-full w-12 h-12">
                  <Monitor className="w-5 h-5" />
                </Button>
                <Button variant="secondary" size="icon" className="rounded-full w-12 h-12">
                  <MessageSquare className="w-5 h-5" />
                </Button>
                <Button variant="secondary" size="icon" className="rounded-full w-12 h-12">
                  <Settings className="w-5 h-5" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Stats */}
          <div className="grid grid-cols-2 gap-3">
            <Card variant="elevated" className="p-4">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Calendar className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <p className="text-xl font-bold text-foreground">{todaysCalls.length}</p>
                  <p className="text-xs text-muted-foreground">Hoje</p>
                </div>
              </div>
            </Card>
            <Card variant="elevated" className="p-4">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-success/10">
                  <CheckCircle className="w-4 h-4 text-success" />
                </div>
                <div>
                  <p className="text-xl font-bold text-foreground">{completedToday}</p>
                  <p className="text-xs text-muted-foreground">Concluídas</p>
                </div>
              </div>
            </Card>
          </div>

          {/* Upcoming Calls */}
          <Card variant="elevated">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Calendar className="w-4 h-4 text-primary" />
                Próximas Teleconsultas
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {isLoadingUpcoming ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="w-5 h-5 animate-spin text-primary" />
                </div>
              ) : upcomingCalls.length === 0 ? (
                <p className="text-center text-sm text-muted-foreground py-4">
                  Nenhuma teleconsulta agendada
                </p>
              ) : (
                upcomingCalls.slice(0, 5).map((call) => (
                  <div
                    key={call.id}
                    className={`flex items-center gap-3 p-3 rounded-lg border transition-colors cursor-pointer ${
                      selectedCall?.id === call.id
                        ? "border-primary bg-primary/5"
                        : "border-border hover:bg-muted/50"
                    }`}
                    onClick={() => setSelectedCall(call)}
                  >
                    <Avatar className="w-10 h-10 border-2 border-primary/20">
                      <AvatarFallback className="bg-primary/10 text-primary text-sm font-semibold">
                        {getInitials(call.patient?.name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-foreground truncate">{call.patient?.name}</p>
                      <p className="text-xs text-muted-foreground">{call.type}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-foreground">
                        {call.appointment_time?.slice(0, 5)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {isToday(new Date(call.appointment_date + "T12:00:00"))
                          ? "Hoje"
                          : format(new Date(call.appointment_date + "T12:00:00"), "dd/MM", { locale: ptBR })}
                      </p>
                    </div>
                  </div>
                ))
              )}
              {selectedCall && !isInCall && (
                <div className="flex gap-2 mt-3">
                  <Button className="flex-1 gap-2" onClick={() => startCall(selectedCall)}>
                    <Video className="w-4 h-4" />
                    Iniciar
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => cancelCall(selectedCall)}
                  >
                    <XCircle className="w-4 h-4" />
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card variant="elevated">
            <CardHeader>
              <CardTitle className="text-base">Ações Rápidas</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button 
                variant="outline" 
                className="w-full justify-start gap-2"
                onClick={openMedicalRecord}
                disabled={!selectedCall}
              >
                <FileText className="w-4 h-4" />
                Abrir Prontuário
              </Button>
              <Button 
                variant="outline" 
                className="w-full justify-start gap-2"
                onClick={openReturnDialog}
                disabled={!selectedCall}
              >
                <Calendar className="w-4 h-4" />
                Agendar Retorno
              </Button>
              <Button 
                variant="outline" 
                className="w-full justify-start gap-2"
                onClick={openPrescriptionDialog}
                disabled={!selectedCall}
              >
                <Pill className="w-4 h-4" />
                Emitir Receita
              </Button>
            </CardContent>
          </Card>

          {/* Recent Calls */}
          <Card variant="elevated">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Clock className="w-4 h-4 text-muted-foreground" />
                Atendimentos Recentes
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {isLoadingRecent ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="w-5 h-5 animate-spin text-primary" />
                </div>
              ) : recentCalls.length === 0 ? (
                <p className="text-center text-sm text-muted-foreground py-4">
                  Nenhum atendimento recente
                </p>
              ) : (
                recentCalls.slice(0, 5).map((call) => (
                  <div key={call.id} className="flex items-center gap-3 p-2 rounded-lg">
                    <Avatar className="w-8 h-8">
                      <AvatarFallback className="bg-muted text-muted-foreground text-xs">
                        {getInitials(call.patient?.name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">
                        {call.patient?.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(call.appointment_date + "T12:00:00"), "dd/MM/yyyy", { locale: ptBR })}
                      </p>
                    </div>
                    <Badge
                      variant={call.status === "Concluído" ? "success-light" : "destructive-light"}
                    >
                      {call.status}
                    </Badge>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Return Appointment Dialog */}
      <Dialog open={isReturnDialogOpen} onOpenChange={setIsReturnDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-primary" />
              Agendar Retorno
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="p-3 bg-muted/50 rounded-lg">
              <p className="text-sm text-muted-foreground">Paciente</p>
              <p className="font-medium">{selectedCall?.patient?.name}</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="returnDate">Data</Label>
                <Input
                  id="returnDate"
                  type="date"
                  value={returnDate}
                  onChange={(e) => setReturnDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="returnTime">Horário</Label>
                <Select value={returnTime} onValueChange={setReturnTime}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {["08:00", "09:00", "10:00", "11:00", "14:00", "15:00", "16:00", "17:00"].map((time) => (
                      <SelectItem key={time} value={time}>{time}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="returnNotes">Observações (opcional)</Label>
              <Textarea
                id="returnNotes"
                value={returnNotes}
                onChange={(e) => setReturnNotes(e.target.value)}
                placeholder="Acompanhamento, exames, etc."
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsReturnDialogOpen(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={() => createReturnAppointment.mutate()}
              disabled={!returnDate || createReturnAppointment.isPending}
            >
              {createReturnAppointment.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : null}
              Agendar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Prescription Dialog */}
      <Dialog open={isPrescriptionDialogOpen} onOpenChange={setIsPrescriptionDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pill className="w-5 h-5 text-primary" />
              Emitir Receita
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="p-3 bg-muted/50 rounded-lg">
              <p className="text-sm text-muted-foreground">Paciente</p>
              <p className="font-medium">{selectedCall?.patient?.name}</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="medication">Medicamento</Label>
              <Input
                id="medication"
                value={prescriptionMedication}
                onChange={(e) => setPrescriptionMedication(e.target.value)}
                placeholder="Nome do medicamento"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dosage">Posologia</Label>
              <Input
                id="dosage"
                value={prescriptionDosage}
                onChange={(e) => setPrescriptionDosage(e.target.value)}
                placeholder="Ex: 1 comprimido de 8 em 8 horas"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="instructions">Instruções adicionais</Label>
              <Textarea
                id="instructions"
                value={prescriptionInstructions}
                onChange={(e) => setPrescriptionInstructions(e.target.value)}
                placeholder="Tomar após as refeições, durante 7 dias..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsPrescriptionDialogOpen(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={() => savePrescription.mutate()}
              disabled={!prescriptionMedication || !prescriptionDosage || savePrescription.isPending}
            >
              {savePrescription.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : null}
              Emitir Receita
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Medical Record Dialog */}
      <Dialog open={isMedicalRecordDialogOpen} onOpenChange={setIsMedicalRecordDialogOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-primary" />
              Prontuário do Paciente
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto space-y-4">
            <div className="p-3 bg-muted/50 rounded-lg">
              <p className="text-sm text-muted-foreground">Paciente</p>
              <p className="font-medium">{selectedCall?.patient?.name}</p>
            </div>
            
            {patientMedicalRecord ? (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 border rounded-lg">
                    <p className="text-xs text-muted-foreground">Número do Prontuário</p>
                    <p className="font-medium text-foreground">{patientMedicalRecord.record_number}</p>
                  </div>
                  <div className="p-3 border rounded-lg">
                    <p className="text-xs text-muted-foreground">Status</p>
                    <Badge variant={patientMedicalRecord.status === "ativo" ? "success" : "secondary"}>
                      {patientMedicalRecord.status}
                    </Badge>
                  </div>
                </div>

                {patientMedicalRecord.primary_diagnosis && (
                  <div className="p-3 border rounded-lg">
                    <p className="text-xs text-muted-foreground mb-1">Diagnóstico Principal</p>
                    <p className="text-sm text-foreground">{patientMedicalRecord.primary_diagnosis}</p>
                  </div>
                )}

                <div className="space-y-2">
                  <h4 className="font-medium text-sm text-foreground flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    Histórico de Entradas
                  </h4>
                  {patientMedicalRecord.entries && patientMedicalRecord.entries.length > 0 ? (
                    <div className="space-y-2 max-h-60 overflow-y-auto">
                      {patientMedicalRecord.entries
                        .sort((a: any, b: any) => new Date(b.entry_date).getTime() - new Date(a.entry_date).getTime())
                        .map((entry: any) => (
                        <div key={entry.id} className="p-3 border rounded-lg bg-background">
                          <div className="flex items-center justify-between mb-2">
                            <Badge variant="outline" className="text-xs">
                              {entry.entry_type}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              {format(new Date(entry.entry_date), "dd/MM/yyyy", { locale: ptBR })}
                            </span>
                          </div>
                          <p className="text-sm text-foreground whitespace-pre-line">{entry.description}</p>
                          {entry.professional && (
                            <p className="text-xs text-muted-foreground mt-2">
                              Por: {entry.professional.name}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      Nenhuma entrada registrada
                    </p>
                  )}
                </div>
              </>
            ) : (
              <div className="text-center py-8">
                <FileText className="w-12 h-12 mx-auto text-muted-foreground/50 mb-3" />
                <p className="text-muted-foreground">
                  Paciente não possui prontuário cadastrado
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  Use a opção "Emitir Receita" para criar automaticamente
                </p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsMedicalRecordDialogOpen(false)}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}
