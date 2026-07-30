import { useNavigate } from "react-router-dom";
import { ArrowLeft, Bell, Wallet, RefreshCw, Percent } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "@/context/LanguageContext";

const AlertsSetting = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();

  const alertOptions = [
    { icon: Bell, label: t("alertsSetting.upcomingReminders"), defaultOn: true },
    { icon: Wallet, label: t("alertsSetting.loanRequestNotifications"), defaultOn: true },
    { icon: RefreshCw, label: t("alertsSetting.repaymentUpdates"), defaultOn: true },
    { icon: Percent, label: t("alertsSetting.interestUpdates"), defaultOn: false },
  ];

  const [toggles, setToggles] = useState(alertOptions.map((o) => o.defaultOn));
  const handleToggle = (index: number) => setToggles((prev) => prev.map((v, i) => (i === index ? !v : v)));

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <div className="px-6 pt-8 pb-2 flex items-center relative">
        <button onClick={() => navigate("/profile")} className="absolute left-4 p-2"><ArrowLeft className="w-6 h-6 text-foreground" strokeWidth={1.5} /></button>
        <h1 className="text-title text-primary font-bold text-center w-full">{t("alertsSetting.title")}</h1>
      </div>
      <div className="px-6 mt-6 flex flex-col gap-3">
        {alertOptions.map((item, index) => (
          <div key={index} className="bg-secondary rounded-xl px-4 py-4 flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-full bg-muted-foreground/20 flex items-center justify-center shrink-0">
              <item.icon className="w-5 h-5 text-muted-foreground" strokeWidth={1.5} />
            </div>
            <span className="flex-1 text-foreground text-base font-medium">{item.label}</span>
            <button onClick={() => handleToggle(index)} className={`w-[52px] h-[30px] rounded-full relative transition-colors duration-200 border-0 outline-none ring-0 p-0 ${toggles[index] ? "bg-primary" : "bg-[hsl(0,0%,25%)]"}`} style={{ WebkitAppearance: "none", appearance: "none" }}>
              <span className={`absolute top-1/2 -translate-y-1/2 w-5 h-5 rounded-full transition-transform duration-200 ${toggles[index] ? "left-[26px] bg-[hsl(0,0%,12%)]" : "left-[5px] bg-[hsl(0,0%,45%)]"}`} />
            </button>
          </div>
        ))}
      </div>
      <div className="flex-1" />
      <div className="px-6 pb-10">
        <button className="w-full py-4 rounded-full bg-primary text-background text-base font-bold">{t("alertsSetting.update")}</button>
      </div>
    </div>
  );
};

export default AlertsSetting;
