import { useState } from "react";
import { CalendarDays } from "lucide-react";
import { useTranslation } from "@/context/LanguageContext";
import { formatDate, getDateLocale } from "@/lib/dateLocale";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";

interface Props {
  value: Date | undefined;
  onChange: (date: Date | undefined) => void;
  /** Styling differs between the full-width wizard step and the counter dialog. */
  triggerClassName?: string;
  showIcon?: boolean;
}

/**
 * A repayment date picker that closes when you say it should.
 *
 * The calendar used to stay open after a date was tapped, with no obvious way
 * to dismiss it other than tapping the page behind -- which on a phone is
 * mostly covered by the calendar itself. An explicit OK button gives the
 * interaction an end.
 *
 * Only past dates are blocked; a repayment date is an agreement between two
 * people and Pengio has no business capping how far out it can be.
 */
const DateField = ({ value, onChange, triggerClassName, showIcon = true }: Props) => {
  const { t, language } = useTranslation();
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={
            triggerClassName ??
            "w-full bg-secondary rounded-xl px-4 py-3.5 flex items-center gap-3"
          }
        >
          {showIcon && <CalendarDays className="w-5 h-5 text-muted-foreground shrink-0" />}
          <span className={`flex-1 text-left text-body-standard ${value ? "text-foreground" : "text-muted-foreground"}`}>
            {value ? formatDate(value, language) : t("lend.selectDate")}
          </span>
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={value}
          onSelect={onChange}
          disabled={(d) => d <= new Date()}
          locale={getDateLocale(language)}
          initialFocus
          className="p-3 pointer-events-auto"
        />
        {/* Always enabled: with no date chosen this reads as "done", and
            leaving the field empty is caught by the step that needs it. */}
        <div className="border-t border-foreground/10 p-2">
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="w-full py-2.5 rounded-lg bg-primary text-primary-foreground text-body-small font-bold"
          >
            {t("common.ok")}
          </button>
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default DateField;
