import { useNavigate } from "react-router-dom";
import { ArrowLeft, ArrowDownLeft, ArrowUpRight, CheckCircle2 } from "lucide-react";
import BottomNav from "@/components/BottomNav";
import { useTranslation } from "@/context/LanguageContext";
import { formatDateString } from "@/lib/dateLocale";
import { useLoans } from "@/hooks/useLoans";

const AllTransactions = () => {
  const navigate = useNavigate();
  const { t, language } = useTranslation();
  const { data: loans, isLoading } = useLoans();

  const firstNameOf = (name: string) => name.split(" ")[0];

  // Agreed loans, newest first. Individual payments live on the loan detail
  // screen; this is a history of agreements rather than of transfers.
  const entries = (loans ?? [])
    .slice()
    .sort((a, b) => b.agreedAt.localeCompare(a.agreedAt))
    .map((loan) => {
      const settled = loan.status === "repaid";
      return {
        id: loan.id,
        icon: settled ? CheckCircle2 : loan.role === "lender" ? ArrowUpRight : ArrowDownLeft,
        text: settled
          ? t("home.activity.repaid", {
              name: firstNameOf(loan.counterparty.name),
              amount: loan.totalDue.toLocaleString("nb-NO"),
            })
          : loan.role === "lender"
            ? t("home.activity.lent", {
                amount: loan.principal.toLocaleString("nb-NO"),
                name: firstNameOf(loan.counterparty.name),
              })
            : t("home.activity.borrowed", {
                amount: loan.principal.toLocaleString("nb-NO"),
                name: firstNameOf(loan.counterparty.name),
              }),
        time: formatDateString(loan.agreedAt, language),
      };
    });

  return (
    <div className="flex flex-col min-h-screen bg-background pb-20">
      <div className="px-6 pt-8 pb-4 flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="text-foreground">
          <ArrowLeft className="w-6 h-6" />
        </button>
        <h1 className="text-h4 font-bold text-foreground">{t("allTransactions.title")}</h1>
      </div>

      <div className="px-6 flex-1">
        {isLoading && (
          <div className="flex justify-center mt-6">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" role="status" aria-label="Loading" />
          </div>
        )}

        {!isLoading && entries.length === 0 && (
          <p className="text-body-small text-muted-foreground text-center mt-6">{t("home.noActivity")}</p>
        )}

        <div className="flex flex-col gap-3">
          {entries.map((entry) => (
            <div
              key={entry.id}
              onClick={() => navigate("/loan-details", { state: { loanId: entry.id } })}
              className="bg-secondary rounded-xl p-4 flex items-center gap-3 cursor-pointer active:opacity-80 transition-opacity"
            >
              <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                <entry.icon className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-body-small font-medium text-foreground">{entry.text}</p>
                <p className="text-body-micro text-muted-foreground">{entry.time}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <BottomNav />
    </div>
  );
};

export default AllTransactions;
