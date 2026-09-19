import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { FileText, Coins, CheckCircle2, ChevronLeft, Pencil } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { formatDate } from "@/lib/dateLocale";
import { useTranslation } from "@/context/LanguageContext";
import { useCreateProposal } from "@/hooks/useProposals";
import type { Contact } from "@/hooks/useContacts";
import ContactPicker from "@/components/ContactPicker";
import { totalDue, formatAmount } from "@/lib/loans";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import DateField from "@/components/DateField";

interface Props {
  /** "borrow" asks someone for money; "lend" offers it. */
  direction: "borrow" | "lend";
  presetAmounts: number[];
}

/**
 * Setting up a loan, one question at a time.
 *
 * Both flows used to be a single long form -- six sections stacked down the
 * page with the send button below the fold. Testers had to scroll to discover
 * what was still being asked of them, and nothing told them whether they had
 * missed something until the send failed.
 *
 * Borrowing and lending ask the same six questions from opposite ends, so they
 * share this. They were previously two files of 463 near-identical lines that
 * had already drifted apart in small ways.
 */
const STEPS = ["amount", "person", "date", "interest", "message", "review"] as const;
type Step = (typeof STEPS)[number];

const ProposalWizard = ({ direction, presetAmounts }: Props) => {
  const navigate = useNavigate();
  const { t, language } = useTranslation();
  const createProposal = useCreateProposal();
  const isBorrow = direction === "borrow";

  const [stepIndex, setStepIndex] = useState(0);
  const [amount, setAmount] = useState(String(presetAmounts[0] ?? 1000));
  const [contact, setContact] = useState<Contact | null>(null);
  const [repaymentDate, setRepaymentDate] = useState<Date | undefined>(undefined);
  const [interestRate, setInterestRate] = useState("0");
  const [message, setMessage] = useState("");
  const [showSuccess, setShowSuccess] = useState(false);

  const step: Step = STEPS[stepIndex];
  const amountValue = parseInt(amount.replace(/\s/g, ""), 10) || 0;
  const interestValue = parseInt(interestRate || "0", 10);

  /**
   * What stops Next, per step. Returning the message rather than a boolean
   * means the button can explain itself instead of just sitting there greyed
   * out with no reason given.
   */
  const blocker = (): string | null => {
    if (step === "amount" && amountValue <= 0) return t("proposal.amountRequired");
    if (step === "person") {
      if (!contact) return t("wizard.pickPersonFirst");
      // Both sides must have an account before the database will accept a
      // proposal, so catch it here rather than at the end of the flow.
      if (!contact.userId) return t("proposal.notOnPengio", { name: contact.name });
    }
    if (step === "date" && !repaymentDate) return t("proposal.dateRequired");
    return null;
  };

  const goNext = () => {
    const problem = blocker();
    if (problem) {
      toast.error(problem);
      return;
    }
    setStepIndex((i) => Math.min(i + 1, STEPS.length - 1));
  };

  // Back from the first question leaves the flow entirely, which is what the
  // arrow in the header would otherwise be the only way to do.
  const goBack = () => {
    if (stepIndex === 0) {
      navigate("/home");
      return;
    }
    setStepIndex((i) => i - 1);
  };

  const handleSend = async () => {
    if (!contact?.userId || amountValue <= 0 || !repaymentDate) {
      toast.error(t(isBorrow ? "borrow.selectError" : "lend.selectError"));
      return;
    }

    try {
      await createProposal.mutateAsync({
        counterpartyId: contact.userId,
        direction,
        amount: amountValue,
        interestPercent: interestValue,
        // The column is a date, so it is stored without a timezone. Formatting
        // locally avoids toISOString() shifting the day for users behind UTC.
        repaymentDate: format(repaymentDate, "yyyy-MM-dd"),
        message,
      });

      setShowSuccess(true);
      setTimeout(() => {
        setShowSuccess(false);
        navigate("/overview", { state: { tab: isBorrow ? "borrowed" : "lent" } });
      }, 1600);
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  return (
    /* dvh, not vh: iOS Safari counts the area behind its own toolbars in
       100vh, so a screen-height page is taller than what can actually be seen
       and anything at its foot lands below the fold. The dynamic viewport
       unit measures what the user really sees.

       min-h rather than h, so a question with a lot in it can grow and scroll
       normally. Short questions still end with the buttons on screen. */
    <div className="flex flex-col min-h-dvh bg-background">
      <div className="shrink-0 px-6 pt-6 pb-2 flex items-center">
        <button onClick={goBack} className="w-10 h-10 rounded-full flex items-center justify-center text-foreground" aria-label={t("wizard.back")}>
          <ChevronLeft className="w-6 h-6" />
        </button>
        <h1 className="flex-1 text-title text-primary font-bold text-center pr-10">
          {t(isBorrow ? "borrow.title" : "lend.title")}
        </h1>
      </div>

      {/* Knowing how many questions are left is most of what the scrolling
          form failed to convey. */}
      <div className="shrink-0 px-6 mb-6">
        <div className="flex gap-1.5 mb-2">
          {STEPS.map((s, i) => (
            <div
              key={s}
              className={`h-1 flex-1 rounded-full transition-colors ${i <= stepIndex ? "bg-primary" : "bg-secondary"}`}
            />
          ))}
        </div>
        <p className="text-body-micro text-muted-foreground">
          {t("wizard.step", { current: stepIndex + 1, total: STEPS.length })}
        </p>
      </div>

      <div className="flex-1 px-6 flex flex-col">
        {step === "amount" && (
          <Question title={t(isBorrow ? "borrow.howMuch" : "lend.howMuch")}>
            <div className="bg-secondary rounded-xl px-4 py-3.5 flex items-center gap-3 mb-3">
              <Coins className="w-5 h-5 text-muted-foreground" />
              <div className="flex-1 flex items-center">
                <input
                  type="text"
                  inputMode="numeric"
                  autoFocus
                  value={amount}
                  onChange={(e) => setAmount(e.target.value.replace(/[^0-9]/g, ""))}
                  className="bg-transparent text-h4 font-bold text-foreground outline-none w-auto"
                  placeholder="0"
                  style={{ width: `${Math.max(1, amount.length)}ch` }}
                />
                <span className="text-body-standard text-muted-foreground ml-2">kr</span>
              </div>
            </div>
            <div className="flex gap-2 flex-wrap">
              {presetAmounts.map((val) => (
                <button
                  key={val}
                  onClick={() => setAmount(String(val))}
                  className={`px-3 py-1.5 rounded-full text-body-small font-medium border transition-all ${
                    amountValue === val
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-transparent text-primary border-primary/50 hover:border-primary"
                  }`}
                >
                  {val.toLocaleString("nb-NO")} kr
                </button>
              ))}
            </div>
          </Question>
        )}

        {step === "person" && (
          <Question title={t(isBorrow ? "borrow.selectContact" : "lend.selectRecipient")}>
            <ContactPicker
              selected={contact}
              onSelect={setContact}
              placeholder={t(isBorrow ? "borrow.selectContactPlaceholder" : "lend.chooseRecipient")}
              searchPlaceholder={t(isBorrow ? "borrow.searchContact" : "lend.searchContact")}
            />
          </Question>
        )}

        {step === "date" && (
          <Question title={t("lend.repaymentPeriod")}>
            <DateField value={repaymentDate} onChange={setRepaymentDate} />
          </Question>
        )}

        {step === "interest" && (
          <Question
            title={t(isBorrow ? "borrow.interestRate" : "lend.interestRate")}
            hint={t("borrow.allowedRange")}
          >
            <div className="bg-secondary rounded-xl px-4 py-3.5 flex items-center gap-3">
              <div className="w-8 h-8 rounded-full border-[1.5px] border-muted-foreground flex items-center justify-center shrink-0">
                <span className="text-[13px] font-semibold text-muted-foreground leading-none">%</span>
              </div>
              <input
                type="text"
                inputMode="numeric"
                autoFocus
                value={interestRate}
                onChange={(e) => {
                  const val = e.target.value.replace(/[^0-9]/g, "");
                  if (val === "") setInterestRate("");
                  else if (parseInt(val, 10) <= 10) setInterestRate(String(parseInt(val, 10)));
                }}
                placeholder={t("borrow.enterInterestRate")}
                className="bg-transparent text-body-standard text-foreground outline-none"
                style={{ width: interestRate ? `${Math.max(interestRate.length, 1)}ch` : "14ch" }}
              />
              {interestRate && <span className="text-body-standard text-foreground -ml-1">%</span>}
            </div>
            {amountValue > 0 && (
              <p className="text-body-small text-muted-foreground mt-3">
                {t(isBorrow ? "wizard.totalOwed" : "wizard.totalBack")}:{" "}
                <span className="text-foreground font-medium">
                  {formatAmount(totalDue(amountValue, interestValue))}
                </span>
              </p>
            )}
          </Question>
        )}

        {step === "message" && (
          <Question title={t("wizard.messageOptional")} hint={t("wizard.messageSkip")}>
            <div className="bg-secondary rounded-xl px-4 py-3.5 flex items-start gap-3">
              <FileText className="w-5 h-5 text-muted-foreground mt-0.5" />
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder={t("borrow.typeHere")}
                rows={4}
                maxLength={500}
                className="flex-1 bg-transparent text-body-standard text-foreground placeholder:text-muted-foreground outline-none resize-none"
              />
            </div>
          </Question>
        )}

        {step === "review" && (
          <Question title={t("wizard.review")} hint={t("wizard.reviewHint")}>
            <div className="flex flex-col gap-2">
              <ReviewRow label={t("wizard.amount")} value={formatAmount(amountValue)} onEdit={() => setStepIndex(0)} />
              <ReviewRow label={t("wizard.person")} value={contact?.name ?? "—"} onEdit={() => setStepIndex(1)} />
              <ReviewRow
                label={t("wizard.date")}
                value={repaymentDate ? formatDate(repaymentDate, language) : "—"}
                onEdit={() => setStepIndex(2)}
              />
              <ReviewRow label={t("wizard.interest")} value={`${interestValue} %`} onEdit={() => setStepIndex(3)} />
              <ReviewRow
                label={t("wizard.messageLabel")}
                value={message.trim() || t("wizard.noMessage")}
                onEdit={() => setStepIndex(4)}
              />
            </div>

            <div className="bg-secondary rounded-xl px-4 py-3.5 mt-3 flex items-center justify-between">
              <span className="text-body-small text-muted-foreground">
                {t(isBorrow ? "wizard.totalOwed" : "wizard.totalBack")}
              </span>
              <span className="text-body-standard font-bold text-primary">
                {formatAmount(totalDue(amountValue, interestValue))}
              </span>
            </div>

            {/* These two paragraphs previously promised a legally binding
                agreement signed with BankID. Neither exists, and saying so
                about a debt between two people is a claim someone might rely
                on. They describe what the app actually does, and they sit on
                the review step because that is where the decision is made --
                on the old form they were below the fold. */}
            <div className="rounded-xl px-4 py-4 bg-secondary border border-foreground/10 mt-4">
              <ul className="list-disc list-outside pl-4 space-y-3">
                <li className="text-body-small text-foreground">{t("lend.agreementText1")}</li>
                <li className="text-body-small text-foreground">{t("lend.agreementText2")}</li>
              </ul>
            </div>
            <p className="text-body-micro text-muted-foreground mt-3">{t("lend.followUpWarning")}</p>
          </Question>
        )}

        {/* mt-auto pins these to the bottom when the question is short, so
            they are on screen without scrolling. A long question pushes them
            down and the page scrolls to them, which is the expected way round.
            The padding clears the floating nav bar and the home indicator. */}
        <div
          className="mt-auto pt-6 flex gap-3"
          style={{ paddingBottom: "calc(6rem + env(safe-area-inset-bottom))" }}
        >
          <button
            onClick={goBack}
            className="px-6 py-4 rounded-full bg-secondary text-foreground text-body-standard font-bold"
          >
            {t("wizard.back")}
          </button>
          {step === "review" ? (
            <button
              onClick={handleSend}
              disabled={createProposal.isPending}
              className="flex-1 py-4 rounded-full bg-primary text-primary-foreground text-title font-bold hover:brightness-95 transition-all disabled:opacity-60"
            >
              {createProposal.isPending ? "…" : t(isBorrow ? "borrow.sendRequest" : "lend.sendOffer")}
            </button>
          ) : (
            <button
              onClick={goNext}
              className="flex-1 py-4 rounded-full bg-primary text-primary-foreground text-title font-bold hover:brightness-95 transition-all"
            >
              {t("wizard.next")}
            </button>
          )}
        </div>
      </div>

      <Dialog open={showSuccess}>
        <DialogContent className="bg-secondary border-none rounded-2xl max-w-[280px] flex flex-col items-center gap-4 p-8 [&>button]:hidden">
          <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center">
            <CheckCircle2 className="w-10 h-10 text-green-500" />
          </div>
          <h2 className="text-title font-bold text-primary text-center">
            {t(isBorrow ? "borrow.requestSent" : "lend.successTitle")}
          </h2>
          <p className="text-body-small text-muted-foreground text-center">
            {t(isBorrow ? "borrow.requestSentSubtitle" : "lend.successSubtitle")}
          </p>
        </DialogContent>
      </Dialog>
    </div>
  );
};

const Question = ({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) => (
  <div>
    <h2 className="text-body-large font-medium text-foreground mb-1">{title}</h2>
    {hint && <p className="text-body-micro text-muted-foreground mb-4">{hint}</p>}
    <div className={hint ? "" : "mt-4"}>{children}</div>
  </div>
);

const ReviewRow = ({ label, value, onEdit }: { label: string; value: string; onEdit: () => void }) => (
  <button
    type="button"
    onClick={onEdit}
    className="w-full bg-secondary rounded-xl px-4 py-3 flex items-center gap-3 text-left"
  >
    <span className="text-body-small text-muted-foreground w-28 shrink-0">{label}</span>
    <span className="flex-1 text-body-standard text-foreground truncate">{value}</span>
    <Pencil className="w-4 h-4 text-muted-foreground shrink-0" />
  </button>
);

export default ProposalWizard;
