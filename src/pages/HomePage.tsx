import { useNavigate } from "react-router-dom";
import { Bell, ArrowDownLeft, ArrowUpRight, Coins, Clock, ChevronRight } from "lucide-react";
import { useTranslation } from "@/context/LanguageContext";
import { useAuth } from "@/context/AuthContext";
import { useNotifications } from "@/context/NotificationContext";
import { useLoans } from "@/hooks/useLoans";
import { useProposals } from "@/hooks/useProposals";
import { formatAmount } from "@/lib/loans";
import { formatDateString } from "@/lib/dateLocale";

interface ActivityItem {
  key: string;
  text: string;
  time: string;
  icon: typeof ArrowUpRight;
  /**
   * Where tapping the row goes. Rows used to carry a loanId and navigate only
   * when it was set, so pending requests -- the rows most likely to be tapped,
   * because they are the ones waiting on an answer -- did nothing at all.
   */
  open?: () => void;
}

const HomePage = () => {
  const navigate = useNavigate();
  const { t, language } = useTranslation();
  const { firstName } = useAuth();
  const { unreadCount } = useNotifications();
  const { data: loans, isLoading: loansLoading } = useLoans();
  const { data: proposals, isLoading: proposalsLoading } = useProposals();

  const greeting = firstName
    ? t("home.greeting", { name: firstName })
    : t("home.greetingFallback");

  // Both totals are what is still owed, not what was originally agreed. The
  // prototype showed fixed figures here -- 12 500 kr and 4 000 kr -- on the
  // first screen after signing in.
  const lentOut = (loans ?? [])
    .filter((l) => l.role === "lender")
    .reduce((sum, l) => sum + l.outstanding, 0);

  const borrowed = (loans ?? [])
    .filter((l) => l.role === "borrower")
    .reduce((sum, l) => sum + l.outstanding, 0);

  const firstNameOf = (name: string) => name.split(" ")[0];

  const loanActivity: ActivityItem[] = (loans ?? []).map((loan) => ({
    key: `loan-${loan.id}`,
    text:
      loan.role === "lender"
        ? t("home.activity.lent", {
            amount: loan.principal.toLocaleString("nb-NO"),
            name: firstNameOf(loan.counterparty.name),
          })
        : t("home.activity.borrowed", {
            amount: loan.principal.toLocaleString("nb-NO"),
            name: firstNameOf(loan.counterparty.name),
          }),
    time: formatDateString(loan.agreedAt, language),
    icon: loan.role === "lender" ? ArrowUpRight : ArrowDownLeft,
    open: () => navigate("/loan-details", { state: { loanId: loan.id } }),
  }));

  const pendingActivity: ActivityItem[] = (proposals ?? [])
    .filter((p) => p.status === "pending")
    .map((p) => ({
      key: `proposal-${p.id}`,
      text: p.incoming
        ? t("home.activity.awaitingYou", { name: firstNameOf(p.counterparty.name) })
        : p.kind === "request"
          ? t("home.activity.pendingRequest", {
              name: firstNameOf(p.counterparty.name),
              amount: p.amount.toLocaleString("nb-NO"),
            })
          : t("home.activity.pendingOffer", {
              name: firstNameOf(p.counterparty.name),
              amount: p.amount.toLocaleString("nb-NO"),
            }),
      time: formatDateString(p.createdAt, language),
      icon: Clock,
      // Requests and offers are answered on different screens.
      open: () => navigate(p.kind === "request" ? `/inbox/${p.id}` : `/loan-request/${p.id}`),
    }));

  const activity = [...pendingActivity, ...loanActivity].slice(0, 8);
  const isLoading = loansLoading || proposalsLoading;

  return (
    <div className="flex flex-col min-h-screen bg-background pb-28">
      <div className="px-6 pt-8 pb-4 flex items-start justify-between">
        <h1 className="text-h4 text-primary font-bold">{greeting}</h1>
        <button onClick={() => navigate("/notifications")} className="w-10 h-10 rounded-full flex items-center justify-center text-primary relative">
          <Bell className="w-6 h-6" />
          {unreadCount > 0 && (
            <span className="absolute top-0 right-0 w-5 h-5 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold flex items-center justify-center">
              {unreadCount}
            </span>
          )}
        </button>
      </div>

      <div className="px-6 mb-5">
        <div className="bg-secondary rounded-2xl p-5">
          <div className="flex justify-between mb-6">
            <div className="flex flex-col items-start">
              <div className="w-10 h-10 rounded-full bg-background/20 flex items-center justify-center mb-2">
                <ArrowUpRight className="w-5 h-5 text-primary" />
              </div>
              <span className="text-body-small text-muted-foreground">{t("home.lentOut")}</span>
              <span className="text-h4 font-bold text-foreground">{formatAmount(lentOut)}</span>
            </div>
            <div className="flex flex-col items-start">
              <div className="w-10 h-10 rounded-full bg-background/20 flex items-center justify-center mb-2">
                <ArrowDownLeft className="w-5 h-5 text-primary" />
              </div>
              <span className="text-body-small text-muted-foreground">{t("home.borrowed")}</span>
              <span className="text-h4 font-bold text-foreground">{formatAmount(borrowed)}</span>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => navigate("/lend")}
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-full bg-pengio-green/80 text-foreground font-bold text-body-standard hover:bg-pengio-green/90 transition-all"
            >
              <ArrowUpRight className="w-5 h-5" />
              {t("home.lendOut")}
            </button>
            <button
              onClick={() => navigate("/borrow")}
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-full bg-primary text-primary-foreground font-bold text-body-standard hover:bg-primary/90 transition-all"
            >
              <Coins className="w-5 h-5" />
              {t("home.borrow")}
            </button>
          </div>
        </div>
      </div>

      <div className="px-6 flex-1">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-title font-bold text-foreground">{t("home.recentActivity")}</h2>
          <button onClick={() => navigate("/all-transactions")} className="text-body-small text-muted-foreground">{t("home.viewAll")}</button>
        </div>

        {isLoading && (
          <div className="flex justify-center mt-6">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" role="status" aria-label="Loading" />
          </div>
        )}

        {!isLoading && activity.length === 0 && (
          <p className="text-body-small text-muted-foreground text-center mt-6">{t("home.noActivity")}</p>
        )}

        <div className="flex flex-col gap-3">
          {activity.map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={item.open}
              className="w-full text-left bg-secondary rounded-xl p-4 flex items-center gap-3 transition-opacity active:opacity-80"
            >
              <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                <item.icon className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-body-small font-medium text-foreground">{item.text}</p>
                <p className="text-body-micro text-muted-foreground">{item.time}</p>
              </div>
              <ChevronRight className="w-5 h-5 text-muted-foreground shrink-0" />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default HomePage;
