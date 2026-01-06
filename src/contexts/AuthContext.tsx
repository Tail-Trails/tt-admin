import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface AuthContextType {
  isAuthenticated: boolean;
  token: string | null;
  user: { email: string } | null;
  login: (token: string, email: string) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(() => 
    localStorage.getItem('auth_token')
  );
  const [user, setUser] = useState<{ email: string } | null>(() => {
    const email = localStorage.getItem('user_email');
    return email ? { email } : null;
  });

  const login = (newToken: string, email: string) => {
    localStorage.setItem('auth_token', newToken);
    localStorage.setItem('user_email', email);
    setToken(newToken);
    setUser({ email });
  };

  const logout = () => {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user_email');
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{
      isAuthenticated: !!token,
      token,
      user,
      login,
      logout,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
