import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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
  UserPlus,
  Search,
  Filter,
  MoreHorizontal,
  FileText,
  Calendar,
  Phone,
  Mail,
  Eye,
  Edit,
  Trash2,
  Loader2,
  X,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format, isValid, parseISO } from "date-fns";
import { logError, handlePatientError } from "@/lib/errorHandler";

interface Patient {
  id: string;
  name: string;
  cpf: string;
  birth_date: string;
  phone: string | null;
  email: string | null;
  status: string;
  created_at: string;
  updated_at: string;
}

interface Filters {
  status: string;
  dateFrom: string;
  dateTo: string;
}

const getStatusVariant = (status: string) => {
  switch (status) {
    case "Ativo":
      return "success-light";
    case "Em tratamento":
      return "info-light";
    case "Internado":
      return "warning-light";
    default:
      return "secondary";
  }
};

const getInitials = (name: string) => {
  return name
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
};

const formatDate = (dateString: string, formatStr: string = "dd/MM/yyyy") => {
  if (!dateString) return "Data inválida";
  const date = parseISO(dateString);
  return isValid(date) ? format(date, formatStr) : "Data inválida";
};

const formatCPF = (value: string) => {
  const numbers = value.replace(/\D/g, "");
  return numbers
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d{1,2})/, "$1-$2")
    .replace(/(-\d{2})\d+?$/, "$1");
};

const formatPhone = (value: string) => {
  const numbers = value.replace(/\D/g, "");
  return numbers
    .replace(/(\d{2})(\d)/, "($1) $2")
    .replace(/(\d{5})(\d)/, "$1-$2")
    .replace(/(-\d{4})\d+?$/, "$1");
};

const emptyFormData = {
  name: "",
  cpf: "",
  birth_date: "",
  phone: "",
  email: "",
  status: "Ativo",
};

const emptyFilters: Filters = {
  status: "",
  dateFrom: "",
  dateTo: "",
};

export default function Pacientes() {
  const [searchTerm, setSearchTerm] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [formData, setFormData] = useState(emptyFormData);
  const [filters, setFilters] = useState<Filters>(emptyFilters);
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);

  const queryClient = useQueryClient();

  // Buscar pacientes do banco de dados
  const { data: patients = [], isLoading } = useQuery({
    queryKey: ["patients"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("patients")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as Patient[];
    },
  });

  // Mutation para criar novo paciente
  const createPatient = useMutation({
    mutationFn: async (newPatient: Omit<Patient, "id" | "created_at" | "updated_at">) => {
      const { data, error } = await supabase
        .from("patients")
        .insert([newPatient])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["patients"] });
      toast.success("Paciente cadastrado com sucesso!");
      setIsDialogOpen(false);
      setFormData(emptyFormData);
    },
    onError: (error: Error) => {
      const message = handlePatientError(error);
      toast.error(message);
      logError("create_patient", error);
    },
  });

  // Mutation para atualizar paciente
  const updatePatient = useMutation({
    mutationFn: async (patient: Omit<Patient, "created_at" | "updated_at">) => {
      const { data, error } = await supabase
        .from("patients")
        .update({
          name: patient.name,
          cpf: patient.cpf,
          birth_date: patient.birth_date,
          phone: patient.phone,
          email: patient.email,
          status: patient.status,
        })
        .eq("id", patient.id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["patients"] });
      toast.success("Paciente atualizado com sucesso!");
      setIsEditDialogOpen(false);
      setSelectedPatient(null);
      setFormData(emptyFormData);
    },
    onError: (error: Error) => {
      const message = handlePatientError(error);
      toast.error(message);
      logError("update_patient", error);
    },
  });

  // Mutation para excluir paciente
  const deletePatient = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("patients").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["patients"] });
      toast.success("Paciente excluído com sucesso!");
      setIsDeleteDialogOpen(false);
      setSelectedPatient(null);
    },
    onError: (error: Error) => {
      toast.error("Erro ao excluir paciente. Tente novamente.");
      logError("delete_patient", error);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.cpf || !formData.birth_date) {
      toast.error("Preencha todos os campos obrigatórios.");
      return;
    }

    createPatient.mutate({
      name: formData.name,
      cpf: formData.cpf,
      birth_date: formData.birth_date,
      phone: formData.phone || null,
      email: formData.email || null,
      status: formData.status,
    });
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.cpf || !formData.birth_date || !selectedPatient) {
      toast.error("Preencha todos os campos obrigatórios.");
      return;
    }

    updatePatient.mutate({
      id: selectedPatient.id,
      name: formData.name,
      cpf: formData.cpf,
      birth_date: formData.birth_date,
      phone: formData.phone || null,
      email: formData.email || null,
      status: formData.status,
    });
  };

  const openEditDialog = (patient: Patient) => {
    setSelectedPatient(patient);
    setFormData({
      name: patient.name,
      cpf: patient.cpf,
      birth_date: patient.birth_date,
      phone: patient.phone || "",
      email: patient.email || "",
      status: patient.status,
    });
    setIsEditDialogOpen(true);
  };

  const openViewDialog = (patient: Patient) => {
    setSelectedPatient(patient);
    setIsViewDialogOpen(true);
  };

  const openDeleteDialog = (patient: Patient) => {
    setSelectedPatient(patient);
    setIsDeleteDialogOpen(true);
  };

  const clearFilters = () => {
    setFilters(emptyFilters);
  };

  const hasActiveFilters = filters.status || filters.dateFrom || filters.dateTo;

  const filteredPatients = patients.filter((patient) => {
    // Busca por texto
    const matchesSearch =
      patient.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      patient.cpf.includes(searchTerm) ||
      patient.id.toLowerCase().includes(searchTerm.toLowerCase());

    // Filtro por status
    const matchesStatus = !filters.status || patient.status === filters.status;

    // Filtro por data de nascimento
    const birthDate = new Date(patient.birth_date);
    const matchesDateFrom = !filters.dateFrom || birthDate >= new Date(filters.dateFrom);
    const matchesDateTo = !filters.dateTo || birthDate <= new Date(filters.dateTo);

    return matchesSearch && matchesStatus && matchesDateFrom && matchesDateTo;
  });

  return (
    <MainLayout
      title="Pacientes"
      subtitle="Gerenciamento de cadastro de pacientes"
    >
      <Card variant="elevated" className="animate-fade-in">
        <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <CardTitle className="text-lg">Lista de Pacientes</CardTitle>
          <div className="flex flex-col sm:flex-row gap-3">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Buscar paciente..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full sm:w-64 h-10 pl-10 pr-4 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring transition-all"
              />
            </div>

            {/* Filters Popover */}
            <Popover open={isFiltersOpen} onOpenChange={setIsFiltersOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" size="default" className="gap-2">
                  <Filter className="w-4 h-4" />
                  Filtros
                  {hasActiveFilters && (
                    <Badge variant="default" className="ml-1 h-5 w-5 p-0 flex items-center justify-center text-xs">
                      !
                    </Badge>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80 bg-popover border border-border shadow-lg z-50" align="end">
                <div className="grid gap-4">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium leading-none">Filtros</h4>
                    {hasActiveFilters && (
                      <Button variant="ghost" size="sm" onClick={clearFilters} className="h-8 px-2 text-xs">
                        <X className="w-3 h-3 mr-1" />
                        Limpar
                      </Button>
                    )}
                  </div>
                  <div className="grid gap-3">
                    <div className="grid gap-2">
                      <Label htmlFor="filter-status">Status</Label>
                      <Select
                        value={filters.status}
                        onValueChange={(value) => setFilters({ ...filters, status: value })}
                      >
                        <SelectTrigger id="filter-status">
                          <SelectValue placeholder="Todos os status" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Ativo">Ativo</SelectItem>
                          <SelectItem value="Em tratamento">Em tratamento</SelectItem>
                          <SelectItem value="Internado">Internado</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid gap-2">
                      <Label>Data de Nascimento</Label>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <Label htmlFor="filter-date-from" className="text-xs text-muted-foreground">De</Label>
                          <Input
                            id="filter-date-from"
                            type="date"
                            value={filters.dateFrom}
                            onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })}
                          />
                        </div>
                        <div>
                          <Label htmlFor="filter-date-to" className="text-xs text-muted-foreground">Até</Label>
                          <Input
                            id="filter-date-to"
                            type="date"
                            value={filters.dateTo}
                            onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                  <Button onClick={() => setIsFiltersOpen(false)} className="w-full">
                    Aplicar Filtros
                  </Button>
                </div>
              </PopoverContent>
            </Popover>
            
            {/* New Patient Dialog */}
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="default" size="default" className="gap-2">
                  <UserPlus className="w-4 h-4" />
                  Novo Paciente
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                  <DialogTitle>Cadastrar Novo Paciente</DialogTitle>
                  <DialogDescription>
                    Preencha os dados do paciente para realizar o cadastro.
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit}>
                  <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                      <Label htmlFor="name">Nome Completo *</Label>
                      <Input
                        id="name"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        placeholder="Digite o nome completo"
                        required
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="grid gap-2">
                        <Label htmlFor="cpf">CPF *</Label>
                        <Input
                          id="cpf"
                          value={formData.cpf}
                          onChange={(e) => setFormData({ ...formData, cpf: formatCPF(e.target.value) })}
                          placeholder="000.000.000-00"
                          maxLength={14}
                          required
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="birth_date">Data de Nascimento *</Label>
                        <Input
                          id="birth_date"
                          type="date"
                          value={formData.birth_date}
                          onChange={(e) => setFormData({ ...formData, birth_date: e.target.value })}
                          required
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="grid gap-2">
                        <Label htmlFor="phone">Telefone</Label>
                        <Input
                          id="phone"
                          value={formData.phone}
                          onChange={(e) => setFormData({ ...formData, phone: formatPhone(e.target.value) })}
                          placeholder="(00) 00000-0000"
                          maxLength={15}
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="email">E-mail</Label>
                        <Input
                          id="email"
                          type="email"
                          value={formData.email}
                          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                          placeholder="email@exemplo.com"
                        />
                      </div>
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="status">Status</Label>
                      <Select
                        value={formData.status}
                        onValueChange={(value) => setFormData({ ...formData, status: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o status" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Ativo">Ativo</SelectItem>
                          <SelectItem value="Em tratamento">Em tratamento</SelectItem>
                          <SelectItem value="Internado">Internado</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                      Cancelar
                    </Button>
                    <Button type="submit" disabled={createPatient.isPending}>
                      {createPatient.isPending ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Salvando...
                        </>
                      ) : (
                        "Salvar"
                      )}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : (
            <>
              <div className="rounded-lg border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead className="font-semibold">Paciente</TableHead>
                      <TableHead className="font-semibold hidden md:table-cell">CPF</TableHead>
                      <TableHead className="font-semibold hidden lg:table-cell">Contato</TableHead>
                      <TableHead className="font-semibold hidden sm:table-cell">Data de Nascimento</TableHead>
                      <TableHead className="font-semibold">Status</TableHead>
                      <TableHead className="font-semibold text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredPatients.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                          {searchTerm || hasActiveFilters ? "Nenhum paciente encontrado." : "Nenhum paciente cadastrado."}
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredPatients.map((patient) => (
                        <TableRow key={patient.id} className="hover:bg-muted/30 transition-colors">
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <Avatar className="w-10 h-10 border-2 border-primary/20">
                                <AvatarFallback className="bg-primary/10 text-primary text-sm font-semibold">
                                  {getInitials(patient.name)}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <p className="font-medium text-foreground">{patient.name}</p>
                                <p className="text-xs text-muted-foreground">{patient.id.slice(0, 8)}</p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="hidden md:table-cell text-muted-foreground">
                            {patient.cpf}
                          </TableCell>
                          <TableCell className="hidden lg:table-cell">
                            <div className="flex flex-col gap-1">
                              {patient.phone && (
                                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                                  <Phone className="w-3 h-3" />
                                  {patient.phone}
                                </span>
                              )}
                              {patient.email && (
                                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                                  <Mail className="w-3 h-3" />
                                  {patient.email}
                                </span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="hidden sm:table-cell text-muted-foreground">
                            {formatDate(patient.birth_date)}
                          </TableCell>
                          <TableCell>
                            <Badge variant={getStatusVariant(patient.status)}>
                              {patient.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon-sm">
                                  <MoreHorizontal className="w-4 h-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="bg-popover border border-border shadow-lg z-50">
                                <DropdownMenuItem className="gap-2 cursor-pointer" onClick={() => openViewDialog(patient)}>
                                  <Eye className="w-4 h-4" />
                                  Ver Detalhes
                                </DropdownMenuItem>
                                <DropdownMenuItem className="gap-2 cursor-pointer">
                                  <FileText className="w-4 h-4" />
                                  Prontuário
                                </DropdownMenuItem>
                                <DropdownMenuItem className="gap-2 cursor-pointer">
                                  <Calendar className="w-4 h-4" />
                                  Agendar Consulta
                                </DropdownMenuItem>
                                <DropdownMenuItem className="gap-2 cursor-pointer" onClick={() => openEditDialog(patient)}>
                                  <Edit className="w-4 h-4" />
                                  Editar
                                </DropdownMenuItem>
                                <DropdownMenuItem className="gap-2 text-destructive cursor-pointer" onClick={() => openDeleteDialog(patient)}>
                                  <Trash2 className="w-4 h-4" />
                                  Excluir
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
              
              {/* Pagination Info */}
              <div className="flex items-center justify-between mt-4 text-sm text-muted-foreground">
                <span>Mostrando {filteredPatients.length} de {patients.length} pacientes</span>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" disabled>Anterior</Button>
                  <Button variant="outline" size="sm">Próximo</Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Editar Paciente</DialogTitle>
            <DialogDescription>
              Altere os dados do paciente conforme necessário.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEditSubmit}>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="edit-name">Nome Completo *</Label>
                <Input
                  id="edit-name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Digite o nome completo"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="edit-cpf">CPF *</Label>
                  <Input
                    id="edit-cpf"
                    value={formData.cpf}
                    onChange={(e) => setFormData({ ...formData, cpf: formatCPF(e.target.value) })}
                    placeholder="000.000.000-00"
                    maxLength={14}
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="edit-birth_date">Data de Nascimento *</Label>
                  <Input
                    id="edit-birth_date"
                    type="date"
                    value={formData.birth_date}
                    onChange={(e) => setFormData({ ...formData, birth_date: e.target.value })}
                    required
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="edit-phone">Telefone</Label>
                  <Input
                    id="edit-phone"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: formatPhone(e.target.value) })}
                    placeholder="(00) 00000-0000"
                    maxLength={15}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="edit-email">E-mail</Label>
                  <Input
                    id="edit-email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="email@exemplo.com"
                  />
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-status">Status</Label>
                <Select
                  value={formData.status}
                  onValueChange={(value) => setFormData({ ...formData, status: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Ativo">Ativo</SelectItem>
                    <SelectItem value="Em tratamento">Em tratamento</SelectItem>
                    <SelectItem value="Internado">Internado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={updatePatient.isPending}>
                {updatePatient.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  "Salvar Alterações"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* View Details Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Detalhes do Paciente</DialogTitle>
          </DialogHeader>
          {selectedPatient && (
            <div className="space-y-6 py-4">
              <div className="flex items-center gap-4">
                <Avatar className="w-16 h-16 border-2 border-primary/20">
                  <AvatarFallback className="bg-primary/10 text-primary text-xl font-semibold">
                    {getInitials(selectedPatient.name)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="text-lg font-semibold">{selectedPatient.name}</h3>
                  <Badge variant={getStatusVariant(selectedPatient.status)}>
                    {selectedPatient.status}
                  </Badge>
                </div>
              </div>

              <div className="grid gap-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-muted-foreground text-xs">CPF</Label>
                    <p className="font-medium">{selectedPatient.cpf}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground text-xs">Data de Nascimento</Label>
                    <p className="font-medium">{formatDate(selectedPatient.birth_date)}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-muted-foreground text-xs">Telefone</Label>
                    <p className="font-medium">{selectedPatient.phone || "Não informado"}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground text-xs">E-mail</Label>
                    <p className="font-medium">{selectedPatient.email || "Não informado"}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-muted-foreground text-xs">Cadastrado em</Label>
                    <p className="font-medium">{formatDate(selectedPatient.created_at, "dd/MM/yyyy HH:mm")}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground text-xs">Última atualização</Label>
                    <p className="font-medium">{formatDate(selectedPatient.updated_at, "dd/MM/yyyy HH:mm")}</p>
                  </div>
                </div>
                <div>
                  <Label className="text-muted-foreground text-xs">ID do Paciente</Label>
                  <p className="font-medium text-xs">{selectedPatient.id}</p>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsViewDialogOpen(false)}>
              Fechar
            </Button>
            <Button onClick={() => {
              setIsViewDialogOpen(false);
              if (selectedPatient) openEditDialog(selectedPatient);
            }}>
              <Edit className="w-4 h-4 mr-2" />
              Editar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o paciente <strong>{selectedPatient?.name}</strong>? 
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => selectedPatient && deletePatient.mutate(selectedPatient.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deletePatient.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Excluindo...
                </>
              ) : (
                "Excluir"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </MainLayout>
  );
}
