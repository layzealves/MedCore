import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
  useMemo,
} from "react";
import { User, Session, AuthChangeEvent } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
}

interface AuthProviderProps {
  children: ReactNode;
}

const DEFAULT_AUTH_STATE: AuthContextType = {
  user: null,
  session: null,
  loading: true,
};

const AuthContext = createContext<AuthContextType>(DEFAULT_AUTH_STATE);

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    function handleAuthStateChange(
      _event: AuthChangeEvent,
      newSession: Session | null
    ) {
      setSession(newSession);
      setUser(newSession?.user ?? null);
      setLoading(false);
    }

    async function initializeAuth() {
      const { data } = await supabase.auth.getSession();
      setSession(data.session);
      setUser(data.session?.user ?? null);
      setLoading(false);
    }

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(handleAuthStateChange);

    initializeAuth();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const contextValue = useMemo<AuthContextType>(
    () => ({ user, session, loading }),
    [user, session, loading]
  );

  return (
    <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>
  );
}
