import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { toLoan, type Loan } from "@/lib/loans";
import { loansKey } from "@/hooks/useProposals";

export interface Payment {
  id: string;
  loanId: string;
  amount: number;
  paidAt: string;
  recordedBy: string;
  confirmed: boolean;
  note: string | null;
}

const LOAN_SELECT = `
  *,
  borrower:profiles!loans_borrower_id_fkey (id, full_name),
  lender:profiles!loans_lender_id_fkey (id, full_name),
  payments (id, amount, paid_at, recorded_by, confirmed_at, note)
` as const;

export function useLoans() {
  const { session } = useAuth();
  const viewerId = session?.user?.id;

  return useQuery({
    queryKey: loansKey,
    enabled: !!viewerId,
    queryFn: async (): Promise<Loan[]> => {
      const { data, error } = await supabase
        .from("loans")
        .select(LOAN_SELECT)
        .order("agreed_at", { ascending: false });

      if (error) throw new Error(error.message);

      return (data ?? []).map((row) => {
        // Only confirmed payments count. An unconfirmed one is a claim the
        // other party has not agreed to, and must not appear to reduce a debt.
        const repaid = (row.payments ?? [])
          .filter((p) => p.confirmed_at !== null)
          .reduce((sum, p) => sum + Number(p.amount), 0);

        return toLoan(row, viewerId!, Math.round(repaid * 100) / 100);
      });
    },
  });
}

export function useLoanPayments(loanId: string | undefined) {
  const { session } = useAuth();

  return useQuery({
    queryKey: ["payments", loanId],
    enabled: !!session && !!loanId,
    queryFn: async (): Promise<Payment[]> => {
      const { data, error } = await supabase
        .from("payments")
        .select("id, loan_id, amount, paid_at, recorded_by, confirmed_at, note")
        .eq("loan_id", loanId!)
        .order("paid_at", { ascending: false });

      if (error) throw new Error(error.message);

      return (data ?? []).map((row) => ({
        id: row.id,
        loanId: row.loan_id,
        amount: Number(row.amount),
        paidAt: row.paid_at,
        recordedBy: row.recorded_by,
        confirmed: row.confirmed_at !== null,
        note: row.note,
      }));
    },
  });
}

export function useRecordPayment() {
  const { session } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: { loanId: string; amount: number; paidAt?: string; note?: string }) => {
      if (!session?.user) throw new Error("You are not signed in.");

      // Confirmation state is set by a database trigger based on who is
      // recording, and anything sent from here is overwritten -- so it is
      // deliberately not passed.
      const { error } = await supabase.from("payments").insert({
        loan_id: input.loanId,
        amount: input.amount,
        paid_at: input.paidAt,
        recorded_by: session.user.id,
        note: input.note?.trim() || null,
      });

      if (error) throw new Error(error.message);
    },
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({ queryKey: loansKey });
      void queryClient.invalidateQueries({ queryKey: ["payments", variables.loanId] });
    },
  });
}

export function useConfirmPayment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: { paymentId: string; loanId: string }) => {
      const { error } = await supabase.rpc("confirm_payment", { payment: input.paymentId });
      if (error) throw new Error(error.message);
    },
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({ queryKey: loansKey });
      void queryClient.invalidateQueries({ queryKey: ["payments", variables.loanId] });
    },
  });
}

/** Payments the current user is being asked to confirm. */
export function usePendingConfirmations() {
  const { session } = useAuth();
  const viewerId = session?.user?.id;

  return useQuery({
    queryKey: ["pending-confirmations"],
    enabled: !!viewerId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("payments")
        .select("id, loan_id, amount, paid_at, recorded_by, loans!inner(lender_id)")
        .is("confirmed_at", null);

      if (error) throw new Error(error.message);

      // Only the lender confirms, and never their own entry.
      return (data ?? [])
        .filter((row) => row.loans?.lender_id === viewerId && row.recorded_by !== viewerId)
        .map((row) => ({
          id: row.id,
          loanId: row.loan_id,
          amount: Number(row.amount),
          paidAt: row.paid_at,
        }));
    },
  });
}
