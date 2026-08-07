import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Users, ShieldCheck, Bell, CalendarDays, LogOut, Trash2, ChevronRight, Globe, Mail, X } from "lucide-react";
import BottomNav from "@/components/BottomNav";
import { Drawer, DrawerContent, DrawerClose } from "@/components/ui/drawer";
import { useTranslation } from "@/context/LanguageContext";
import { useAuth } from "@/context/AuthContext";

const Profile = () => {
  const navigate = useNavigate();
  const { t, language, setLanguage } = useTranslation();
  const { user, logout: authLogout } = useAuth();
  const [showLogout, setShowLogout] = useState(false);
  const [showDeleteAccount, setShowDeleteAccount] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [showLanguagePicker, setShowLanguagePicker] = useState(false);

  const settingsItems = [
    { icon: Users, label: t("profile.manageFamily"), route: "/manage-members" },
    { icon: ShieldCheck, label: t("profile.loginSecurity"), route: "/login-security" },
    { icon: Bell, label: t("profile.alerts"), subtitle: t("profile.alertsSubtitle"), route: "/alerts-setting" },
    { icon: CalendarDays, label: t("profile.upcomingPayments"), route: "/upcoming-payments" },
    { icon: LogOut, label: t("profile.logout"), action: "logout" },
    { icon: Trash2, label: t("profile.deleteAccount"), destructive: true, action: "delete" },
  ];

  // Awaited so the stored session is cleared before navigating away; otherwise
  // RequireAuth can still see a live session and bounce straight back in.
  const handleSignOut = async () => {
    setShowLogout(false);
    await authLogout();
    navigate("/login", { replace: true });
  };

  // Signs out, but does not delete anything. Erasing an account has to remove
  // the auth user, which needs privileges the browser does not have -- and it
  // has to reckon with loans the person is party to, since a counterparty's
  // record of a debt should not vanish because the other side left.
  // TODO: implement as a server-side function with an explicit data-retention
  // rule before offering this to real users.
  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== t("profile.deleteWord")) return;
    setShowDeleteAccount(false);
    setDeleteConfirmText("");
    await authLogout();
    navigate("/login", { replace: true });
  };

  const languageLabel = language === "en" ? "English" : "Norsk (Bokmål)";

  return (
    <div className="flex flex-col min-h-screen bg-background pb-24">
      <div className="px-6 pt-8 pb-2 flex items-center relative">
        <button onClick={() => navigate(-1)} className="absolute left-4 p-2"><ArrowLeft className="w-6 h-6 text-foreground" /></button>
        <h1 className="text-title text-primary font-bold text-center w-full">{t("profile.title")}</h1>
      </div>

      <div className="px-6 mt-4">
        <div className="bg-secondary rounded-2xl pt-10 pb-5 px-5 flex flex-col items-center relative">
          <div className="w-20 h-20 rounded-full bg-primary flex items-center justify-center text-2xl font-bold text-background absolute -top-6 border-4 border-background">{user ? user.name.split(" ").map(n => n[0]).join("") : "?"}</div>
          <div className="mt-6 flex flex-col items-center gap-1">
            <h2 className="text-lg font-bold text-foreground">{user?.name || "Guest"}</h2>
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Mail className="w-3.5 h-3.5" />
              <span className="text-sm">{user?.email || ""}</span>
            </div>
            <button onClick={() => setShowLanguagePicker(!showLanguagePicker)} className="flex items-center gap-1.5 text-foreground mt-1">
              <Globe className="w-3.5 h-3.5 text-primary" />
              <span className="text-sm">{languageLabel}</span>
              <ChevronRight className="w-3 h-3 text-muted-foreground" />
            </button>
            {showLanguagePicker && (
              <div className="mt-2 bg-background/80 rounded-xl p-2 flex flex-col gap-1 w-48 border border-foreground/10">
                <button onClick={() => { setLanguage("en"); setShowLanguagePicker(false); }} className={`px-3 py-2 rounded-lg text-sm text-left ${language === "en" ? "text-primary bg-primary/10" : "text-foreground hover:bg-foreground/5"}`}>
                  English
                </button>
                <button onClick={() => { setLanguage("no"); setShowLanguagePicker(false); }} className={`px-3 py-2 rounded-lg text-sm text-left ${language === "no" ? "text-primary bg-primary/10" : "text-foreground hover:bg-foreground/5"}`}>
                  Norsk (Bokmål)
                </button>
              </div>
            )}
          </div>
          <button onClick={() => navigate("/edit-personal-info")} className="mt-4 w-full py-3.5 rounded-full bg-primary text-background text-base font-bold">
            {t("profile.editPersonalInfo")}
          </button>
        </div>
      </div>

      <div className="px-6 mt-5 flex flex-col gap-3">
        {settingsItems.map((item) => (
          <button
            key={item.label}
            onClick={() => {
              if (item.action === "logout") setShowLogout(true);
              else if (item.action === "delete") setShowDeleteAccount(true);
              else if (item.route) navigate(item.route);
            }}
            className="bg-secondary rounded-xl px-4 py-4 flex items-center gap-3.5 w-full text-left"
          >
            <div className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 ${item.destructive ? "bg-destructive/20" : "bg-muted-foreground/20"}`}>
              <item.icon className={`w-5 h-5 ${item.destructive ? "text-destructive" : "text-primary"}`} />
            </div>
            <div className="flex-1 min-w-0">
              <p className={`text-base font-medium ${item.destructive ? "text-destructive" : "text-foreground"}`}>{item.label}</p>
              {item.subtitle && <p className="text-sm text-muted-foreground">{item.subtitle}</p>}
            </div>
            <ChevronRight className="w-5 h-5 text-muted-foreground shrink-0" />
          </button>
        ))}
      </div>

      {/* Logout Drawer */}
      <Drawer open={showLogout} onOpenChange={setShowLogout}>
        <DrawerContent className="bg-[hsl(0,0%,10%)] border-0 rounded-t-3xl px-6 pb-8">
          <div className="flex justify-between items-center mt-2">
            <h2 className="text-xl font-bold text-primary">{t("profile.signOut")}</h2>
            <DrawerClose asChild><button className="p-1"><X className="w-5 h-5 text-muted-foreground" /></button></DrawerClose>
          </div>
          <div className="flex flex-col items-center mt-6">
            <div className="relative w-24 h-24">
              <svg width="80" height="80" viewBox="0 0 80 80" fill="none" className="mx-auto">
                <circle cx="40" cy="28" r="14" fill="hsl(0,0%,35%)" />
                <ellipse cx="40" cy="68" rx="24" ry="16" fill="hsl(0,0%,35%)" />
              </svg>
              <div className="absolute -bottom-1 right-1 w-10 h-10 rounded-full bg-primary flex items-center justify-center"><LogOut className="w-5 h-5 text-background" /></div>
            </div>
            <p className="text-primary font-semibold text-base mt-5">{t("profile.signOutConfirm")}</p>
            <p className="text-muted-foreground text-sm text-center mt-1.5 max-w-[260px]">{t("profile.signOutMessage")}</p>
          </div>
          <div className="flex gap-3 mt-8">
            <DrawerClose asChild><button className="flex-1 py-3.5 rounded-full bg-primary/15 text-primary font-bold text-base">{t("profile.cancel")}</button></DrawerClose>
            <button onClick={handleSignOut} className="flex-1 py-3.5 rounded-full bg-primary text-background font-bold text-base">{t("buttons.signOut")}</button>
          </div>
        </DrawerContent>
      </Drawer>

      {/* Delete Account Drawer */}
      <Drawer open={showDeleteAccount} onOpenChange={(open) => { setShowDeleteAccount(open); if (!open) setDeleteConfirmText(""); }}>
        <DrawerContent className="bg-[hsl(0,0%,10%)] border-0 rounded-t-3xl px-6 pb-8 max-h-[90vh] overflow-y-auto">
          <div className="flex justify-between items-center mt-2">
            <h2 className="text-xl font-bold text-primary">{t("profile.deleteAccount")}</h2>
            <DrawerClose asChild><button className="p-1"><X className="w-5 h-5 text-muted-foreground" /></button></DrawerClose>
          </div>
          <div className="flex flex-col items-center mt-6">
            <div className="relative w-24 h-24">
              <svg width="80" height="80" viewBox="0 0 80 80" fill="none" className="mx-auto">
                <circle cx="40" cy="28" r="14" fill="hsl(0,0%,35%)" />
                <ellipse cx="40" cy="68" rx="24" ry="16" fill="hsl(0,0%,35%)" />
              </svg>
              <div className="absolute -bottom-1 right-1 w-10 h-10 rounded-full bg-destructive flex items-center justify-center"><Trash2 className="w-5 h-5 text-white" /></div>
            </div>
            <p className="text-primary font-semibold text-base mt-5 text-center">{t("profile.deleteConfirm")}</p>
          </div>
          <div className="mt-6">
            <p className="text-foreground font-semibold text-base mb-3">{t("profile.deleteWill")}</p>
            <div className="bg-[hsl(0,0%,15%)] rounded-xl px-4 py-4 flex flex-col gap-2.5">
              {[t("profile.deleteItem1"), t("profile.deleteItem2"), t("profile.deleteItem3"), t("profile.deleteItem4")].map((item, i) => (
                <div key={i} className="flex items-start gap-2.5"><span className="text-muted-foreground mt-1">•</span><span className="text-muted-foreground text-sm">{item}</span></div>
              ))}
            </div>
          </div>
          <div className="mt-6">
            <p className="text-foreground text-sm mb-2">{t("profile.typeDelete", { word: t("profile.deleteWord") })}</p>
            <input type="text" placeholder={t("profile.enterHere")} value={deleteConfirmText} onChange={(e) => setDeleteConfirmText(e.target.value)} className="w-full bg-[hsl(0,0%,15%)] text-foreground rounded-xl px-4 py-3.5 text-base placeholder:text-muted-foreground outline-none border-0 focus:ring-1 focus:ring-primary/30" />
          </div>
          <div className="flex gap-3 mt-8">
            <DrawerClose asChild><button className="flex-1 py-3.5 rounded-full bg-primary/15 text-primary font-bold text-base">{t("profile.cancel")}</button></DrawerClose>
            <button onClick={handleDeleteAccount} disabled={deleteConfirmText !== t("profile.deleteWord")} className="flex-1 py-3.5 rounded-full bg-destructive text-white font-bold text-base disabled:opacity-40 transition-opacity">
              {t("profile.deleteMyAccount")}
            </button>
          </div>
        </DrawerContent>
      </Drawer>

      <BottomNav />
    </div>
  );
};

export default Profile;
