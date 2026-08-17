import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Coins, Clock, Percent, TrendingUp } from "lucide-react";
import { toast } from "sonner";
import { formatDateString } from "@/lib/dateLocale";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useProposals, useRespondToProposal } from "@/hooks/useProposals";
import { useTranslation } from "@/context/LanguageContext";
import CounterDialog from "@/components/CounterDialog";
import { totalDue, formatAmount } from "@/lib/loans";

const LoanRequest = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { t, language } = useTranslation();
  const { data: proposals, isLoading } = useProposals();
  const respond = useRespondToProposal();

  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [showCounterDialog, setShowCounterDialog] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");

  const offer = proposals?.find((p) => p.id === id);

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

  if (!offer) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background px-6">
        <p className="text-foreground text-body-standard mb-4">{t("loanRequest.offerNotFound")}</p>
        <button onClick={() => navigate("/inbox")} className="text-primary text-body-small">{t("loanRequest.backToInbox")}</button>
      </div>
    );
  }

  // The viewer of an offer is the borrower, so the interest is money they pay.
  // The prototype labelled this "Earnings", which is true only for the lender.
  const interestCost = Math.round(offer.amount * (offer.interestPercent / 100));
  const settled = offer.status !== "pending";

  const handleApprove = async () => {
    try {
      await respond.mutateAsync({ proposalId: offer.id, accept: true });
      toast.success(t("loanRequest.approved"));
      navigate("/overview", { state: { tab: "borrowed" } });
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const handleReject = async () => {
    try {
      await respond.mutateAsync({
        proposalId: offer.id,
        accept: false,
        reason: rejectionReason || undefined,
      });
      setShowRejectDialog(false);
      setRejectionReason("");
      toast(t("loanRequest.rejected"));
      navigate("/inbox");
    } catch (e) {
      toast.error((e as Error).message);
    }
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
            <div className="w-12 h-12 rounded-full bg-pengio-green flex items-center justify-center text-body-small font-bold text-foreground">{offer.counterparty.initials}</div>
            <div>
              <p className="text-body-standard font-medium text-foreground">{t("loanRequest.hasOfferedLoan", { name: offer.counterparty.name })}</p>
              <p className="text-body-micro text-muted-foreground">{t("loanRequest.received", { time: formatDateString(offer.createdAt, language) })}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 mb-5">
            <InfoBlock icon={<Coins className="w-5 h-5 text-muted-foreground" />} label={t("loanRequest.amount")} value={`${offer.amount.toLocaleString("nb-NO")} kr`} />
            <InfoBlock icon={<Clock className="w-5 h-5 text-muted-foreground" />} label={t("loanRequest.repayment")} value={formatDateString(offer.repaymentDate, language)} />
            <InfoBlock icon={<Percent className="w-5 h-5 text-muted-foreground" />} label={t("loanRequest.interestRate")} value={`${offer.interestPercent} %`} />
            <InfoBlock icon={<TrendingUp className="w-5 h-5 text-muted-foreground" />} label={t("loanRequest.interestCost")} value={`${interestCost.toLocaleString("nb-NO")} kr`} />
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
          <p className="text-body-small text-muted-foreground">{t("loanRequest.agreementNote")}</p>
          <p className="text-body-small text-muted-foreground mt-2">
            {formatAmount(totalDue(offer.amount, offer.interestPercent), offer.currency)}
          </p>
        </div>

        {settled && (
          <div className="flex justify-center mb-6">
            <span className={`px-6 py-2 rounded-full text-body-standard font-bold ${
              offer.status === "accepted" ? "bg-pengio-green/20 text-pengio-green"
              : offer.status === "countered" ? "bg-primary/20 text-primary"
              : "bg-destructive/20 text-destructive"}`}>
              {offer.status === "accepted" ? t("status.approved")
               : offer.status === "countered" ? t("counter.wasCountered")
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
              className="flex-1 py-4 rounded-full bg-destructive text-foreground text-body-standard font-bold hover:bg-destructive/90 transition-all disabled:opacity-60"
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
        proposal={offer}
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
            <Button variant="outline" onClick={() => { setShowRejectDialog(false); setRejectionReason(""); }} className="flex-1 rounded-full border-foreground/20 text-foreground">
              {t("buttons.cancel")}
            </Button>
            <Button onClick={handleReject} disabled={respond.isPending} className="flex-1 rounded-full bg-destructive text-destructive-foreground hover:bg-destructive/90">
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
    <div className="min-w-0">
      <p className="text-body-micro text-muted-foreground">{label}</p>
      <p className="text-body-standard font-bold text-foreground truncate">{value}</p>
    </div>
  </div>
);

export default LoanRequest;
