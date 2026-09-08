import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useTranslation } from "@/context/LanguageContext";
import { useAuth } from "@/context/AuthContext";
import PasswordField from "@/components/PasswordField";

const MIN_PASSWORD_LENGTH = 8;

const LoginSecurity = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { user, signIn, setPassword } = useAuth();

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;

    if (!currentPassword) {
      setError(t("loginSecurity.currentRequired"));
      return;
    }
    if (newPassword.length < MIN_PASSWORD_LENGTH) {
      setError(t("loginSecurity.tooShort"));
      return;
    }
    if (newPassword !== confirmPassword) {
      setError(t("loginSecurity.mismatch"));
      return;
    }

    setSubmitting(true);
    setError("");

    // updateUser will happily change the password of whoever holds the session,
    // without checking the old one. Signing in again is what makes the "current
    // password" field mean something: an unlocked phone is not enough to lock
    // the real owner out. A failed attempt leaves the existing session intact.
    const email = user?.email ?? "";
    const { error: reauthError } = await signIn(email, currentPassword);
    if (reauthError) {
      setError(t("loginSecurity.wrongCurrentPassword"));
      setSubmitting(false);
      return;
    }

    const { error: updateError } = await setPassword(newPassword);
    if (updateError) {
      setError(updateError);
      setSubmitting(false);
      return;
    }

    toast.success(t("loginSecurity.saved"));
    navigate(-1);
  };

  return (
    <div className="flex flex-col min-h-screen bg-background pb-28">
      <div className="px-6 pt-8 pb-2 flex items-center relative">
        <button onClick={() => navigate(-1)} className="absolute left-4 p-2"><ArrowLeft className="w-6 h-6 text-foreground" /></button>
        <h1 className="text-title text-primary font-bold text-center w-full">{t("loginSecurity.title")}</h1>
      </div>
      <form onSubmit={handleSubmit} className="flex flex-col flex-1">
        <div className="px-6 mt-6 flex flex-col gap-5">
          <div className="flex flex-col gap-2">
            <label className="text-foreground text-sm font-medium">{t("loginSecurity.currentPassword")}</label>
            <PasswordField
              value={currentPassword}
              onChange={(v) => { setCurrentPassword(v); setError(""); }}
              placeholder={t("loginSecurity.enterOldPassword")}
              autoComplete="current-password"
            />
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-foreground text-sm font-medium">{t("loginSecurity.newPassword")}</label>
            <PasswordField
              value={newPassword}
              onChange={(v) => { setNewPassword(v); setError(""); }}
              placeholder={t("loginSecurity.enterNewPassword")}
              autoComplete="new-password"
            />
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-foreground text-sm font-medium">{t("loginSecurity.confirmPassword")}</label>
            <PasswordField
              value={confirmPassword}
              onChange={(v) => { setConfirmPassword(v); setError(""); }}
              placeholder={t("loginSecurity.reEnterNewPassword")}
              autoComplete="new-password"
            />
          </div>

          {error && <p className="text-destructive text-body-small text-center">{error}</p>}
        </div>
        <div className="flex-1" />
        <div className="px-6 mt-6">
          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3.5 rounded-full bg-primary text-background text-base font-bold disabled:opacity-60"
          >
            {submitting ? "…" : t("loginSecurity.savePassword")}
          </button>
        </div>
      </form>
    </div>
  );
};

export default LoginSecurity;
