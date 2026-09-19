import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { ArrowLeft, CheckCircle2, Clock, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { useTranslation } from "@/context/LanguageContext";
import { formatDateString } from "@/lib/dateLocale";
import { useAuth } from "@/context/AuthContext";
import { useLoans, useLoanPayments, useRecordPayment, useConfirmPayment } from "@/hooks/useLoans";
import { formatAmount, dueState } from "@/lib/loans";

const LoanDetails = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { t, language } = useTranslation();
  const { session } = useAuth();

  const loanId = (location.state as { loanId?: string } | null)?.loanId;
  const fromTab = (location.state as { fromTab?: string } | null)?.fromTab;

  const { data: loans, isLoading } = useLoans();
  const { data: payments } = useLoanPayments(loanId);
  const recordPayment = useRecordPayment();
  const confirmPayment = useConfirmPayment();

  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");

  const loan = loans?.find((l) => l.id === loanId);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" role="status" aria-label="Loading" />
      </div>
    );
  }

  if (!loan) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background px-6">
        <p className="text-foreground text-body-standard mb-4">{t("loanDetails.notFound")}</p>
        <button onClick={() => navigate("/overview")} className="text-primary text-body-small">{t("loanDetails.back")}</button>
      </div>
    );
  }

  const handleRecord = async () => {
    const value = parseFloat(amount.replace(/\s/g, "").replace(",", "."));
    if (!Number.isFinite(value) || value <= 0) {
      toast.error(t("proposal.amountRequired"));
      return;
    }
    try {
      await recordPayment.mutateAsync({ loanId: loan.id, amount: value, note });
      setAmount("");
      setNote("");
      toast.success(t("loanDetails.paymentRecorded"));
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const handleConfirm = async (paymentId: string) => {
    try {
      await confirmPayment.mutateAsync({ paymentId, loanId: loan.id });
      toast.success(t("loanDetails.confirmed"));
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const isLender = loan.role === "lender";
  const progressPct = loan.totalDue > 0 ? Math.round((loan.repaid / loan.totalDue) * 100) : 0;
  const settled = loan.outstanding <= 0;
  const due = dueState(loan.repaymentDate);
  const name = loan.counterparty.name;

  // Overdue is worth shouting about; a date a month out is not. Anything still
  // owed inside a week gets the warm colour, everything else stays neutral.
  const urgency = settled
    ? "text-pengio-green"
    : due.kind === "overdue"
      ? "text-destructive"
      : due.kind === "today" || due.kind === "soon"
        ? "text-primary"
        : "text-muted-foreground";

  const dueLabel = () => {
    if (due.kind === "overdue") {
      return due.days === 1
        ? t("repay.overdueOneDay")
        : t("repay.overdueDays", { count: due.days });
    }
    if (due.kind === "today") return t("repay.dueToday");
    if (due.kind === "soon") {
      return due.days === 1
        ? t("repay.dueTomorrow")
        : t("repay.dueInDays", { count: due.days });
    }
    return t("repay.dueOn", { date: formatDateString(loan.repaymentDate, language) });
  };

  return (
    <div className="flex flex-col min-h-screen bg-background pb-28">
      <div className="px-6 pt-8 pb-2 flex items-center relative">
        <button
          onClick={() => navigate("/overview", fromTab ? { state: { tab: fromTab } } : undefined)}
          className="absolute left-4 p-2"
        >
          <ArrowLeft className="w-6 h-6 text-foreground" />
        </button>
        <h1 className="text-title text-primary font-bold text-center w-full">{t("loanDetails.title")}</h1>
      </div>

      <div className="px-6 mt-5 flex-1 overflow-y-auto flex flex-col gap-4">
        {/* The headline answers the two questions people actually opened this
            screen with -- who owes whom, and how much is left. Both used to be
            inferable only from a role label and the fifth of six grey rows. */}
        <div className="bg-secondary rounded-xl p-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-11 h-11 rounded-full bg-muted-foreground/30 flex items-center justify-center text-sm font-bold text-foreground shrink-0">
              {loan.counterparty.initials}
            </div>
            <p className="text-body-standard text-muted-foreground min-w-0 truncate">
              {settled
                ? t("repay.settled")
                : isLender
                  ? t("repay.owesYou", { name })
                  : t("repay.youOwe", { name })}
            </p>
          </div>

          {settled ? (
            <p className="text-body-small text-muted-foreground">{t("repay.settledNote", { name })}</p>
          ) : (
            <>
              <p className="text-h4 font-bold text-foreground leading-tight">
                {formatAmount(loan.outstanding, loan.currency)}
              </p>
              <p className="text-body-small text-muted-foreground mt-0.5">
                {t("repay.ofTotal", { total: formatAmount(loan.totalDue, loan.currency) })}
              </p>
            </>
          )}

          <div className={`flex items-center gap-1.5 mt-3 text-body-small font-medium ${urgency}`}>
            {due.kind === "overdue" && !settled && <AlertTriangle className="w-4 h-4 shrink-0" />}
            <span>{settled ? formatDateString(loan.repaymentDate, language) : dueLabel()}</span>
          </div>

          <div
            className="h-2.5 w-full rounded-full bg-background/40 overflow-hidden mt-4"
            role="progressbar"
            aria-valuenow={progressPct}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={t("repay.progress", {
              paid: formatAmount(loan.repaid, loan.currency),
              total: formatAmount(loan.totalDue, loan.currency),
            })}
          >
            <div
              className="h-full rounded-full bg-pengio-green transition-all"
              style={{ width: `${progressPct}%` }}
            />
          </div>
          <p className="text-body-micro text-muted-foreground mt-2">
            {t("repay.progress", {
              paid: formatAmount(loan.repaid, loan.currency),
              total: formatAmount(loan.totalDue, loan.currency),
            })}
          </p>
        </div>

        {/* The agreed terms are reference material, not the headline. They sit
            below the answer rather than crowding it. */}
        <div className="bg-secondary rounded-xl p-4">
          <h3 className="text-body-small font-semibold text-muted-foreground mb-3">{t("repay.terms")}</h3>
          <div className="flex flex-col gap-2">
            <Row label={t("loanDetails.principal")} value={formatAmount(loan.principal, loan.currency)} />
            <Row label={t("loanDetails.interestRate")} value={`${loan.interestPercent} %`} />
            <Row label={t("loanDetails.totalRepayable")} value={formatAmount(loan.totalDue, loan.currency)} />
            <Row label={t("loanDetails.repaymentDate")} value={formatDateString(loan.repaymentDate, language)} />
          </div>
        </div>

        {loan.status === "active" && (
          <div className="bg-secondary rounded-xl p-4">
            <h3 className="text-base font-semibold text-foreground mb-1">{t("loanDetails.recordPayment")}</h3>
            {/* Pengio never moves the money, so a payment row is a statement
                about something that happened elsewhere. Saying so here stops
                anyone reading "Record" as "Send" -- and saying who does what
                next stops the two sides waiting on each other. */}
            <p className="text-xs text-muted-foreground mb-3">
              {isLender ? t("repay.theyPay", { name }) : t("repay.youPay", { name })}
            </p>
            <p className="text-xs text-muted-foreground mb-3">{t("loanDetails.settlementNote")}</p>
            <div className="flex flex-col gap-2">
              <input
                type="text"
                inputMode="decimal"
                value={amount}
                onChange={(e) => setAmount(e.target.value.replace(/[^0-9.,]/g, ""))}
                placeholder={t("loanDetails.amountPlaceholder")}
                className="bg-background/30 rounded-lg px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground outline-none"
              />
              <input
                type="text"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder={t("loanDetails.notePlaceholder")}
                maxLength={500}
                className="bg-background/30 rounded-lg px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground outline-none"
              />
              <button
                onClick={handleRecord}
                disabled={recordPayment.isPending}
                className="mt-1 py-2.5 rounded-full bg-primary text-primary-foreground text-sm font-bold disabled:opacity-60"
              >
                {recordPayment.isPending ? "…" : t("loanDetails.record")}
              </button>
            </div>
          </div>
        )}

        <div>
          <h3 className="text-base font-semibold text-foreground mb-3">{t("loanDetails.payments")}</h3>

          {(!payments || payments.length === 0) && (
            <p className="text-sm text-muted-foreground">{t("repay.nothingRecorded")}</p>
          )}

          <div className="flex flex-col gap-3">
            {payments?.map((payment) => {
              const mine = payment.recordedBy === session?.user?.id;
              // Only the lender confirms, and never a payment they entered
              // themselves -- that one is already self-confirmed.
              const canConfirm = !payment.confirmed && isLender && !mine;

              // Every row says which of the three states it is in and who is
              // holding it up. Previously an unconfirmed payment read
              // "Waiting for them to confirm" to both sides at once.
              const status = payment.confirmed
                ? t("repay.statusConfirmed")
                : canConfirm
                  ? t("repay.statusAwaitingYou")
                  : t("repay.statusAwaitingThem", { name });

              return (
                <div key={payment.id} className="bg-secondary rounded-xl p-4 flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${payment.confirmed ? "bg-pengio-green/20" : "bg-primary/20"}`}>
                    {payment.confirmed
                      ? <CheckCircle2 className="w-4 h-4 text-pengio-green" />
                      : <Clock className="w-4 h-4 text-primary" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-2">
                      <p className="text-sm font-medium text-foreground">
                        {formatAmount(payment.amount, loan.currency)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatDateString(payment.paidAt, language)}
                      </p>
                    </div>
                    <p className={`text-xs font-medium mt-0.5 ${payment.confirmed ? "text-pengio-green" : "text-primary"}`}>
                      {status}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5 truncate">
                      {mine ? t("repay.recordedByYou") : t("repay.recordedByThem", { name })}
                    </p>
                    {payment.note && <p className="text-xs text-muted-foreground mt-0.5 truncate">{payment.note}</p>}
                  </div>
                  {canConfirm && (
                    <button
                      onClick={() => handleConfirm(payment.id)}
                      disabled={confirmPayment.isPending}
                      className="px-3 py-1.5 rounded-full bg-pengio-green text-foreground text-xs font-bold shrink-0 disabled:opacity-60"
                    >
                      {t("loanDetails.confirm")}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

const Row = ({ label, value, emphasis }: { label: string; value: string; emphasis?: boolean }) => (
  <div className="flex items-center justify-between">
    <span className="text-sm text-muted-foreground">{label}</span>
    <span className={`text-sm font-medium ${emphasis ? "text-primary" : "text-foreground"}`}>{value}</span>
  </div>
);

export default LoanDetails;
