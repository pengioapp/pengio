import type { Database } from "@/integrations/supabase/types";

type ProposalRow = Database["public"]["Tables"]["loan_proposals"]["Row"];
type LoanRow = Database["public"]["Tables"]["loans"]["Row"];

export interface Party {
  id: string;
  name: string;
  initials: string;
}

/** A proposal as the UI thinks about it: from the current user's point of view. */
export interface Proposal {
  id: string;
  /** 'request' means someone wants to borrow; 'offer' means someone wants to lend. */
  kind: "request" | "offer";
  /** True when the current user is the one being asked to respond. */
  incoming: boolean;
  counterparty: Party;
  amount: number;
  currency: string;
  interestPercent: number;
  repaymentDate: string;
  message: string | null;
  condition: string | null;
  status: ProposalRow["status"];
  rejectionReason: string | null;
  /** The proposal this one replaced, when it is a counter. */
  counterTo: string | null;
  createdAt: string;
}

export interface Loan {
  id: string;
  /** The current user's side of this loan. */
  role: "borrower" | "lender";
  counterparty: Party;
  principal: number;
  currency: string;
  interestPercent: number;
  /** Principal plus the flat surcharge -- what must be repaid in total. */
  totalDue: number;
  repaid: number;
  outstanding: number;
  repaymentDate: string;
  status: LoanRow["status"];
  agreedAt: string;
}

export const initialsOf = (name: string): string => {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase();
};

const party = (id: string, name: string | null | undefined): Party => {
  const resolved = name?.trim() || "Unknown";
  return { id, name: resolved, initials: initialsOf(resolved) };
};

/**
 * Interest is a flat surcharge on the principal, not an annualised rate --
 * "5%" means "pay back 105%". Mirrors loan_total_due() in the database, and
 * rounds the same way so the two never disagree by a øre.
 */
export const totalDue = (principal: number, interestPercent: number): number =>
  Math.round(principal * (1 + interestPercent / 100) * 100) / 100;

type NamedProfile = { id: string; full_name: string | null } | null;

export const toProposal = (
  row: ProposalRow & { borrower?: NamedProfile; lender?: NamedProfile },
  viewerId: string
): Proposal => {
  const initiatedByBorrower = row.initiated_by === row.borrower_id;
  const recipientId = initiatedByBorrower ? row.lender_id : row.borrower_id;
  const viewerIsBorrower = row.borrower_id === viewerId;
  const otherId = viewerIsBorrower ? row.lender_id : row.borrower_id;
  const otherName = viewerIsBorrower ? row.lender?.full_name : row.borrower?.full_name;

  return {
    id: row.id,
    kind: initiatedByBorrower ? "request" : "offer",
    incoming: recipientId === viewerId,
    counterparty: party(otherId, otherName),
    amount: Number(row.amount),
    currency: row.currency,
    interestPercent: Number(row.interest_percent),
    repaymentDate: row.repayment_date,
    message: row.message,
    condition: row.condition,
    status: row.status,
    rejectionReason: row.rejection_reason,
    // Coalesced rather than passed straight through, so this stays correct
    // against a database where the counter-offer migration has not run yet.
    counterTo: row.counter_to ?? null,
    createdAt: row.created_at,
  };
};

export const toLoan = (
  row: LoanRow & { borrower?: NamedProfile; lender?: NamedProfile },
  viewerId: string,
  repaid: number
): Loan => {
  const viewerIsBorrower = row.borrower_id === viewerId;
  const otherId = viewerIsBorrower ? row.lender_id : row.borrower_id;
  const otherName = viewerIsBorrower ? row.lender?.full_name : row.borrower?.full_name;
  const principal = Number(row.principal);
  const interest = Number(row.interest_percent);
  const due = totalDue(principal, interest);

  return {
    id: row.id,
    role: viewerIsBorrower ? "borrower" : "lender",
    counterparty: party(otherId, otherName),
    principal,
    currency: row.currency,
    interestPercent: interest,
    totalDue: due,
    repaid,
    outstanding: Math.max(0, Math.round((due - repaid) * 100) / 100),
    repaymentDate: row.repayment_date,
    status: row.status,
    agreedAt: row.agreed_at,
  };
};

export const formatAmount = (amount: number, currency = "NOK"): string =>
  new Intl.NumberFormat("nb-NO", {
    style: "currency",
    currency,
    maximumFractionDigits: amount % 1 === 0 ? 0 : 2,
  }).format(amount);
