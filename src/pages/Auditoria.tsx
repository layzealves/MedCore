import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Shield, 
  Search, 
  Filter,
  User,
  Clock,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Eye,
  Activity,
  Lock,
  Loader2,
  FileText,
  Calendar,
  Users,
  Stethoscope,
  X,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { format, startOfDay, subDays, isAfter, isBefore, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

interface AuditLog {
  id: string;
  created_at: string;
  user_name: string;
  action: string;
  resource: string;
  resource_id: string | null;
  ip_address: string | null;
  status: string;
  log_type: string;
  details: string | null;
}

export default function Auditoria() {
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("todos");
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  
  // Filter states
  const [filterDateFrom, setFilterDateFrom] = useState("");
  const [filterDateTo, setFilterDateTo] = useState("");
  const [filterStatus, setFilterStatus] = useState("todos");
  const [filterLogType, setFilterLogType] = useState("todos");
  const [filterResource, setFilterResource] = useState("todos");

  // Check if any filter is active
  const hasActiveFilters = filterDateFrom || filterDateTo || filterStatus !== "todos" || filterLogType !== "todos" || filterResource !== "todos";

  const clearFilters = () => {
    setFilterDateFrom("");
    setFilterDateTo("");
    setFilterStatus("todos");
    setFilterLogType("todos");
    setFilterResource("todos");
  };

  // Fetch audit logs
  const { data: auditLogs = [], isLoading: isLoadingLogs } = useQuery({
    queryKey: ["audit_logs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("audit_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data as AuditLog[];
    },
  });

  // Fetch stats from real data
  const { data: stats } = useQuery({
    queryKey: ["audit_stats"],
    queryFn: async () => {
      const today = startOfDay(new Date()).toISOString();
      
      // Get today's logs count
      const { count: todayCount } = await supabase
        .from("audit_logs")
        .select("*", { count: "exact", head: true })
        .gte("created_at", today);

      // Get success rate
      const { count: successCount } = await supabase
        .from("audit_logs")
        .select("*", { count: "exact", head: true })
        .eq("status", "sucesso");

      const { count: totalCount } = await supabase
        .from("audit_logs")
        .select("*", { count: "exact", head: true });

      // Get security alerts (failed/blocked)
      const { count: alertsCount } = await supabase
        .from("audit_logs")
        .select("*", { count: "exact", head: true })
        .in("status", ["falha", "bloqueado"]);

      // Get blocked attempts
      const { count: blockedCount } = await supabase
        .from("audit_logs")
        .select("*", { count: "exact", head: true })
        .eq("status", "bloqueado");

      const successRate = totalCount && totalCount > 0 
        ? ((successCount || 0) / totalCount * 100).toFixed(1) 
        : "100.0";

      return {
        todayEvents: todayCount || 0,
        successRate,
        activeAlerts: alertsCount || 0,
        blockedAttempts: blockedCount || 0,
      };
    },
  });

  // Generate security alerts from recent problematic logs
  const securityAlerts = auditLogs
    .filter(log => log.status === "falha" || log.status === "bloqueado")
    .slice(0, 5)
    .map(log => ({
      id: log.id,
      titulo: log.status === "bloqueado" ? "Tentativa bloqueada" : "Ação com falha",
      descricao: `${log.action} em ${log.resource}`,
      data: format(new Date(log.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR }),
      severidade: log.status === "bloqueado" ? "alta" : "media",
    }));

  // Get unique resources for filter dropdown
  const uniqueResources = [...new Set(auditLogs.map(log => log.resource))];

  // Filter logs based on tab, search, and advanced filters
  const filteredLogs = auditLogs.filter(log => {
    const matchesSearch = searchTerm === "" || 
      log.user_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.resource.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesTab = activeTab === "todos" ||
      (activeTab === "seguranca" && (log.status === "falha" || log.status === "bloqueado" || log.log_type === "seguranca")) ||
      (activeTab === "acessos" && (log.log_type === "leitura" || log.log_type === "autenticacao")) ||
      (activeTab === "modificacoes" && log.log_type === "escrita");

    // Date filters
    const logDate = new Date(log.created_at);
    const matchesDateFrom = !filterDateFrom || isAfter(logDate, new Date(filterDateFrom));
    const matchesDateTo = !filterDateTo || isBefore(logDate, new Date(filterDateTo + "T23:59:59"));

    // Status filter
    const matchesStatus = filterStatus === "todos" || log.status === filterStatus;

    // Log type filter
    const matchesLogType = filterLogType === "todos" || log.log_type === filterLogType;

    // Resource filter
    const matchesResource = filterResource === "todos" || log.resource === filterResource;

    return matchesSearch && matchesTab && matchesDateFrom && matchesDateTo && matchesStatus && matchesLogType && matchesResource;
  });

  const getLogTypeIcon = (logType: string) => {
    switch (logType) {
      case "leitura": return <Eye className="w-4 h-4" />;
      case "escrita": return <FileText className="w-4 h-4" />;
      case "seguranca": return <Shield className="w-4 h-4" />;
      case "autenticacao": return <Lock className="w-4 h-4" />;
      default: return <Activity className="w-4 h-4" />;
    }
  };

  const getResourceIcon = (resource: string) => {
    if (resource.includes("Paciente")) return <Users className="w-4 h-4 text-primary" />;
    if (resource.includes("Prontuário")) return <FileText className="w-4 h-4 text-primary" />;
    if (resource.includes("Agendamento")) return <Calendar className="w-4 h-4 text-primary" />;
    if (resource.includes("Telemedicina")) return <Stethoscope className="w-4 h-4 text-primary" />;
    return <Activity className="w-4 h-4 text-primary" />;
  };

  return (
    <MainLayout title="Auditoria e Segurança" subtitle="Monitoramento de atividades e conformidade LGPD">
      <div className="space-y-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="card-elevated">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Activity className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">
                    {stats?.todayEvents ?? <Loader2 className="w-5 h-5 animate-spin" />}
                  </p>
                  <p className="text-sm text-muted-foreground">Eventos Hoje</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="card-elevated">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-success/10 flex items-center justify-center">
                  <CheckCircle className="w-6 h-6 text-success" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">
                    {stats?.successRate ?? "--"}%
                  </p>
                  <p className="text-sm text-muted-foreground">Taxa de Sucesso</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="card-elevated">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-warning/10 flex items-center justify-center">
                  <AlertTriangle className="w-6 h-6 text-warning" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">
                    {stats?.activeAlerts ?? 0}
                  </p>
                  <p className="text-sm text-muted-foreground">Alertas Ativos</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="card-elevated">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-destructive/10 flex items-center justify-center">
                  <XCircle className="w-6 h-6 text-destructive" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">
                    {stats?.blockedAttempts ?? 0}
                  </p>
                  <p className="text-sm text-muted-foreground">Tentativas Bloqueadas</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search and Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input 
                  placeholder="Buscar por usuário, ação ou recurso..." 
                  className="pl-10"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <Popover open={isFilterOpen} onOpenChange={setIsFilterOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="gap-2">
                    <Filter className="w-4 h-4" />
                    Filtros
                    {hasActiveFilters && (
                      <Badge variant="secondary" className="ml-1 h-5 w-5 p-0 flex items-center justify-center text-xs">
                        !
                      </Badge>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-80" align="end">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium text-sm text-foreground">Filtros Avançados</h4>
                      {hasActiveFilters && (
                        <Button variant="ghost" size="sm" onClick={clearFilters} className="h-auto p-1 text-xs">
                          <X className="w-3 h-3 mr-1" />
                          Limpar
                        </Button>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <Label className="text-xs">Data Início</Label>
                        <Input
                          type="date"
                          value={filterDateFrom}
                          onChange={(e) => setFilterDateFrom(e.target.value)}
                          className="h-9"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs">Data Fim</Label>
                        <Input
                          type="date"
                          value={filterDateTo}
                          onChange={(e) => setFilterDateTo(e.target.value)}
                          className="h-9"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-xs">Status</Label>
                      <Select value={filterStatus} onValueChange={setFilterStatus}>
                        <SelectTrigger className="h-9">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="todos">Todos</SelectItem>
                          <SelectItem value="sucesso">Sucesso</SelectItem>
                          <SelectItem value="falha">Falha</SelectItem>
                          <SelectItem value="bloqueado">Bloqueado</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-xs">Tipo de Log</Label>
                      <Select value={filterLogType} onValueChange={setFilterLogType}>
                        <SelectTrigger className="h-9">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="todos">Todos</SelectItem>
                          <SelectItem value="leitura">Leitura</SelectItem>
                          <SelectItem value="escrita">Escrita</SelectItem>
                          <SelectItem value="sistema">Sistema</SelectItem>
                          <SelectItem value="seguranca">Segurança</SelectItem>
                          <SelectItem value="autenticacao">Autenticação</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-xs">Recurso</Label>
                      <Select value={filterResource} onValueChange={setFilterResource}>
                        <SelectTrigger className="h-9">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="todos">Todos</SelectItem>
                          {uniqueResources.map((resource) => (
                            <SelectItem key={resource} value={resource}>
                              {resource}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <Button 
                      className="w-full" 
                      size="sm"
                      onClick={() => setIsFilterOpen(false)}
                    >
                      Aplicar Filtros
                    </Button>
                  </div>
                </PopoverContent>
              </Popover>
            </div>

            {/* Active filters display */}
            {hasActiveFilters && (
              <div className="flex flex-wrap gap-2 mt-4">
                {filterDateFrom && (
                  <Badge variant="secondary" className="gap-1">
                    De: {format(new Date(filterDateFrom), "dd/MM/yyyy")}
                    <X className="w-3 h-3 cursor-pointer" onClick={() => setFilterDateFrom("")} />
                  </Badge>
                )}
                {filterDateTo && (
                  <Badge variant="secondary" className="gap-1">
                    Até: {format(new Date(filterDateTo), "dd/MM/yyyy")}
                    <X className="w-3 h-3 cursor-pointer" onClick={() => setFilterDateTo("")} />
                  </Badge>
                )}
                {filterStatus !== "todos" && (
                  <Badge variant="secondary" className="gap-1 capitalize">
                    Status: {filterStatus}
                    <X className="w-3 h-3 cursor-pointer" onClick={() => setFilterStatus("todos")} />
                  </Badge>
                )}
                {filterLogType !== "todos" && (
                  <Badge variant="secondary" className="gap-1 capitalize">
                    Tipo: {filterLogType}
                    <X className="w-3 h-3 cursor-pointer" onClick={() => setFilterLogType("todos")} />
                  </Badge>
                )}
                {filterResource !== "todos" && (
                  <Badge variant="secondary" className="gap-1">
                    Recurso: {filterResource}
                    <X className="w-3 h-3 cursor-pointer" onClick={() => setFilterResource("todos")} />
                  </Badge>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Logs Table */}
          <Card className="card-elevated lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-primary" />
                Logs de Auditoria
              </CardTitle>
              <CardDescription>Registro detalhado de todas as atividades do sistema</CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="mb-4">
                  <TabsTrigger value="todos">Todos</TabsTrigger>
                  <TabsTrigger value="seguranca">Segurança</TabsTrigger>
                  <TabsTrigger value="acessos">Acessos</TabsTrigger>
                  <TabsTrigger value="modificacoes">Modificações</TabsTrigger>
                </TabsList>
                <TabsContent value={activeTab} className="space-y-4">
                  {isLoadingLogs ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="w-6 h-6 animate-spin text-primary" />
                    </div>
                  ) : filteredLogs.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <Shield className="w-12 h-12 mx-auto mb-3 opacity-50" />
                      <p>Nenhum log encontrado</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b border-border">
                            <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Data/Hora</th>
                            <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Usuário</th>
                            <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Ação</th>
                            <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Status</th>
                            <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Tipo</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredLogs.map((log) => (
                            <tr key={log.id} className="border-b border-border/50 hover:bg-muted/50 transition-colors">
                              <td className="py-3 px-4">
                                <div className="flex items-center gap-2">
                                  <Clock className="w-4 h-4 text-muted-foreground" />
                                  <div>
                                    <span className="text-sm text-foreground block">
                                      {format(new Date(log.created_at), "dd/MM/yyyy", { locale: ptBR })}
                                    </span>
                                    <span className="text-xs text-muted-foreground">
                                      {format(new Date(log.created_at), "HH:mm:ss", { locale: ptBR })}
                                    </span>
                                  </div>
                                </div>
                              </td>
                              <td className="py-3 px-4">
                                <div className="flex items-center gap-2">
                                  <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center">
                                    <User className="w-3 h-3 text-primary" />
                                  </div>
                                  <span className="text-sm font-medium text-foreground">{log.user_name}</span>
                                </div>
                              </td>
                              <td className="py-3 px-4">
                                <div>
                                  <p className="text-sm text-foreground">{log.action}</p>
                                  <div className="flex items-center gap-1 mt-0.5">
                                    {getResourceIcon(log.resource)}
                                    <p className="text-xs text-muted-foreground">{log.resource}</p>
                                  </div>
                                </div>
                              </td>
                              <td className="py-3 px-4">
                                <Badge 
                                  variant={
                                    log.status === "sucesso" ? "success" : 
                                    log.status === "falha" ? "destructive" : 
                                    "warning"
                                  }
                                >
                                  {log.status === "sucesso" && <CheckCircle className="w-3 h-3 mr-1" />}
                                  {log.status === "falha" && <XCircle className="w-3 h-3 mr-1" />}
                                  {log.status === "bloqueado" && <Lock className="w-3 h-3 mr-1" />}
                                  {log.status.charAt(0).toUpperCase() + log.status.slice(1)}
                                </Badge>
                              </td>
                              <td className="py-3 px-4">
                                <Badge variant="outline" className="gap-1">
                                  {getLogTypeIcon(log.log_type)}
                                  <span className="capitalize">{log.log_type}</span>
                                </Badge>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>

          {/* Security Alerts */}
          <Card className="card-elevated">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-warning" />
                Alertas de Segurança
              </CardTitle>
              <CardDescription>Eventos que requerem atenção</CardDescription>
            </CardHeader>
            <CardContent>
              {securityAlerts.length === 0 ? (
                <div className="text-center py-8">
                  <CheckCircle className="w-12 h-12 mx-auto text-success/50 mb-3" />
                  <p className="text-sm text-muted-foreground">Nenhum alerta de segurança</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {securityAlerts.map((alerta) => (
                    <div 
                      key={alerta.id} 
                      className={`p-4 rounded-lg border-l-4 ${
                        alerta.severidade === "alta" 
                          ? "bg-destructive/10 border-destructive" 
                          : alerta.severidade === "media"
                          ? "bg-warning/10 border-warning"
                          : "bg-muted border-muted-foreground"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <h4 className="font-medium text-foreground text-sm">{alerta.titulo}</h4>
                        <Badge 
                          variant={
                            alerta.severidade === "alta" ? "destructive" : 
                            alerta.severidade === "media" ? "warning" : 
                            "secondary"
                          }
                          className="text-xs"
                        >
                          {alerta.severidade.toUpperCase()}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">{alerta.descricao}</p>
                      <p className="text-xs text-muted-foreground mt-2">{alerta.data}</p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* LGPD Compliance */}
        <Card className="card-elevated">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lock className="w-5 h-5 text-primary" />
              Conformidade LGPD
            </CardTitle>
            <CardDescription>Status de conformidade com a Lei Geral de Proteção de Dados</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="p-4 rounded-lg bg-success/10 border border-success/20">
                <div className="flex items-center gap-3">
                  <CheckCircle className="w-8 h-8 text-success" />
                  <div>
                    <h4 className="font-medium text-foreground">Criptografia de Dados</h4>
                    <p className="text-sm text-muted-foreground">Dados sensíveis criptografados</p>
                  </div>
                </div>
              </div>
              <div className="p-4 rounded-lg bg-success/10 border border-success/20">
                <div className="flex items-center gap-3">
                  <CheckCircle className="w-8 h-8 text-success" />
                  <div>
                    <h4 className="font-medium text-foreground">Controle de Acesso</h4>
                    <p className="text-sm text-muted-foreground">Perfis e permissões ativos</p>
                  </div>
                </div>
              </div>
              <div className="p-4 rounded-lg bg-success/10 border border-success/20">
                <div className="flex items-center gap-3">
                  <CheckCircle className="w-8 h-8 text-success" />
                  <div>
                    <h4 className="font-medium text-foreground">Logs de Auditoria</h4>
                    <p className="text-sm text-muted-foreground">Registro completo de atividades</p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}