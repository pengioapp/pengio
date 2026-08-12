import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import BottomNav from "@/components/BottomNav";
import { useTranslation } from "@/context/LanguageContext";
import { formatDateString } from "@/lib/dateLocale";
import { useLoans } from "@/hooks/useLoans";
import { useProposals } from "@/hooks/useProposals";
import { formatAmount, type Loan } from "@/lib/loans";

type DisplayStatus = "dueSoon" | "overdue" | "paidOff" | "active" | "pending";

const statusColorMap: Record<DisplayStatus, string> = {
  dueSoon: "text-primary",
  overdue: "text-destructive",
  paidOff: "text-pengio-green",
  active: "text-pengio-blue",
  pending: "text-muted-foreground",
};

const DUE_SOON_DAYS = 7;

/**
 * The database records whether a loan is settled. How urgent an unsettled one
 * looks is a presentation concern, derived from the repayment date on each
 * render rather than stored and left to go stale.
 */
const displayStatus = (loan: Loan): DisplayStatus => {
  if (loan.status === "repaid") return "paidOff";

  const due = new Date(loan.repaymentDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const daysLeft = Math.ceil((due.getTime() - today.getTime()) / 86_400_000);

  if (daysLeft < 0) return "overdue";
  if (daysLeft <= DUE_SOON_DAYS) return "dueSoon";
  return "active";
};

interface Row {
  key: string;
  name: string;
  initials: string;
  amount: number;
  currency: string;
  status: DisplayStatus;
  dueDate: string;
  loan?: Loan;
}

const Overview = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { t, language } = useTranslation();
  const { data: loans, isLoading: loansLoading } = useLoans();
  const { data: proposals, isLoading: proposalsLoading } = useProposals();

  const initialTab = (location.state as { tab?: string } | null)?.tab === "lent" ? "lent" : "borrowed";
  const [activeTab, setActiveTab] = useState<"borrowed" | "lent">(initialTab);

  const isLoading = loansLoading || proposalsLoading;
  const wantRole = activeTab === "borrowed" ? "borrower" : "lender";

  const loanRows: Row[] = (loans ?? [])
    .filter((l) => l.role === wantRole)
    .map((l) => ({
      key: l.id,
      name: l.counterparty.name,
      initials: l.counterparty.initials,
      // What is still owed is the number that matters day to day. The original
      // principal is on the detail screen.
      amount: l.status === "repaid" ? l.totalDue : l.outstanding,
      currency: l.currency,
      status: displayStatus(l),
      dueDate: l.repaymentDate,
      loan: l,
    }));

  // Proposals this user sent and is still waiting on. They are not loans yet,
  // but they are exactly what someone wonders about after sending one.
  const pendingRows: Row[] = (proposals ?? [])
    .filter((p) => !p.incoming && p.status === "pending")
    .filter((p) => (activeTab === "borrowed" ? p.kind === "request" : p.kind === "offer"))
    .map((p) => ({
      key: p.id,
      name: p.counterparty.name,
      initials: p.counterparty.initials,
      amount: p.amount,
      currency: p.currency,
      status: "pending" as const,
      dueDate: p.repaymentDate,
    }));

  const rows = [...pendingRows, ...loanRows];
  const label = activeTab === "borrowed" ? t("overview.youBorrowedFrom") : t("overview.youLentTo");

  const statusLabel = (s: DisplayStatus) => {
    if (s === "dueSoon") return t("status.dueSoon");
    if (s === "overdue") return t("status.overdue");
    if (s === "paidOff") return t("status.paidOff");
    if (s === "pending") return t("status.pending");
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
        {isLoading && (
          <div className="flex justify-center mt-8">
            <div
              className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent"
              role="status"
              aria-label="Loading"
            />
          </div>
        )}

        {!isLoading && rows.length === 0 && (
          <p className="text-muted-foreground text-body-standard text-center mt-8">
            {activeTab === "borrowed" ? t("overview.noBorrowed") : t("overview.noLent")}
          </p>
        )}

        {rows.map((row) => (
          <div
            key={row.key}
            className={`bg-secondary rounded-xl p-4 transition-opacity ${row.loan ? "cursor-pointer active:opacity-80" : ""}`}
            onClick={() => {
              if (!row.loan) return;
              navigate("/loan-details", { state: { loanId: row.loan.id, fromTab: activeTab } });
            }}
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-lg bg-muted-foreground/30 flex items-center justify-center text-body-small font-bold text-foreground shrink-0">
                {row.initials}
              </div>
              <p className="text-body-standard font-medium text-foreground">{label} {row.name}</p>
            </div>

            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <span className="text-body-small text-muted-foreground">{t("overview.amount")}</span>
                <span className="flex-1 mx-2 border-b border-dotted border-muted-foreground/40" />
                <span className="text-body-small text-foreground font-medium">{formatAmount(row.amount, row.currency)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-body-small text-muted-foreground">{t("overview.status")}</span>
                <span className="flex-1 mx-2 border-b border-dotted border-muted-foreground/40" />
                <span className={`text-body-small font-medium ${statusColorMap[row.status]}`}>{statusLabel(row.status)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-body-small text-muted-foreground">{t("overview.dueDate")}</span>
                <span className="flex-1 mx-2 border-b border-dotted border-muted-foreground/40" />
                <span className="text-body-small text-foreground font-medium">{formatDateString(row.dueDate, language)}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      <BottomNav />
    </div>
  );
};

export default Overview;
