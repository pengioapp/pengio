import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { toProposal, type Proposal } from "@/lib/loans";

export const proposalsKey = ["proposals"] as const;
export const loansKey = ["loans"] as const;

// Counterparty names come from profiles, which RLS only exposes for people the
// viewer has a contact relationship with -- the same relationship the database
// requires before a proposal can exist at all.
const PROPOSAL_SELECT = `
  *,
  borrower:profiles!loan_proposals_borrower_id_fkey (id, full_name),
  lender:profiles!loan_proposals_lender_id_fkey (id, full_name)
` as const;

export function useProposals() {
  const { session } = useAuth();
  const viewerId = session?.user?.id;

  return useQuery({
    queryKey: proposalsKey,
    enabled: !!viewerId,
    queryFn: async (): Promise<Proposal[]> => {
      const { data, error } = await supabase
        .from("loan_proposals")
        .select(PROPOSAL_SELECT)
        .order("created_at", { ascending: false });

      if (error) throw new Error(error.message);
      return (data ?? []).map((row) => toProposal(row, viewerId!));
    },
  });
}

/** Pending proposals awaiting this user's answer -- the inbox. */
export function useIncomingProposals() {
  const query = useProposals();
  return {
    ...query,
    data: query.data?.filter((p) => p.incoming && p.status === "pending"),
  };
}

/** Pending proposals this user sent and is waiting on. */
export function useOutgoingProposals() {
  const query = useProposals();
  return {
    ...query,
    data: query.data?.filter((p) => !p.incoming && p.status === "pending"),
  };
}

export interface CreateProposalInput {
  /** The other party's Pengio user id. */
  counterpartyId: string;
  /** Whether the current user wants to borrow or to lend. */
  direction: "borrow" | "lend";
  amount: number;
  interestPercent: number;
  repaymentDate: string;
  message?: string;
  condition?: string;
}

export function useCreateProposal() {
  const { session } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateProposalInput) => {
      const me = session?.user?.id;
      if (!me) throw new Error("You are not signed in.");

      const borrowerId = input.direction === "borrow" ? me : input.counterpartyId;
      const lenderId = input.direction === "borrow" ? input.counterpartyId : me;

      const { data, error } = await supabase
        .from("loan_proposals")
        .insert({
          borrower_id: borrowerId,
          lender_id: lenderId,
          initiated_by: me,
          amount: input.amount,
          interest_percent: input.interestPercent,
          repayment_date: input.repaymentDate,
          message: input.message?.trim() || null,
          condition: input.condition?.trim() || null,
        })
        .select("id")
        .single();

      if (error) {
        // The insert policy also requires a contact relationship, so a policy
        // violation here usually means exactly that rather than a bug.
        if (error.code === "42501") {
          throw new Error("You can only propose a loan to someone in your contacts.");
        }
        throw new Error(error.message);
      }
      return data.id;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: proposalsKey });
    },
  });
}

export function useRespondToProposal() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: { proposalId: string; accept: boolean; reason?: string }) => {
      // Accepting and creating the loan happen in one transaction inside the
      // database, so there is no window where a proposal is accepted with no
      // loan behind it.
      const { data, error } = await supabase.rpc("respond_to_proposal", {
        proposal: input.proposalId,
        accept: input.accept,
        reason: input.reason?.trim() || undefined,
      });

      if (error) throw new Error(error.message);
      return data as string | null;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: proposalsKey });
      void queryClient.invalidateQueries({ queryKey: loansKey });
    },
  });
}

export function useCancelProposal() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (proposalId: string) => {
      const { error } = await supabase
        .from("loan_proposals")
        .update({ status: "cancelled", responded_at: new Date().toISOString() })
        .eq("id", proposalId);

      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: proposalsKey });
    },
  });
}
