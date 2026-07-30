import { useNavigate, useLocation } from "react-router-dom";
import { ArrowLeft, AlertCircle, Sparkles, CheckCircle2 } from "lucide-react";
import { useTranslation } from "@/context/LanguageContext";
import { formatDateString, formatDuration } from "@/lib/dateLocale";

const RepaymentChart = ({ paid, total }: { paid: number; total: number }) => {
  const { t } = useTranslation();
  const remaining = total - paid;
  const paidPct = Math.round((paid / total) * 100);
  const remainingPct = 100 - paidPct;
  const size = 160;
  const stroke = 20;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const gap = 8;
  const totalUsable = circumference - gap * 2;
  const greenArc = (paidPct / 100) * totalUsable;
  const yellowArc = (remainingPct / 100) * totalUsable;
  const startOffset = circumference * 0.25;

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="relative">
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="hsl(var(--pengio-green))" strokeWidth={stroke} strokeLinecap="round" strokeDasharray={`${greenArc} ${circumference - greenArc}`} strokeDashoffset={startOffset} />
          <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="hsl(var(--primary))" strokeWidth={stroke} strokeLinecap="round" strokeDasharray={`${yellowArc} ${circumference - yellowArc}`} strokeDashoffset={startOffset - greenArc - gap} />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-xs text-muted-foreground">{t("loanDetails.total")}</span>
          <span className="text-lg font-bold text-primary">{total.toLocaleString("nb-NO")} kr</span>
        </div>
      </div>
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-sm bg-pengio-green" />
          <span className="text-xs text-muted-foreground">{t("loanDetails.paid")} : {paid.toLocaleString("nb-NO")} kr ({paidPct} %)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-sm bg-primary" />
          <span className="text-xs text-muted-foreground">{t("loanDetails.remainingLabel")} : {remaining.toLocaleString("nb-NO")} kr ({remainingPct} %)</span>
        </div>
      </div>
    </div>
  );
};

const LoanDetails = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { t, language } = useTranslation();
  const passedLoan = location.state?.loan;

  const parseAmount = (str: string) => {
    const num = parseInt(str.replace(/[^\d]/g, ""), 10);
    return isNaN(num) ? 0 : num;
  };

  const lentAmount = passedLoan ? (passedLoan.amount || parseAmount(passedLoan.outstandingBalance)) : 5000;
  const isLent = passedLoan
    ? (passedLoan.title?.includes(t("loanDetails.loanTo")) || passedLoan.title?.startsWith("Loan to"))
    : true;
  const isPaidOff = passedLoan
    ? (passedLoan.status === t("status.paidOff") || passedLoan.status === "Paid off" || passedLoan.status === "Paid Off")
    : false;

  const loan = passedLoan ? {
    title: passedLoan.title,
    subtitle: isLent ? t("loanDetails.youAreLender") : t("loanDetails.youAreBorrower"),
    avatar: passedLoan.avatar,
    status: passedLoan.status,
    outstandingBalance: isPaidOff ? 0 : Math.round(lentAmount * 0.24),
    crossedBalance: isPaidOff ? 0 : Math.round(lentAmount * 0.76),
    lentAmount: lentAmount,
    interestRate: passedLoan.interestRate || "5 %",
    monthlyInstallment: `${Math.round(lentAmount / 4)} kr`,
    nextPaymentDue: formatDateString(passedLoan.nextPayment || "—", language),
    totalDuration: formatDuration(3, language),
    remaining: isPaidOff ? formatDuration(0, language) : formatDuration(2, language),
    totalPaid: isPaidOff ? lentAmount : Math.round(lentAmount * 0.76),
    totalAmount: lentAmount,
  } : {
    title: `${t("loanDetails.loanTo")} Erik Johansen`,
    subtitle: t("loanDetails.youAreLender"),
    avatar: "EJ",
    status: t("status.dueSoon"),
    outstandingBalance: 1200,
    crossedBalance: 3800,
    lentAmount: 5000,
    interestRate: "5 %",
    monthlyInstallment: "950 kr",
    nextPaymentDue: formatDateString("28 March 2025", language),
    totalDuration: formatDuration(3, language),
    remaining: formatDuration(2, language),
    totalPaid: 1200,
    totalAmount: 5000,
  };

  const progressPct = ((loan.lentAmount - loan.outstandingBalance) / loan.lentAmount) * 100;

  return (
    <div className="flex flex-col min-h-screen bg-background pb-8">
      <div className="px-6 pt-8 pb-2 flex items-center relative">
        <button onClick={() => {
          const fromTab = location.state?.fromTab;
          if (fromTab) navigate("/overview", { state: { tab: fromTab } });
          else navigate(-1);
        }} className="absolute left-4 p-2">
          <ArrowLeft className="w-6 h-6 text-foreground" />
        </button>
        <h1 className="text-xl text-primary font-bold text-center w-full">{t("loanDetails.title")}</h1>
      </div>

      <div className="px-6 mt-5 flex-1 overflow-y-auto flex flex-col gap-4">
        <div className="bg-secondary rounded-xl p-5 flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-muted-foreground/30 flex items-center justify-center text-sm font-bold text-foreground shrink-0">{loan.avatar}</div>
            <div className="flex-1 min-w-0">
              <p className="text-base font-semibold text-foreground">{loan.title}</p>
              <p className="text-xs text-muted-foreground">{loan.subtitle}</p>
            </div>
            <span className="text-[10px] font-semibold px-3 py-1 rounded-full bg-primary/20 text-primary shrink-0">{loan.status}</span>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">{t("loanDetails.outstandingBalance")} :</span>
                <span className="text-xs text-muted-foreground line-through">kr {loan.crossedBalance.toLocaleString("nb-NO")}</span>
              </div>
              <span className="text-base font-bold text-primary">{loan.outstandingBalance.toLocaleString("nb-NO")} kr</span>
            </div>
            <div className="w-full h-3 bg-muted-foreground/20 rounded-full overflow-hidden">
              <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${progressPct}%` }} />
            </div>
            <div className="flex items-center justify-between mt-2">
              <span className="text-xs text-muted-foreground">{t("loanDetails.lentAmount")}</span>
              <span className="text-xs text-foreground font-medium">{loan.lentAmount.toLocaleString("nb-NO")} kr</span>
            </div>
          </div>

          <div className="border-t border-muted-foreground/20" />

          <div className="flex flex-col gap-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">{t("loanDetails.interestRate")}</span>
              <span className="text-sm text-foreground font-medium">{loan.interestRate}</span>
            </div>
            <div className="border-t border-muted-foreground/10" />
            <div className="flex justify-between items-start">
              <div className="flex flex-col">
                <span className="text-sm text-muted-foreground">{t("loanDetails.monthlyInstallment")}</span>
                <span className="text-[10px] text-muted-foreground/60">{t("loanDetails.installmentSubtext")}</span>
              </div>
              <span className="text-sm text-foreground font-medium">{loan.monthlyInstallment}</span>
            </div>
            <div className="border-t border-muted-foreground/10" />
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">{t("loanDetails.nextPaymentDue")}</span>
              <span className="text-sm text-foreground font-medium">{loan.nextPaymentDue}</span>
            </div>
            <div className="border-t border-muted-foreground/10" />
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">{t("loanDetails.totalDuration")}</span>
              <span className="text-sm text-foreground font-medium">{loan.totalDuration}</span>
            </div>
            <div className="border-t border-muted-foreground/10" />
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">{t("loanDetails.remaining")}</span>
              <span className="text-sm text-foreground font-medium">{loan.remaining}</span>
            </div>
          </div>
        </div>

        <div className="bg-secondary rounded-xl p-5">
          <h3 className="text-base font-semibold text-foreground mb-4">{t("loanDetails.repaymentProgress")}</h3>
          <RepaymentChart paid={loan.totalPaid} total={loan.totalAmount} />
        </div>

        <div className="border border-primary/40 rounded-xl p-5 flex flex-col items-center text-center gap-2">
          <span className="text-3xl">🎊</span>
          <p className="text-sm text-foreground">{t("loanDetails.earnedInterest")}</p>
        </div>

        <div>
          <h3 className="text-base font-semibold text-foreground mb-3">{t("loanDetails.smartTips")}</h3>
          <div className="bg-secondary rounded-xl p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
              <Sparkles className="w-5 h-5 text-primary" />
            </div>
            <p className="text-sm text-foreground">{t("loanDetails.tipMessage")}</p>
          </div>
        </div>

        <div>
          <h3 className="text-base font-semibold text-foreground mb-3">{t("loanDetails.alerts")}</h3>
          <div className="flex flex-col gap-3">
            <div className="bg-secondary rounded-xl p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-muted-foreground/20 flex items-center justify-center shrink-0">
                <AlertCircle className="w-5 h-5 text-muted-foreground" />
              </div>
              <p className="text-sm text-foreground">{t("loanDetails.paymentDueSoon")}</p>
            </div>
            <div className="bg-secondary rounded-xl p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-muted-foreground/20 flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-5 h-5 text-muted-foreground" />
              </div>
              <p className="text-sm text-foreground">{t("loanDetails.nearlyCompleted")}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoanDetails;
