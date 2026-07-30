import { useNavigate } from "react-router-dom";
import { Bell, ArrowDownLeft, ArrowUpRight, Coins } from "lucide-react";
import BottomNav from "@/components/BottomNav";
import { useTranslation } from "@/context/LanguageContext";
import { useAuth } from "@/context/AuthContext";
import { useNotifications } from "@/context/NotificationContext";

const HomePage = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { firstName } = useAuth();
  const { unreadCount } = useNotifications();

  const greeting = firstName
    ? t("home.greeting", { name: firstName })
    : t("home.greetingFallback");

  const mockActivity = [
    { id: 1, type: "borrowed", name: "Anna Kristoffersen", avatar: "AK", amount: 1000, interest: 0, repaymentDate: "10 April 2025", text: t("home.activity.borrowed", { amount: "1000", name: "Anna" }), time: t("home.activity.yesterday"), icon: ArrowDownLeft },
    { id: 2, type: "lent", name: "Erik Johansen", avatar: "EJ", amount: 5000, interest: 5, repaymentDate: "28 March 2025", text: t("home.activity.lent", { amount: "5000", name: "Erik" }), time: t("home.activity.daysAgo", { count: 3 }), icon: ArrowUpRight },
    { id: 3, type: "repaid", name: "Erik Johansen", avatar: "EJ", amount: 2000, interest: 3, repaymentDate: "15 March 2025", text: t("home.activity.repaid", { name: "Erik", amount: "2000" }), time: t("home.activity.lastWeek"), icon: ArrowUpRight },
    { id: 4, type: "borrowed", name: "Anna Kristoffersen", avatar: "AK", amount: 1000, interest: 2, repaymentDate: "20 April 2025", text: t("home.activity.borrowed", { amount: "1000", name: "Anna" }), time: t("home.activity.yesterday"), icon: ArrowDownLeft },
  ];

  const handleActivityClick = (item: typeof mockActivity[0]) => {
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
              <span className="text-h4 font-bold text-foreground">12 500 kr</span>
            </div>
            <div className="flex flex-col items-start">
              <div className="w-10 h-10 rounded-full bg-background/20 flex items-center justify-center mb-2">
                <ArrowDownLeft className="w-5 h-5 text-primary" />
              </div>
              <span className="text-body-small text-muted-foreground">{t("home.borrowed")}</span>
              <span className="text-h4 font-bold text-foreground">4 000 kr</span>
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

        <div className="flex flex-col gap-3">
          {mockActivity.map((item) => (
            <div key={item.id} onClick={() => handleActivityClick(item)} className="bg-secondary rounded-xl p-4 flex items-center gap-3 cursor-pointer active:opacity-80 transition-opacity">
              <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                <item.icon className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-body-small font-medium text-foreground">{item.text}</p>
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

export default HomePage;
