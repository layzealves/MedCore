import { useEffect, useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { StatsCard } from "@/components/dashboard/StatsCard";
import { RecentPatients } from "@/components/dashboard/RecentPatients";
import { UpcomingAppointments } from "@/components/dashboard/UpcomingAppointments";
import { BedOccupancy } from "@/components/dashboard/BedOccupancy";
import { QuickActions } from "@/components/dashboard/QuickActions";
import { supabase } from "@/integrations/supabase/client";
import { logError } from "@/lib/errorHandler";
import { Users, Calendar, BedDouble, Activity } from "lucide-react";

interface DashboardStats {
  totalPatients: number;
  patientsYesterday: number;
  scheduledAppointments: number;
  appointmentsLastWeek: number;
  occupiedBeds: number;
  totalBeds: number;
  activeAdmissions: number;
  admissionsYesterday: number;
}

interface Bed {
  status: string;
}

const INITIAL_STATS: DashboardStats = {
  totalPatients: 0,
  patientsYesterday: 0,
  scheduledAppointments: 0,
  appointmentsLastWeek: 0,
  occupiedBeds: 0,
  totalBeds: 0,
  activeAdmissions: 0,
  admissionsYesterday: 0,
};

const MILLISECONDS_PER_DAY = 86400000;

function getDateString(daysAgo: number = 0): string {
  return new Date(Date.now() - daysAgo * MILLISECONDS_PER_DAY)
    .toISOString()
    .split("T")[0];
}

function calculateTrend(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0;
  return Math.round(((current - previous) / previous) * 100);
}

function calculatePercentage(part: number, total: number): number {
  return total > 0 ? Math.round((part / total) * 100) : 0;
}

function countOccupiedBeds(beds: Bed[]): number {
  return beds.filter((bed) => bed.status === "Ocupado").length;
}

async function fetchAllStats(): Promise<DashboardStats> {
  const today = getDateString();
  const yesterday = getDateString(1);
  const lastWeek = getDateString(7);

  const [
    patientsResult,
    patientsYesterdayResult,
    appointmentsResult,
    appointmentsLastWeekResult,
    bedsResult,
    admissionsResult,
    admissionsYesterdayResult,
  ] = await Promise.all([
    supabase.from("patients").select("*", { count: "exact", head: true }),
    supabase
      .from("patients")
      .select("*", { count: "exact", head: true })
      .gte("created_at", yesterday)
      .lt("created_at", today),
    supabase
      .from("appointments")
      .select("*", { count: "exact", head: true })
      .eq("status", "Agendado")
      .gte("appointment_date", today),
    supabase
      .from("appointments")
      .select("*", { count: "exact", head: true })
      .gte("appointment_date", lastWeek)
      .lt("appointment_date", today),
    supabase.from("beds").select("*"),
    supabase
      .from("admissions")
      .select("*", { count: "exact", head: true })
      .eq("status", "Ativa"),
    supabase
      .from("admissions")
      .select("*", { count: "exact", head: true })
      .eq("status", "Ativa")
      .gte("created_at", yesterday)
      .lt("created_at", today),
  ]);

  const beds = bedsResult.data || [];

  return {
    totalPatients: patientsResult.count || 0,
    patientsYesterday: patientsYesterdayResult.count || 0,
    scheduledAppointments: appointmentsResult.count || 0,
    appointmentsLastWeek: appointmentsLastWeekResult.count || 0,
    occupiedBeds: countOccupiedBeds(beds),
    totalBeds: beds.length,
    activeAdmissions: admissionsResult.count || 0,
    admissionsYesterday: admissionsYesterdayResult.count || 0,
  };
}

function Index() {
  const [stats, setStats] = useState<DashboardStats>(INITIAL_STATS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardStats();
  }, []);

  async function loadDashboardStats() {
    try {
      const dashboardStats = await fetchAllStats();
      setStats(dashboardStats);
    } catch (error) {
      logError("fetch_dashboard_stats", error);
    } finally {
      setLoading(false);
    }
  }

  const occupancyPercentage = calculatePercentage(
    stats.occupiedBeds,
    stats.totalBeds
  );

  const patientsTrend =
    stats.patientsYesterday > 0
      ? {
          value: calculateTrend(
            stats.totalPatients,
            stats.totalPatients - stats.patientsYesterday
          ),
          label: "novos ontem",
        }
      : undefined;

  const appointmentsTrend =
    stats.appointmentsLastWeek > 0
      ? {
          value: calculateTrend(
            stats.scheduledAppointments,
            stats.appointmentsLastWeek
          ),
          label: "vs semana",
        }
      : undefined;

  const admissionsTrend =
    stats.admissionsYesterday > 0
      ? { value: stats.admissionsYesterday, label: "novas ontem" }
      : undefined;

  return (
    <MainLayout title="Dashboard" subtitle="Visão geral do sistema hospitalar">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatsCard
          title="Total de Pacientes"
          value={loading ? "..." : stats.totalPatients}
          icon={<Users className="w-6 h-6" />}
          trend={patientsTrend}
          variant="primary"
        />
        <StatsCard
          title="Consultas Agendadas"
          value={loading ? "..." : stats.scheduledAppointments}
          icon={<Calendar className="w-6 h-6" />}
          trend={appointmentsTrend}
          variant="info"
        />
        <StatsCard
          title="Leitos Ocupados"
          value={loading ? "..." : `${stats.occupiedBeds}/${stats.totalBeds}`}
          subtitle={`${occupancyPercentage}% de ocupação`}
          icon={<BedDouble className="w-6 h-6" />}
          variant="warning"
        />
        <StatsCard
          title="Internações Ativas"
          value={loading ? "..." : stats.activeAdmissions}
          icon={<Activity className="w-6 h-6" />}
          trend={admissionsTrend}
          variant="success"
        />
      </div>

      <div className="mb-8">
        <QuickActions />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <RecentPatients />
        </div>
        <div>
          <BedOccupancy />
        </div>
      </div>

      <div className="mt-6">
        <UpcomingAppointments />
      </div>
    </MainLayout>
  );
}

export default Index;
