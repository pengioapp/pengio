import { useNavigate } from "react-router-dom";
import { ArrowLeft, CalendarDays } from "lucide-react";
import { useTranslation } from "@/context/LanguageContext";
import { formatDateString } from "@/lib/dateLocale";
import { useLoans } from "@/hooks/useLoans";
import { formatAmount, type Loan } from "@/lib/loans";

type BadgeType = "overdue" | "due-soon" | "days-left" | "upcoming";

const badgeStyles: Record<BadgeType, string> = {
  "overdue": "bg-destructive text-destructive-foreground",
  "due-soon": "bg-primary text-background",
  "days-left": "bg-[#41D33E] text-background",
  "upcoming": "bg-[hsl(0,0%,30%)] text-foreground",
};

const daysUntil = (isoDate: string) => {
  const due = new Date(isoDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.ceil((due.getTime() - today.getTime()) / 86_400_000);
};

const PaymentCard = ({ loan }: { loan: Loan }) => {
  const navigate = useNavigate();
  const { t, language } = useTranslation();
  const days = daysUntil(loan.repaymentDate);

  const badge: BadgeType =
    days < 0 ? "overdue" : days <= 3 ? "due-soon" : days <= 7 ? "days-left" : "upcoming";

  const badgeLabel =
    days < 0 ? t("upcomingPayments.overdue")
    : days <= 3 ? t("status.dueSoon")
    : t("upcomingPayments.daysLeft", { count: days });

  return (
    <div
      onClick={() => navigate("/loan-details", { state: { loanId: loan.id } })}
      className="bg-secondary rounded-xl overflow-hidden cursor-pointer active:opacity-80 transition-opacity"
    >
      <div className="px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <CalendarDays className="w-5 h-5 text-muted-foreground" strokeWidth={1.5} />
          <span className="text-foreground text-sm font-medium">{formatDateString(loan.repaymentDate, language)}</span>
        </div>
        <span className={`text-xs font-semibold px-3 py-1 rounded-full ${badgeStyles[badge]}`}>{badgeLabel}</span>
      </div>
      <div className="px-4 pb-3 flex flex-col gap-1.5">
        <div className="flex justify-between items-center">
          <span className="text-muted-foreground text-sm">
            {loan.role === "borrower" ? t("upcomingPayments.youOwe") : t("upcomingPayments.owesYou")}
          </span>
          <span className="text-foreground text-sm">{loan.counterparty.name}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-muted-foreground text-sm">{t("upcomingPayments.amount")}</span>
          <span className="text-primary text-sm font-medium">{formatAmount(loan.outstanding, loan.currency)}</span>
        </div>
      </div>
    </div>
  );
};

const UpcomingPayments = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { data: loans, isLoading } = useLoans();

  // Only unsettled loans have anything still due. Buckets are derived from the
  // repayment date rather than hardcoded, so they stay correct as time passes.
  const active = (loans ?? [])
    .filter((l) => l.status === "active")
    .sort((a, b) => a.repaymentDate.localeCompare(b.repaymentDate));

  const overdue = active.filter((l) => daysUntil(l.repaymentDate) < 0);
  const thisWeek = active.filter((l) => {
    const d = daysUntil(l.repaymentDate);
    return d >= 0 && d <= 7;
  });
  const nextWeek = active.filter((l) => {
    const d = daysUntil(l.repaymentDate);
    return d > 7 && d <= 14;
  });
  const later = active.filter((l) => daysUntil(l.repaymentDate) > 14);

  const sections = [
    { title: t("upcomingPayments.overdue"), items: overdue },
    { title: t("upcomingPayments.thisWeek"), items: thisWeek },
    { title: t("upcomingPayments.nextWeek"), items: nextWeek },
    { title: t("upcomingPayments.later"), items: later },
  ].filter((s) => s.items.length > 0);

  return (
    <div className="flex flex-col min-h-screen bg-background pb-8">
      <div className="px-6 pt-8 pb-2 flex items-center relative">
        <button onClick={() => navigate("/profile")} className="absolute left-4 p-2">
          <ArrowLeft className="w-6 h-6 text-foreground" strokeWidth={1.5} />
        </button>
        <h1 className="text-title text-primary font-bold text-center w-full">{t("upcomingPayments.title")}</h1>
      </div>

      <div className="px-6 mt-6 flex flex-col gap-6">
        {isLoading && (
          <div className="flex justify-center">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" role="status" aria-label="Loading" />
          </div>
        )}

        {!isLoading && sections.length === 0 && (
          <p className="text-muted-foreground text-sm text-center mt-4">{t("upcomingPayments.none")}</p>
        )}

        {sections.map((section) => (
          <div key={section.title} className="flex flex-col gap-3">
            <h2 className="text-primary font-bold text-base">{section.title}</h2>
            {section.items.map((loan) => <PaymentCard key={loan.id} loan={loan} />)}
          </div>
        ))}
      </div>
    </div>
  );
};

export default UpcomingPayments;
