import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { ArrowLeft, Coins, Clock, Percent, TrendingUp, CalendarIcon } from "lucide-react";
import { toast } from "sonner";
import { parse } from "date-fns";
import { formatDate, getDateLocale } from "@/lib/dateLocale";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { type LoanOffer } from "@/data/mockRequests";
import { useLoanContext } from "@/context/LoanContext";
import RepaymentChart from "@/components/RepaymentChart";
import { useTranslation } from "@/context/LanguageContext";
import { useNotifications } from "@/context/NotificationContext";
import { cn } from "@/lib/utils";

const LoanRequest = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { t, language } = useTranslation();
  const { acceptOffer, rejectOffer, updateOfferRepaymentDate } = useLoanContext();
  const { addNotification } = useNotifications();
  const offer = location.state?.offer as LoanOffer | undefined;
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [status, setStatus] = useState(offer?.status || "Pending");
  const [chartMode, setChartMode] = useState<"weekly" | "monthly">("monthly");
  const [rejectionReason, setRejectionReason] = useState("");
  const [repaymentDate, setRepaymentDate] = useState<Date | undefined>(() => {
    if (!offer?.repaymentPeriod) return undefined;
    try {
      return parse(offer.repaymentPeriod, "d MMMM yyyy", new Date());
    } catch {
      return undefined;
    }
  });
  const [calendarOpen, setCalendarOpen] = useState(false);

  if (!offer) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background px-6">
        <p className="text-foreground text-body-standard mb-4">{t("loanRequest.offerNotFound")}</p>
        <button onClick={() => navigate("/inbox")} className="text-primary text-body-small">{t("loanRequest.backToInbox")}</button>
      </div>
    );
  }

  const earnings = Math.round(offer.amount * (offer.interestPercent / 100));

  const handleApprove = () => {
    acceptOffer(offer.id);
    setStatus("Approved");
    addNotification({ title: "Loan offer accepted", message: `You accepted ${offer.senderName}'s loan offer of ${offer.amount.toLocaleString("nb-NO")} kr`, timestamp: "Just now", type: "approved" });
    toast.success(t("loanRequest.approved"));
    setTimeout(() => navigate("/overview", { state: { tab: "borrowed" } }), 800);
  };

  const handleDateSelect = (date: Date | undefined) => {
    if (!date || !offer) return;
    setRepaymentDate(date);
    const formatted = formatDate(date, language);
    updateOfferRepaymentDate(offer.id, formatted);
    setCalendarOpen(false);
    addNotification({ title: "Repayment date changed", message: `Repayment date updated to ${formatted}`, timestamp: "Just now", type: "date-change" });
    toast.success(t("requestDetail.dateUpdated", { date: formatted }));
  };

  const handleReject = () => {
    rejectOffer(offer.id, rejectionReason || undefined);
    setStatus("Rejected");
    setShowRejectDialog(false);
    addNotification({ title: "Loan offer rejected", message: `You rejected ${offer.senderName}'s offer${rejectionReason ? `: ${rejectionReason}` : ""}`, timestamp: "Just now", type: "rejected" });
    toast(t("loanRequest.rejected"));
    setRejectionReason("");
    setTimeout(() => navigate("/inbox"), 1200);
  };

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <div className="px-6 pt-6 pb-4 flex items-center">
        <button onClick={() => navigate("/inbox")} className="w-10 h-10 rounded-full flex items-center justify-center text-foreground">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="flex-1 text-title text-primary font-bold text-center pr-10">{t("loanRequest.title")}</h1>
      </div>

      <div className="flex-1 px-6 pb-8 flex flex-col overflow-y-auto">
        <div className="bg-secondary rounded-2xl p-4 mb-6">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-12 h-12 rounded-full bg-pengio-green flex items-center justify-center text-body-small font-bold text-foreground">{offer.senderAvatar}</div>
            <div>
              <p className="text-body-standard font-medium text-foreground">{t("loanRequest.hasOfferedLoan", { name: offer.senderName })}</p>
              <p className="text-body-micro text-muted-foreground">{t("loanRequest.received", { time: offer.receivedAt.toLowerCase() })}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 mb-5">
            <InfoBlock icon={<Coins className="w-5 h-5 text-muted-foreground" />} label={t("loanRequest.amount")} value={`${offer.amount.toLocaleString("nb-NO")} kr`} />
            <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
              <PopoverTrigger asChild>
                <button className="bg-background/30 rounded-xl px-3 py-3 flex items-center gap-2.5 text-left hover:bg-background/40 transition-colors">
                  <Clock className="w-5 h-5 text-muted-foreground" />
                  <div>
                    <p className="text-body-micro text-muted-foreground">{t("loanRequest.repayment")}</p>
                    <p className="text-body-standard font-bold text-foreground">
                      {repaymentDate ? formatDate(repaymentDate, language) : offer.repaymentPeriod}
                    </p>
                  </div>
                  <CalendarIcon className="w-4 h-4 text-primary" />
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={repaymentDate}
                  onSelect={handleDateSelect}
                  disabled={(date) => date <= new Date()}
                  locale={getDateLocale(language)}
                  initialFocus
                  className={cn("p-3 pointer-events-auto")}
                />
              </PopoverContent>
            </Popover>
            <InfoBlock icon={<Percent className="w-5 h-5 text-muted-foreground" />} label={t("loanRequest.interestRate")} value={`${offer.interestPercent} %`} />
            <InfoBlock icon={<TrendingUp className="w-5 h-5 text-muted-foreground" />} label={t("loanRequest.earnings")} value={`${earnings.toLocaleString("nb-NO")} kr`} />
          </div>

          <RepaymentChart amount={offer.amount} mode={chartMode} />
          <div className="flex justify-center gap-3 mt-3">
            <button onClick={() => setChartMode("weekly")} className={`px-4 py-1.5 rounded-full text-body-small font-medium transition-colors ${chartMode === "weekly" ? "bg-secondary text-foreground border border-foreground/20" : "text-muted-foreground"}`}>
              {t("loanRequest.weekly")}
            </button>
            <button onClick={() => setChartMode("monthly")} className={`px-4 py-1.5 rounded-full text-body-small font-medium transition-colors ${chartMode === "monthly" ? "border border-primary text-primary" : "text-muted-foreground"}`}>
              {t("loanRequest.monthly")}
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between mb-4">
          <p className="text-body-small text-muted-foreground">{t("loanRequest.otherCondition")}</p>
          <p className="text-body-small text-foreground font-medium">{offer.condition || t("loanRequest.noConditions")}</p>
        </div>

        {offer.message && (
          <div className="bg-secondary rounded-xl px-4 py-3 mb-6">
            <p className="text-body-micro text-muted-foreground mb-1">{t("loanRequest.message")} :</p>
            <p className="text-body-small text-foreground">" {offer.message} "</p>
          </div>
        )}

        <div className="mb-6">
          <h2 className="text-body-standard font-medium text-primary mb-2">{t("loanRequest.loanAgreement")}</h2>
          <p className="text-body-small text-muted-foreground">
            {t("loanRequest.bankIdText")}{" "}
            <span className="text-foreground underline">{t("loanRequest.bankId")}</span>.
          </p>
        </div>

        {status !== "Pending" && (
          <div className="flex justify-center mb-6">
            <span className={`px-6 py-2 rounded-full text-body-standard font-bold ${status === "Approved" ? "bg-pengio-green/20 text-pengio-green" : "bg-destructive/20 text-destructive"}`}>
              {status === "Approved" ? t("status.approved") : t("status.rejected")}
            </span>
          </div>
        )}

        {status === "Pending" && (
          <div className="mt-auto pt-4 flex gap-3">
            <button onClick={() => setShowRejectDialog(true)} className="flex-1 py-4 rounded-full bg-destructive text-foreground text-body-standard font-bold hover:bg-destructive/90 transition-all">
              {t("buttons.reject")}
            </button>
            <button onClick={handleApprove} className="flex-1 py-4 rounded-full bg-pengio-green text-foreground text-body-standard font-bold hover:bg-pengio-green-hover transition-all">
              {t("buttons.approve")}
            </button>
          </div>
        )}
      </div>

      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent className="bg-secondary border-foreground/10 max-w-[340px] rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-foreground">{t("requestDetail.rejectReasonTitle")}</DialogTitle>
            <DialogDescription className="text-muted-foreground">
              {t("requestDetail.rejectReasonDescription")}
            </DialogDescription>
          </DialogHeader>
          <Textarea
            value={rejectionReason}
            onChange={(e) => setRejectionReason(e.target.value)}
            placeholder={t("requestDetail.enterReason")}
            className="bg-background/30 border-foreground/10 text-foreground placeholder:text-muted-foreground min-h-[100px] resize-none"
          />
          <DialogFooter className="flex-row gap-3 sm:flex-row">
            <Button variant="outline" onClick={() => { setShowRejectDialog(false); setRejectionReason(""); }} className="flex-1 rounded-full border-foreground/20 text-foreground">
              {t("buttons.cancel")}
            </Button>
            <Button onClick={handleReject} className="flex-1 rounded-full bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {t("requestDetail.send")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

const InfoBlock = ({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) => (
  <div className="bg-background/30 rounded-xl px-3 py-3 flex items-center gap-2.5">
    {icon}
    <div>
      <p className="text-body-micro text-muted-foreground">{label}</p>
      <p className="text-body-standard font-bold text-foreground">{value}</p>
    </div>
  </div>
);

export default LoanRequest;
