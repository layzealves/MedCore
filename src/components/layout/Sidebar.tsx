import { useState, useEffect, useCallback } from "react";
import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { logError } from "@/lib/errorHandler";
import {
  LayoutDashboard,
  Users,
  UserCog,
  Calendar,
  BedDouble,
  FileText,
  Video,
  Shield,
  Settings,
  ChevronLeft,
  ChevronRight,
  Stethoscope,
  Menu,
  X,
  LucideIcon,
} from "lucide-react";

interface NavItem {
  title: string;
  href: string;
  icon: LucideIcon;
  badgeKey?: string;
}

const NAV_ITEMS: NavItem[] = [
  { title: "Dashboard", href: "/", icon: LayoutDashboard },
  { title: "Pacientes", href: "/pacientes", icon: Users },
  { title: "Profissionais", href: "/profissionais", icon: UserCog },
  { title: "Agendamentos", href: "/agendamentos", icon: Calendar, badgeKey: "appointments" },
  { title: "Leitos", href: "/leitos", icon: BedDouble },
  { title: "Prontuários", href: "/prontuarios", icon: FileText },
  { title: "Telemedicina", href: "/telemedicina", icon: Video },
  { title: "Auditoria", href: "/auditoria", icon: Shield },
  { title: "Configurações", href: "/configuracoes", icon: Settings },
];

const MAX_BADGE_VALUE = 99;
const SIDEBAR_CHANNEL = "sidebar-badges";
const APP_VERSION = "v1.0.0";

function formatBadgeValue(count: number | undefined): string | null {
  if (!count || count === 0) return null;
  return count > MAX_BADGE_VALUE ? "99+" : count.toString();
}

function getTodayDateString(): string {
  return new Date().toISOString().split("T")[0];
}

interface NavLinkItemProps {
  item: NavItem;
  isActive: boolean;
  badgeValue: string | null;
  collapsed: boolean;
  onNavigate: () => void;
}

function NavLinkItem({ item, isActive, badgeValue, collapsed, onNavigate }: NavLinkItemProps) {
  const Icon = item.icon;

  return (
    <Link
      to={item.href}
      onClick={onNavigate}
      className={cn(
        "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 group",
        isActive
          ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-sm"
          : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
      )}
    >
      <Icon
        className={cn(
          "w-5 h-5 flex-shrink-0 transition-transform duration-200",
          !isActive && "group-hover:scale-110"
        )}
      />
      {!collapsed && <span className="flex-1 animate-fade-in">{item.title}</span>}
      {!collapsed && badgeValue && (
        <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-accent text-accent-foreground animate-fade-in">
          {badgeValue}
        </span>
      )}
    </Link>
  );
}

interface LogoProps {
  collapsed: boolean;
}

function Logo({ collapsed }: LogoProps) {
  return (
    <div className="flex items-center h-16 px-4 border-b border-sidebar-border">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center shadow-primary">
          <Stethoscope className="w-5 h-5 text-primary-foreground" />
        </div>
        {!collapsed && (
          <div className="animate-fade-in">
            <h1 className="text-lg font-bold text-sidebar-foreground">SGHSS</h1>
            <p className="text-xs text-sidebar-muted">Gestão Hospitalar</p>
          </div>
        )}
      </div>
    </div>
  );
}

interface StatusIndicatorProps {
  collapsed: boolean;
}

function StatusIndicator({ collapsed }: StatusIndicatorProps) {
  return (
    <div className={cn("px-4 py-3 border-t border-sidebar-border", collapsed && "px-2")}>
      <div
        className={cn(
          "flex items-center gap-3 p-3 rounded-lg bg-sidebar-accent",
          collapsed && "justify-center"
        )}
      >
        <div className="w-2.5 h-2.5 rounded-full bg-success animate-pulse-soft" />
        {!collapsed && (
          <div className="animate-fade-in">
            <p className="text-xs font-medium text-sidebar-foreground">Sistema Online</p>
            <p className="text-xs text-sidebar-muted">{APP_VERSION}</p>
          </div>
        )}
      </div>
    </div>
  );
}

interface CollapseButtonProps {
  collapsed: boolean;
  onClick: () => void;
}

function CollapseButton({ collapsed, onClick }: CollapseButtonProps) {
  const Icon = collapsed ? ChevronRight : ChevronLeft;

  return (
    <Button
      variant="ghost"
      size="icon-sm"
      className="absolute -right-3 top-20 hidden lg:flex w-6 h-6 rounded-full border border-sidebar-border bg-sidebar shadow-sm hover:bg-sidebar-accent"
      onClick={onClick}
    >
      <Icon className="w-3 h-3 text-sidebar-foreground" />
    </Button>
  );
}

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [badges, setBadges] = useState<Record<string, number>>({});
  const location = useLocation();

  const fetchBadges = useCallback(async () => {
    try {
      const today = getTodayDateString();
      const { count, error } = await supabase
        .from("appointments")
        .select("*", { count: "exact", head: true })
        .eq("status", "Agendado")
        .gte("appointment_date", today);

      if (error) throw error;

      setBadges({ appointments: count || 0 });
    } catch (error) {
      logError("fetch_sidebar_badges", error);
    }
  }, []);

  useEffect(() => {
    fetchBadges();

    const channel = supabase
      .channel(SIDEBAR_CHANNEL)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "appointments" },
        fetchBadges
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchBadges]);

  function closeMobileMenu() {
    setMobileOpen(false);
  }

  function toggleCollapsed() {
    setCollapsed((prev) => !prev);
  }

  function toggleMobileMenu() {
    setMobileOpen((prev) => !prev);
  }

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        className="fixed top-4 left-4 z-50 lg:hidden"
        onClick={toggleMobileMenu}
      >
        {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </Button>

      {mobileOpen && (
        <div
          className="fixed inset-0 bg-foreground/20 backdrop-blur-sm z-40 lg:hidden"
          onClick={closeMobileMenu}
        />
      )}

      <aside
        className={cn(
          "fixed top-0 left-0 z-40 h-screen gradient-sidebar border-r border-sidebar-border transition-all duration-300 flex flex-col",
          collapsed ? "w-20" : "w-64",
          mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        <Logo collapsed={collapsed} />

        <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
          {NAV_ITEMS.map((item) => (
            <NavLinkItem
              key={item.href}
              item={item}
              isActive={location.pathname === item.href}
              badgeValue={formatBadgeValue(badges[item.badgeKey || ""])}
              collapsed={collapsed}
              onNavigate={closeMobileMenu}
            />
          ))}
        </nav>

        <StatusIndicator collapsed={collapsed} />
        <CollapseButton collapsed={collapsed} onClick={toggleCollapsed} />
      </aside>

      <div
        className={cn(
          "transition-all duration-300 hidden lg:block",
          collapsed ? "w-20" : "w-64"
        )}
      />
    </>
  );
}
