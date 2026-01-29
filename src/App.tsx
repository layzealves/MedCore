import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { AuthProvider } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import Index from "./pages/Index";
import Login from "./pages/Login";
import RedefinirSenha from "./pages/RedefinirSenha";
import Pacientes from "./pages/Pacientes";
import Profissionais from "./pages/Profissionais";
import Agendamentos from "./pages/Agendamentos";
import Leitos from "./pages/Leitos";
import Telemedicina from "./pages/Telemedicina";
import Prontuarios from "./pages/Prontuarios";
import Auditoria from "./pages/Auditoria";
import Configuracoes from "./pages/Configuracoes";
import Ajuda from "./pages/Ajuda";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthProvider>
            <Routes>
              {/* Public routes */}
              <Route path="/login" element={<Login />} />
              <Route path="/redefinir-senha" element={<RedefinirSenha />} />
              
              {/* Protected routes */}
              <Route path="/" element={<ProtectedRoute><Index /></ProtectedRoute>} />
              <Route path="/pacientes" element={<ProtectedRoute><Pacientes /></ProtectedRoute>} />
              <Route path="/profissionais" element={<ProtectedRoute><Profissionais /></ProtectedRoute>} />
              <Route path="/agendamentos" element={<ProtectedRoute><Agendamentos /></ProtectedRoute>} />
              <Route path="/leitos" element={<ProtectedRoute><Leitos /></ProtectedRoute>} />
              <Route path="/prontuarios" element={<ProtectedRoute><Prontuarios /></ProtectedRoute>} />
              <Route path="/telemedicina" element={<ProtectedRoute><Telemedicina /></ProtectedRoute>} />
              <Route path="/auditoria" element={<ProtectedRoute><Auditoria /></ProtectedRoute>} />
              <Route path="/configuracoes" element={<ProtectedRoute><Configuracoes /></ProtectedRoute>} />
              <Route path="/ajuda" element={<ProtectedRoute><Ajuda /></ProtectedRoute>} />
              
              {/* Catch-all */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
