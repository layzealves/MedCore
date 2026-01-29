import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { MoreHorizontal, ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { format, parseISO, isValid, differenceInYears } from "date-fns";
import { logError } from "@/lib/errorHandler";

interface Patient {
  id: string;
  name: string;
  birth_date: string;
  status: string;
  created_at: string;
}

type BadgeVariant = "success-light" | "info-light" | "warning-light" | "secondary";

const STATUS_VARIANTS: Record<string, BadgeVariant> = {
  "Ativo": "success-light",
  "Em tratamento": "info-light",
  "Internado": "warning-light",
};

const CARD_TITLE = "Pacientes Recentes";
const PATIENTS_LIMIT = 5;

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((word) => word[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function getStatusVariant(status: string): BadgeVariant {
  return STATUS_VARIANTS[status] || "secondary";
}

function calculateAge(birthDate: string): number | null {
  if (!birthDate) return null;
  const date = parseISO(birthDate);
  return isValid(date) ? differenceInYears(new Date(), date) : null;
}

function formatTime(dateString: string): string {
  if (!dateString) return "";
  const date = parseISO(dateString);
  return isValid(date) ? format(date, "HH:mm") : "";
}

function LoadingSkeleton() {
  return (
    <Card variant="elevated" className="animate-slide-up">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg">{CARD_TITLE}</CardTitle>
        <Button variant="ghost" size="sm" className="gap-1">
          Ver todos
          <ArrowRight className="w-4 h-4" />
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {Array.from({ length: PATIENTS_LIMIT }).map((_, index) => (
          <div key={index} className="flex items-center gap-4 p-3">
            <Skeleton className="w-10 h-10 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-24" />
            </div>
            <Skeleton className="h-6 w-20" />
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function EmptyState() {
  return (
    <p className="text-sm text-muted-foreground text-center py-8">
      Nenhum paciente cadastrado.
    </p>
  );
}

interface PatientItemProps {
  patient: Patient;
}

function PatientItem({ patient }: PatientItemProps) {
  const age = calculateAge(patient.birth_date);

  return (
    <div className="flex items-center gap-4 p-3 rounded-lg hover:bg-muted/50 transition-colors group">
      <Avatar className="w-10 h-10 border-2 border-primary/20">
        <AvatarFallback className="bg-primary-light text-primary text-sm font-semibold">
          {getInitials(patient.name)}
        </AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-sm font-semibold text-foreground truncate">
            {patient.name}
          </p>
          {age !== null && (
            <span className="text-xs text-muted-foreground">{age} anos</span>
          )}
        </div>
        <p className="text-xs text-muted-foreground truncate">{patient.status}</p>
      </div>
      <div className="flex items-center gap-3">
        <Badge variant={getStatusVariant(patient.status)}>{patient.status}</Badge>
        <span className="text-xs text-muted-foreground hidden sm:block">
          {formatTime(patient.created_at)}
        </span>
        <Button
          variant="ghost"
          size="icon-sm"
          className="opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <MoreHorizontal className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}

export function RecentPatients() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchRecentPatients();
  }, []);

  async function fetchRecentPatients() {
    try {
      const { data, error } = await supabase
        .from("patients")
        .select("id, name, birth_date, status, created_at")
        .order("created_at", { ascending: false })
        .limit(PATIENTS_LIMIT);

      if (error) throw error;
      setPatients(data || []);
    } catch (error) {
      logError("fetch_recent_patients", error);
    } finally {
      setLoading(false);
    }
  }

  function handleViewAll() {
    navigate("/pacientes");
  }

  if (loading) {
    return <LoadingSkeleton />;
  }

  return (
    <Card variant="elevated" className="animate-slide-up">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg">{CARD_TITLE}</CardTitle>
        <Button variant="ghost" size="sm" className="gap-1" onClick={handleViewAll}>
          Ver todos
          <ArrowRight className="w-4 h-4" />
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {patients.length === 0 ? (
          <EmptyState />
        ) : (
          patients.map((patient) => (
            <PatientItem key={patient.id} patient={patient} />
          ))
        )}
      </CardContent>
    </Card>
  );
}
