import { useState, useEffect, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Settings, 
  User, 
  Bell, 
  Shield, 
  Database,
  Palette,
  Building,
  Mail,
  Phone,
  MapPin,
  Save,
  Key,
  Globe,
  Clock,
  Loader2,
  Camera
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { logError } from "@/lib/errorHandler";
import { useTheme } from "next-themes";
import defaultAvatar from "@/assets/default-avatar.png";

interface InstitutionSettings {
  id: string;
  name: string;
  cnpj: string;
  email: string | null;
  phone: string | null;
  address: string | null;
}

interface UserProfile {
  id: string;
  full_name: string;
  role: string;
  email: string | null;
  phone: string | null;
  avatar_url: string | null;
}

export default function Configuracoes() {
  const [searchParams] = useSearchParams();
  const { theme, setTheme } = useTheme();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Get the tab from URL, default to "geral"
  const tabFromUrl = searchParams.get("tab") || "geral";
  
  // Institution settings state
  const [settings, setSettings] = useState<InstitutionSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Institution form state
  const [name, setName] = useState("");
  const [cnpj, setCnpj] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  
  // Profile state
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [profileSaving, setProfileSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  
  // Profile form state
  const [profileFullName, setProfileFullName] = useState("");
  const [profileRole, setProfileRole] = useState("");
  const [profileEmail, setProfileEmail] = useState("");
  const [profilePhone, setProfilePhone] = useState("");

  useEffect(() => {
    fetchSettings();
    fetchProfile();
  }, []);

  const fetchSettings = async () => {
    try {
      const { data, error } = await supabase
        .from("institution_settings")
        .select("*")
        .limit(1)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setSettings(data);
        setName(data.name);
        setCnpj(data.cnpj);
        setEmail(data.email || "");
        setPhone(data.phone || "");
        setAddress(data.address || "");
      }
    } catch (error) {
      logError("fetch_settings", error);
      toast.error("Erro ao carregar configurações");
    } finally {
      setLoading(false);
    }
  };

  const fetchProfile = async () => {
    try {

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

      const { data, error } = await supabase
        .from("user_profiles")
        .select("*")
        .eq("id", user.id)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setProfile(data);
        setProfileFullName(data.full_name);
        setProfileRole(data.role);
        setProfileEmail(data.email || "");
        setProfilePhone(data.phone || "");
      }
    } catch (error) {
      logError("fetch_profile", error);
      toast.error("Erro ao carregar perfil");
    } finally {
      setProfileLoading(false);
    }
  };

  const handlePhotoChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !profile) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Por favor, selecione uma imagem válida");
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      toast.error("A imagem deve ter no máximo 2MB");
      return;
    }

    setUploadingPhoto(true);
    try {
      // Get current user ID for secure storage path
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Usuário não autenticado");
        return;
      }

      const fileExt = file.name.split(".").pop();
      // Store in user's folder for RLS policy compliance
      const fileName = `${user.id}/${profile.id}-${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from("avatars")
        .getPublicUrl(fileName);

      const { error: updateError } = await supabase
        .from("user_profiles")
        .update({ avatar_url: urlData.publicUrl })
        .eq("id", profile.id);

      if (updateError) throw updateError;

      setProfile({ ...profile, avatar_url: urlData.publicUrl });
      toast.success("Foto atualizada com sucesso!");
    } catch (error) {
      logError("upload_photo", error);
      toast.error("Erro ao fazer upload da foto");
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleSaveProfile = async () => {
    if (!profile) return;

    setProfileSaving(true);
    try {
      const { error } = await supabase
        .from("user_profiles")
        .update({
          full_name: profileFullName.trim(),
          role: profileRole.trim(),
          email: profileEmail.trim() || null,
          phone: profilePhone.trim() || null,
        })
        .eq("id", profile.id);

      if (error) throw error;

      toast.success("Perfil salvo com sucesso!");
      fetchProfile();
    } catch (error) {
      logError("save_profile", error);
      toast.error("Erro ao salvar perfil");
    } finally {
      setProfileSaving(false);
    }
  };

  const handleSaveSettings = async () => {
    if (!settings) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from("institution_settings")
        .update({
          name: name.trim(),
          cnpj: cnpj.trim(),
          email: email.trim() || null,
          phone: phone.trim() || null,
          address: address.trim() || null,
        })
        .eq("id", settings.id);

      if (error) throw error;

      toast.success("Configurações salvas com sucesso!");
      fetchSettings();
    } catch (error) {
      logError("save_settings", error);
      toast.error("Erro ao salvar configurações");
    } finally {
      setSaving(false);
    }
  };

  return (
    <MainLayout title="Configurações" subtitle="Gerencie as configurações do sistema">
      <div className="space-y-6">
        {/* Settings Tabs */}
        <Tabs defaultValue={tabFromUrl} className="space-y-6">
          <TabsList className="grid w-full grid-cols-2 lg:grid-cols-5 h-auto gap-2 bg-transparent p-0">
            <TabsTrigger value="geral" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground gap-2">
              <Settings className="w-4 h-4" />
              Geral
            </TabsTrigger>
            <TabsTrigger value="perfil" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground gap-2">
              <User className="w-4 h-4" />
              Perfil
            </TabsTrigger>
            <TabsTrigger value="notificacoes" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground gap-2">
              <Bell className="w-4 h-4" />
              Notificações
            </TabsTrigger>
            <TabsTrigger value="seguranca" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground gap-2">
              <Shield className="w-4 h-4" />
              Segurança
            </TabsTrigger>
            <TabsTrigger value="sistema" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground gap-2">
              <Database className="w-4 h-4" />
              Sistema
            </TabsTrigger>
          </TabsList>

          {/* General Settings */}
          <TabsContent value="geral" className="space-y-6">
            <Card className="card-elevated">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building className="w-5 h-5 text-primary" />
                  Informações da Instituição
                </CardTitle>
                <CardDescription>Configure os dados da sua instituição de saúde</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {loading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-primary" />
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <Label htmlFor="nomeInstituicao">Nome da Instituição</Label>
                        <Input 
                          id="nomeInstituicao" 
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="cnpj">CNPJ</Label>
                        <Input 
                          id="cnpj" 
                          value={cnpj}
                          onChange={(e) => setCnpj(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="email">E-mail</Label>
                        <div className="relative">
                          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                          <Input 
                            id="email" 
                            className="pl-10" 
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="telefone">Telefone</Label>
                        <div className="relative">
                          <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                          <Input 
                            id="telefone" 
                            className="pl-10" 
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                          />
                        </div>
                      </div>
                      <div className="space-y-2 md:col-span-2">
                        <Label htmlFor="endereco">Endereço</Label>
                        <div className="relative">
                          <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                          <Input 
                            id="endereco" 
                            className="pl-10" 
                            value={address}
                            onChange={(e) => setAddress(e.target.value)}
                          />
                        </div>
                      </div>
                    </div>
                    <div className="flex justify-end">
                      <Button 
                        className="gradient-primary text-primary-foreground shadow-primary gap-2"
                        onClick={handleSaveSettings}
                        disabled={saving}
                      >
                        {saving ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Save className="w-4 h-4" />
                        )}
                        {saving ? "Salvando..." : "Salvar Alterações"}
                      </Button>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            <Card className="card-elevated">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Palette className="w-5 h-5 text-primary" />
                  Aparência
                </CardTitle>
                <CardDescription>Personalize a aparência do sistema</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Modo Escuro</Label>
                    <p className="text-sm text-muted-foreground">Ativar tema escuro para o sistema</p>
                  </div>
                  <Switch 
                    checked={theme === "dark"}
                    onCheckedChange={(checked) => setTheme(checked ? "dark" : "light")}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Profile Settings */}
          <TabsContent value="perfil" className="space-y-6">
            <Card className="card-elevated">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="w-5 h-5 text-primary" />
                  Dados do Usuário
                </CardTitle>
                <CardDescription>Atualize suas informações pessoais</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {profileLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-primary" />
                  </div>
                ) : (
                  <>
                    <div className="flex items-center gap-6">
                      <div className="relative w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden">
                        <img 
                          src={profile?.avatar_url || defaultAvatar} 
                          alt="Avatar" 
                          className="w-full h-full object-cover"
                        />
                        {uploadingPhoto && (
                          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                            <Loader2 className="w-6 h-6 animate-spin text-white" />
                          </div>
                        )}
                      </div>
                      <div>
                        <input
                          type="file"
                          ref={fileInputRef}
                          onChange={handlePhotoChange}
                          accept="image/*"
                          className="hidden"
                        />
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => fileInputRef.current?.click()}
                          disabled={uploadingPhoto}
                        >
                          <Camera className="w-4 h-4 mr-2" />
                          Alterar Foto
                        </Button>
                        <p className="text-sm text-muted-foreground mt-2">JPG, PNG ou GIF. Máximo 2MB.</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <Label htmlFor="nome">Nome Completo</Label>
                        <Input 
                          id="nome" 
                          value={profileFullName}
                          onChange={(e) => setProfileFullName(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="cargo">Cargo</Label>
                        <Input 
                          id="cargo" 
                          value={profileRole}
                          onChange={(e) => setProfileRole(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="emailPerfil">E-mail</Label>
                        <Input 
                          id="emailPerfil" 
                          type="email" 
                          value={profileEmail}
                          onChange={(e) => setProfileEmail(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="telefonePerfil">Telefone</Label>
                        <Input 
                          id="telefonePerfil" 
                          value={profilePhone}
                          onChange={(e) => setProfilePhone(e.target.value)}
                        />
                      </div>
                    </div>
                    <div className="flex justify-end">
                      <Button 
                        className="gradient-primary text-primary-foreground shadow-primary gap-2"
                        onClick={handleSaveProfile}
                        disabled={profileSaving}
                      >
                        {profileSaving ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Save className="w-4 h-4" />
                        )}
                        {profileSaving ? "Salvando..." : "Salvar Perfil"}
                      </Button>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Notification Settings */}
          <TabsContent value="notificacoes" className="space-y-6">
            <Card className="card-elevated">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bell className="w-5 h-5 text-primary" />
                  Preferências de Notificação
                </CardTitle>
                <CardDescription>Configure como deseja receber notificações</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Notificações por E-mail</Label>
                    <p className="text-sm text-muted-foreground">Receber alertas importantes por e-mail</p>
                  </div>
                  <Switch defaultChecked />
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Notificações Push</Label>
                    <p className="text-sm text-muted-foreground">Receber notificações no navegador</p>
                  </div>
                  <Switch defaultChecked />
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Alertas de Emergência</Label>
                    <p className="text-sm text-muted-foreground">Receber alertas de situações críticas</p>
                  </div>
                  <Switch defaultChecked />
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Lembretes de Agendamento</Label>
                    <p className="text-sm text-muted-foreground">Lembrar sobre consultas e exames</p>
                  </div>
                  <Switch defaultChecked />
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Relatórios Semanais</Label>
                    <p className="text-sm text-muted-foreground">Receber resumo semanal de atividades</p>
                  </div>
                  <Switch />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Security Settings */}
          <TabsContent value="seguranca" className="space-y-6">
            <Card className="card-elevated">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Key className="w-5 h-5 text-primary" />
                  Alterar Senha
                </CardTitle>
                <CardDescription>Atualize sua senha de acesso</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 gap-6 max-w-md">
                  <div className="space-y-2">
                    <Label htmlFor="senhaAtual">Senha Atual</Label>
                    <Input id="senhaAtual" type="password" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="novaSenha">Nova Senha</Label>
                    <Input id="novaSenha" type="password" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirmarSenha">Confirmar Nova Senha</Label>
                    <Input id="confirmarSenha" type="password" />
                  </div>
                </div>
                <Button className="gradient-primary text-primary-foreground shadow-primary gap-2">
                  <Key className="w-4 h-4" />
                  Alterar Senha
                </Button>
              </CardContent>
            </Card>

            <Card className="card-elevated">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="w-5 h-5 text-primary" />
                  Autenticação em Dois Fatores
                </CardTitle>
                <CardDescription>Adicione uma camada extra de segurança</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Ativar 2FA</Label>
                    <p className="text-sm text-muted-foreground">Usar autenticação em dois fatores</p>
                  </div>
                  <Switch />
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Sessões Ativas</Label>
                    <p className="text-sm text-muted-foreground">1 sessão ativa neste momento</p>
                  </div>
                  <Button variant="outline" size="sm">Ver Sessões</Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* System Settings */}
          <TabsContent value="sistema" className="space-y-6">
            <Card className="card-elevated">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Database className="w-5 h-5 text-primary" />
                  Configurações do Sistema
                </CardTitle>
                <CardDescription>Configurações avançadas do sistema</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="idioma">Idioma do Sistema</Label>
                    <div className="relative">
                      <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input id="idioma" className="pl-10" defaultValue="Português (Brasil)" readOnly />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="fuso">Fuso Horário</Label>
                    <div className="relative">
                      <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input id="fuso" className="pl-10" defaultValue="América/São Paulo (GMT-3)" readOnly />
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Backup Automático</Label>
                    <p className="text-sm text-muted-foreground">Realizar backup diário às 03:00</p>
                  </div>
                  <Switch defaultChecked />
                </div>
              </CardContent>
            </Card>

            <Card className="card-elevated">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="w-5 h-5 text-primary" />
                  Informações do Sistema
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="p-4 rounded-lg bg-muted/50">
                    <p className="text-sm text-muted-foreground">Versão</p>
                    <p className="text-lg font-semibold text-foreground">1.0.0</p>
                  </div>
                  <div className="p-4 rounded-lg bg-muted/50">
                    <p className="text-sm text-muted-foreground">Última Atualização</p>
                    <p className="text-lg font-semibold text-foreground">20/01/2025</p>
                  </div>
                  <div className="p-4 rounded-lg bg-muted/50">
                    <p className="text-sm text-muted-foreground">Status</p>
                    <p className="text-lg font-semibold text-success">Online</p>
                  </div>
                  <div className="p-4 rounded-lg bg-muted/50">
                    <p className="text-sm text-muted-foreground">Uptime</p>
                    <p className="text-lg font-semibold text-foreground">99.9%</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
}
