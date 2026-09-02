import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

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

export interface AuthResult {
  error: string | null;
}

interface AuthContextType {
  user: AuthUser | null;
  session: Session | null;
  /** True until the initial session lookup finishes. Guards against redirecting
   *  a signed-in user to /login during the first render. */
  loading: boolean;
  signIn: (email: string, password: string) => Promise<AuthResult>;
  signUp: (name: string, email: string, password: string) => Promise<AuthResult>;
  requestPasswordReset: (email: string) => Promise<AuthResult>;
  setPassword: (password: string) => Promise<AuthResult>;
  logout: () => Promise<void>;
  firstName: string;
  profile: ProfileData;
  updateProfile: (data: ProfileData) => Promise<AuthResult>;
}

const emptyProfile: ProfileData = {
  fullName: "",
  email: "",
  phone: "",
  residence: "",
  age: "",
  profession: "",
  aboutMe: "",
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Age is derived rather than stored: a stored age is wrong from the next
// birthday onwards, and nothing would ever correct it.
const ageFromBirthDate = (birthDate: string | null): string => {
  if (!birthDate) return "";
  const born = new Date(birthDate);
  if (Number.isNaN(born.getTime())) return "";
  const now = new Date();
  let age = now.getFullYear() - born.getFullYear();
  const monthDiff = now.getMonth() - born.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < born.getDate())) age -= 1;
  return age >= 0 ? String(age) : "";
};

// Supabase surfaces raw auth errors that are fine for logs but poor for users.
const humanise = (message: string): string => {
  const m = message.toLowerCase();
  if (m.includes("invalid login credentials")) return "Wrong email or password.";
  if (m.includes("email not confirmed")) return "Check your inbox to confirm your email first.";
  if (m.includes("already registered")) return "That email already has an account.";
  if (m.includes("rate limit")) return "Too many attempts. Wait a minute and try again.";
  if (m.includes("password")) return message;
  return message;
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<ProfileData>(emptyProfile);
  const [loading, setLoading] = useState(true);

  const loadProfile = useCallback(async (authUser: User) => {
    const { data, error } = await supabase
      .from("profiles")
      .select("full_name, email, phone, residence, birth_date, profession, about_me")
      .eq("id", authUser.id)
      .maybeSingle();

    if (error || !data) {
      // The signup trigger creates this row, so a miss means the row is still
      // in flight or was removed. Fall back to what the token already tells us
      // rather than rendering a blank profile.
      setProfile({
        ...emptyProfile,
        fullName: (authUser.user_metadata?.full_name as string) ?? "",
        email: authUser.email ?? "",
      });
      return;
    }

    setProfile({
      fullName: data.full_name ?? "",
      email: data.email ?? "",
      phone: data.phone ?? "",
      residence: data.residence ?? "",
      age: ageFromBirthDate(data.birth_date),
      profession: data.profession ?? "",
      aboutMe: data.about_me ?? "",
    });
  }, []);

  useEffect(() => {
    let active = true;

    // onAuthStateChange fires immediately with the restored session, and again
    // on every sign-in, sign-out, and token refresh. Registering it before the
    // getSession call below means a session restored from storage is never
    // missed in the gap between the two.
    const { data: subscription } = supabase.auth.onAuthStateChange((_event, next) => {
      if (!active) return;
      setSession(next);
      if (next?.user) {
        void loadProfile(next.user);
      } else {
        setProfile(emptyProfile);
      }
      setLoading(false);
    });

    void supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      setSession(data.session);
      if (data.session?.user) void loadProfile(data.session.user);
      setLoading(false);
    });

    return () => {
      active = false;
      subscription.subscription.unsubscribe();
    };
  }, [loadProfile]);

  const signIn = useCallback(async (email: string, password: string): Promise<AuthResult> => {
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });
    return { error: error ? humanise(error.message) : null };
  }, []);

  const signUp = useCallback(
    async (name: string, email: string, password: string): Promise<AuthResult> => {
      const { error } = await supabase.auth.signUp({
        email: email.trim().toLowerCase(),
        password,
        // Read by handle_new_user() to populate profiles.full_name, so the
        // profile is never created nameless.
        options: { data: { full_name: name.trim() } },
      });
      return { error: error ? humanise(error.message) : null };
    },
    []
  );

  const requestPasswordReset = useCallback(async (email: string): Promise<AuthResult> => {
    // redirectTo has to be on Supabase's allow list, so it is derived from
    // wherever the app is actually running rather than hardcoded.
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    return { error: error ? humanise(error.message) : null };
  }, []);

  const setPassword = useCallback(async (password: string): Promise<AuthResult> => {
    const { error } = await supabase.auth.updateUser({ password });
    return { error: error ? humanise(error.message) : null };
  }, []);

  const logout = useCallback(async () => {
    await supabase.auth.signOut();
  }, []);

  const updateProfile = useCallback(
    async (data: ProfileData): Promise<AuthResult> => {
      if (!session?.user) return { error: "You are not signed in." };

      // age is intentionally not written back. It is derived from birth_date,
      // and turning a whole-number age into a date would invent a birthday.
      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: data.fullName.trim(),
          phone: data.phone || null,
          residence: data.residence || null,
          profession: data.profession || null,
          about_me: data.aboutMe || null,
        })
        .eq("id", session.user.id);

      if (error) return { error: error.message };

      setProfile((prev) => ({ ...data, age: prev.age, email: prev.email }));
      return { error: null };
    },
    [session]
  );

  const user: AuthUser | null = session?.user
    ? {
        name: profile.fullName || (session.user.user_metadata?.full_name as string) || "",
        email: session.user.email ?? "",
      }
    : null;

  const firstName = user?.name ? user.name.split(" ")[0] : "";

  return (
    <AuthContext.Provider
      value={{
        user, session, loading, signIn, signUp, logout, firstName, profile,
        updateProfile, requestPasswordReset, setPassword,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};
