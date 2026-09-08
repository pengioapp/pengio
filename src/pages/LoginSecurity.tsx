import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "@/context/LanguageContext";
import PasswordField from "@/components/PasswordField";

const LoginSecurity = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  return (
    <div className="flex flex-col min-h-screen bg-background pb-28">
      <div className="px-6 pt-8 pb-2 flex items-center relative">
        <button onClick={() => navigate(-1)} className="absolute left-4 p-2"><ArrowLeft className="w-6 h-6 text-foreground" /></button>
        <h1 className="text-title text-primary font-bold text-center w-full">{t("loginSecurity.title")}</h1>
      </div>
      <div className="px-6 mt-6 flex flex-col gap-5">
        <div className="flex flex-col gap-2">
          <label className="text-foreground text-sm font-medium">{t("loginSecurity.currentPassword")}</label>
          <PasswordField
            value={currentPassword}
            onChange={setCurrentPassword}
            placeholder={t("loginSecurity.enterOldPassword")}
            autoComplete="current-password"
          />
        </div>
        <div className="flex flex-col gap-2">
          <label className="text-foreground text-sm font-medium">{t("loginSecurity.newPassword")}</label>
          <PasswordField
            value={newPassword}
            onChange={setNewPassword}
            placeholder={t("loginSecurity.enterNewPassword")}
            autoComplete="new-password"
          />
        </div>
        <div className="flex flex-col gap-2">
          <label className="text-foreground text-sm font-medium">{t("loginSecurity.confirmPassword")}</label>
          <PasswordField
            value={confirmPassword}
            onChange={setConfirmPassword}
            placeholder={t("loginSecurity.reEnterNewPassword")}
            autoComplete="new-password"
          />
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
