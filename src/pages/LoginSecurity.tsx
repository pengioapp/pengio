import { useNavigate } from "react-router-dom";
import { ArrowLeft, KeyRound } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "@/context/LanguageContext";

const inputClass = "w-full bg-secondary/60 rounded-xl px-4 py-3.5 text-foreground text-base placeholder:text-muted-foreground outline-none border-none";

const LoginSecurity = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  return (
    <div className="flex flex-col min-h-screen bg-background pb-8">
      <div className="px-6 pt-8 pb-2 flex items-center relative">
        <button onClick={() => navigate(-1)} className="absolute left-4 p-2"><ArrowLeft className="w-6 h-6 text-foreground" /></button>
        <h1 className="text-title text-primary font-bold text-center w-full">{t("loginSecurity.title")}</h1>
      </div>
      <div className="px-6 mt-6 flex flex-col gap-5">
        <div className="flex flex-col gap-2">
          <label className="text-foreground text-sm font-medium">{t("loginSecurity.currentPassword")}</label>
          <div className="relative">
            <KeyRound className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" strokeWidth={1.5} />
            <input type="password" placeholder={t("loginSecurity.enterOldPassword")} value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} className={`${inputClass} pl-12`} />
          </div>
        </div>
        <div className="flex flex-col gap-2">
          <label className="text-foreground text-sm font-medium">{t("loginSecurity.newPassword")}</label>
          <div className="relative">
            <KeyRound className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" strokeWidth={1.5} />
            <input type="password" placeholder={t("loginSecurity.enterNewPassword")} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className={`${inputClass} pl-12`} />
          </div>
        </div>
        <div className="flex flex-col gap-2">
          <label className="text-foreground text-sm font-medium">{t("loginSecurity.confirmPassword")}</label>
          <div className="relative">
            <KeyRound className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" strokeWidth={1.5} />
            <input type="password" placeholder={t("loginSecurity.reEnterNewPassword")} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className={`${inputClass} pl-12`} />
          </div>
        </div>
      </div>
      <div className="flex-1" />
      <div className="px-6 mt-6">
        <button className="w-full py-3.5 rounded-full bg-primary text-background text-base font-bold">{t("loginSecurity.savePassword")}</button>
      </div>
    </div>
  );
};

export default LoginSecurity;
