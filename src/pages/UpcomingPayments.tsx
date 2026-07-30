import { useNavigate } from "react-router-dom";
import { ArrowLeft, CalendarDays } from "lucide-react";
import { useTranslation } from "@/context/LanguageContext";

type BadgeType = "due-soon" | "days-left" | "upcoming";

interface PaymentItem {
  date: string;
  badge: BadgeType;
  badgeLabel: string;
  recipient: string;
  amount: string;
}

const badgeStyles: Record<BadgeType, string> = {
  "due-soon": "bg-primary text-background",
  "days-left": "bg-[#41D33E] text-background",
  "upcoming": "bg-[hsl(0,0%,30%)] text-foreground",
};

const PaymentCard = ({ item }: { item: PaymentItem }) => {
  const { t } = useTranslation();
  return (
    <div className="bg-secondary rounded-xl overflow-hidden">
      <div className="px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <CalendarDays className="w-5 h-5 text-muted-foreground" strokeWidth={1.5} />
          <span className="text-foreground text-sm font-medium">{item.date}</span>
        </div>
        <span className={`text-xs font-semibold px-3 py-1 rounded-full ${badgeStyles[item.badge]}`}>{item.badgeLabel}</span>
      </div>
      <div className="px-4 pb-3 flex flex-col gap-1.5">
        <div className="flex justify-between items-center">
          <span className="text-muted-foreground text-sm">{t("upcomingPayments.payment")}</span>
          <span className="text-foreground text-sm">{item.recipient}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-muted-foreground text-sm">{t("upcomingPayments.amount")}</span>
          <span className="text-primary text-sm font-medium">{item.amount}</span>
        </div>
      </div>
    </div>
  );
};

const UpcomingPayments = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();

  const thisWeek: PaymentItem[] = [
    { date: "Wednesday, 26 March 2025", badge: "due-soon", badgeLabel: t("status.dueSoon"), recipient: "Erik Johansen", amount: "950 kr" },
  ];

  const nextWeek: PaymentItem[] = [
    { date: "Friday, 28 March 2025", badge: "due-soon", badgeLabel: t("status.dueSoon"), recipient: "Anna Kristoffersen", amount: "600 kr" },
    { date: "Friday, 28 March 2025", badge: "days-left", badgeLabel: "2 days left", recipient: "Jonas Mikkelsen", amount: "850 kr" },
    { date: "12 April 2025", badge: "upcoming", badgeLabel: "Upcoming", recipient: "Kaia Lunde", amount: "1,200 kr" },
    { date: "12 April 2025", badge: "upcoming", badgeLabel: "Upcoming", recipient: "Kaia Lunde", amount: "1,200 kr" },
  ];

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <div className="px-6 pt-8 pb-2 flex items-center relative">
        <button onClick={() => navigate("/profile")} className="absolute left-4 p-2"><ArrowLeft className="w-6 h-6 text-foreground" strokeWidth={1.5} /></button>
        <h1 className="text-title text-primary font-bold text-center w-full">{t("upcomingPayments.title")}</h1>
      </div>
      <div className="px-6 mt-6 flex flex-col gap-6">
        <div className="flex flex-col gap-3">
          <h2 className="text-primary font-bold text-base">{t("upcomingPayments.thisWeek")}</h2>
          {thisWeek.map((item, i) => <PaymentCard key={i} item={item} />)}
        </div>
        <div className="flex flex-col gap-3">
          <h2 className="text-primary font-bold text-base">{t("upcomingPayments.nextWeek")}</h2>
          {nextWeek.map((item, i) => <PaymentCard key={i} item={item} />)}
        </div>
      </div>
    </div>
  );
};

export default UpcomingPayments;
