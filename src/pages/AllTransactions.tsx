import { useNavigate } from "react-router-dom";
import { ArrowLeft, ArrowDownLeft, ArrowUpRight } from "lucide-react";
import BottomNav from "@/components/BottomNav";
import { useTranslation } from "@/context/LanguageContext";

const AllTransactions = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();

  const allActivity = [
    { id: 1, type: "borrowed", name: "Anna Kristoffersen", avatar: "AK", amount: 1000, interest: 0, repaymentDate: "10 April 2025", time: t("home.activity.yesterday"), icon: ArrowDownLeft },
    { id: 2, type: "lent", name: "Erik Johansen", avatar: "EJ", amount: 5000, interest: 5, repaymentDate: "28 March 2025", time: t("home.activity.daysAgo", { count: 3 }), icon: ArrowUpRight },
    { id: 3, type: "repaid", name: "Erik Johansen", avatar: "EJ", amount: 2000, interest: 3, repaymentDate: "15 March 2025", time: t("home.activity.lastWeek"), icon: ArrowUpRight },
    { id: 4, type: "borrowed", name: "Anna Kristoffersen", avatar: "AK", amount: 1000, interest: 2, repaymentDate: "20 April 2025", time: t("home.activity.yesterday"), icon: ArrowDownLeft },
    { id: 5, type: "lent", name: "Kaia Lunde", avatar: "KL", amount: 3000, interest: 4, repaymentDate: "1 May 2025", time: t("home.activity.daysAgo", { count: 5 }), icon: ArrowUpRight },
    { id: 6, type: "repaid", name: "Anna Kristoffersen", avatar: "AK", amount: 1500, interest: 0, repaymentDate: "10 March 2025", time: t("home.activity.lastWeek"), icon: ArrowUpRight },
  ];

  const getText = (item: typeof allActivity[0]) => {
    if (item.type === "borrowed") return t("home.activity.borrowed", { amount: String(item.amount), name: item.name.split(" ")[0] });
    if (item.type === "lent") return t("home.activity.lent", { amount: String(item.amount), name: item.name.split(" ")[0] });
    return t("home.activity.repaid", { name: item.name.split(" ")[0], amount: String(item.amount) });
  };

  const handleItemClick = (item: typeof allActivity[0]) => {
    const isLent = item.type === "lent" || item.type === "repaid";
    navigate("/loan-details", {
      state: {
        loan: {
          title: `${isLent ? t("loanDetails.loanTo") : t("loanDetails.loanFrom")} ${item.name}`,
          avatar: item.avatar,
          status: item.type === "repaid" ? t("status.paidOff") : t("status.dueSoon"),
          outstandingBalance: `${item.amount.toLocaleString("nb-NO")} kr`,
          nextPayment: item.repaymentDate,
          interestRate: `${item.interest} %`,
          amount: item.amount,
        },
      },
    });
  };

  return (
    <div className="flex flex-col min-h-screen bg-background pb-20">
      <div className="px-6 pt-8 pb-4 flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="text-foreground">
          <ArrowLeft className="w-6 h-6" />
        </button>
        <h1 className="text-h4 font-bold text-foreground">{t("allTransactions.title")}</h1>
      </div>

      <div className="px-6 flex-1">
        <div className="flex flex-col gap-3">
          {allActivity.map((item) => (
            <div
              key={item.id}
              onClick={() => handleItemClick(item)}
              className="bg-secondary rounded-xl p-4 flex items-center gap-3 cursor-pointer active:opacity-80 transition-opacity"
            >
              <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                <item.icon className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-body-small font-medium text-foreground">{getText(item)}</p>
                <p className="text-body-micro text-muted-foreground">{item.time}</p>
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
