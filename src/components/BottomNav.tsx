import { useLocation, useNavigate } from "react-router-dom";
import navHome from "@/assets/icons/nav-home.svg";
import navCoins from "@/assets/icons/nav-coins.svg";
import navInbox from "@/assets/icons/nav-inbox.svg";
import navProfile from "@/assets/icons/nav-profile.svg";
import { useTranslation } from "@/context/LanguageContext";

const BottomNav = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const navItems = [
    { label: t("nav.home"), icon: navHome, path: "/home" },
    { label: t("nav.loanOverview"), icon: navCoins, path: "/loan-summary" },
    { label: t("nav.inbox"), icon: navInbox, path: "/inbox" },
    { label: t("nav.profile"), icon: navProfile, path: "/profile" },
  ];

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 flex justify-center">
      <nav className="bg-[#101010] border border-[#171717] rounded-full px-2 py-2 w-full max-w-md">
        <div className="flex justify-around items-center">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className={`flex items-center gap-2 rounded-full transition-all ${isActive ? "bg-primary text-primary-foreground font-medium px-5 py-3" : "text-muted-foreground px-3 py-3"}`}
              >
                <img src={item.icon} alt={item.label} className="w-6 h-6" style={isActive ? { filter: "brightness(0)" } : { filter: "brightness(0) saturate(100%) invert(45%) sepia(0%) saturate(0%) hue-rotate(0deg) brightness(90%) contrast(90%)" }} />
                {isActive && <span className="text-sm whitespace-nowrap font-semibold">{item.label}</span>}
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
};

export default BottomNav;
