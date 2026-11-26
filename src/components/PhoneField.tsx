import { Phone } from "lucide-react";
import { useTranslation } from "@/context/LanguageContext";

/** The Nordics first, then the places Norwegians most often have family. */
const COUNTRY_CODES = ["+47", "+46", "+45", "+358", "+354", "+44", "+48", "+49", "+1"];

interface Props {
  /** Dialling code, e.g. "+47". */
  code: string;
  onCodeChange: (code: string) => void;
  /** The local part, digits only. */
  number: string;
  onNumberChange: (number: string) => void;
  autoFocus?: boolean;
}

/**
 * A phone number with its country code.
 *
 * The code used to be the literal text "+47" printed beside the input, so a
 * Swedish or Danish number was silently stored as a Norwegian one. The
 * database assumes +47 only for a bare eight-digit number; anything typed with
 * a code keeps it.
 */
const PhoneField = ({ code, onCodeChange, number, onNumberChange, autoFocus }: Props) => {
  const { t } = useTranslation();

  return (
    <div className="flex items-center gap-2 bg-secondary rounded-xl px-4 py-3.5">
      <Phone className="w-5 h-5 text-muted-foreground shrink-0" strokeWidth={1.5} />
      <select
        value={code}
        onChange={(e) => onCodeChange(e.target.value)}
        aria-label={t("phone.country")}
        className="bg-transparent text-body-standard text-foreground outline-none shrink-0 cursor-pointer"
      >
        {COUNTRY_CODES.map((c) => (
          <option key={c} value={c} className="bg-secondary text-foreground">{c}</option>
        ))}
      </select>
      <input
        type="tel"
        inputMode="numeric"
        autoComplete="tel-national"
        autoFocus={autoFocus}
        value={number}
        onChange={(e) => onNumberChange(e.target.value.replace(/[^0-9]/g, ""))}
        placeholder={t("phone.enterNumber")}
        className="flex-1 min-w-0 bg-transparent text-body-standard text-foreground placeholder:text-muted-foreground outline-none"
      />
    </div>
  );
};

export default PhoneField;
