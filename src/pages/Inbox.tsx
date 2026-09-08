import { useNavigate } from "react-router-dom";
import { useProposals } from "@/hooks/useProposals";
import { useTranslation } from "@/context/LanguageContext";
import { formatDateString } from "@/lib/dateLocale";
import type { Proposal } from "@/lib/loans";

const avatarColors = [
  "bg-pengio-green",
  "bg-pengio-blue",
  "bg-pengio-orange",
  "bg-pengio-purple",
];

const Inbox = () => {
  const navigate = useNavigate();
  const { t, language } = useTranslation();
  const { data: proposals, isLoading, error } = useProposals();

  // Only proposals awaiting this user's answer belong in the inbox. Ones they
  // sent themselves are waiting on somebody else and show up elsewhere.
  const incoming = proposals?.filter((p) => p.incoming) ?? [];
  const pending = incoming.filter((p) => p.status === "pending");
  const resolved = incoming.filter((p) => p.status !== "pending");

  const openProposal = (p: Proposal) =>
    navigate(p.kind === "request" ? `/inbox/${p.id}` : `/loan-request/${p.id}`);

  const renderPending = (p: Proposal, idx: number) => (
    <button
      key={p.id}
      onClick={() => openProposal(p)}
      className="bg-secondary rounded-xl p-4 flex items-center gap-3 text-left w-full transition-all hover:brightness-110"
    >
      <div className={`w-10 h-10 rounded-full ${avatarColors[idx % avatarColors.length]} flex items-center justify-center text-body-micro font-bold text-foreground shrink-0`}>
        {p.counterparty.initials}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-body-small font-medium text-foreground">
          {p.kind === "request"
            ? t("inbox.wantsToBorrow", { name: p.counterparty.name })
            : t("inbox.offeredYou", { name: p.counterparty.name })}{" "}
          <span className="text-primary font-bold">{p.amount.toLocaleString("nb-NO")} kr</span>
        </p>
        <p className="text-body-micro text-muted-foreground">
          {t("inbox.repayIn", {
            period: formatDateString(p.repaymentDate, language),
            percent: p.interestPercent,
          })}
        </p>
      </div>
      <span className={`text-body-micro font-medium shrink-0 ${p.kind === "offer" ? "text-pengio-green" : "text-primary"}`}>
        {p.kind === "offer" ? t("inbox.offer") : t("status.pending")}
      </span>
    </button>
  );

  const renderResolved = (p: Proposal, idx: number) => (
    <div key={p.id} className="bg-secondary/60 rounded-xl p-4 flex items-center gap-3 opacity-70">
      <div className={`w-10 h-10 rounded-full ${avatarColors[idx % avatarColors.length]} flex items-center justify-center text-body-micro font-bold text-foreground shrink-0`}>
        {p.counterparty.initials}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-body-small font-medium text-foreground">
          {p.counterparty.name} – {p.amount.toLocaleString("nb-NO")} kr
        </p>
      </div>
      <span className={`text-body-micro font-medium shrink-0 ${
        p.status === "accepted" ? "text-pengio-green"
        : p.status === "countered" ? "text-primary"
        : "text-destructive"}`}>
        {p.status === "accepted" ? t("status.approved")
         : p.status === "countered" ? t("counter.wasCountered")
         : t("status.rejected")}
      </span>
    </div>
  );

  return (
    <div className="flex flex-col min-h-screen bg-background pb-28">
      <div className="px-6 pt-8 pb-4">
        <h1 className="text-title text-primary font-bold text-center">{t("inbox.title")}</h1>
      </div>

      <div className="px-6 flex-1">
        {isLoading && (
          <div className="flex justify-center mt-10">
            <div
              className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent"
              role="status"
              aria-label="Loading"
            />
          </div>
        )}

        {error && (
          <p className="text-destructive text-body-small text-center mt-10">
            {(error as Error).message}
          </p>
        )}

        {!isLoading && !error && pending.length === 0 && resolved.length === 0 && (
          <p className="text-muted-foreground text-body-standard text-center mt-10">
            {t("inbox.noRequests")}
          </p>
        )}

        {pending.length > 0 && (
          <div className="mb-6">
            <h2 className="text-body-small text-muted-foreground mb-3">{t("inbox.pending")}</h2>
            <div className="flex flex-col gap-3">{pending.map(renderPending)}</div>
          </div>
        )}

        {resolved.length > 0 && (
          <div>
            <h2 className="text-body-small text-muted-foreground mb-3">{t("inbox.resolved")}</h2>
            <div className="flex flex-col gap-3">{resolved.map(renderResolved)}</div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Inbox;
