import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Users, Percent, ArrowUpRight } from "lucide-react";
import { useTranslation } from "@/context/LanguageContext";
import { formatDateString } from "@/lib/dateLocale";
import { useLoans } from "@/hooks/useLoans";
import { formatAmount, type Loan } from "@/lib/loans";

type TabType = "lent" | "borrowed";

const CircularChart = ({
  green,
  yellow,
  greenLabel,
  yellowLabel,
}: {
  green: number;
  yellow: number;
  greenLabel: string;
  yellowLabel: string;
}) => {
  const size = 180;
  const stroke = 24;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const gap = 12;
  const totalUsable = circumference - gap * 2;
  const greenArc = (green / 100) * totalUsable;
  const yellowArc = (yellow / 100) * totalUsable;
  const startOffset = circumference * 0.25;

  return (
    <div className="flex flex-col items-center gap-4">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="hsl(var(--pengio-green))" strokeWidth={stroke} strokeLinecap="round" strokeDasharray={`${greenArc} ${circumference - greenArc}`} strokeDashoffset={startOffset} />
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="hsl(var(--primary))" strokeWidth={stroke} strokeLinecap="round" strokeDasharray={`${yellowArc} ${circumference - yellowArc}`} strokeDashoffset={startOffset - greenArc - gap} />
      </svg>
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-sm bg-pengio-green" />
          <span className="text-sm text-muted-foreground">{greenLabel}</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-sm bg-primary" />
          <span className="text-sm text-muted-foreground">{yellowLabel}</span>
        </div>
      </div>
    </div>
  );
};

const statusStyles = {
  dueSoon: "bg-primary/20 text-primary",
  paidOff: "bg-pengio-green/20 text-pengio-green",
  overdue: "bg-destructive/20 text-destructive",
  active: "bg-pengio-blue/20 text-pengio-blue",
} as const;

type StatusKey = keyof typeof statusStyles;

const statusOf = (loan: Loan): StatusKey => {
  if (loan.status === "repaid") return "paidOff";
  const due = new Date(loan.repaymentDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const daysLeft = Math.ceil((due.getTime() - today.getTime()) / 86_400_000);
  if (daysLeft < 0) return "overdue";
  if (daysLeft <= 7) return "dueSoon";
  return "active";
};

const LoanCard = ({ loan }: { loan: Loan }) => {
  const navigate = useNavigate();
  const { t, language } = useTranslation();
  const status = statusOf(loan);

  const statusLabel =
    status === "paidOff" ? t("status.paidOff")
    : status === "overdue" ? t("status.overdue")
    : status === "dueSoon" ? t("status.dueSoon")
    : t("status.active");

  return (
    <div
      onClick={() => navigate("/loan-details", { state: { loanId: loan.id } })}
      className="bg-secondary rounded-xl p-4 flex flex-col gap-3 cursor-pointer active:opacity-80 transition-opacity"
    >
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-muted-foreground/20 flex items-center justify-center text-xs font-bold text-foreground shrink-0">
          {loan.counterparty.initials}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-foreground truncate">
            {loan.role === "lender" ? t("loanDetails.loanTo") : t("loanDetails.loanFrom")} {loan.counterparty.name}
          </p>
          <span className={`inline-block mt-1 text-[10px] font-semibold px-2 py-0.5 rounded-full ${statusStyles[status]}`}>
            {statusLabel}
          </span>
        </div>
        <ArrowUpRight className="w-5 h-5 text-muted-foreground shrink-0" />
      </div>
      <div className="flex flex-col gap-1 text-xs">
        <div className="flex justify-between">
          <span className="text-muted-foreground">{t("loanSummary.outstandingBalance")}</span>
          <span className="text-foreground font-medium">{formatAmount(loan.outstanding, loan.currency)}</span>
        </div>
        {loan.status !== "repaid" && (
          <div className="flex justify-between">
            <span className="text-muted-foreground">{t("loanSummary.nextPayment")}</span>
            <span className="text-foreground font-medium">{formatDateString(loan.repaymentDate, language)}</span>
          </div>
        )}
      </div>
    </div>
  );
};

const LoanSummary = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { data: loans, isLoading } = useLoans();
  const [activeTab, setActiveTab] = useState<TabType>("lent");

  const wantRole = activeTab === "lent" ? "lender" : "borrower";
  const side = (loans ?? []).filter((l) => l.role === wantRole);

  // Every figure below is computed from actual loans. The prototype showed
  // fixed numbers here -- 17 500 kr lent, 4.2 % interest, a 70/30 chart --
  // which on a financial summary reads as fact rather than placeholder.
  const totalDueAll = side.reduce((sum, l) => sum + l.totalDue, 0);
  const totalRepaid = side.reduce((sum, l) => sum + l.repaid, 0);
  const totalOutstanding = side.reduce((sum, l) => sum + l.outstanding, 0);
  const activeCount = side.filter((l) => l.status === "active").length;

  const repaidPct = totalDueAll > 0 ? Math.round((totalRepaid / totalDueAll) * 100) : 0;
  const remainingPct = 100 - repaidPct;

  // Weighted by principal, so a large loan at a low rate is not averaged away
  // by a small loan at a high one.
  const principalSum = side.reduce((sum, l) => sum + l.principal, 0);
  const avgInterest =
    principalSum > 0
      ? Math.round((side.reduce((sum, l) => sum + l.principal * l.interestPercent, 0) / principalSum) * 10) / 10
      : 0;

  return (
    <div className="flex flex-col min-h-screen bg-background pb-28">
      <div className="px-6 pt-8 pb-2 flex items-center relative">
        <button onClick={() => navigate(-1)} className="absolute left-4 p-2">
          <ArrowLeft className="w-6 h-6 text-foreground" />
        </button>
        <h1 className="text-xl text-primary font-bold text-center w-full">{t("loanSummary.title")}</h1>
      </div>

      <div className="px-6 mt-4">
        <div className="flex border-b border-secondary">
          <button onClick={() => setActiveTab("lent")} className={`flex-1 pb-3 text-center text-base font-medium transition-colors ${activeTab === "lent" ? "text-primary border-b-2 border-primary" : "text-muted-foreground"}`}>
            {t("loanSummary.lentOut")}
          </button>
          <button onClick={() => setActiveTab("borrowed")} className={`flex-1 pb-3 text-center text-base font-medium transition-colors ${activeTab === "borrowed" ? "text-primary border-b-2 border-primary" : "text-muted-foreground"}`}>
            {t("loanSummary.borrowed")}
          </button>
        </div>
      </div>

      <div className="px-6 mt-5 flex-1 overflow-y-auto flex flex-col gap-4">
        {isLoading && (
          <div className="flex justify-center mt-8">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" role="status" aria-label="Loading" />
          </div>
        )}

        {!isLoading && side.length === 0 && (
          <p className="text-muted-foreground text-sm text-center mt-8">{t("loanSummary.nothingYet")}</p>
        )}

        {!isLoading && side.length > 0 && (
          <>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-secondary rounded-xl p-4 flex flex-col gap-3">
                <div className="w-10 h-10 rounded-lg bg-muted-foreground/20 flex items-center justify-center">
                  <Users className="w-5 h-5 text-foreground" />
                </div>
                <span className="text-xs text-muted-foreground">
                  {activeTab === "lent" ? t("loanSummary.totalLending") : t("loanSummary.totalDebt")}
                </span>
                <span className="text-xl font-bold text-foreground">{formatAmount(totalOutstanding)}</span>
              </div>
              <div className="bg-secondary rounded-xl p-4 flex flex-col gap-3">
                <div className="w-10 h-10 rounded-lg bg-muted-foreground/20 flex items-center justify-center">
                  <Percent className="w-5 h-5 text-foreground" />
                </div>
                <span className="text-xs text-muted-foreground">{t("loanSummary.avgInterest")}</span>
                <span className="text-xl font-bold text-foreground">{avgInterest} %</span>
              </div>
            </div>

            <div className="bg-secondary rounded-xl p-4 flex items-center justify-between">
              <span className="text-xs text-muted-foreground">{t("loanSummary.activeCount")}</span>
              <span className="text-xl font-bold text-foreground">{activeCount}</span>
            </div>

            <div className="bg-secondary rounded-xl p-5">
              <h3 className="text-base font-semibold text-foreground mb-4">{t("loanSummary.overview")}</h3>
              <CircularChart
                green={repaidPct}
                yellow={remainingPct}
                greenLabel={`${repaidPct} % ${t("loanSummary.repaid")}`}
                yellowLabel={`${remainingPct} % ${t("loanSummary.remaining")}`}
              />
            </div>

            <div>
              <h3 className="text-base font-semibold text-foreground mb-3">{t("loanSummary.myLoans")}</h3>
              <div className="flex flex-col gap-3">
                {side.map((loan) => <LoanCard key={loan.id} loan={loan} />)}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default LoanSummary;
