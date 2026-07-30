import { nb } from "date-fns/locale";
import { format as dateFnsFormat, parse, type Locale } from "date-fns";

const locales: Record<string, Locale> = { no: nb };

export function formatDate(date: Date, language: string): string {
  if (language === "no") {
    return dateFnsFormat(date, "d. MMMM yyyy", { locale: nb });
  }
  return dateFnsFormat(date, "d MMMM yyyy");
}

export function formatDateString(dateStr: string, language: string): string {
  if (!dateStr || dateStr === "—") return dateStr;
  // Try parsing common English date formats
  const formats = ["d MMMM yyyy", "dd MMMM yyyy", "MMMM d, yyyy", "yyyy-MM-dd"];
  for (const fmt of formats) {
    try {
      const parsed = parse(dateStr, fmt, new Date());
      if (!isNaN(parsed.getTime())) {
        return formatDate(parsed, language);
      }
    } catch {
      // try next format
    }
  }
  return dateStr;
}

export function formatDuration(count: number, language: string): string {
  if (language === "no") {
    return `${count} ${count === 1 ? "måned" : "måneder"}`;
  }
  return `${count} ${count === 1 ? "month" : "months"}`;
}

export function getDateLocale(language: string): Locale | undefined {
  return locales[language];
}
