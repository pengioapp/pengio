import { useState } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { Lock, Search } from "lucide-react";
import loginIllustration from "@/assets/login-illustration.png";
import { useTranslation } from "@/context/LanguageContext";
import { useAuth } from "@/context/AuthContext";

const Login = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();
  const { signIn } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Where RequireAuth bounced them from, so signing in resumes the journey.
  const from = (location.state as { from?: string } | null)?.from ?? "/home";

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;

    // Reported separately. A single message covering both used to name two
    // accounts from the prototype's hardcoded login, sending people off to
    // sign in as users who no longer exist.
    if (!email.trim()) {
      setError(t("login.emailRequired"));
      return;
    }
    if (!password) {
      setError(t("login.passwordRequired"));
      return;
    }

    setSubmitting(true);
    setError("");

    const { error: signInError } = await signIn(email, password);

    if (signInError) {
      setError(signInError);
      setSubmitting(false);
      return;
    }

    navigate(from, { replace: true });
  };

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <div
        className="relative bg-primary flex flex-col items-center justify-center overflow-hidden"
        style={{ minHeight: '220px' }}
      >
        <svg viewBox="0 0 400 220" className="absolute inset-0 w-full h-full z-0" preserveAspectRatio="none">
          <path d="M0,0 L400,0 L400,160 Q350,120 280,140 Q180,170 100,130 Q50,110 0,150 Z" fill="hsl(43, 85%, 50%)" opacity="0.3" />
          <path d="M0,0 L400,0 L400,120 Q320,160 220,130 Q120,100 0,160 Z" fill="hsl(40, 80%, 48%)" opacity="0.2" />
        </svg>
        <button onClick={() => navigate("/")} className="absolute top-4 left-4 w-10 h-10 rounded-full bg-primary-foreground/15 flex items-center justify-center text-primary-foreground z-20">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6" /></svg>
        </button>
        <img src={loginIllustration} alt="Loan approved illustration" className="relative z-20 w-48 h-48 object-contain mb-[-4rem]" />
      </div>

      <div className="flex-1 bg-dark-gray rounded-t-[2rem] -mt-4 relative z-10 px-6 pt-8 pb-8 flex flex-col">
        <h1 className="text-h4 font-bold text-primary text-center mb-1">{t("login.title")}</h1>
        <p className="text-body-small text-muted-foreground text-center mb-8">{t("login.subtitle")}</p>

        <form onSubmit={handleLogin} className="flex flex-col gap-5 flex-1">
          <div>
            <label className="text-body-small text-foreground mb-2 block font-medium">{t("login.email")}</label>
            <div className="flex items-center gap-3 bg-secondary rounded-xl px-4 py-3.5">
              <Search className="w-4 h-4 text-muted-foreground" />
              <input type="email" autoComplete="email" value={email} onChange={(e) => { setEmail(e.target.value); setError(""); }} placeholder={t("login.enterEmail")} className="flex-1 bg-transparent text-body-standard text-foreground placeholder:text-muted-foreground outline-none" />
            </div>
          </div>

          <div>
            <label className="text-body-small text-foreground mb-2 block font-medium">{t("login.password")}</label>
            <div className="flex items-center gap-3 bg-secondary rounded-xl px-4 py-3.5">
              <Search className="w-4 h-4 text-muted-foreground" />
              <input type="password" autoComplete="current-password" value={password} onChange={(e) => { setPassword(e.target.value); setError(""); }} placeholder={t("login.enterPassword")} className="flex-1 bg-transparent text-body-standard text-foreground placeholder:text-muted-foreground outline-none" />
            </div>
          </div>

          {error && <p className="text-destructive text-body-small text-center">{error}</p>}
          <div className="mt-auto pt-6 flex flex-col items-center gap-4">
            <button type="submit" disabled={submitting} className="w-full py-4 rounded-full bg-primary text-primary-foreground text-title font-bold hover:brightness-95 transition-all disabled:opacity-60">
              {submitting ? "…" : t("login.loginNow")}
            </button>
            <p className="text-body-small text-muted-foreground">
              {t("login.noAccount")}{" "}
              <Link to="/create-account" className="text-primary font-bold underline">{t("login.createOne")}</Link>
            </p>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Login;
