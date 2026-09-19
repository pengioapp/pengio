import { useState } from "react";
import { format } from "date-fns";
import { toast } from "sonner";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import DateField from "@/components/DateField";
import { useTranslation } from "@/context/LanguageContext";
import { useCounterProposal } from "@/hooks/useProposals";
import { totalDue, formatAmount, type Proposal } from "@/lib/loans";

interface Props {
  proposal: Proposal;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCountered: () => void;
}

/**
 * Shared by the request and offer screens, which face the same proposal from
 * opposite ends and need the identical reply.
 *
 * Pre-filled with the other side's terms, so the form shows what is being
 * changed rather than starting blank.
 */
const CounterDialog = ({ proposal, open, onOpenChange, onCountered }: Props) => {
  const { t } = useTranslation();
  const counter = useCounterProposal();

  const [amount, setAmount] = useState(String(proposal.amount));
  const [interest, setInterest] = useState(String(proposal.interestPercent));
  const [date, setDate] = useState<Date | undefined>(() => new Date(proposal.repaymentDate));
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const amountValue = parseFloat(amount.replace(/\s/g, "").replace(",", ".")) || 0;
  const interestValue = parseFloat(interest.replace(",", ".")) || 0;

  const handleSend = async () => {
    if (amountValue <= 0) {
      setError(t("proposal.amountRequired"));
      return;
    }
    if (interestValue < 0 || interestValue > 100) {
      setError(t("counter.interest"));
      return;
    }
    if (!date) {
      setError(t("proposal.dateRequired"));
      return;
    }

    try {
      await counter.mutateAsync({
        proposalId: proposal.id,
        amount: amountValue,
        interestPercent: interestValue,
        // Stored as a plain date, so format locally rather than via
        // toISOString(), which would shift the day for users behind UTC.
        repaymentDate: format(date, "yyyy-MM-dd"),
        message,
      });
      toast.success(t("counter.sent"));
      onOpenChange(false);
      onCountered();
    } catch (e) {
      setError((e as Error).message);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-secondary border-foreground/10 max-w-[340px] rounded-2xl">
        <DialogHeader>
          <DialogTitle className="text-foreground">{t("counter.title")}</DialogTitle>
          <DialogDescription className="text-muted-foreground">
            {t("counter.description")}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-3">
          <label className="flex flex-col gap-1">
            <span className="text-body-micro text-muted-foreground">{t("counter.amount")}</span>
            <input
              type="text"
              inputMode="decimal"
              value={amount}
              onChange={(e) => { setAmount(e.target.value.replace(/[^0-9.,]/g, "")); setError(""); }}
              className="bg-background/30 rounded-lg px-3 py-2.5 text-sm text-foreground outline-none"
            />
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-body-micro text-muted-foreground">{t("counter.interest")}</span>
            <input
              type="text"
              inputMode="decimal"
              value={interest}
              onChange={(e) => { setInterest(e.target.value.replace(/[^0-9.,]/g, "")); setError(""); }}
              className="bg-background/30 rounded-lg px-3 py-2.5 text-sm text-foreground outline-none"
            />
          </label>

          <div className="flex flex-col gap-1">
            <span className="text-body-micro text-muted-foreground">{t("counter.date")}</span>
            <DateField
              value={date}
              onChange={(d) => { setDate(d); setError(""); }}
              triggerClassName="bg-background/30 rounded-lg px-3 py-2.5 text-sm text-foreground text-left flex items-center"
              showIcon={false}
            />
          </div>

          <Textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder={t("counter.message")}
            maxLength={500}
            className="bg-background/30 border-foreground/10 text-foreground placeholder:text-muted-foreground min-h-[70px] resize-none"
          />

          {amountValue > 0 && (
            <p className="text-body-micro text-muted-foreground">
              {t("counter.total", {
                total: formatAmount(totalDue(amountValue, interestValue), proposal.currency),
              })}
            </p>
          )}

          {error && <p className="text-destructive text-body-micro">{error}</p>}
        </div>

        <DialogFooter className="flex-row gap-3 sm:flex-row">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="flex-1 rounded-full border-foreground/20 text-foreground"
          >
            {t("buttons.cancel")}
          </Button>
          <Button
            onClick={handleSend}
            disabled={counter.isPending}
            className="flex-1 rounded-full bg-primary text-primary-foreground hover:bg-primary/90"
          >
            {counter.isPending ? "…" : t("counter.send")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default CounterDialog;
