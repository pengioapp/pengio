import { useNavigate } from "react-router-dom";
import BottomNav from "@/components/BottomNav";
import { useLoanContext } from "@/context/LoanContext";
import { useTranslation } from "@/context/LanguageContext";
import { formatDateString } from "@/lib/dateLocale";

const avatarColors = [
  "bg-pengio-green",
  "bg-pengio-blue",
  "bg-pengio-orange",
  "bg-pengio-purple",
];

const Inbox = () => {
  const navigate = useNavigate();
  const { t, language } = useTranslation();
  const { requests, loanOffers } = useLoanContext();

  const pendingRequests = requests.filter((r) => r.status === "Pending");
  const pendingOffers = loanOffers.filter((o) => o.status === "Pending");
  const resolvedRequests = requests.filter((r) => r.status !== "Pending");
  const resolvedOffers = loanOffers.filter((o) => o.status !== "Pending");

  return (
    <div className="flex flex-col min-h-screen bg-background pb-20">
      <div className="px-6 pt-8 pb-4">
        <h1 className="text-title text-primary font-bold text-center">{t("inbox.title")}</h1>
      </div>

      <div className="px-6 flex-1">
        {pendingRequests.length === 0 && pendingOffers.length === 0 && resolvedRequests.length === 0 && resolvedOffers.length === 0 && (
          <p className="text-muted-foreground text-body-standard text-center mt-10">{t("inbox.noRequests")}</p>
        )}

        {(pendingRequests.length > 0 || pendingOffers.length > 0) && (
          <div className="mb-6">
            <h2 className="text-body-small text-muted-foreground mb-3">{t("inbox.pending")}</h2>
            <div className="flex flex-col gap-3">
              {pendingRequests.map((req, idx) => (
                <button
                  key={`req-${req.id}`}
                  onClick={() => navigate(`/inbox/${req.id}`, { state: { request: req } })}
                  className="bg-secondary rounded-xl p-4 flex items-center gap-3 text-left w-full transition-all hover:brightness-110"
                >
                  <div className={`w-10 h-10 rounded-full ${avatarColors[idx % avatarColors.length]} flex items-center justify-center text-body-micro font-bold text-foreground shrink-0`}>
                    {req.senderAvatar}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-body-small font-medium text-foreground">
                      {t("inbox.wantsToBorrow", { name: req.senderName })}{" "}
                      <span className="text-primary font-bold">{req.amount.toLocaleString("nb-NO")} kr</span>
                    </p>
                    <p className="text-body-micro text-muted-foreground">
                      {t("inbox.repayIn", { period: formatDateString(req.repaymentPeriod, language), percent: req.interestPercent })}
                    </p>
                  </div>
                  <span className="text-body-micro text-primary font-medium shrink-0">{t("status.pending")}</span>
                </button>
              ))}
              {pendingOffers.map((offer, idx) => (
                <button
                  key={`offer-${offer.id}`}
                  onClick={() => navigate(`/loan-request/${offer.id}`, { state: { offer } })}
                  className="bg-secondary rounded-xl p-4 flex items-center gap-3 text-left w-full transition-all hover:brightness-110"
                >
                  <div className={`w-10 h-10 rounded-full ${avatarColors[(idx + pendingRequests.length) % avatarColors.length]} flex items-center justify-center text-body-micro font-bold text-foreground shrink-0`}>
                    {offer.senderAvatar}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-body-small font-medium text-foreground">
                      {t("inbox.offeredYou", { name: offer.senderName })}{" "}
                      <span className="text-primary font-bold">{offer.amount.toLocaleString("nb-NO")} kr</span>
                    </p>
                    <p className="text-body-micro text-muted-foreground">
                      {t("inbox.repayIn", { period: formatDateString(offer.repaymentPeriod, language), percent: offer.interestPercent })}
                    </p>
                  </div>
                  <span className="text-body-micro text-pengio-green font-medium shrink-0">{t("inbox.offer")}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {(resolvedRequests.length > 0 || resolvedOffers.length > 0) && (
          <div>
            <h2 className="text-body-small text-muted-foreground mb-3">{t("inbox.resolved")}</h2>
            <div className="flex flex-col gap-3">
              {resolvedRequests.map((req, idx) => (
                <div key={`req-${req.id}`} className="bg-secondary/60 rounded-xl p-4 flex items-center gap-3 opacity-70">
                  <div className={`w-10 h-10 rounded-full ${avatarColors[idx % avatarColors.length]} flex items-center justify-center text-body-micro font-bold text-foreground shrink-0`}>
                    {req.senderAvatar}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-body-small font-medium text-foreground">{req.senderName} – {req.amount.toLocaleString("nb-NO")} kr</p>
                  </div>
                  <span className={`text-body-micro font-medium shrink-0 ${req.status === "Approved" ? "text-pengio-green" : "text-destructive"}`}>
                    {req.status === "Approved" ? t("status.approved") : t("status.rejected")}
                  </span>
                </div>
              ))}
              {resolvedOffers.map((offer, idx) => (
                <div key={`offer-${offer.id}`} className="bg-secondary/60 rounded-xl p-4 flex items-center gap-3 opacity-70">
                  <div className={`w-10 h-10 rounded-full ${avatarColors[(idx + resolvedRequests.length) % avatarColors.length]} flex items-center justify-center text-body-micro font-bold text-foreground shrink-0`}>
                    {offer.senderAvatar}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-body-small font-medium text-foreground">{offer.senderName} – {offer.amount.toLocaleString("nb-NO")} kr</p>
                  </div>
                  <span className={`text-body-micro font-medium shrink-0 ${offer.status === "Approved" ? "text-pengio-green" : "text-destructive"}`}>
                    {offer.status === "Approved" ? t("status.approved") : t("status.rejected")}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  );
};

export default Inbox;
