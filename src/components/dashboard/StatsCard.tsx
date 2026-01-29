import { ReactNode } from "react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

interface StatsCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: ReactNode;
  trend?: {
    value: number;
    label: string;
  };
  variant?: "default" | "primary" | "success" | "warning" | "info";
  className?: string;
}

export function StatsCard({
  title,
  value,
  subtitle,
  icon,
  trend,
  variant = "default",
  className,
}: StatsCardProps) {
  const getTrendIcon = () => {
    if (!trend) return null;
    if (trend.value > 0) return <TrendingUp className="w-3 h-3" />;
    if (trend.value < 0) return <TrendingDown className="w-3 h-3" />;
    return <Minus className="w-3 h-3" />;
  };

  const getTrendColor = () => {
    if (!trend) return "";
    if (trend.value > 0) return "text-success";
    if (trend.value < 0) return "text-destructive";
    return "text-muted-foreground";
  };

  const getIconBg = () => {
    switch (variant) {
      case "primary":
        return "bg-primary-light text-primary";
      case "success":
        return "bg-success-light text-success";
      case "warning":
        return "bg-warning-light text-warning";
      case "info":
        return "bg-info-light text-info";
      default:
        return "bg-secondary text-secondary-foreground";
    }
  };

  return (
    <Card variant="elevated" className={cn("p-6 animate-fade-in", className)}>
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <p className="text-3xl font-bold text-foreground">{value}</p>
          {subtitle && (
            <p className="text-sm text-muted-foreground">{subtitle}</p>
          )}
          {trend && (
            <div className={cn("flex items-center gap-1 text-sm font-medium", getTrendColor())}>
              {getTrendIcon()}
              <span>{Math.abs(trend.value)}%</span>
              <span className="text-muted-foreground font-normal">{trend.label}</span>
            </div>
          )}
        </div>
        <div className={cn("p-3 rounded-xl", getIconBg())}>
          {icon}
        </div>
      </div>
    </Card>
  );
}
