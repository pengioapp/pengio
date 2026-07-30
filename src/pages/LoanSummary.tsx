import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Users, CalendarDays, Percent, ArrowUpRight } from "lucide-react";
import BottomNav from "@/components/BottomNav";
import { useLoanContext } from "@/context/LoanContext";
import { useTranslation } from "@/context/LanguageContext";

type LoanStatus = "Due soon" | "Paid off" | "Overdue";

interface MockLoan {
  id: number;
  title: string;
  avatar: string;
  status: LoanStatus;
  outstandingBalance: string;
  nextPayment: string;
}

const lentLoans: MockLoan[] = [
  { id: 1, title: "Loan to Erik Johansen", avatar: "EJ", status: "Due soon", outstandingBalance: "4 000 kr", nextPayment: "29 March 2025" },
  { id: 2, title: "Loan to Kaia Lunde", avatar: "KL", status: "Paid off", outstandingBalance: "0.00 kr", nextPayment: "" },
  { id: 3, title: "Loan from Anna Kristoffersen", avatar: "AK", status: "Overdue", outstandingBalance: "4 000 kr", nextPayment: "29 March 2025" },
];

const borrowedLoans: MockLoan[] = [
  { id: 4, title: "Loan to Erik Johansen", avatar: "EJ", status: "Due soon", outstandingBalance: "4 000 kr", nextPayment: "29 March 2025" },
  { id: 5, title: "Loan to Kaia Lunde", avatar: "KL", status: "Paid off", outstandingBalance: "0.00 kr", nextPayment: "" },
];

const statusStyles: Record<LoanStatus, string> = {
  "Due soon": "bg-primary/20 text-primary",
  "Paid off": "bg-pengio-green/20 text-pengio-green",
  "Overdue": "bg-destructive/20 text-destructive",
};

type TabType = "lent" | "borrowed";

const CircularChart = ({ green, yellow, greenLabel, yellowLabel }: { green: number; yellow: number; greenLabel: string; yellowLabel: string }) => {
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
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="hsl(var(--pengio-green))" strokeWidth={stroke} strokeLinecap="round" strokeDasharray={`${greenArc} ${circumference - greenArc}`} strokeDashoffset={startOffset} transform={`rotate(0 ${size / 2} ${size / 2})`} />
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="hsl(var(--primary))" strokeWidth={stroke} strokeLinecap="round" strokeDasharray={`${yellowArc} ${circumference - yellowArc}`} strokeDashoffset={startOffset - greenArc - gap} transform={`rotate(0 ${size / 2} ${size / 2})`} />
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

const LoanCard = ({ loan }: { loan: MockLoan }) => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  return (
    <div onClick={() => navigate("/loan-details", { state: { loan: { ...loan, amount: parseInt(loan.outstandingBalance.replace(/[^\d]/g, ""), 10) || 0 } } })} className="bg-secondary rounded-xl p-4 flex flex-col gap-3 cursor-pointer active:opacity-80 transition-opacity">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-muted-foreground/20 flex items-center justify-center text-xs font-bold text-foreground shrink-0">{loan.avatar}</div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-foreground">{loan.title}</p>
          <span className={`inline-block mt-1 text-[10px] font-semibold px-2 py-0.5 rounded-full ${statusStyles[loan.status]}`}>{loan.status}</span>
        </div>
        <ArrowUpRight className="w-5 h-5 text-muted-foreground shrink-0" />
      </div>
      <div className="flex flex-col gap-1 text-xs">
        <div className="flex justify-between">
          <span className="text-muted-foreground">{t("loanSummary.outstandingBalance")}</span>
          <span className="text-foreground font-medium">{loan.outstandingBalance}</span>
        </div>
        {loan.nextPayment && (
          <div className="flex justify-between">
            <span className="text-muted-foreground">{t("loanSummary.nextPayment")}</span>
            <span className="text-foreground font-medium">{loan.nextPayment}</span>
          </div>
        )}
      </div>
    </div>
  );
};

const LoanSummary = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { approvedLoans } = useLoanContext();
  const [activeTab, setActiveTab] = useState<TabType>("lent");

  return (
    <div className="flex flex-col min-h-screen bg-background pb-24">
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
        {activeTab === "lent" ? (
          <>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-secondary rounded-xl p-4 flex flex-col gap-3">
                <div className="w-10 h-10 rounded-lg bg-muted-foreground/20 flex items-center justify-center"><Users className="w-5 h-5 text-foreground" /></div>
                <span className="text-xs text-muted-foreground">{t("loanSummary.totalLending")}</span>
                <span className="text-xl font-bold text-foreground">17 500 kr</span>
              </div>
              <div className="bg-secondary rounded-xl p-4 flex flex-col gap-3">
                <div className="w-10 h-10 rounded-lg bg-muted-foreground/20 flex items-center justify-center"><CalendarDays className="w-5 h-5 text-foreground" /></div>
                <span className="text-xs text-muted-foreground">{t("loanSummary.totalMonthlyEarnings")}</span>
                <span className="text-xl font-bold text-foreground">320 kr</span>
              </div>
            </div>

            <div className="bg-secondary rounded-xl p-5">
              <h3 className="text-base font-semibold text-foreground mb-4">{t("loanSummary.overview")}</h3>
              <CircularChart green={70} yellow={30} greenLabel={`70 % ${t("loanSummary.repaid")}`} yellowLabel={`30 % ${t("loanSummary.remaining")}`} />
            </div>

            {approvedLoans.length > 0 && (
              <div className="bg-secondary rounded-xl p-4">
                <h3 className="text-base font-semibold text-foreground mb-3">{t("loanSummary.activeLoans")}</h3>
                <div className="flex flex-col gap-3">
                  {approvedLoans.map((loan) => (
                    <div key={loan.id} className="flex items-center gap-3 bg-background/30 rounded-xl p-3">
                      <div className="w-10 h-10 rounded-full bg-pengio-green flex items-center justify-center text-xs font-bold text-foreground shrink-0">{loan.borrowerAvatar}</div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground">{loan.borrowerName}</p>
                        <p className="text-xs text-muted-foreground">{loan.amount.toLocaleString("nb-NO")} kr · {loan.repaymentPeriod} · {loan.interestPercent}%</p>
                      </div>
                      <span className="text-xs font-medium text-pengio-green shrink-0">{t("loanSummary.active")}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="border border-primary/40 rounded-xl p-5 flex flex-col items-center text-center gap-2">
              <span className="text-3xl">🎊</span>
              <p className="text-sm text-foreground">{t("loanSummary.lentHighlight")}</p>
            </div>

            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-base font-semibold text-foreground">{t("loanSummary.myLoans")}</h3>
                <button className="text-sm text-muted-foreground">{t("loanSummary.viewAll")}</button>
              </div>
              <div className="flex flex-col gap-3">
                {lentLoans.map((loan) => <LoanCard key={loan.id} loan={loan} />)}
              </div>
            </div>
          </>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-secondary rounded-xl p-4 flex flex-col gap-3">
                <div className="w-10 h-10 rounded-lg bg-muted-foreground/20 flex items-center justify-center"><Users className="w-5 h-5 text-foreground" /></div>
                <span className="text-xs text-muted-foreground">{t("loanSummary.totalDebt")}</span>
                <span className="text-xl font-bold text-foreground">5 500 kr</span>
              </div>
              <div className="bg-secondary rounded-xl p-4 flex flex-col gap-3">
                <div className="w-10 h-10 rounded-lg bg-muted-foreground/20 flex items-center justify-center"><CalendarDays className="w-5 h-5 text-foreground" /></div>
                <span className="text-xs text-muted-foreground">{t("loanSummary.monthlyPayment")}</span>
                <span className="text-xl font-bold text-foreground">1 200 kr</span>
              </div>
            </div>

            <div className="bg-secondary rounded-xl p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-muted-foreground/20 flex items-center justify-center"><Percent className="w-5 h-5 text-foreground" /></div>
              <div className="flex flex-col">
                <span className="text-xs text-muted-foreground">{t("loanSummary.weightedInterest")}</span>
                <span className="text-xl font-bold text-foreground">4.2 %</span>
              </div>
            </div>

            <div className="bg-secondary rounded-xl p-5">
              <h3 className="text-base font-semibold text-foreground mb-4">{t("loanSummary.overview")}</h3>
              <CircularChart green={40} yellow={60} greenLabel={`40 % ${t("loanSummary.repaid")}`} yellowLabel={`60 % ${t("loanSummary.remaining")}`} />
            </div>

            <div className="border border-primary/40 rounded-xl p-5 flex flex-col items-center text-center gap-2">
              <span className="text-3xl">🎊</span>
              <p className="text-sm text-foreground">{t("loanSummary.borrowedHighlight")}</p>
            </div>

            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-base font-semibold text-foreground">{t("loanSummary.myLoans")}</h3>
                <button className="text-sm text-muted-foreground">{t("loanSummary.viewAll")}</button>
              </div>
              <div className="flex flex-col gap-3">
                {borrowedLoans.map((loan) => <LoanCard key={loan.id} loan={loan} />)}
              </div>
            </div>
          </>
        )}
      </div>

      <BottomNav />
    </div>
  );
};

export default LoanSummary;
