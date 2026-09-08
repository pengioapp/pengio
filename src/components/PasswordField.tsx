import { useState } from "react";
import { Lock, Eye, EyeOff } from "lucide-react";
import { useTranslation } from "@/context/LanguageContext";

interface Props {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  /** "current-password" when signing in, "new-password" when choosing one. */
  autoComplete?: "current-password" | "new-password";
}

/**
 * A password input that can be revealed.
 *
 * Hidden by default -- someone may well be sitting next to you -- but typing a
 * password blind on a phone keyboard is how people end up locked out, which is
 * exactly what happened during testing. The toggle is the cheapest fix for
 * that, and it is shared so every password field in the app behaves the same.
 */
const PasswordField = ({ value, onChange, placeholder, autoComplete = "current-password" }: Props) => {
  const { t } = useTranslation();
  const [visible, setVisible] = useState(false);

  return (
    <div className="flex items-center gap-3 bg-secondary rounded-xl px-4 py-3.5">
      <Lock className="w-4 h-4 text-muted-foreground shrink-0" />
      <input
        type={visible ? "text" : "password"}
        autoComplete={autoComplete}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="flex-1 bg-transparent text-body-standard text-foreground placeholder:text-muted-foreground outline-none"
      />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? t("password.hide") : t("password.show")}
        aria-pressed={visible}
        className="text-muted-foreground shrink-0 p-1 -m-1"
      >
        {visible ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
      </button>
    </div>
  );
};

export default PasswordField;
