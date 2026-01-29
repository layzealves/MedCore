import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Calendar, Clock, Video, MapPin, ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { logError } from "@/lib/errorHandler";

interface Appointment {
  id: string;
  appointment_date: string;
  appointment_time: string;
  duration: number;
  type: string;
  is_video: boolean;
  patient: {
    name: string;
  } | null;
  professional: {
    specialty: string;
  } | null;
}

export function UpcomingAppointments() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchUpcomingAppointments();
  }, []);

  const fetchUpcomingAppointments = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      
      const { data, error } = await supabase
        .from("appointments")
        .select(`
          id,
          appointment_date,
          appointment_time,
          duration,
          type,
          is_video,
          patient:patients!appointments_patient_id_fkey(name),
          professional:professionals!appointments_professional_id_fkey(specialty)
        `)
        .eq("status", "Agendado")
        .gte("appointment_date", today)
        .order("appointment_date", { ascending: true })
        .order("appointment_time", { ascending: true })
        .limit(4);

      if (error) throw error;
      setAppointments(data || []);
    } catch (error) {
      logError("fetch_upcoming_appointments", error);
    } finally {
      setLoading(false);
    }
  };

  const getAppointmentIcon = (isVideo: boolean, type: string) => {
    if (isVideo) return Video;
    if (type === "Retorno") return Calendar;
    return MapPin;
  };

  const getAppointmentVariant = (isVideo: boolean, type: string) => {
    if (isVideo) return "info-light" as const;
    if (type === "Retorno") return "success-light" as const;
    return "primary-light" as const;
  };

  const formatTime = (time: string) => {
    return time.slice(0, 5); // Get HH:mm from HH:mm:ss
  };

  if (loading) {
    return (
      <Card variant="elevated" className="animate-slide-up" style={{ animationDelay: "100ms" }}>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg">Próximos Agendamentos</CardTitle>
          <Button variant="ghost" size="sm" className="gap-1">
            Ver agenda
            <ArrowRight className="w-4 h-4" />
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="flex items-center gap-4 p-4 rounded-xl border border-border">
              <Skeleton className="w-10 h-10 rounded-lg" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-24" />
              </div>
              <div className="text-right space-y-1">
                <Skeleton className="h-4 w-12 ml-auto" />
                <Skeleton className="h-3 w-16 ml-auto" />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card variant="elevated" className="animate-slide-up" style={{ animationDelay: "100ms" }}>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg">Próximos Agendamentos</CardTitle>
        <Button 
          variant="ghost" 
          size="sm" 
          className="gap-1"
          onClick={() => navigate("/agendamentos")}
        >
          Ver agenda
          <ArrowRight className="w-4 h-4" />
        </Button>
      </CardHeader>
      <CardContent className="space-y-3">
        {appointments.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">
            Nenhum agendamento futuro encontrado.
          </p>
        ) : (
          appointments.map((appointment) => {
            const Icon = getAppointmentIcon(appointment.is_video, appointment.type);
            const variant = getAppointmentVariant(appointment.is_video, appointment.type);
            const typeLabel = appointment.is_video ? "Teleconsulta" : appointment.type;

            return (
              <div
                key={appointment.id}
                className="flex items-center gap-4 p-4 rounded-xl border border-border bg-gradient-to-r from-background to-muted/30 hover:shadow-md transition-all group"
              >
                <div className="p-2.5 rounded-lg bg-primary-light">
                  <Icon className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground">
                    {appointment.patient?.name || "Paciente não encontrado"}
                  </p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <Badge variant={variant} className="text-[10px] px-1.5">
                      {typeLabel}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {appointment.professional?.specialty || "Especialidade não informada"}
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-foreground">
                    {formatTime(appointment.appointment_time)}
                  </p>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Clock className="w-3 h-3" />
                    {appointment.duration} min
                  </div>
                </div>
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}
