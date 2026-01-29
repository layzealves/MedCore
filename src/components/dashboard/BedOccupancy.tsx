import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { logError } from "@/lib/errorHandler";

interface DepartmentOccupancy {
  name: string;
  occupied: number;
  total: number;
}

interface Bed {
  department: string;
  status: string;
}

const OCCUPANCY_THRESHOLDS = {
  HIGH: 80,
  CRITICAL: 90,
} as const;

const CARD_TITLE = "Ocupação de Leitos";
const ANIMATION_DELAY = "200ms";

function calculateOccupancyPercentage(occupied: number, total: number): number {
  return total > 0 ? Math.round((occupied / total) * 100) : 0;
}

function getOccupancyLevel(percentage: number): "critical" | "high" | "normal" {
  if (percentage >= OCCUPANCY_THRESHOLDS.CRITICAL) return "critical";
  if (percentage >= OCCUPANCY_THRESHOLDS.HIGH) return "high";
  return "normal";
}

function getProgressColor(level: "critical" | "high" | "normal"): string {
  const colors = {
    critical: "bg-destructive",
    high: "bg-warning",
    normal: "bg-success",
  };
  return colors[level];
}

function getTextColor(level: "critical" | "high" | "normal"): string {
  const colors = {
    critical: "text-destructive font-medium",
    high: "text-warning font-medium",
    normal: "text-success font-medium",
  };
  return colors[level];
}

function groupBedsByDepartment(beds: Bed[]): DepartmentOccupancy[] {
  const departmentMap = new Map<string, { occupied: number; total: number }>();

  beds.forEach((bed) => {
    const existing = departmentMap.get(bed.department) || { occupied: 0, total: 0 };
    existing.total += 1;
    if (bed.status === "Ocupado") {
      existing.occupied += 1;
    }
    departmentMap.set(bed.department, existing);
  });

  return Array.from(departmentMap.entries())
    .map(([name, data]) => ({ name, ...data }))
    .sort((a, b) => {
      const percentageA = calculateOccupancyPercentage(a.occupied, a.total);
      const percentageB = calculateOccupancyPercentage(b.occupied, b.total);
      return percentageB - percentageA;
    });
}

function LoadingSkeleton() {
  return (
    <Card variant="elevated" className="animate-slide-up" style={{ animationDelay: ANIMATION_DELAY }}>
      <CardHeader>
        <CardTitle className="text-lg">{CARD_TITLE}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="space-y-2">
            <div className="flex justify-between">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-16" />
            </div>
            <Skeleton className="h-2.5 w-full" />
            <div className="flex justify-between">
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-3 w-20" />
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function EmptyState() {
  return (
    <Card variant="elevated" className="animate-slide-up" style={{ animationDelay: ANIMATION_DELAY }}>
      <CardHeader>
        <CardTitle className="text-lg">{CARD_TITLE}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground text-center py-8">
          Nenhum leito cadastrado.
        </p>
      </CardContent>
    </Card>
  );
}

interface DepartmentItemProps {
  department: DepartmentOccupancy;
}

function DepartmentItem({ department }: DepartmentItemProps) {
  const percentage = calculateOccupancyPercentage(department.occupied, department.total);
  const level = getOccupancyLevel(percentage);
  const available = department.total - department.occupied;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium text-foreground">{department.name}</span>
        <span className="text-muted-foreground">
          {department.occupied}/{department.total} leitos
        </span>
      </div>
      <div className="relative">
        <Progress
          value={percentage}
          className="h-2.5"
          indicatorClassName={getProgressColor(level)}
        />
      </div>
      <div className="flex items-center justify-between text-xs">
        <span className={getTextColor(level)}>{percentage}% ocupado</span>
        <span className="text-muted-foreground">{available} disponíveis</span>
      </div>
    </div>
  );
}

export function BedOccupancy() {
  const [departments, setDepartments] = useState<DepartmentOccupancy[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchBedOccupancy();
  }, []);

  async function fetchBedOccupancy() {
    try {
      const { data: beds, error } = await supabase
        .from("beds")
        .select("department, status");

      if (error) throw error;

      const departmentList = groupBedsByDepartment(beds || []);
      setDepartments(departmentList);
    } catch (error) {
      logError("fetch_bed_occupancy", error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return <LoadingSkeleton />;
  }

  if (departments.length === 0) {
    return <EmptyState />;
  }

  return (
    <Card variant="elevated" className="animate-slide-up" style={{ animationDelay: ANIMATION_DELAY }}>
      <CardHeader>
        <CardTitle className="text-lg">{CARD_TITLE}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        {departments.map((dept) => (
          <DepartmentItem key={dept.name} department={dept} />
        ))}
      </CardContent>
    </Card>
  );
}
