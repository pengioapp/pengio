import { createContext, useContext, useState, useCallback, type ReactNode } from "react";

export interface ProfileData {
  fullName: string;
  email: string;
  phone: string;
  residence: string;
  age: string;
  profession: string;
  aboutMe: string;
}

interface AuthUser {
  name: string;
  email: string;
}

interface AuthContextType {
  user: AuthUser | null;
  login: (email: string) => boolean;
  signup: (name: string, email: string) => void;
  logout: () => void;
  firstName: string;
  profile: ProfileData;
  updateProfile: (data: ProfileData) => void;
}

const PREDEFINED_USERS: Record<string, string> = {
  "anna@test.com": "Anna Kristoffersen",
  "erik@test.com": "Erik Johansen",
};

const STORAGE_KEY = "pengio-auth-user";
const PROFILE_KEY = "pengio-profile";

const defaultProfile: ProfileData = {
  fullName: "",
  email: "",
  phone: "",
  residence: "",
  age: "",
  profession: "",
  aboutMe: "",
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<AuthUser | null>(() => {
    try {
      const saved = sessionStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [profile, setProfile] = useState<ProfileData>(() => {
    try {
      const saved = sessionStorage.getItem(PROFILE_KEY);
      return saved ? JSON.parse(saved) : defaultProfile;
    } catch {
      return defaultProfile;
    }
  });

  const login = useCallback((email: string): boolean => {
    const normalizedEmail = email.trim().toLowerCase();
    const name = PREDEFINED_USERS[normalizedEmail];
    if (!name) return false;
    const u = { name, email: normalizedEmail };
    setUser(u);
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(u));
    return true;
  }, []);

  const signup = useCallback((name: string, email: string) => {
    const u = { name: name.trim(), email: email.trim().toLowerCase() };
    setUser(u);
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(u));
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    sessionStorage.removeItem(STORAGE_KEY);
  }, []);

  const updateProfile = useCallback((data: ProfileData) => {
    setProfile(data);
    sessionStorage.setItem(PROFILE_KEY, JSON.stringify(data));
    // Also update user name/email to keep in sync
    const u = { name: data.fullName, email: data.email };
    setUser(u);
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(u));
  }, []);

  const firstName = user ? user.name.split(" ")[0] : "";

  return (
    <AuthContext.Provider value={{ user, login, signup, logout, firstName, profile, updateProfile }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};
