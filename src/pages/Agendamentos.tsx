import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  CalendarPlus,
  ChevronLeft,
  ChevronRight,
  Clock,
  Video,
  MapPin,
  User,
  Filter,
  Loader2,
  Calendar,
  FileText,
  X,
  Trash2,
  Edit,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const timeSlots = [
  "08:00", "08:30", "09:00", "09:30", "10:00", "10:30",
  "11:00", "11:30", "14:00", "14:30", "15:00", "15:30",
  "16:00", "16:30", "17:00", "17:30",
];

const appointmentTypes = [
  "Consulta",
  "Retorno",
  "Teleconsulta",
  "Exame",
  "Procedimento",
];

const appointmentStatuses = [
  "Agendado",
  "Confirmado",
  "Em atendimento",
  "Concluído",
  "Cancelado",
];

const weekDays = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

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

export default function Agendamentos() {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [view, setView] = useState<"day" | "week">("day");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [typeFilter, setTypeFilter] = useState("all");
  const [professionalFilter, setProfessionalFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [formData, setFormData] = useState({
    patient_id: "",
    professional_id: "",
    appointment_date: format(new Date(), "yyyy-MM-dd"),
    appointment_time: "",
    duration: "30",
    type: "Consulta",
    is_video: false,
    notes: "",
  });

  const queryClient = useQueryClient();

  // Fetch patients
  const { data: patients = [] } = useQuery({
    queryKey: ["patients"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("patients")
        .select("id, name")
        .eq("status", "Ativo")
        .order("name");
      if (error) throw error;
      return data;
    },
  });

  // Fetch professionals
  const { data: professionals = [] } = useQuery({
    queryKey: ["professionals"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("professionals")
        .select("id, name, specialty")
        .order("name");
      if (error) throw error;
      return data;
    },
  });

  // Fetch appointments
  const { data: appointments = [], isLoading } = useQuery({
    queryKey: ["appointments", format(selectedDate, "yyyy-MM-dd")],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("appointments")
        .select(`
          *,
          patient:patients(name),
          professional:professionals(name, specialty)
        `)
        .eq("appointment_date", format(selectedDate, "yyyy-MM-dd"))
        .order("appointment_time");
      if (error) throw error;
      return data as Appointment[];
    },
  });

  // Create appointment mutation
  const createAppointment = useMutation({
    mutationFn: async (data: typeof formData) => {
      const { error } = await supabase.from("appointments").insert({
        patient_id: data.patient_id,
        professional_id: data.professional_id,
        appointment_date: data.appointment_date,
        appointment_time: data.appointment_time,
        duration: parseInt(data.duration),
        type: data.type,
        is_video: data.is_video,
        notes: data.notes || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Agendamento criado com sucesso!");
      queryClient.invalidateQueries({ queryKey: ["appointments"] });
      setIsDialogOpen(false);
      resetForm();
    },
    onError: (error) => {
      toast.error("Erro ao criar agendamento: " + error.message);
    },
  });

  // Update appointment status mutation
  const updateAppointmentStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase
        .from("appointments")
        .update({ status })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Status atualizado com sucesso!");
      queryClient.invalidateQueries({ queryKey: ["appointments"] });
    },
    onError: (error) => {
      toast.error("Erro ao atualizar status: " + error.message);
    },
  });

  // Delete appointment mutation
  const deleteAppointment = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("appointments").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Agendamento excluído com sucesso!");
      queryClient.invalidateQueries({ queryKey: ["appointments"] });
      setIsDetailsOpen(false);
      setSelectedAppointment(null);
    },
    onError: (error) => {
      toast.error("Erro ao excluir agendamento: " + error.message);
    },
  });

  const resetForm = () => {
    setFormData({
      patient_id: "",
      professional_id: "",
      appointment_date: format(new Date(), "yyyy-MM-dd"),
      appointment_time: "",
      duration: "30",
      type: "Consulta",
      is_video: false,
      notes: "",
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.patient_id || !formData.professional_id || !formData.appointment_time) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }
    createAppointment.mutate(formData);
  };

  const clearFilters = () => {
    setTypeFilter("all");
    setProfessionalFilter("all");
    setStatusFilter("all");
  };

  const hasActiveFilters = typeFilter !== "all" || professionalFilter !== "all" || statusFilter !== "all";

  // Filter appointments
  const filteredAppointments = appointments.filter((apt) => {
    if (typeFilter !== "all" && apt.type !== typeFilter) return false;
    if (professionalFilter !== "all" && apt.professional_id !== professionalFilter) return false;
    if (statusFilter !== "all" && apt.status !== statusFilter) return false;
    return true;
  });

  const getAppointmentForSlot = (time: string) => {
    return filteredAppointments.find((apt) => apt.appointment_time?.slice(0, 5) === time);
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString("pt-BR", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  };

  const generateWeekDates = () => {
    const dates = [];
    const startOfWeek = new Date(selectedDate);
    startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());

    for (let i = 0; i < 7; i++) {
      const date = new Date(startOfWeek);
      date.setDate(startOfWeek.getDate() + i);
      dates.push(date);
    }
    return dates;
  };

  const teleconsultasCount = filteredAppointments.filter((a) => a.is_video).length;
  const presenciaisCount = filteredAppointments.filter((a) => !a.is_video).length;

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case "Confirmado":
        return "success-light";
      case "Em atendimento":
        return "info-light";
      case "Concluído":
        return "secondary";
      case "Cancelado":
        return "destructive";
      default:
        return "primary-light";
    }
  };

  return (
    <MainLayout
      title="Agendamentos"
      subtitle="Gestão de consultas e procedimentos"
    >
      {/* Header Actions */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              const newDate = new Date(selectedDate);
              newDate.setDate(newDate.getDate() - 1);
              setSelectedDate(newDate);
            }}
          >
            <ChevronLeft className="w-5 h-5" />
          </Button>
          <div className="text-center min-w-[200px]">
            <p className="font-semibold text-foreground capitalize">
              {formatDate(selectedDate)}
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              const newDate = new Date(selectedDate);
              newDate.setDate(newDate.getDate() + 1);
              setSelectedDate(newDate);
            }}
          >
            <ChevronRight className="w-5 h-5" />
          </Button>
        </div>

        <div className="flex gap-2 sm:ml-auto">
          <div className="flex rounded-lg border border-input overflow-hidden">
            <Button
              variant={view === "day" ? "default" : "ghost"}
              size="sm"
              className="rounded-none"
              onClick={() => setView("day")}
            >
              Dia
            </Button>
            <Button
              variant={view === "week" ? "default" : "ghost"}
              size="sm"
              className="rounded-none"
              onClick={() => setView("week")}
            >
              Semana
            </Button>
          </div>

          {/* Filters Popover */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="gap-2">
                <Filter className="w-4 h-4" />
                Filtros
                {hasActiveFilters && (
                  <Badge variant="secondary" className="ml-1 h-5 w-5 p-0 flex items-center justify-center text-xs">
                    {[typeFilter, professionalFilter, statusFilter].filter(v => v !== "all").length}
                  </Badge>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80" align="end">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium text-sm">Filtros</h4>
                  {hasActiveFilters && (
                    <Button variant="ghost" size="sm" onClick={clearFilters} className="h-8 text-xs">
                      <X className="w-3 h-3 mr-1" />
                      Limpar
                    </Button>
                  )}
                </div>

                <div className="space-y-2">
                  <Label className="text-xs">Tipo de Atendimento</Label>
                  <Select value={typeFilter} onValueChange={setTypeFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="Todos os tipos" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos os tipos</SelectItem>
                      {appointmentTypes.map((type) => (
                        <SelectItem key={type} value={type}>
                          {type}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs">Profissional</Label>
                  <Select value={professionalFilter} onValueChange={setProfessionalFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="Todos os profissionais" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos os profissionais</SelectItem>
                      {professionals.map((prof) => (
                        <SelectItem key={prof.id} value={prof.id}>
                          {prof.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs">Status</Label>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="Todos os status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos os status</SelectItem>
                      {appointmentStatuses.map((status) => (
                        <SelectItem key={status} value={status}>
                          {status}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </PopoverContent>
          </Popover>

          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="default" className="gap-2">
                <CalendarPlus className="w-4 h-4" />
                Novo Agendamento
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>Novo Agendamento</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="patient">Paciente *</Label>
                  <Select
                    value={formData.patient_id}
                    onValueChange={(value) =>
                      setFormData({ ...formData, patient_id: value })
                    }
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

                <div className="space-y-2">
                  <Label htmlFor="professional">Profissional *</Label>
                  <Select
                    value={formData.professional_id}
                    onValueChange={(value) =>
                      setFormData({ ...formData, professional_id: value })
                    }
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
                  <div className="space-y-2">
                    <Label htmlFor="date">Data *</Label>
                    <Input
                      id="date"
                      type="date"
                      value={formData.appointment_date}
                      onChange={(e) =>
                        setFormData({ ...formData, appointment_date: e.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="time">Horário *</Label>
                    <Select
                      value={formData.appointment_time}
                      onValueChange={(value) =>
                        setFormData({ ...formData, appointment_time: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent>
                        {timeSlots.map((time) => (
                          <SelectItem key={time} value={time}>
                            {time}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="type">Tipo</Label>
                    <Select
                      value={formData.type}
                      onValueChange={(value) => {
                        const isVideo = value === "Teleconsulta";
                        setFormData({ ...formData, type: value, is_video: isVideo });
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {appointmentTypes.map((type) => (
                          <SelectItem key={type} value={type}>
                            {type}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="duration">Duração (min)</Label>
                    <Select
                      value={formData.duration}
                      onValueChange={(value) =>
                        setFormData({ ...formData, duration: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="15">15 min</SelectItem>
                        <SelectItem value="30">30 min</SelectItem>
                        <SelectItem value="45">45 min</SelectItem>
                        <SelectItem value="60">60 min</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="notes">Observações</Label>
                  <Textarea
                    id="notes"
                    placeholder="Observações sobre o agendamento..."
                    value={formData.notes}
                    onChange={(e) =>
                      setFormData({ ...formData, notes: e.target.value })
                    }
                  />
                </div>

                <div className="flex justify-end gap-2 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsDialogOpen(false)}
                  >
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={createAppointment.isPending}>
                    {createAppointment.isPending && (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    )}
                    Salvar
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Mini Calendar */}
        <Card variant="elevated" className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-base">Calendário</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-7 gap-1 text-center mb-2">
              {weekDays.map((day) => (
                <span key={day} className="text-xs font-medium text-muted-foreground p-1">
                  {day}
                </span>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {generateWeekDates().map((date, index) => {
                const isSelected = date.toDateString() === selectedDate.toDateString();
                const isToday = date.toDateString() === new Date().toDateString();
                return (
                  <button
                    key={index}
                    onClick={() => setSelectedDate(date)}
                    className={`p-2 rounded-lg text-sm font-medium transition-all ${
                      isSelected
                        ? "bg-primary text-primary-foreground"
                        : isToday
                        ? "bg-primary/10 text-primary"
                        : "hover:bg-muted text-foreground"
                    }`}
                  >
                    {date.getDate()}
                  </button>
                );
              })}
            </div>

            {/* Stats */}
            <div className="mt-6 space-y-3">
              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                <span className="text-sm text-muted-foreground">Total hoje</span>
                <span className="font-semibold text-foreground">{filteredAppointments.length}</span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-info/10">
                <span className="text-sm text-muted-foreground">Teleconsultas</span>
                <span className="font-semibold text-info">{teleconsultasCount}</span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-success/10">
                <span className="text-sm text-muted-foreground">Presenciais</span>
                <span className="font-semibold text-success">{presenciaisCount}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Schedule */}
        <Card variant="elevated" className="lg:col-span-3">
          <CardHeader>
            <CardTitle className="text-base">Agenda do Dia</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </div>
            ) : (
              <div className="space-y-2">
                {timeSlots.map((time) => {
                  const appointment = getAppointmentForSlot(time);
                  return (
                    <div
                      key={time}
                      className={`flex items-stretch gap-4 p-3 rounded-lg border transition-all ${
                        appointment
                          ? "border-primary/20 bg-primary/5 hover:bg-primary/10"
                          : "border-border hover:bg-muted/50"
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-[80px]">
                        <Clock className="w-4 h-4 text-muted-foreground" />
                        <span className="font-medium text-foreground">{time}</span>
                      </div>

                      {appointment ? (
                        <div className="flex-1 flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-1 h-10 rounded-full bg-primary" />
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-medium text-foreground">
                                  {appointment.patient?.name}
                                </span>
                                <Badge
                                  variant={appointment.is_video ? "info-light" : "primary-light"}
                                  className="text-[10px]"
                                >
                                  {appointment.is_video ? (
                                    <><Video className="w-3 h-3 mr-1" /> Teleconsulta</>
                                  ) : (
                                    <><MapPin className="w-3 h-3 mr-1" /> Presencial</>
                                  )}
                                </Badge>
                                <Badge
                                  variant={getStatusBadgeVariant(appointment.status) as any}
                                  className="text-[10px]"
                                >
                                  {appointment.status}
                                </Badge>
                              </div>
                              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <User className="w-3 h-3" />
                                <span>{appointment.professional?.name}</span>
                                <span>•</span>
                                <span>{appointment.duration} min</span>
                              </div>
                            </div>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedAppointment(appointment);
                              setIsDetailsOpen(true);
                            }}
                          >
                            Detalhes
                          </Button>
                        </div>
                      ) : (
                        <div className="flex-1 flex items-center justify-between text-muted-foreground">
                          <span className="text-sm">Horário disponível</span>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-primary"
                            onClick={() => {
                              setFormData({
                                ...formData,
                                appointment_date: format(selectedDate, "yyyy-MM-dd"),
                                appointment_time: time,
                              });
                              setIsDialogOpen(true);
                            }}
                          >
                            + Agendar
                          </Button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Appointment Details Dialog */}
      <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Detalhes do Agendamento</DialogTitle>
          </DialogHeader>
          {selectedAppointment && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-4 rounded-lg bg-muted/50">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <User className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <p className="font-semibold text-foreground">{selectedAppointment.patient?.name}</p>
                  <p className="text-sm text-muted-foreground">Paciente</p>
                </div>
              </div>

              <Separator />

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Calendar className="w-3 h-3" /> Data
                  </p>
                  <p className="font-medium text-foreground">
                    {format(new Date(selectedAppointment.appointment_date + "T12:00:00"), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Clock className="w-3 h-3" /> Horário
                  </p>
                  <p className="font-medium text-foreground">
                    {selectedAppointment.appointment_time?.slice(0, 5)} ({selectedAppointment.duration} min)
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <User className="w-3 h-3" /> Profissional
                  </p>
                  <p className="font-medium text-foreground">{selectedAppointment.professional?.name}</p>
                  <p className="text-xs text-muted-foreground">{selectedAppointment.professional?.specialty}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Tipo</p>
                  <Badge variant={selectedAppointment.is_video ? "info-light" : "primary-light"}>
                    {selectedAppointment.is_video ? (
                      <><Video className="w-3 h-3 mr-1" /> Teleconsulta</>
                    ) : (
                      <><MapPin className="w-3 h-3 mr-1" /> Presencial</>
                    )}
                  </Badge>
                </div>
              </div>

              <Separator />

              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Alterar Status</Label>
                <Select
                  value={selectedAppointment.status}
                  onValueChange={(value) => {
                    updateAppointmentStatus.mutate({ id: selectedAppointment.id, status: value });
                    setSelectedAppointment({ ...selectedAppointment, status: value });
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {appointmentStatuses.map((status) => (
                      <SelectItem key={status} value={status}>
                        {status}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedAppointment.notes && (
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <FileText className="w-3 h-3" /> Observações
                  </p>
                  <p className="text-sm text-foreground bg-muted/50 p-3 rounded-lg">
                    {selectedAppointment.notes}
                  </p>
                </div>
              )}

              <Separator />

              <div className="flex justify-between pt-2">
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="destructive"
                      size="sm"
                      className="gap-2"
                      disabled={deleteAppointment.isPending}
                    >
                      {deleteAppointment.isPending ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Trash2 className="w-4 h-4" />
                      )}
                      Excluir
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
                      <AlertDialogDescription>
                        Tem certeza que deseja excluir este agendamento? Esta ação não pode ser desfeita.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => deleteAppointment.mutate(selectedAppointment.id)}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        Excluir
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
                <Button variant="outline" onClick={() => setIsDetailsOpen(false)}>
                  Fechar
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}
