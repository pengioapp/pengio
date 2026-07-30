import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Coins, Clock, Percent, CalendarIcon } from "lucide-react";
import { toast } from "sonner";
import { parse } from "date-fns";
import { formatDate, getDateLocale } from "@/lib/dateLocale";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { type LoanRequest } from "@/data/mockRequests";
import { useLoanContext } from "@/context/LoanContext";
import { useTranslation } from "@/context/LanguageContext";
import { useNotifications } from "@/context/NotificationContext";
import { cn } from "@/lib/utils";

const RequestDetail = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { t, language } = useTranslation();
  const { approveRequest, rejectRequest, updateRequestRepaymentDate } = useLoanContext();
  const { addNotification } = useNotifications();
  const request = location.state?.request as LoanRequest | undefined;
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [status, setStatus] = useState(request?.status || "Pending");
  const [interestRate, setInterestRate] = useState("5");
  const [rejectionReason, setRejectionReason] = useState("");
  const [repaymentDate, setRepaymentDate] = useState<Date | undefined>(() => {
    if (!request?.repaymentPeriod) return undefined;
    try {
      return parse(request.repaymentPeriod, "d MMMM yyyy", new Date());
    } catch {
      return undefined;
    }
  });
  const [calendarOpen, setCalendarOpen] = useState(false);

  if (!request) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background px-6">
        <p className="text-foreground text-body-standard mb-4">{t("requestDetail.requestNotFound")}</p>
        <button onClick={() => navigate("/inbox")} className="text-primary text-body-small">{t("requestDetail.backToInbox")}</button>
      </div>
    );
  }

  const handleInterestChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/[^0-9]/g, "");
    const num = parseInt(val, 10);
    if (val === "") setInterestRate("");
    else if (num <= 10) setInterestRate(String(num));
  };

  const handleDateSelect = (date: Date | undefined) => {
    if (!date) return;
    setRepaymentDate(date);
    const formatted = formatDate(date, language);
    updateRequestRepaymentDate(request.id, formatted);
    setCalendarOpen(false);
    addNotification({ title: "Repayment date changed", message: `Repayment date updated to ${formatted}`, timestamp: "Just now", type: "date-change" });
    toast.success(t("requestDetail.dateUpdated", { date: formatted }));
  };

  const handleApprove = () => {
    if (!request) return;
    const interest = parseInt(interestRate || "0", 10);
    approveRequest(request.id, interest);
    setStatus("Approved");
    addNotification({ title: "Request approved", message: `You approved ${request.senderName}'s request for ${request.amount.toLocaleString("nb-NO")} kr`, timestamp: "Just now", type: "approved" });
    toast.success(t("status.approved"));
    setTimeout(() => navigate("/overview", { state: { tab: "lent" } }), 800);
  };

  const handleReject = () => {
    if (!request) return;
    rejectRequest(request.id, rejectionReason || undefined);
    setStatus("Rejected");
    setShowRejectDialog(false);
    addNotification({ title: "Request rejected", message: `You rejected ${request.senderName}'s request${rejectionReason ? `: ${rejectionReason}` : ""}`, timestamp: "Just now", type: "rejected" });
    toast(t("status.rejected"));
    setRejectionReason("");
    setTimeout(() => navigate("/inbox"), 1200);
  };

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <div className="px-6 pt-6 pb-4 flex items-center">
        <button onClick={() => navigate("/inbox")} className="w-10 h-10 rounded-full flex items-center justify-center text-foreground">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6" /></svg>
        </button>
        <h1 className="flex-1 text-title text-primary font-bold text-center pr-10">{t("requestDetail.title")}</h1>
      </div>

      <div className="flex-1 px-6 pb-8 flex flex-col">
        <div className="bg-secondary rounded-2xl p-4 mb-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-full bg-pengio-blue flex items-center justify-center text-body-small font-bold text-foreground">{request.senderAvatar}</div>
            <div>
              <p className="text-body-standard font-medium text-foreground">{t("requestDetail.wantsToBorrow", { name: request.senderName.split(" ")[0] })}</p>
              <p className="text-body-micro text-muted-foreground">{t("loanRequest.received", { time: request.receivedAt.toLowerCase() })}</p>
            </div>
          </div>
          <div className="flex gap-3 mb-4">
            <div className="flex-1 bg-background/30 rounded-xl px-3 py-3 flex items-center gap-2.5">
              <Coins className="w-5 h-5 text-muted-foreground shrink-0" />
              <div>
                <p className="text-body-micro text-muted-foreground">{t("loanRequest.amount")}</p>
                <p className="text-body-standard font-bold text-foreground">{request.amount.toLocaleString("nb-NO")} kr</p>
              </div>
            </div>
            <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
              <PopoverTrigger asChild>
                <button className="flex-1 bg-background/30 rounded-xl px-3 py-3 flex items-center gap-2.5 text-left hover:bg-background/40 transition-colors">
                  <Clock className="w-5 h-5 text-muted-foreground shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-body-micro text-muted-foreground">{t("loanRequest.repayment")}</p>
                    <p className="text-body-standard font-bold text-foreground truncate">
                      {repaymentDate ? formatDate(repaymentDate, language) : request.repaymentPeriod}
                    </p>
                  </div>
                  <CalendarIcon className="w-4 h-4 text-primary shrink-0" />
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
          </div>
          <div className="bg-background/20 rounded-xl px-4 py-3">
            <p className="text-body-micro text-muted-foreground mb-1">{t("loanRequest.message")} :</p>
            <p className="text-body-small text-foreground">"{request.message}"</p>
          </div>
        </div>

        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-body-standard font-medium text-foreground">{t("requestDetail.interestRate")}</h2>
            <p className="text-body-micro text-primary">{t("requestDetail.allowedRange")}</p>
          </div>
          <div className="bg-secondary rounded-xl px-4 py-3.5 flex items-center gap-3">
            <div className="w-8 h-8 rounded-full border-[1.5px] border-muted-foreground flex items-center justify-center shrink-0">
              <span className="text-[13px] font-semibold text-muted-foreground leading-none">%</span>
            </div>
            <input type="text" value={interestRate || ""} onChange={handleInterestChange} onFocus={() => setInterestRate(interestRate)} className="bg-transparent text-body-standard text-foreground outline-none w-auto" placeholder="0" style={{ width: `${Math.max((interestRate?.length || 1), 1)}ch` }} />
            <span className="text-body-small text-muted-foreground -ml-1">%</span>
            <span className="flex-1" />
          </div>
        </div>

        <div className="mb-6">
          <h2 className="text-body-standard font-medium text-primary mb-3">{t("requestDetail.loanAgreement")}</h2>
          <div className="bg-secondary rounded-xl p-4">
            <ul className="space-y-2.5 text-body-small text-foreground list-disc list-inside">
              <li>{t("requestDetail.agreementText")}</li>
            </ul>
          </div>
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
            <button onClick={() => setShowRejectDialog(true)} className="flex-1 py-4 rounded-full bg-destructive/15 text-destructive text-body-standard font-bold hover:bg-destructive/25 transition-all">{t("buttons.reject")}</button>
            <button onClick={handleApprove} className="flex-1 py-4 rounded-full bg-pengio-green text-foreground text-body-standard font-bold hover:bg-pengio-green-hover transition-all">{t("buttons.approve")}</button>
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
            <Button variant="outline" onClick={() => { setShowRejectDialog(false); setRejectionReason(""); }} className="flex-1 rounded-full border-foreground/20 text-foreground">{t("buttons.cancel")}</Button>
            <Button onClick={handleReject} className="flex-1 rounded-full bg-destructive text-destructive-foreground hover:bg-destructive/90">{t("requestDetail.send")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default RequestDetail;