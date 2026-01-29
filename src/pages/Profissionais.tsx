import { useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  UserPlus,
  Search,
  Filter,
  MoreHorizontal,
  Calendar,
  Clock,
  Star,
  Stethoscope,
  Loader2,
  Pencil,
  Trash2,
  User,
  Phone,
  Mail,
  X,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
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
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

type Professional = Tables<"professionals">;

const getStatusVariant = (status: string) => {
  switch (status) {
    case "Disponível":
      return "success-light";
    case "Em atendimento":
      return "info-light";
    case "Em plantão":
      return "warning-light";
    case "Férias":
      return "secondary";
    default:
      return "secondary";
  }
};

const getInitials = (name: string) => {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .substring(0, 2)
    .toUpperCase();
};

const specialties = [
  "Cardiologia",
  "Dermatologia",
  "Ortopedia",
  "Neurologia",
  "Psiquiatria",
  "Pediatria",
  "Ginecologia",
  "Urologia",
  "Oftalmologia",
  "Enfermagem UTI",
  "Enfermagem Geral",
  "Fisioterapia",
];

const registrationTypes = [
  { value: "CRM", label: "CRM (Médico)" },
  { value: "COREN", label: "COREN (Enfermeiro)" },
  { value: "CRF", label: "CRF (Farmacêutico)" },
  { value: "CREFITO", label: "CREFITO (Fisioterapeuta)" },
  { value: "CRO", label: "CRO (Dentista)" },
];

const statusOptions = [
  "Disponível",
  "Em atendimento",
  "Em plantão",
  "Férias",
];

export default function Profissionais() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [specialtyFilter, setSpecialtyFilter] = useState<string>("");
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [isDeleteAlertOpen, setIsDeleteAlertOpen] = useState(false);
  const [selectedProfessional, setSelectedProfessional] = useState<Professional | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    specialty: "",
    registration_type: "CRM",
    registration_number: "",
    status: "Disponível",
    phone: "",
    email: "",
  });

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch professionals from database
  const { data: professionals = [], isLoading } = useQuery({
    queryKey: ["professionals"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("professionals")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  // Create professional mutation
  const createProfessional = useMutation({
    mutationFn: async (data: typeof formData) => {
      const { error } = await supabase.from("professionals").insert([
        {
          name: data.name,
          specialty: data.specialty,
          registration_type: data.registration_type,
          registration_number: data.registration_number,
          status: data.status,
          phone: data.phone || null,
          email: data.email || null,
        },
      ]);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["professionals"] });
      toast({
        title: "Sucesso",
        description: "Profissional cadastrado com sucesso!",
      });
      setIsDialogOpen(false);
      resetForm();
    },
    onError: (error) => {
      toast({
        title: "Erro",
        description: "Erro ao cadastrar profissional: " + error.message,
        variant: "destructive",
      });
    },
  });

  // Update professional mutation
  const updateProfessional = useMutation({
    mutationFn: async (data: { id: string } & typeof formData) => {
      const { error } = await supabase
        .from("professionals")
        .update({
          name: data.name,
          specialty: data.specialty,
          registration_type: data.registration_type,
          registration_number: data.registration_number,
          status: data.status,
          phone: data.phone || null,
          email: data.email || null,
        })
        .eq("id", data.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["professionals"] });
      toast({
        title: "Sucesso",
        description: "Profissional atualizado com sucesso!",
      });
      setIsEditDialogOpen(false);
      setSelectedProfessional(null);
    },
    onError: (error) => {
      toast({
        title: "Erro",
        description: "Erro ao atualizar profissional: " + error.message,
        variant: "destructive",
      });
    },
  });

  // Delete professional mutation
  const deleteProfessional = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("professionals")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["professionals"] });
      toast({
        title: "Sucesso",
        description: "Profissional excluído com sucesso!",
      });
      setIsDeleteAlertOpen(false);
      setSelectedProfessional(null);
    },
    onError: (error) => {
      toast({
        title: "Erro",
        description: "Erro ao excluir profissional: " + error.message,
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setFormData({
      name: "",
      specialty: "",
      registration_type: "CRM",
      registration_number: "",
      status: "Disponível",
      phone: "",
      email: "",
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.specialty || !formData.registration_number) {
      toast({
        title: "Erro",
        description: "Preencha todos os campos obrigatórios.",
        variant: "destructive",
      });
      return;
    }
    createProfessional.mutate(formData);
  };

  const handleEdit = (prof: Professional) => {
    setSelectedProfessional(prof);
    setFormData({
      name: prof.name,
      specialty: prof.specialty,
      registration_type: prof.registration_type,
      registration_number: prof.registration_number,
      status: prof.status,
      phone: prof.phone || "",
      email: prof.email || "",
    });
    setIsEditDialogOpen(true);
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProfessional) return;
    if (!formData.name || !formData.specialty || !formData.registration_number) {
      toast({
        title: "Erro",
        description: "Preencha todos os campos obrigatórios.",
        variant: "destructive",
      });
      return;
    }
    updateProfessional.mutate({ id: selectedProfessional.id, ...formData });
  };

  const handleView = (prof: Professional) => {
    setSelectedProfessional(prof);
    setIsViewDialogOpen(true);
  };

  const handleDeleteClick = (prof: Professional) => {
    setSelectedProfessional(prof);
    setIsDeleteAlertOpen(true);
  };

  const handleDeleteConfirm = () => {
    if (selectedProfessional) {
      deleteProfessional.mutate(selectedProfessional.id);
    }
  };

  const filteredProfessionals = professionals.filter((prof) => {
    const matchesSearch =
      prof.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      prof.specialty.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = !statusFilter || prof.status === statusFilter;
    const matchesSpecialty = !specialtyFilter || prof.specialty === specialtyFilter;
    return matchesSearch && matchesStatus && matchesSpecialty;
  });

  const uniqueSpecialties = [...new Set(professionals.map((p) => p.specialty))].sort();

  const hasActiveFilters = statusFilter || specialtyFilter;

  const clearFilters = () => {
    setStatusFilter("");
    setSpecialtyFilter("");
  };

  return (
    <MainLayout
      title="Profissionais"
      subtitle="Gestão de profissionais de saúde"
    >
      {/* Header Actions */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Buscar profissional por nome ou especialidade..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full h-10 pl-10 pr-4 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring transition-all"
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
                    value={statusFilter}
                    onValueChange={setStatusFilter}
                  >
                    <SelectTrigger id="filter-status">
                      <SelectValue placeholder="Todos os status" />
                    </SelectTrigger>
                    <SelectContent>
                      {statusOptions.map((status) => (
                        <SelectItem key={status} value={status}>
                          {status}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="filter-specialty">Especialidade</Label>
                  <Select
                    value={specialtyFilter}
                    onValueChange={setSpecialtyFilter}
                  >
                    <SelectTrigger id="filter-specialty">
                      <SelectValue placeholder="Todas as especialidades" />
                    </SelectTrigger>
                    <SelectContent>
                      {uniqueSpecialties.map((specialty) => (
                        <SelectItem key={specialty} value={specialty}>
                          {specialty}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Button onClick={() => setIsFiltersOpen(false)} className="w-full">
                Aplicar Filtros
              </Button>
            </div>
          </PopoverContent>
        </Popover>

        <Button
          variant="default"
          className="gap-2"
          onClick={() => setIsDialogOpen(true)}
        >
          <UserPlus className="w-4 h-4" />
          Novo Profissional
        </Button>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      )}

      {/* Empty State */}
      {!isLoading && filteredProfessionals.length === 0 && (
        <div className="text-center py-12">
          <Stethoscope className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold text-foreground mb-2">
            Nenhum profissional encontrado
          </h3>
          <p className="text-muted-foreground mb-4">
            {searchTerm
              ? "Nenhum profissional corresponde à sua busca."
              : "Comece adicionando o primeiro profissional."}
          </p>
          {!searchTerm && (
            <Button onClick={() => setIsDialogOpen(true)}>
              <UserPlus className="w-4 h-4 mr-2" />
              Adicionar Profissional
            </Button>
          )}
        </div>
      )}

      {/* Professionals Grid */}
      {!isLoading && filteredProfessionals.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredProfessionals.map((prof, index) => (
            <Card
              key={prof.id}
              variant="elevated"
              className="animate-slide-up"
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <Avatar className="w-12 h-12 border-2 border-primary/20">
                      <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                        {getInitials(prof.name)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <h3 className="font-semibold text-foreground">
                        {prof.name}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {prof.specialty}
                      </p>
                    </div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon-sm">
                        <MoreHorizontal className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleView(prof)}>
                        <User className="w-4 h-4 mr-2" />
                        Ver Perfil
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <Calendar className="w-4 h-4 mr-2" />
                        Ver Agenda
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => handleEdit(prof)}>
                        <Pencil className="w-4 h-4 mr-2" />
                        Editar
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => handleDeleteClick(prof)}
                        className="text-destructive focus:text-destructive"
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Excluir
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">
                      {prof.registration_type}-SP {prof.registration_number}
                    </span>
                    <Badge variant={getStatusVariant(prof.status)}>
                      {prof.status}
                    </Badge>
                  </div>

                  <div className="flex items-center gap-4 text-sm">
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <Star className="w-4 h-4 text-warning" fill="currentColor" />
                      <span className="font-medium text-foreground">
                        {prof.rating || "5.0"}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <Stethoscope className="w-4 h-4" />
                      <span>{prof.patients_count || 0} pacientes</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-2 border-t border-border">
                    <Clock className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">
                      Próximo horário:{" "}
                      <span className="font-medium text-foreground">
                        {prof.next_available || "Não definido"}
                      </span>
                    </span>
                  </div>
                </div>

                <div className="flex gap-2 mt-4">
                  <Button variant="outline" size="sm" className="flex-1 gap-1">
                    <Calendar className="w-4 h-4" />
                    Agenda
                  </Button>
                  <Button variant="default" size="sm" className="flex-1">
                    Agendar
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* New Professional Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Novo Profissional</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nome Completo *</Label>
              <Input
                id="name"
                placeholder="Ex: Dr. João Silva"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="specialty">Especialidade *</Label>
              <Select
                value={formData.specialty}
                onValueChange={(value) =>
                  setFormData({ ...formData, specialty: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a especialidade" />
                </SelectTrigger>
                <SelectContent>
                  {specialties.map((spec) => (
                    <SelectItem key={spec} value={spec}>
                      {spec}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="registration_type">Tipo de Registro *</Label>
                <Select
                  value={formData.registration_type}
                  onValueChange={(value) =>
                    setFormData({ ...formData, registration_type: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {registrationTypes.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="registration_number">Número *</Label>
                <Input
                  id="registration_number"
                  placeholder="Ex: 123456"
                  value={formData.registration_number}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      registration_number: e.target.value,
                    })
                  }
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select
                value={formData.status}
                onValueChange={(value) =>
                  setFormData({ ...formData, status: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {statusOptions.map((status) => (
                    <SelectItem key={status} value={status}>
                      {status}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Telefone</Label>
              <Input
                id="phone"
                placeholder="(11) 99999-9999"
                value={formData.phone}
                onChange={(e) =>
                  setFormData({ ...formData, phone: e.target.value })
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">E-mail</Label>
              <Input
                id="email"
                type="email"
                placeholder="profissional@email.com"
                value={formData.email}
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
              />
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsDialogOpen(false)}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={createProfessional.isPending}>
                {createProfessional.isPending ? (
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

      {/* Edit Professional Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Editar Profissional</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleEditSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Nome Completo *</Label>
              <Input
                id="edit-name"
                placeholder="Ex: Dr. João Silva"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-specialty">Especialidade *</Label>
              <Select
                value={formData.specialty}
                onValueChange={(value) =>
                  setFormData({ ...formData, specialty: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a especialidade" />
                </SelectTrigger>
                <SelectContent>
                  {specialties.map((spec) => (
                    <SelectItem key={spec} value={spec}>
                      {spec}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-registration_type">Tipo de Registro *</Label>
                <Select
                  value={formData.registration_type}
                  onValueChange={(value) =>
                    setFormData({ ...formData, registration_type: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {registrationTypes.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-registration_number">Número *</Label>
                <Input
                  id="edit-registration_number"
                  placeholder="Ex: 123456"
                  value={formData.registration_number}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      registration_number: e.target.value,
                    })
                  }
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-status">Status</Label>
              <Select
                value={formData.status}
                onValueChange={(value) =>
                  setFormData({ ...formData, status: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {statusOptions.map((status) => (
                    <SelectItem key={status} value={status}>
                      {status}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-phone">Telefone</Label>
              <Input
                id="edit-phone"
                placeholder="(11) 99999-9999"
                value={formData.phone}
                onChange={(e) =>
                  setFormData({ ...formData, phone: e.target.value })
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-email">E-mail</Label>
              <Input
                id="edit-email"
                type="email"
                placeholder="profissional@email.com"
                value={formData.email}
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
              />
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsEditDialogOpen(false)}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={updateProfessional.isPending}>
                {updateProfessional.isPending ? (
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

      {/* View Professional Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Perfil do Profissional</DialogTitle>
          </DialogHeader>
          {selectedProfessional && (
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <Avatar className="w-16 h-16 border-2 border-primary/20">
                  <AvatarFallback className="bg-primary/10 text-primary font-semibold text-lg">
                    {getInitials(selectedProfessional.name)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="text-lg font-semibold">{selectedProfessional.name}</h3>
                  <p className="text-muted-foreground">{selectedProfessional.specialty}</p>
                  <Badge variant={getStatusVariant(selectedProfessional.status)} className="mt-1">
                    {selectedProfessional.status}
                  </Badge>
                </div>
              </div>

              <div className="grid gap-3 pt-4 border-t">
                <div className="flex items-center gap-3">
                  <Stethoscope className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm">
                    {selectedProfessional.registration_type}-SP {selectedProfessional.registration_number}
                  </span>
                </div>
                {selectedProfessional.phone && (
                  <div className="flex items-center gap-3">
                    <Phone className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm">{selectedProfessional.phone}</span>
                  </div>
                )}
                {selectedProfessional.email && (
                  <div className="flex items-center gap-3">
                    <Mail className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm">{selectedProfessional.email}</span>
                  </div>
                )}
                <div className="flex items-center gap-3">
                  <Star className="w-4 h-4 text-warning" fill="currentColor" />
                  <span className="text-sm">Avaliação: {selectedProfessional.rating || "5.0"}</span>
                </div>
                <div className="flex items-center gap-3">
                  <User className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm">{selectedProfessional.patients_count || 0} pacientes atendidos</span>
                </div>
                <div className="flex items-center gap-3">
                  <Clock className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm">
                    Próximo horário: {selectedProfessional.next_available || "Não definido"}
                  </span>
                </div>
              </div>

              <DialogFooter className="pt-4">
                <Button variant="outline" onClick={() => setIsViewDialogOpen(false)}>
                  Fechar
                </Button>
                <Button onClick={() => {
                  setIsViewDialogOpen(false);
                  handleEdit(selectedProfessional);
                }}>
                  Editar
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={isDeleteAlertOpen} onOpenChange={setIsDeleteAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o profissional{" "}
              <strong>{selectedProfessional?.name}</strong>? Esta ação não pode
              ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteProfessional.isPending ? (
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
