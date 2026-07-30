import { useTranslation } from "@/context/LanguageContext";

const Dashboard = () => {
  const { t } = useTranslation();
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="text-center px-6">
        <h1 className="text-h4 text-pengio-green mb-2">{t("dashboard.welcome")}</h1>
        <p className="text-body-standard text-muted-foreground">{t("dashboard.loggedIn")}</p>
      </div>
    </div>
  );
};

export default Dashboard;
