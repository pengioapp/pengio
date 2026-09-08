import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { toast } from "sonner";
import { useTranslation } from "@/context/LanguageContext";
import { useAuth } from "@/context/AuthContext";
import PasswordField from "@/components/PasswordField";

const MIN_PASSWORD_LENGTH = 8;

/**
 * Where the emailed recovery link lands.
 *
 * Supabase puts a recovery token in the URL fragment; the client picks it up
 * and establishes a session before this renders. So arriving here already
 * signed in is the success case, and arriving without a session means the link
 * was bad or has expired.
 */
const ResetPassword = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { setPassword, session, loading } = useAuth();

  const [password, setPasswordValue] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [linkChecked, setLinkChecked] = useState(false);

  // The token is consumed asynchronously, so a missing session is only
  // meaningful once that has had a chance to finish.
  useEffect(() => {
    if (!loading) setLinkChecked(true);
  }, [loading]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;

    if (password.length < MIN_PASSWORD_LENGTH) {
      setError(t("reset.tooShort"));
      return;
    }
    if (password !== confirm) {
      setError(t("reset.mismatch"));
      return;
    }

    setSubmitting(true);
    setError("");

    const { error: setError_ } = await setPassword(password);

    if (setError_) {
      setError(setError_);
      setSubmitting(false);
      return;
    }

    toast.success(t("reset.saved"));
    navigate("/home", { replace: true });
  };

  if (!linkChecked) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" role="status" aria-label="Loading" />
      </div>
    );
  }

  if (!session) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background px-6 text-center">
        <p className="text-foreground text-body-standard mb-4">{t("reset.invalidLink")}</p>
        <Link to="/forgot-password" className="text-primary text-body-small font-bold underline">
          {t("forgot.title")}
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <div className="px-6 pt-6 pb-4">
        <h1 className="text-title text-primary font-bold text-center">{t("reset.title")}</h1>
      </div>

      <div className="flex-1 px-6 pb-8 flex flex-col">
        <form onSubmit={handleSubmit} className="flex flex-col gap-5 flex-1">
          <p className="text-body-small text-muted-foreground">{t("reset.subtitle")}</p>

          <div>
            <label className="text-body-small text-foreground mb-2 block font-medium">{t("reset.password")}</label>
            <PasswordField
              value={password}
              onChange={(v) => { setPasswordValue(v); setError(""); }}
              autoComplete="new-password"
            />
          </div>

          <div>
            <label className="text-body-small text-foreground mb-2 block font-medium">{t("reset.confirm")}</label>
            <PasswordField
              value={confirm}
              onChange={(v) => { setConfirm(v); setError(""); }}
              autoComplete="new-password"
            />
          </div>

          {error && <p className="text-destructive text-body-small text-center">{error}</p>}

          <div className="mt-auto pt-6">
            <button
              type="submit"
              disabled={submitting}
              className="w-full py-4 rounded-full bg-primary text-primary-foreground text-title font-bold hover:brightness-95 transition-all disabled:opacity-60"
            >
              {submitting ? "…" : t("reset.save")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ResetPassword;
