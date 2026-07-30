import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import BottomNav from "@/components/BottomNav";
import { useTranslation } from "@/context/LanguageContext";
import { useLoanContext } from "@/context/LoanContext";

type LoanStatus = "Due Soon" | "Overdue" | "Paid Off" | "Active";

interface LoanItem {
  id: number;
  name: string;
  avatarInitials: string;
  amount: number;
  status: LoanStatus;
  dueDate?: string;
}

const borrowedLoans: LoanItem[] = [
  { id: 1, name: "Anna Kristoffsen", avatarInitials: "AK", amount: 1000, status: "Due Soon", dueDate: "29 March 2025" },
  { id: 2, name: "Anna Kristoffsen", avatarInitials: "AK", amount: 4000, status: "Due Soon", dueDate: "29 March 2025" },
  { id: 3, name: "Joni Mikkelsen", avatarInitials: "JM", amount: 4000, status: "Overdue", dueDate: "14 March 2025" },
  { id: 4, name: "Joni Mikkelsen", avatarInitials: "JM", amount: 1500, status: "Due Soon", dueDate: "29 March 2025" },
];

const lentLoans: LoanItem[] = [
  { id: 5, name: "Erik Johansen", avatarInitials: "EJ", amount: 2000, status: "Due Soon", dueDate: "31 March 2025" },
  { id: 6, name: "Kaia Lunde", avatarInitials: "KL", amount: 2000, status: "Paid Off" },
];

const statusColorMap: Record<LoanStatus, string> = {
  "Due Soon": "text-primary",
  "Overdue": "text-destructive",
  "Paid Off": "text-pengio-green",
  "Active": "text-pengio-blue",
};

const Overview = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();
  const { sentLoans } = useLoanContext();
  const initialTab = (location.state as any)?.tab === "lent" ? "lent" : "borrowed";
  const [activeTab, setActiveTab] = useState<"borrowed" | "lent">(initialTab);

  const sentBorrowed: LoanItem[] = sentLoans
    .filter((s) => s.type === "borrowed")
    .map((s) => ({ id: s.id, name: s.name, avatarInitials: s.avatarInitials, amount: s.amount, status: "Active" as LoanStatus, dueDate: s.repaymentDate }));

  const sentLent: LoanItem[] = sentLoans
    .filter((s) => s.type === "lent")
    .map((s) => ({ id: s.id, name: s.name, avatarInitials: s.avatarInitials, amount: s.amount, status: "Active" as LoanStatus, dueDate: s.repaymentDate }));

  const loans = activeTab === "borrowed" ? [...borrowedLoans, ...sentBorrowed] : [...lentLoans, ...sentLent];
  const label = activeTab === "borrowed" ? t("overview.youBorrowedFrom") : t("overview.youLentTo");

  const statusLabel = (s: LoanStatus) => {
    if (s === "Due Soon") return t("status.dueSoon");
    if (s === "Overdue") return t("status.overdue");
    if (s === "Paid Off") return t("status.paidOff");
    return t("status.active");
  };

  return (
    <div className="flex flex-col min-h-screen bg-background pb-20">
      <div className="px-6 pt-8 pb-2 flex items-center relative">
        <button onClick={() => navigate(-1)} className="absolute left-4 p-2">
          <ArrowLeft className="w-6 h-6 text-foreground" />
        </button>
        <h1 className="text-title text-primary font-bold text-center w-full">{t("overview.title")}</h1>
      </div>

      <div className="px-6 mt-4">
        <div className="flex border-b border-secondary">
          <button onClick={() => setActiveTab("borrowed")} className={`flex-1 pb-3 text-center text-body-standard font-medium transition-colors ${activeTab === "borrowed" ? "text-primary border-b-2 border-primary" : "text-muted-foreground"}`}>
            {t("overview.borrowed")}
          </button>
          <button onClick={() => setActiveTab("lent")} className={`flex-1 pb-3 text-center text-body-standard font-medium transition-colors ${activeTab === "lent" ? "text-primary border-b-2 border-primary" : "text-muted-foreground"}`}>
            {t("overview.lentOut")}
          </button>
        </div>
      </div>

      <div className="px-6 mt-4 flex-1 overflow-y-auto flex flex-col gap-4">
        {loans.map((loan) => (
          <div
            key={loan.id}
            className="bg-secondary rounded-xl p-4 cursor-pointer active:opacity-80 transition-opacity"
            onClick={() => navigate("/loan-details", {
              state: {
                loan: {
                  title: `${activeTab === "borrowed" ? t("loanDetails.loanFrom") : t("loanDetails.loanTo")} ${loan.name}`,
                  avatar: loan.avatarInitials,
                  status: loan.status === "Due Soon" ? t("status.dueSoon") : loan.status === "Paid Off" ? t("status.paidOff") : statusLabel(loan.status),
                  outstandingBalance: `${loan.amount.toLocaleString("nb-NO")} kr`,
                  nextPayment: loan.dueDate || "—",
                  amount: loan.amount,
                },
                fromTab: activeTab,
              },
            })}
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-lg bg-muted-foreground/30 flex items-center justify-center text-body-small font-bold text-foreground shrink-0">
                {loan.avatarInitials}
              </div>
              <p className="text-body-standard font-medium text-foreground">{label} {loan.name}</p>
            </div>

            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <span className="text-body-small text-muted-foreground">{t("overview.amount")}</span>
                <span className="flex-1 mx-2 border-b border-dotted border-muted-foreground/40" />
                <span className="text-body-small text-foreground font-medium">{loan.amount.toLocaleString("nb-NO")} kr</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-body-small text-muted-foreground">{t("overview.status")}</span>
                <span className="flex-1 mx-2 border-b border-dotted border-muted-foreground/40" />
                <span className={`text-body-small font-medium ${statusColorMap[loan.status]}`}>{statusLabel(loan.status)}</span>
              </div>
              {loan.dueDate && (
                <div className="flex items-center justify-between">
                  <span className="text-body-small text-muted-foreground">{t("overview.dueDate")}</span>
                  <span className="flex-1 mx-2 border-b border-dotted border-muted-foreground/40" />
                  <span className="text-body-small text-foreground font-medium">{loan.dueDate}</span>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      <BottomNav />
    </div>
  );
};

export default Overview;
