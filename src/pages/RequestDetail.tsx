import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Coins, Clock } from "lucide-react";
import { toast } from "sonner";
import { formatDateString } from "@/lib/dateLocale";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useProposals, useRespondToProposal } from "@/hooks/useProposals";
import { useTranslation } from "@/context/LanguageContext";
import CounterDialog from "@/components/CounterDialog";
import { totalDue, formatAmount } from "@/lib/loans";

const RequestDetail = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { t, language } = useTranslation();
  const { data: proposals, isLoading } = useProposals();
  const respond = useRespondToProposal();

  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [showCounterDialog, setShowCounterDialog] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");

  const request = proposals?.find((p) => p.id === id);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div
          className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent"
          role="status"
          aria-label="Loading"
        />
      </div>
    );
  }

  if (!request) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background px-6">
        <p className="text-foreground text-body-standard mb-4">{t("requestDetail.requestNotFound")}</p>
        <button onClick={() => navigate("/inbox")} className="text-primary text-body-small">{t("requestDetail.backToInbox")}</button>
      </div>
    );
  }

  const handleApprove = async () => {
    try {
      await respond.mutateAsync({ proposalId: request.id, accept: true });
      toast.success(t("status.approved"));
      navigate("/overview", { state: { tab: "lent" } });
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const handleReject = async () => {
    try {
      await respond.mutateAsync({
        proposalId: request.id,
        accept: false,
        reason: rejectionReason || undefined,
      });
      setShowRejectDialog(false);
      setRejectionReason("");
      toast(t("status.rejected"));
      navigate("/inbox");
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const settled = request.status !== "pending";
  const due = totalDue(request.amount, request.interestPercent);

  return (
    <div className="flex flex-col min-h-screen bg-background pb-28">
      <div className="px-6 pt-6 pb-4 flex items-center">
        <button onClick={() => navigate("/inbox")} className="w-10 h-10 rounded-full flex items-center justify-center text-foreground">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6" /></svg>
        </button>
        <h1 className="flex-1 text-title text-primary font-bold text-center pr-10">{t("requestDetail.title")}</h1>
      </div>

      <div className="flex-1 px-6 pb-8 flex flex-col">
        <div className="bg-secondary rounded-2xl p-4 mb-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-full bg-pengio-blue flex items-center justify-center text-body-small font-bold text-foreground">{request.counterparty.initials}</div>
            <div>
              <p className="text-body-standard font-medium text-foreground">{t("requestDetail.wantsToBorrow", { name: request.counterparty.name.split(" ")[0] })}</p>
              <p className="text-body-micro text-muted-foreground">{t("loanRequest.received", { time: formatDateString(request.createdAt, language) })}</p>
            </div>
          </div>
          <div className="flex gap-3 mb-4">
            <div className="flex-1 bg-background/30 rounded-xl px-3 py-3 flex items-center gap-2.5">
              <Coins className="w-5 h-5 text-muted-foreground shrink-0" />
              <div>
                <p className="text-body-micro text-muted-foreground">{t("loanRequest.amount")}</p>
                <p className="text-body-standard font-bold text-foreground whitespace-nowrap">{request.amount.toLocaleString("nb-NO")} kr</p>
              </div>
            </div>
            <div className="flex-1 bg-background/30 rounded-xl px-3 py-3 flex items-center gap-2.5">
              <Clock className="w-5 h-5 text-muted-foreground shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-body-micro text-muted-foreground">{t("loanRequest.repayment")}</p>
                <p className="text-body-standard font-bold text-foreground truncate">
                  {formatDateString(request.repaymentDate, language)}
                </p>
              </div>
            </div>
          </div>
          {request.message && (
            <div className="bg-background/20 rounded-xl px-4 py-3">
              <p className="text-body-micro text-muted-foreground mb-1">{t("loanRequest.message")} :</p>
              <p className="text-body-small text-foreground">"{request.message}"</p>
            </div>
          )}
        </div>

        {/* Terms are shown, not edited. Changing the rate or the date here and
            calling the result "approved" would bind the borrower to something
            they never proposed. Altering terms belongs in a counter-offer that
            the other side agrees to. */}
        <div className="mb-6">
          <h2 className="text-body-standard font-medium text-foreground mb-3">{t("requestDetail.interestRate")}</h2>
          <div className="bg-secondary rounded-xl px-4 py-3.5 flex items-center gap-3">
            <div className="w-8 h-8 rounded-full border-[1.5px] border-muted-foreground flex items-center justify-center shrink-0">
              <span className="text-[13px] font-semibold text-muted-foreground leading-none">%</span>
            </div>
            <span className="text-body-standard text-foreground">{request.interestPercent} %</span>
            <span className="flex-1" />
            <span className="text-body-micro text-muted-foreground">
              {formatAmount(due, request.currency)}
            </span>
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

        {settled && (
          <div className="flex justify-center mb-6">
            <span className={`px-6 py-2 rounded-full text-body-standard font-bold ${
              request.status === "accepted" ? "bg-pengio-green/20 text-pengio-green"
              : request.status === "countered" ? "bg-primary/20 text-primary"
              : "bg-destructive/20 text-destructive"}`}>
              {request.status === "accepted" ? t("status.approved")
               : request.status === "countered" ? t("counter.wasCountered")
               : t("status.rejected")}
            </span>
          </div>
        )}

        {!settled && (
          <div className="mt-auto pt-4 flex flex-col gap-3">
            <button
              onClick={() => setShowCounterDialog(true)}
              disabled={respond.isPending}
              className="w-full py-3 rounded-full border border-primary text-primary text-body-standard font-bold hover:bg-primary/10 transition-all disabled:opacity-60"
            >
              {t("counter.button")}
            </button>
            <div className="flex gap-3">
            <button
              onClick={() => setShowRejectDialog(true)}
              disabled={respond.isPending}
              className="flex-1 py-4 rounded-full bg-destructive/15 text-destructive text-body-standard font-bold hover:bg-destructive/25 transition-all disabled:opacity-60"
            >
              {t("buttons.reject")}
            </button>
            <button
              onClick={handleApprove}
              disabled={respond.isPending}
              className="flex-1 py-4 rounded-full bg-pengio-green text-foreground text-body-standard font-bold hover:bg-pengio-green-hover transition-all disabled:opacity-60"
            >
              {respond.isPending ? "…" : t("buttons.approve")}
            </button>
            </div>
          </div>
        )}
      </div>

      <CounterDialog
        proposal={request}
        open={showCounterDialog}
        onOpenChange={setShowCounterDialog}
        onCountered={() => navigate("/inbox")}
      />

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
            <Button onClick={handleReject} disabled={respond.isPending} className="flex-1 rounded-full bg-destructive text-destructive-foreground hover:bg-destructive/90">{t("requestDetail.send")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default RequestDetail;
