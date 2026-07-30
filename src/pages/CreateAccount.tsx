import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Mail, Lock, CheckSquare, Square, User } from "lucide-react";
import { useTranslation } from "@/context/LanguageContext";
import { useAuth } from "@/context/AuthContext";

const CreateAccount = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { signup } = useAuth();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [termsAccepted, setTermsAccepted] = useState(false);

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) return;
    if (!termsAccepted) return;
    if (!fullName.trim()) return;
    signup(fullName, email);
    navigate("/home");
  };

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <div className="relative bg-primary pt-12 pb-16 px-6 overflow-hidden">
        <svg viewBox="0 0 400 200" className="absolute inset-0 w-full h-full" preserveAspectRatio="none">
          <path d="M0,0 L400,0 L400,200 L0,200 Z" fill="hsl(47, 91%, 61%)" />
          <path d="M-50,60 Q80,20 200,80 Q320,140 450,60 L450,200 L-50,200 Z" fill="hsl(43, 80%, 48%)" opacity="0.3" />
          <path d="M-50,100 Q100,60 220,110 Q340,160 450,90 L450,200 L-50,200 Z" fill="hsl(40, 75%, 45%)" opacity="0.25" />
        </svg>
        <button onClick={() => navigate("/login")} className="relative z-10 w-10 h-10 rounded-full bg-primary-foreground/15 flex items-center justify-center text-primary-foreground mb-4">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6" /></svg>
        </button>
      </div>

      <div className="flex-1 bg-dark-gray rounded-t-3xl -mt-6 relative z-10 px-6 pt-8 pb-8 flex flex-col">
        <h1 className="text-h4 font-bold text-primary mb-1">{t("createAccount.title")}</h1>
        <p className="text-body-small text-muted-foreground mb-6">{t("createAccount.subtitle")}</p>

        <form onSubmit={handleCreate} className="flex flex-col gap-4 flex-1">
          <div>
            <label className="text-body-small text-foreground mb-2 block">{t("createAccount.fullName")}</label>
            <div className="flex items-center gap-3 bg-secondary rounded-xl px-4 py-3">
              <User className="w-4 h-4 text-muted-foreground" />
              <input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder={t("createAccount.enterFullName")} className="flex-1 bg-transparent text-body-standard text-foreground placeholder:text-muted-foreground outline-none" />
            </div>
          </div>

          <div>
            <label className="text-body-small text-foreground mb-2 block">{t("createAccount.email")}</label>
            <div className="flex items-center gap-3 bg-secondary rounded-xl px-4 py-3">
              <Mail className="w-4 h-4 text-muted-foreground" />
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder={t("createAccount.enterEmail")} className="flex-1 bg-transparent text-body-standard text-foreground placeholder:text-muted-foreground outline-none" />
            </div>
          </div>

          <div>
            <label className="text-body-small text-foreground mb-2 block">{t("createAccount.password")}</label>
            <div className="flex items-center gap-3 bg-secondary rounded-xl px-4 py-3">
              <Lock className="w-4 h-4 text-muted-foreground" />
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder={t("createAccount.enterPassword")} className="flex-1 bg-transparent text-body-standard text-foreground placeholder:text-muted-foreground outline-none" />
            </div>
          </div>

          <div>
            <label className="text-body-small text-foreground mb-2 block">{t("createAccount.confirmPassword")}</label>
            <div className="flex items-center gap-3 bg-secondary rounded-xl px-4 py-3">
              <Lock className="w-4 h-4 text-muted-foreground" />
              <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder={t("createAccount.reEnterPassword")} className="flex-1 bg-transparent text-body-standard text-foreground placeholder:text-muted-foreground outline-none" />
            </div>
          </div>

          <button type="button" onClick={() => setTermsAccepted(!termsAccepted)} className="flex items-start gap-3 mt-1">
            {termsAccepted ? <CheckSquare className="w-5 h-5 text-primary shrink-0 mt-0.5" /> : <Square className="w-5 h-5 text-muted-foreground shrink-0 mt-0.5" />}
            <span className="text-body-micro text-muted-foreground text-left">{t("createAccount.terms")}</span>
          </button>

          <div className="mt-auto pt-4 flex flex-col gap-3">
            <button type="submit" className="w-full py-4 rounded-full bg-primary text-primary-foreground text-title font-bold hover:brightness-95 transition-all">
              {t("createAccount.create")}
            </button>
            <p className="text-body-micro text-muted-foreground text-center">{t("createAccount.or")}</p>
            <button type="button" className="w-full py-4 rounded-full border-2 border-primary text-primary text-title font-bold hover:bg-primary/10 transition-all">
              {t("createAccount.vipps")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateAccount;
