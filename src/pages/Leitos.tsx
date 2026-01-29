import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  BedDouble,
  AlertTriangle,
  UserPlus,
  ArrowRight,
  Activity,
  Clock,
  Filter,
  Loader2,
  X,
  User,
  Calendar,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format, differenceInDays } from "date-fns";
import { ptBR } from "date-fns/locale";

const conditions = ["Crítico", "Estável", "Recuperação"];
const departments = ["UTI", "Enfermaria A", "Enfermaria B", "Pediatria", "Maternidade", "Centro Cirúrgico"];

interface Bed {
  id: string;
  bed_number: string;
  department: string;
  status: string;
}

interface Admission {
  id: string;
  patient_id: string;
  bed_id: string;
  professional_id: string | null;
  admission_date: string;
  discharge_date: string | null;
  condition: string;
  diagnosis: string | null;
  notes: string | null;
  status: string;
  patient: { name: string } | null;
  professional: { name: string } | null;
}

interface BedWithAdmission extends Bed {
  admission?: Admission | null;
}

const getConditionVariant = (condition: string | null) => {
  switch (condition) {
    case "Crítico":
      return "destructive-light";
    case "Estável":
      return "success-light";
    case "Recuperação":
      return "info-light";
    default:
      return "secondary";
  }
};

const getBedStatusVariant = (status: string) => {
  switch (status) {
    case "Ocupado":
      return "primary-light";
    case "Disponível":
      return "success-light";
    case "Manutenção":
      return "warning-light";
    default:
      return "secondary";
  }
};

export default function Leitos() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [selectedBed, setSelectedBed] = useState<BedWithAdmission | null>(null);
  const [departmentFilter, setDepartmentFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [formData, setFormData] = useState({
    patient_id: "",
    bed_id: "",
    professional_id: "",
    condition: "Estável",
    diagnosis: "",
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

  // Fetch beds
  const { data: beds = [], isLoading: isLoadingBeds } = useQuery({
    queryKey: ["beds"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("beds")
        .select("*")
        .order("bed_number");
      if (error) throw error;
      return data as Bed[];
    },
  });

  // Fetch active admissions
  const { data: admissions = [] } = useQuery({
    queryKey: ["admissions", "active"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("admissions")
        .select(`
          *,
          patient:patients(name),
          professional:professionals(name)
        `)
        .eq("status", "Ativa");
      if (error) throw error;
      return data as Admission[];
    },
  });

  // Create admission mutation
  const createAdmission = useMutation({
    mutationFn: async (data: typeof formData) => {
      // First create the admission
      const { error: admissionError } = await supabase.from("admissions").insert({
        patient_id: data.patient_id,
        bed_id: data.bed_id,
        professional_id: data.professional_id || null,
        condition: data.condition,
        diagnosis: data.diagnosis || null,
        notes: data.notes || null,
      });
      if (admissionError) throw admissionError;

      // Then update bed status
      const { error: bedError } = await supabase
        .from("beds")
        .update({ status: "Ocupado" })
        .eq("id", data.bed_id);
      if (bedError) throw bedError;
    },
    onSuccess: () => {
      toast.success("Internação realizada com sucesso!");
      queryClient.invalidateQueries({ queryKey: ["beds"] });
      queryClient.invalidateQueries({ queryKey: ["admissions"] });
      setIsDialogOpen(false);
      resetForm();
    },
    onError: (error) => {
      toast.error("Erro ao realizar internação: " + error.message);
    },
  });

  // Discharge patient mutation
  const dischargePatient = useMutation({
    mutationFn: async ({ admissionId, bedId }: { admissionId: string; bedId: string }) => {
      // Update admission
      const { error: admissionError } = await supabase
        .from("admissions")
        .update({ 
          status: "Alta",
          discharge_date: format(new Date(), "yyyy-MM-dd")
        })
        .eq("id", admissionId);
      if (admissionError) throw admissionError;

      // Update bed status
      const { error: bedError } = await supabase
        .from("beds")
        .update({ status: "Disponível" })
        .eq("id", bedId);
      if (bedError) throw bedError;
    },
    onSuccess: () => {
      toast.success("Alta realizada com sucesso!");
      queryClient.invalidateQueries({ queryKey: ["beds"] });
      queryClient.invalidateQueries({ queryKey: ["admissions"] });
      setIsDetailsOpen(false);
      setSelectedBed(null);
    },
    onError: (error) => {
      toast.error("Erro ao dar alta: " + error.message);
    },
  });

  const resetForm = () => {
    setFormData({
      patient_id: "",
      bed_id: "",
      professional_id: "",
      condition: "Estável",
      diagnosis: "",
      notes: "",
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.patient_id || !formData.bed_id) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }
    createAdmission.mutate(formData);
  };

  const clearFilters = () => {
    setDepartmentFilter("all");
    setStatusFilter("all");
  };

  const hasActiveFilters = departmentFilter !== "all" || statusFilter !== "all";

  // Combine beds with admissions
  const bedsWithAdmissions: BedWithAdmission[] = beds.map((bed) => {
    const admission = admissions.find((a) => a.bed_id === bed.id);
    return { ...bed, admission };
  });

  // Filter beds
  const filteredBeds = bedsWithAdmissions.filter((bed) => {
    if (departmentFilter !== "all" && bed.department !== departmentFilter) return false;
    if (statusFilter !== "all" && bed.status !== statusFilter) return false;
    return true;
  });

  // Available beds for admission
  const availableBeds = beds.filter((bed) => bed.status === "Disponível");

  // Calculate stats
  const totalBeds = beds.length;
  const occupiedBeds = beds.filter((b) => b.status === "Ocupado").length;
  const availableBedCount = beds.filter((b) => b.status === "Disponível").length;
  const criticalPatients = admissions.filter((a) => a.condition === "Crítico").length;

  // Calculate department stats
  const departmentStats = departments.map((dept) => {
    const deptBeds = bedsWithAdmissions.filter((b) => b.department === dept);
    const total = deptBeds.length;
    const occupied = deptBeds.filter((b) => b.status === "Ocupado").length;
    const available = deptBeds.filter((b) => b.status === "Disponível").length;
    const critical = deptBeds.filter((b) => b.admission?.condition === "Crítico").length;
    const percentage = total > 0 ? Math.round((occupied / total) * 100) : 0;
    
    let status = "Normal";
    if (percentage >= 90) status = "Alerta";
    else if (percentage >= 70) status = "Atenção";
    
    return { name: dept, total, occupied, available, critical, status, percentage };
  }).filter((d) => d.total > 0);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Alerta":
        return "destructive";
      case "Atenção":
        return "warning";
      default:
        return "success";
    }
  };

  return (
    <MainLayout
      title="Gestão de Leitos"
      subtitle="Controle de ocupação e disponibilidade"
    >
      {/* Stats Overview */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card variant="elevated" className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <BedDouble className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{totalBeds}</p>
              <p className="text-sm text-muted-foreground">Total de Leitos</p>
            </div>
          </div>
        </Card>
        <Card variant="elevated" className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-info/10">
              <Activity className="w-5 h-5 text-info" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{occupiedBeds}</p>
              <p className="text-sm text-muted-foreground">Ocupados</p>
            </div>
          </div>
        </Card>
        <Card variant="elevated" className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-success/10">
              <BedDouble className="w-5 h-5 text-success" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{availableBedCount}</p>
              <p className="text-sm text-muted-foreground">Disponíveis</p>
            </div>
          </div>
        </Card>
        <Card variant="elevated" className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-destructive/10">
              <AlertTriangle className="w-5 h-5 text-destructive" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{criticalPatients}</p>
              <p className="text-sm text-muted-foreground">Críticos</p>
            </div>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Departments Overview */}
        <Card variant="elevated" className="lg:col-span-1">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Por Departamento</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {departmentStats.map((dept) => (
              <div key={dept.name} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-foreground">{dept.name}</span>
                    <Badge variant={getStatusColor(dept.status) as any}>
                      {dept.status}
                    </Badge>
                  </div>
                  <span className="text-sm text-muted-foreground">
                    {dept.occupied}/{dept.total}
                  </span>
                </div>
                <Progress
                  value={dept.percentage}
                  className="h-2"
                  indicatorClassName={
                    dept.percentage >= 90
                      ? "bg-destructive"
                      : dept.percentage >= 70
                      ? "bg-warning"
                      : "bg-success"
                  }
                />
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>{dept.available} disponíveis</span>
                  {dept.critical > 0 && (
                    <span className="text-destructive font-medium">
                      {dept.critical} crítico(s)
                    </span>
                  )}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Beds List */}
        <Card variant="elevated" className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Leitos</CardTitle>
            <div className="flex gap-2">
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-1">
                    <Filter className="w-4 h-4" />
                    Filtrar
                    {hasActiveFilters && (
                      <Badge variant="secondary" className="ml-1 h-5 w-5 p-0 flex items-center justify-center text-xs">
                        {[departmentFilter, statusFilter].filter(v => v !== "all").length}
                      </Badge>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-72" align="end">
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
                      <Label className="text-xs">Departamento</Label>
                      <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
                        <SelectTrigger>
                          <SelectValue placeholder="Todos" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Todos</SelectItem>
                          {departments.map((dept) => (
                            <SelectItem key={dept} value={dept}>
                              {dept}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-xs">Status</Label>
                      <Select value={statusFilter} onValueChange={setStatusFilter}>
                        <SelectTrigger>
                          <SelectValue placeholder="Todos" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Todos</SelectItem>
                          <SelectItem value="Disponível">Disponível</SelectItem>
                          <SelectItem value="Ocupado">Ocupado</SelectItem>
                          <SelectItem value="Manutenção">Manutenção</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </PopoverContent>
              </Popover>

              <Button 
                variant="default" 
                size="sm" 
                className="gap-1"
                onClick={() => setIsDialogOpen(true)}
              >
                <UserPlus className="w-4 h-4" />
                Internar
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {isLoadingBeds ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {filteredBeds.map((bed) => {
                  const days = bed.admission 
                    ? differenceInDays(new Date(), new Date(bed.admission.admission_date))
                    : 0;

                  return (
                    <div
                      key={bed.id}
                      className={`p-4 rounded-xl border transition-all hover:shadow-md ${
                        bed.status === "Disponível"
                          ? "border-success/30 bg-success/5"
                          : bed.status === "Manutenção"
                          ? "border-warning/30 bg-warning/5"
                          : "border-border"
                      }`}
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <p className="font-semibold text-foreground">{bed.bed_number}</p>
                          <p className="text-xs text-muted-foreground">{bed.department}</p>
                        </div>
                        <Badge variant={getBedStatusVariant(bed.status)}>
                          {bed.status}
                        </Badge>
                      </div>

                      {bed.admission ? (
                        <div className="space-y-2">
                          <p className="text-sm font-medium text-foreground">
                            {bed.admission.patient?.name}
                          </p>
                          <div className="flex items-center justify-between">
                            <Badge variant={getConditionVariant(bed.admission.condition)}>
                              {bed.admission.condition}
                            </Badge>
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                              <Clock className="w-3 h-3" />
                              {days} dias
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="w-full gap-1 mt-2"
                            onClick={() => {
                              setSelectedBed(bed);
                              setIsDetailsOpen(true);
                            }}
                          >
                            Ver detalhes
                            <ArrowRight className="w-4 h-4" />
                          </Button>
                        </div>
                      ) : (
                        <div className="text-center py-2">
                          <p className="text-sm text-muted-foreground mb-2">
                            {bed.status === "Manutenção" ? "Em manutenção" : "Leito disponível"}
                          </p>
                          {bed.status === "Disponível" && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="w-full"
                              onClick={() => {
                                setFormData({ ...formData, bed_id: bed.id });
                                setIsDialogOpen(true);
                              }}
                            >
                              Internar Paciente
                            </Button>
                          )}
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

      {/* Admission Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Nova Internação</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="patient">Paciente *</Label>
              <Select
                value={formData.patient_id}
                onValueChange={(value) => setFormData({ ...formData, patient_id: value })}
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
              <Label htmlFor="bed">Leito *</Label>
              <Select
                value={formData.bed_id}
                onValueChange={(value) => setFormData({ ...formData, bed_id: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o leito" />
                </SelectTrigger>
                <SelectContent>
                  {availableBeds.map((bed) => (
                    <SelectItem key={bed.id} value={bed.id}>
                      {bed.bed_number} - {bed.department}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="professional">Médico Responsável</Label>
                <Select
                  value={formData.professional_id}
                  onValueChange={(value) => setFormData({ ...formData, professional_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {professionals.map((prof) => (
                      <SelectItem key={prof.id} value={prof.id}>
                        {prof.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="condition">Condição</Label>
                <Select
                  value={formData.condition}
                  onValueChange={(value) => setFormData({ ...formData, condition: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {conditions.map((cond) => (
                      <SelectItem key={cond} value={cond}>
                        {cond}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="diagnosis">Diagnóstico</Label>
              <Textarea
                id="diagnosis"
                placeholder="Diagnóstico do paciente..."
                value={formData.diagnosis}
                onChange={(e) => setFormData({ ...formData, diagnosis: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Observações</Label>
              <Textarea
                id="notes"
                placeholder="Observações adicionais..."
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              />
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsDialogOpen(false);
                  resetForm();
                }}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={createAdmission.isPending}>
                {createAdmission.isPending && (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                )}
                Internar
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Details Dialog */}
      <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Detalhes da Internação</DialogTitle>
          </DialogHeader>
          {selectedBed?.admission && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-4 rounded-lg bg-muted/50">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <User className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <p className="font-semibold text-foreground">
                    {selectedBed.admission.patient?.name}
                  </p>
                  <p className="text-sm text-muted-foreground">Paciente</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <BedDouble className="w-3 h-3" /> Leito
                  </p>
                  <p className="font-medium text-foreground">{selectedBed.bed_number}</p>
                  <p className="text-xs text-muted-foreground">{selectedBed.department}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Calendar className="w-3 h-3" /> Data de Internação
                  </p>
                  <p className="font-medium text-foreground">
                    {format(new Date(selectedBed.admission.admission_date + "T12:00:00"), "dd/MM/yyyy", { locale: ptBR })}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {differenceInDays(new Date(), new Date(selectedBed.admission.admission_date))} dias internado
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Médico Responsável</p>
                  <p className="font-medium text-foreground">
                    {selectedBed.admission.professional?.name || "Não definido"}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Condição</p>
                  <Badge variant={getConditionVariant(selectedBed.admission.condition)}>
                    {selectedBed.admission.condition}
                  </Badge>
                </div>
              </div>

              {selectedBed.admission.diagnosis && (
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Diagnóstico</p>
                  <p className="text-sm text-foreground bg-muted/50 p-3 rounded-lg">
                    {selectedBed.admission.diagnosis}
                  </p>
                </div>
              )}

              {selectedBed.admission.notes && (
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Observações</p>
                  <p className="text-sm text-foreground bg-muted/50 p-3 rounded-lg">
                    {selectedBed.admission.notes}
                  </p>
                </div>
              )}

              <div className="flex justify-between pt-4">
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => {
                    if (selectedBed.admission) {
                      dischargePatient.mutate({
                        admissionId: selectedBed.admission.id,
                        bedId: selectedBed.id,
                      });
                    }
                  }}
                  disabled={dischargePatient.isPending}
                >
                  {dischargePatient.isPending ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <ArrowRight className="w-4 h-4 mr-2" />
                  )}
                  Dar Alta
                </Button>
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
