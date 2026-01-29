import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { 
  HelpCircle, 
  MessageCircle, 
  FileText, 
  Video, 
  Mail, 
  Phone, 
  ExternalLink,
  BookOpen,
  Users,
  Calendar,
  Bed,
  ClipboardList
} from "lucide-react";

const faqs = [
  {
    question: "Como cadastrar um novo paciente?",
    answer: "Para cadastrar um novo paciente, acesse o menu 'Pacientes' no painel lateral e clique no botão 'Novo Paciente'. Preencha os dados obrigatórios como nome, CPF e data de nascimento, e clique em 'Salvar'."
  },
  {
    question: "Como agendar uma consulta?",
    answer: "Vá até o menu 'Agendamentos' e clique em 'Novo Agendamento'. Selecione o paciente, o profissional de saúde, a data e horário desejados. Você também pode definir se será uma consulta presencial ou por telemedicina."
  },
  {
    question: "Como acessar o prontuário de um paciente?",
    answer: "Acesse o menu 'Prontuários' e utilize a barra de pesquisa para encontrar o paciente desejado. Clique no prontuário para visualizar todo o histórico médico, incluindo consultas anteriores, exames e prescrições."
  },
  {
    question: "Como gerenciar a ocupação de leitos?",
    answer: "No menu 'Leitos', você pode visualizar a ocupação atual de todos os leitos por departamento. Para internar um paciente, clique no leito disponível e selecione 'Nova Internação'. Para dar alta, acesse a internação ativa e clique em 'Registrar Alta'."
  },
  {
    question: "Como alterar minha senha?",
    answer: "Acesse 'Configurações' através do menu do seu perfil no canto superior direito. Na aba 'Segurança', você encontrará a opção para alterar sua senha. Digite sua senha atual e a nova senha desejada."
  },
  {
    question: "Como exportar relatórios?",
    answer: "Na maioria das telas do sistema, você encontrará um botão 'Exportar' que permite baixar os dados em formato Excel ou PDF. Utilize os filtros disponíveis para personalizar as informações do relatório."
  },
  {
    question: "Como funciona o sistema de notificações?",
    answer: "O sistema envia notificações automaticamente para alertar sobre consultas próximas, novas internações e pacientes cadastrados recentemente. Você pode personalizar suas preferências de notificação em Configurações > Notificações."
  },
  {
    question: "Como utilizar a telemedicina?",
    answer: "Para realizar uma consulta por telemedicina, acesse o menu 'Telemedicina'. Você verá as consultas agendadas para o dia. Clique em 'Iniciar Consulta' quando estiver pronto para iniciar a videochamada com o paciente."
  }
];

const quickLinks = [
  { icon: Users, label: "Gerenciar Pacientes", path: "/pacientes" },
  { icon: Calendar, label: "Agendamentos", path: "/agendamentos" },
  { icon: ClipboardList, label: "Prontuários", path: "/prontuarios" },
  { icon: Bed, label: "Gestão de Leitos", path: "/leitos" },
];

export default function Ajuda() {
  return (
    <MainLayout title="Central de Ajuda" subtitle="Encontre respostas e suporte para utilizar o sistema">
      <div className="space-y-6">
        {/* Quick Links */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {quickLinks.map((link) => (
            <Card 
              key={link.path} 
              className="card-elevated cursor-pointer hover:shadow-lg transition-shadow"
              onClick={() => window.location.href = link.path}
            >
              <CardContent className="flex flex-col items-center justify-center p-6">
                <div className="w-12 h-12 rounded-full gradient-primary flex items-center justify-center mb-3">
                  <link.icon className="w-6 h-6 text-primary-foreground" />
                </div>
                <span className="text-sm font-medium text-center">{link.label}</span>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* FAQ Section */}
          <div className="lg:col-span-2">
            <Card className="card-elevated">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <HelpCircle className="w-5 h-5 text-primary" />
                  Perguntas Frequentes
                </CardTitle>
                <CardDescription>Encontre respostas para as dúvidas mais comuns</CardDescription>
              </CardHeader>
              <CardContent>
                <Accordion type="single" collapsible className="w-full">
                  {faqs.map((faq, index) => (
                    <AccordionItem key={index} value={`item-${index}`}>
                      <AccordionTrigger className="text-left">
                        {faq.question}
                      </AccordionTrigger>
                      <AccordionContent className="text-muted-foreground">
                        {faq.answer}
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </CardContent>
            </Card>
          </div>

          {/* Contact & Resources */}
          <div className="space-y-6">
            <Card className="card-elevated">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageCircle className="w-5 h-5 text-primary" />
                  Suporte
                </CardTitle>
                <CardDescription>Entre em contato conosco</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                  <Mail className="w-5 h-5 text-primary" />
                  <div>
                    <p className="text-sm font-medium">E-mail</p>
                    <p className="text-sm text-muted-foreground">suporte@hospital.com.br</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                  <Phone className="w-5 h-5 text-primary" />
                  <div>
                    <p className="text-sm font-medium">Telefone</p>
                    <p className="text-sm text-muted-foreground">(11) 3000-0000</p>
                  </div>
                </div>
                <Button className="w-full gradient-primary text-primary-foreground">
                  <MessageCircle className="w-4 h-4 mr-2" />
                  Abrir Chamado
                </Button>
              </CardContent>
            </Card>

            <Card className="card-elevated">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-primary" />
                  Recursos
                </CardTitle>
                <CardDescription>Materiais de apoio</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button variant="outline" className="w-full justify-start gap-2">
                  <FileText className="w-4 h-4" />
                  Manual do Usuário
                  <ExternalLink className="w-3 h-3 ml-auto" />
                </Button>
                <Button variant="outline" className="w-full justify-start gap-2">
                  <Video className="w-4 h-4" />
                  Tutoriais em Vídeo
                  <ExternalLink className="w-3 h-3 ml-auto" />
                </Button>
                <Button variant="outline" className="w-full justify-start gap-2">
                  <FileText className="w-4 h-4" />
                  Novidades da Versão
                  <ExternalLink className="w-3 h-3 ml-auto" />
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
