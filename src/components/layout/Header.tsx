import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Bell, Search, User, ChevronDown, X, Loader2, Settings, Shield, HelpCircle, LogOut } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { supabase } from "@/integrations/supabase/client";
import { format, isToday, differenceInMinutes, differenceInHours } from "date-fns";
import { logError } from "@/lib/errorHandler";
import { ptBR } from "date-fns/locale";

interface HeaderProps {
  title: string;
  subtitle?: string;
}

interface SearchResult {
  id: string;
  name: string;
  type: "patient" | "professional" | "medical_record";
  subtitle?: string;
}

interface Notification {
  id: string;
  type: "appointment" | "admission" | "patient";
  title: string;
  message: string;
  time: Date;
  variant: "warning-light" | "info-light" | "success-light" | "primary-light";
}

export function Header({ title, subtitle }: HeaderProps) {
  const navigate = useNavigate();
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [profile, setProfile] = useState<{ full_name: string; role: string; avatar_url: string | null } | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loadingNotifications, setLoadingNotifications] = useState(true);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    fetchProfile();
    fetchNotifications();
  }, []);

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      toast.success("Sessão encerrada com sucesso");
      navigate("/");
    } catch (error) {
      logError("logout", error);
      toast.error("Erro ao encerrar sessão");
    }
  };

  const fetchProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from("user_profiles")
        .select("full_name, role, avatar_url")
        .eq("id", user.id)
        .maybeSingle();
      
      if (data) {
        setProfile(data);
      }
    } catch (error) {
      logError("fetch_profile", error);
    }
  };

  const fetchNotifications = async () => {
    setLoadingNotifications(true);
    try {
      const notifs: Notification[] = [];
      const today = format(new Date(), "yyyy-MM-dd");
      const now = new Date();

      // Fetch today's upcoming appointments
      const { data: appointments } = await supabase
        .from("appointments")
        .select(`
          id,
          appointment_date,
          appointment_time,
          type,
          is_video,
          patient:patients!appointments_patient_id_fkey(name)
        `)
        .eq("appointment_date", today)
        .eq("status", "Agendado")
        .order("appointment_time", { ascending: true })
        .limit(5);

      appointments?.forEach((apt) => {
        const [hours, minutes] = apt.appointment_time.split(":");
        const aptTime = new Date();
        aptTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);
        
        const minDiff = differenceInMinutes(aptTime, now);
        
        if (minDiff > 0 && minDiff <= 60) {
          notifs.push({
            id: `apt-${apt.id}`,
            type: "appointment",
            title: apt.is_video ? "Teleconsulta" : apt.type,
            message: `${apt.patient?.name} em ${minDiff} minutos`,
            time: aptTime,
            variant: apt.is_video ? "info-light" : "primary-light",
          });
        }
      });

      // Fetch recent admissions (last 24 hours)
      const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
      const { data: admissions } = await supabase
        .from("admissions")
        .select(`
          id,
          created_at,
          condition,
          patient:patients!admissions_patient_id_fkey(name),
          bed:beds!admissions_bed_id_fkey(bed_number, department)
        `)
        .gte("created_at", yesterday)
        .eq("status", "Ativa")
        .order("created_at", { ascending: false })
        .limit(3);

      admissions?.forEach((adm) => {
        const admTime = new Date(adm.created_at);
        notifs.push({
          id: `adm-${adm.id}`,
          type: "admission",
          title: adm.condition === "Crítico" ? "Internação Urgente" : "Nova Internação",
          message: `${adm.patient?.name} - ${adm.bed?.department} (Leito ${adm.bed?.bed_number})`,
          time: admTime,
          variant: adm.condition === "Crítico" ? "warning-light" : "success-light",
        });
      });

      // Fetch recently registered patients (last 24 hours)
      const { data: recentPatients } = await supabase
        .from("patients")
        .select("id, name, created_at")
        .gte("created_at", yesterday)
        .order("created_at", { ascending: false })
        .limit(3);

      recentPatients?.forEach((patient) => {
        const patientTime = new Date(patient.created_at);
        notifs.push({
          id: `patient-${patient.id}`,
          type: "patient",
          title: "Novo Paciente",
          message: `${patient.name} foi cadastrado`,
          time: patientTime,
          variant: "success-light",
        });
      });

      // Sort by time (most recent first)
      notifs.sort((a, b) => b.time.getTime() - a.time.getTime());
      
      setNotifications(notifs.slice(0, 10));
    } catch (error) {
      logError("fetch_notifications", error);
    } finally {
      setLoadingNotifications(false);
    }
  };

  const formatNotificationTime = (time: Date) => {
    const now = new Date();
    const minDiff = differenceInMinutes(now, time);
    const hoursDiff = differenceInHours(now, time);

    if (minDiff < 1) return "Agora";
    if (minDiff < 60) return `${minDiff} min`;
    if (hoursDiff < 24) return `${hoursDiff}h`;
    return format(time, "dd/MM", { locale: ptBR });
  };

  const performSearch = async (query: string) => {
    setSearching(true);
    try {
      const results: SearchResult[] = [];

      // Search patients
      const { data: patients } = await supabase
        .from("patients")
        .select("id, name, cpf")
        .or(`name.ilike.%${query}%,cpf.ilike.%${query}%`)
        .limit(5);

      patients?.forEach((p) => {
        results.push({
          id: p.id,
          name: p.name,
          type: "patient",
          subtitle: p.cpf,
        });
      });

      // Search professionals
      const { data: professionals } = await supabase
        .from("professionals")
        .select("id, name, specialty")
        .or(`name.ilike.%${query}%,specialty.ilike.%${query}%`)
        .limit(5);

      professionals?.forEach((p) => {
        results.push({
          id: p.id,
          name: p.name,
          type: "professional",
          subtitle: p.specialty,
        });
      });

      // Search medical records by record number
      const { data: records } = await supabase
        .from("medical_records")
        .select("id, record_number, patient:patients!medical_records_patient_id_fkey(name)")
        .ilike("record_number", `%${query}%`)
        .limit(5);

      records?.forEach((r) => {
        results.push({
          id: r.id,
          name: r.record_number,
          type: "medical_record",
          subtitle: r.patient?.name,
        });
      });

      setSearchResults(results);
    } catch (error) {
      logError("search", error);
    } finally {
      setSearching(false);
    }
  };

  const handleResultClick = (result: SearchResult) => {
    setSearchOpen(false);
    setSearchQuery("");
    
    switch (result.type) {
      case "patient":
        navigate("/pacientes");
        break;
      case "professional":
        navigate("/profissionais");
        break;
      case "medical_record":
        navigate("/prontuarios");
        break;
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case "patient":
        return "Paciente";
      case "professional":
        return "Profissional";
      case "medical_record":
        return "Prontuário";
      default:
        return type;
    }
  };

  const getTypeVariant = (type: string) => {
    switch (type) {
      case "patient":
        return "primary-light" as const;
      case "professional":
        return "info-light" as const;
      case "medical_record":
        return "success-light" as const;
      default:
        return "secondary" as const;
    }
  };

  return (
    <header className="sticky top-0 z-30 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-16 items-center justify-between px-4 lg:px-8">
        {/* Title */}
        <div className="pl-12 lg:pl-0">
          <h1 className="text-xl font-bold text-foreground">{title}</h1>
          {subtitle && (
            <p className="text-sm text-muted-foreground">{subtitle}</p>
          )}
        </div>

        {/* Search Bar */}
        <div className="hidden md:flex flex-1 max-w-md mx-8">
          <Popover open={searchOpen} onOpenChange={setSearchOpen}>
            <PopoverTrigger asChild>
              <div className="relative w-full">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Buscar pacientes, prontuários..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    if (e.target.value.length >= 1) {
                      setSearchOpen(true);
                    }
                  }}
                  onFocus={() => {
                    if (searchQuery.length >= 1) {
                      setSearchOpen(true);
                    }
                  }}
                  className="w-full h-10 pl-10 pr-10 rounded-lg border border-input bg-secondary/50 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-all"
                />
                {searchQuery && (
                  <button
                    onClick={() => {
                      setSearchQuery("");
                      setSearchResults([]);
                    }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            </PopoverTrigger>
            <PopoverContent className="w-[400px] p-0" align="start">
              <div className="p-2">
                {searching ? (
                  <div className="flex items-center justify-center py-6">
                    <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                  </div>
                ) : searchResults.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-6">
                    Nenhum resultado encontrado.
                  </p>
                ) : (
                  <div className="space-y-1">
                    {searchResults.map((result) => (
                      <button
                        key={`${result.type}-${result.id}`}
                        onClick={() => handleResultClick(result)}
                        className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-muted text-left transition-colors"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">
                            {result.name}
                          </p>
                          {result.subtitle && (
                            <p className="text-xs text-muted-foreground truncate">
                              {result.subtitle}
                            </p>
                          )}
                        </div>
                        <Badge variant={getTypeVariant(result.type)} className="text-[10px]">
                          {getTypeLabel(result.type)}
                        </Badge>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </PopoverContent>
          </Popover>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-2">
          {/* Notifications */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="relative">
                <Bell className="w-5 h-5" />
                {notifications.length > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-accent text-accent-foreground text-[10px] font-bold flex items-center justify-center">
                    {notifications.length > 9 ? "9+" : notifications.length}
                  </span>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80">
              <DropdownMenuLabel className="flex items-center justify-between">
                <span>Notificações</span>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-6 text-xs"
                  onClick={() => fetchNotifications()}
                >
                  Atualizar
                </Button>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              {loadingNotifications ? (
                <div className="flex items-center justify-center py-6">
                  <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                </div>
              ) : notifications.length === 0 ? (
                <div className="py-6 text-center text-sm text-muted-foreground">
                  Nenhuma notificação
                </div>
              ) : (
                notifications.map((notif) => (
                  <DropdownMenuItem 
                    key={notif.id} 
                    className="flex flex-col items-start gap-1 py-3 cursor-pointer"
                    onClick={() => {
                      if (notif.type === "appointment") navigate("/agendamentos");
                      else if (notif.type === "admission") navigate("/leitos");
                      else if (notif.type === "patient") navigate("/pacientes");
                    }}
                  >
                    <div className="flex items-center gap-2">
                      <Badge variant={notif.variant}>{notif.title}</Badge>
                      <span className="text-xs text-muted-foreground">
                        {formatNotificationTime(notif.time)}
                      </span>
                    </div>
                    <p className="text-sm">{notif.message}</p>
                  </DropdownMenuItem>
                ))
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* User Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="gap-2 pl-2">
                <div className="w-8 h-8 rounded-full gradient-primary flex items-center justify-center overflow-hidden">
                  {profile?.avatar_url ? (
                    <img src={profile.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                  ) : (
                    <User className="w-4 h-4 text-primary-foreground" />
                  )}
                </div>
                <div className="hidden lg:block text-left">
                  <p className="text-sm font-medium">{profile?.full_name || "Usuário"}</p>
                  <p className="text-xs text-muted-foreground">{profile?.role || "Cargo"}</p>
                </div>
                <ChevronDown className="w-4 h-4 text-muted-foreground hidden lg:block" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>Minha Conta</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => navigate("/configuracoes?tab=perfil")}>
                <User className="w-4 h-4 mr-2" />
                Perfil
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate("/configuracoes?tab=geral")}>
                <Settings className="w-4 h-4 mr-2" />
                Configurações
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate("/ajuda")}>
                <HelpCircle className="w-4 h-4 mr-2" />
                Ajuda
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-destructive" onClick={handleLogout}>
                <LogOut className="w-4 h-4 mr-2" />
                Sair
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
