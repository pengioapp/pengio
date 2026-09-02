import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Mail } from "lucide-react";
import { useTranslation } from "@/context/LanguageContext";
import { useAuth } from "@/context/AuthContext";

const ForgotPassword = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { requestPasswordReset } = useAuth();

  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;

    if (!email.trim()) {
      setError(t("login.emailRequired"));
      return;
    }

    setSubmitting(true);
    setError("");

    const { error: resetError } = await requestPasswordReset(email);

    // Reported as sent either way. Saying "no account with that email" would
    // tell anyone who asks which addresses are registered here -- on an app
    // about borrowing money, that is not a harmless thing to disclose.
    if (resetError && !resetError.toLowerCase().includes("not found")) {
      setError(resetError);
      setSubmitting(false);
      return;
    }

    setSent(true);
    setSubmitting(false);
  };

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <div className="px-6 pt-6 pb-4 flex items-center">
        <button onClick={() => navigate("/login")} className="w-10 h-10 rounded-full flex items-center justify-center text-foreground">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6" /></svg>
        </button>
        <h1 className="flex-1 text-title text-primary font-bold text-center pr-10">{t("forgot.title")}</h1>
      </div>

      <div className="flex-1 px-6 pb-8 flex flex-col">
        {sent ? (
          <div className="mt-8 bg-secondary rounded-xl p-5">
            <p className="text-body-standard text-foreground">{t("forgot.sent")}</p>
            <Link to="/login" className="text-primary text-body-small font-bold underline mt-4 inline-block">
              {t("forgot.backToLogin")}
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-5 flex-1">
            <p className="text-body-small text-muted-foreground mt-2">{t("forgot.subtitle")}</p>

            <div>
              <label className="text-body-small text-foreground mb-2 block font-medium">{t("forgot.email")}</label>
              <div className="flex items-center gap-3 bg-secondary rounded-xl px-4 py-3.5">
                <Mail className="w-4 h-4 text-muted-foreground" />
                <input
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setError(""); }}
                  placeholder={t("login.enterEmail")}
                  className="flex-1 bg-transparent text-body-standard text-foreground placeholder:text-muted-foreground outline-none"
                />
              </div>
            </div>

            {error && <p className="text-destructive text-body-small text-center">{error}</p>}

            <div className="mt-auto pt-6 flex flex-col items-center gap-4">
              <button
                type="submit"
                disabled={submitting}
                className="w-full py-4 rounded-full bg-primary text-primary-foreground text-title font-bold hover:brightness-95 transition-all disabled:opacity-60"
              >
                {submitting ? "…" : t("forgot.send")}
              </button>
              <Link to="/login" className="text-body-small text-muted-foreground underline">
                {t("forgot.backToLogin")}
              </Link>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default ForgotPassword;
