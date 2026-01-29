import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  FileText, 
  Search, 
  Plus, 
  User, 
  Calendar, 
  Pill, 
  Activity,
  Eye,
  Loader2,
  X,
  Archive,
  RotateCcw,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const entryTypes = ["Consulta", "Exame", "Prescrição", "Procedimento", "Evolução"];

interface MedicalRecord {
  id: string;
  record_number: string;
  patient_id: string;
  primary_professional_id: string | null;
  primary_diagnosis: string | null;
  status: string;
  notes: string | null;
  updated_at: string;
  patient: { name: string; cpf: string } | null;
  professional: { name: string } | null;
}

interface MedicalRecordEntry {
  id: string;
  medical_record_id: string;
  professional_id: string | null;
  entry_type: string;
  description: string;
  entry_date: string;
  created_at: string;
  professional: { name: string } | null;
}

export default function Prontuarios() {
  const [searchTerm, setSearchTerm] = useState("");
  const [isNewRecordOpen, setIsNewRecordOpen] = useState(false);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isNewEntryOpen, setIsNewEntryOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<MedicalRecord | null>(null);
  const [newRecordData, setNewRecordData] = useState({
    patient_id: "",
    primary_professional_id: "",
    primary_diagnosis: "",
    notes: "",
  });
  const [newEntryData, setNewEntryData] = useState({
    entry_type: "Consulta",
    description: "",
  });

  const queryClient = useQueryClient();

  // Fetch patients
  const { data: patients = [] } = useQuery({
    queryKey: ["patients"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("patients")
        .select("id, name, cpf")
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

  // Fetch medical records
  const { data: medicalRecords = [], isLoading } = useQuery({
    queryKey: ["medical_records"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("medical_records")
        .select(`
          *,
          patient:patients(name, cpf),
          professional:professionals(name)
        `)
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return data as MedicalRecord[];
    },
  });

  // Fetch record entries
  const { data: recordEntries = [] } = useQuery({
    queryKey: ["medical_record_entries", selectedRecord?.id],
    queryFn: async () => {
      if (!selectedRecord) return [];
      const { data, error } = await supabase
        .from("medical_record_entries")
        .select(`
          *,
          professional:professionals(name)
        `)
        .eq("medical_record_id", selectedRecord.id)
        .order("entry_date", { ascending: false });
      if (error) throw error;
      return data as MedicalRecordEntry[];
    },
    enabled: !!selectedRecord,
  });

  // Fetch recent entries for history
  const { data: recentEntries = [] } = useQuery({
    queryKey: ["recent_entries"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("medical_record_entries")
        .select(`
          *,
          professional:professionals(name),
          medical_record:medical_records(record_number, patient:patients(name))
        `)
        .order("created_at", { ascending: false })
        .limit(10);
      if (error) throw error;
      return data;
    },
  });

  // Create medical record
  const createRecord = useMutation({
    mutationFn: async (data: typeof newRecordData) => {
      const { error } = await supabase.from("medical_records").insert({
        patient_id: data.patient_id,
        primary_professional_id: data.primary_professional_id || null,
        primary_diagnosis: data.primary_diagnosis || null,
        notes: data.notes || null,
        record_number: "", // Will be auto-generated by trigger
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Prontuário criado com sucesso!");
      queryClient.invalidateQueries({ queryKey: ["medical_records"] });
      setIsNewRecordOpen(false);
      resetNewRecordForm();
    },
    onError: (error) => {
      toast.error("Erro ao criar prontuário: " + error.message);
    },
  });

  // Create entry
  const createEntry = useMutation({
    mutationFn: async (data: typeof newEntryData) => {
      if (!selectedRecord) throw new Error("Nenhum prontuário selecionado");
      const { error } = await supabase.from("medical_record_entries").insert({
        medical_record_id: selectedRecord.id,
        entry_type: data.entry_type,
        description: data.description,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Registro adicionado com sucesso!");
      queryClient.invalidateQueries({ queryKey: ["medical_record_entries"] });
      queryClient.invalidateQueries({ queryKey: ["recent_entries"] });
      queryClient.invalidateQueries({ queryKey: ["medical_records"] });
      setIsNewEntryOpen(false);
      resetNewEntryForm();
    },
    onError: (error) => {
      toast.error("Erro ao adicionar registro: " + error.message);
    },
  });

  // Update record status
  const updateRecordStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase
        .from("medical_records")
        .update({ status })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Status atualizado com sucesso!");
      queryClient.invalidateQueries({ queryKey: ["medical_records"] });
    },
    onError: (error) => {
      toast.error("Erro ao atualizar status: " + error.message);
    },
  });

  const resetNewRecordForm = () => {
    setNewRecordData({
      patient_id: "",
      primary_professional_id: "",
      primary_diagnosis: "",
      notes: "",
    });
  };

  const resetNewEntryForm = () => {
    setNewEntryData({
      entry_type: "Consulta",
      description: "",
    });
  };

  const handleCreateRecord = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRecordData.patient_id) {
      toast.error("Selecione um paciente");
      return;
    }
    createRecord.mutate(newRecordData);
  };

  const handleCreateEntry = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEntryData.description) {
      toast.error("Preencha a descrição");
      return;
    }
    createEntry.mutate(newEntryData);
  };

  // Filter records by search
  const filteredRecords = medicalRecords.filter((record) => {
    const search = searchTerm.toLowerCase();
    return (
      record.record_number.toLowerCase().includes(search) ||
      record.patient?.name.toLowerCase().includes(search) ||
      record.patient?.cpf.includes(search)
    );
  });

  const activeRecords = filteredRecords.filter((r) => r.status === "ativo");
  const archivedRecords = filteredRecords.filter((r) => r.status === "arquivado");

  // Stats
  const totalActive = medicalRecords.filter((r) => r.status === "ativo").length;
  const totalArchived = medicalRecords.filter((r) => r.status === "arquivado").length;
  const todayDate = format(new Date(), "yyyy-MM-dd");
  const updatedToday = medicalRecords.filter(
    (r) => r.updated_at.startsWith(todayDate)
  ).length;

  const getEntryIcon = (type: string) => {
    switch (type) {
      case "Consulta":
        return <Activity className="w-5 h-5 text-primary" />;
      case "Exame":
        return <FileText className="w-5 h-5 text-warning" />;
      case "Prescrição":
        return <Pill className="w-5 h-5 text-success" />;
      default:
        return <FileText className="w-5 h-5 text-muted-foreground" />;
    }
  };

  const renderRecordsTable = (records: MedicalRecord[]) => (
    <div className="overflow-x-auto">
      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      ) : records.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          Nenhum prontuário encontrado
        </div>
      ) : (
        <table className="w-full">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Nº Prontuário</th>
              <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Paciente</th>
              <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">CPF</th>
              <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Diagnóstico</th>
              <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Médico Responsável</th>
              <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Última Atualização</th>
              <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Status</th>
              <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Ações</th>
            </tr>
          </thead>
          <tbody>
            {records.map((record) => (
              <tr key={record.id} className="border-b border-border/50 hover:bg-muted/50 transition-colors">
                <td className="py-3 px-4">
                  <span className="font-mono text-sm text-primary">{record.record_number}</span>
                </td>
                <td className="py-3 px-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                      <User className="w-4 h-4 text-primary" />
                    </div>
                    <span className="font-medium text-foreground">{record.patient?.name}</span>
                  </div>
                </td>
                <td className="py-3 px-4 text-sm text-muted-foreground">{record.patient?.cpf}</td>
                <td className="py-3 px-4 text-sm text-foreground">{record.primary_diagnosis || "-"}</td>
                <td className="py-3 px-4 text-sm text-foreground">{record.professional?.name || "-"}</td>
                <td className="py-3 px-4 text-sm text-muted-foreground">
                  {format(new Date(record.updated_at), "dd/MM/yyyy", { locale: ptBR })}
                </td>
                <td className="py-3 px-4">
                  <Badge variant={record.status === "ativo" ? "success" : "secondary"}>
                    {record.status === "ativo" ? "Ativo" : "Arquivado"}
                  </Badge>
                </td>
                <td className="py-3 px-4">
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        setSelectedRecord(record);
                        setIsDetailsOpen(true);
                      }}
                    >
                      <Eye className="w-4 h-4" />
                    </Button>
                    {record.status === "ativo" ? (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => updateRecordStatus.mutate({ id: record.id, status: "arquivado" })}
                      >
                        <Archive className="w-4 h-4" />
                      </Button>
                    ) : (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => updateRecordStatus.mutate({ id: record.id, status: "ativo" })}
                      >
                        <RotateCcw className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );

  return (
    <MainLayout title="Prontuários Eletrônicos" subtitle="Gestão de registros clínicos dos pacientes">
      <div className="space-y-6">
        {/* Search and Actions */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nome, CPF ou número do prontuário..."
                  className="pl-10"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <Button className="gap-2" onClick={() => setIsNewRecordOpen(true)}>
                <Plus className="w-4 h-4" />
                Novo Prontuário
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="card-elevated">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                  <FileText className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{totalActive}</p>
                  <p className="text-sm text-muted-foreground">Prontuários Ativos</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="card-elevated">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-success/10 flex items-center justify-center">
                  <Activity className="w-6 h-6 text-success" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{updatedToday}</p>
                  <p className="text-sm text-muted-foreground">Atualizados Hoje</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="card-elevated">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-warning/10 flex items-center justify-center">
                  <Pill className="w-6 h-6 text-warning" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{recentEntries.filter(e => e.entry_type === "Prescrição").length}</p>
                  <p className="text-sm text-muted-foreground">Prescrições Recentes</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="card-elevated">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center">
                  <FileText className="w-6 h-6 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{totalArchived}</p>
                  <p className="text-sm text-muted-foreground">Arquivados</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Prontuarios List */}
        <Card className="card-elevated">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-primary" />
              Lista de Prontuários
            </CardTitle>
            <CardDescription>Visualize e gerencie os prontuários eletrônicos</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="ativos">
              <TabsList className="mb-4">
                <TabsTrigger value="ativos">Ativos ({activeRecords.length})</TabsTrigger>
                <TabsTrigger value="arquivados">Arquivados ({archivedRecords.length})</TabsTrigger>
                <TabsTrigger value="todos">Todos ({filteredRecords.length})</TabsTrigger>
              </TabsList>
              <TabsContent value="ativos">
                {renderRecordsTable(activeRecords)}
              </TabsContent>
              <TabsContent value="arquivados">
                {renderRecordsTable(archivedRecords)}
              </TabsContent>
              <TabsContent value="todos">
                {renderRecordsTable(filteredRecords)}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card className="card-elevated">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-primary" />
              Histórico Recente
            </CardTitle>
            <CardDescription>Últimas atualizações nos prontuários</CardDescription>
          </CardHeader>
          <CardContent>
            {recentEntries.length === 0 ? (
              <p className="text-center py-4 text-muted-foreground">Nenhum registro recente</p>
            ) : (
              <div className="space-y-4">
                {recentEntries.map((entry: any) => (
                  <div key={entry.id} className="flex items-start gap-4 p-4 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      {getEntryIcon(entry.entry_type)}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium text-foreground">{entry.entry_type}</h4>
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(entry.entry_date + "T12:00:00"), "dd/MM/yyyy", { locale: ptBR })}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">{entry.description}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {entry.professional?.name || "Profissional não informado"} • {entry.medical_record?.patient?.name}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* New Record Dialog */}
      <Dialog open={isNewRecordOpen} onOpenChange={setIsNewRecordOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Novo Prontuário</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateRecord} className="space-y-4">
            <div className="space-y-2">
              <Label>Paciente *</Label>
              <Select
                value={newRecordData.patient_id}
                onValueChange={(value) => setNewRecordData({ ...newRecordData, patient_id: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o paciente" />
                </SelectTrigger>
                <SelectContent>
                  {patients.map((patient) => (
                    <SelectItem key={patient.id} value={patient.id}>
                      {patient.name} - {patient.cpf}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Médico Responsável</Label>
              <Select
                value={newRecordData.primary_professional_id}
                onValueChange={(value) => setNewRecordData({ ...newRecordData, primary_professional_id: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o médico" />
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

            <div className="space-y-2">
              <Label>Diagnóstico Principal</Label>
              <Input
                placeholder="Ex: Hipertensão Arterial"
                value={newRecordData.primary_diagnosis}
                onChange={(e) => setNewRecordData({ ...newRecordData, primary_diagnosis: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label>Observações</Label>
              <Textarea
                placeholder="Observações adicionais..."
                value={newRecordData.notes}
                onChange={(e) => setNewRecordData({ ...newRecordData, notes: e.target.value })}
              />
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => setIsNewRecordOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={createRecord.isPending}>
                {createRecord.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Criar Prontuário
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Details Dialog */}
      <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-primary" />
              Prontuário {selectedRecord?.record_number}
            </DialogTitle>
          </DialogHeader>
          {selectedRecord && (
            <div className="space-y-6">
              <div className="flex items-center gap-3 p-4 rounded-lg bg-muted/50">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <User className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <p className="font-semibold text-foreground">{selectedRecord.patient?.name}</p>
                  <p className="text-sm text-muted-foreground">CPF: {selectedRecord.patient?.cpf}</p>
                </div>
                <Badge className="ml-auto" variant={selectedRecord.status === "ativo" ? "success" : "secondary"}>
                  {selectedRecord.status === "ativo" ? "Ativo" : "Arquivado"}
                </Badge>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground">Médico Responsável</p>
                  <p className="font-medium text-foreground">{selectedRecord.professional?.name || "Não definido"}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Diagnóstico Principal</p>
                  <p className="font-medium text-foreground">{selectedRecord.primary_diagnosis || "Não informado"}</p>
                </div>
              </div>

              {selectedRecord.notes && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Observações</p>
                  <p className="text-sm text-foreground bg-muted/50 p-3 rounded-lg">{selectedRecord.notes}</p>
                </div>
              )}

              <div className="flex items-center justify-between">
                <h4 className="font-medium text-foreground">Registros do Prontuário</h4>
                <Button size="sm" onClick={() => setIsNewEntryOpen(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Novo Registro
                </Button>
              </div>

              {recordEntries.length === 0 ? (
                <p className="text-center py-4 text-muted-foreground">Nenhum registro encontrado</p>
              ) : (
                <div className="space-y-3 max-h-60 overflow-y-auto">
                  {recordEntries.map((entry) => (
                    <div key={entry.id} className="flex items-start gap-3 p-3 rounded-lg border">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                        {getEntryIcon(entry.entry_type)}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <Badge variant="secondary">{entry.entry_type}</Badge>
                          <span className="text-xs text-muted-foreground">
                            {format(new Date(entry.entry_date + "T12:00:00"), "dd/MM/yyyy", { locale: ptBR })}
                          </span>
                        </div>
                        <p className="text-sm text-foreground mt-1">{entry.description}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {entry.professional?.name || "Profissional não informado"}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex justify-end pt-4">
                <Button variant="outline" onClick={() => setIsDetailsOpen(false)}>
                  Fechar
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* New Entry Dialog */}
      <Dialog open={isNewEntryOpen} onOpenChange={setIsNewEntryOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Novo Registro</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateEntry} className="space-y-4">
            <div className="space-y-2">
              <Label>Tipo de Registro</Label>
              <Select
                value={newEntryData.entry_type}
                onValueChange={(value) => setNewEntryData({ ...newEntryData, entry_type: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {entryTypes.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Descrição *</Label>
              <Textarea
                placeholder="Descreva o registro..."
                value={newEntryData.description}
                onChange={(e) => setNewEntryData({ ...newEntryData, description: e.target.value })}
                rows={4}
              />
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => setIsNewEntryOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={createEntry.isPending}>
                {createEntry.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Adicionar
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}
