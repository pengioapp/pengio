import { createContext, useContext, useState, type ReactNode } from "react";
import { mockRequests, mockLoanOffers, type LoanRequest, type LoanOffer } from "@/data/mockRequests";

export interface ApprovedLoan {
  id: number;
  borrowerName: string;
  borrowerAvatar: string;
  amount: number;
  repaymentPeriod: string;
  interestPercent: number;
}

export interface SentLoanItem {
  id: number;
  name: string;
  avatarInitials: string;
  amount: number;
  repaymentDate: string;
  status: "Pending" | "Active";
  type: "borrowed" | "lent";
}

interface LoanContextType {
  requests: LoanRequest[];
  loanOffers: LoanOffer[];
  approvedLoans: ApprovedLoan[];
  sentLoans: SentLoanItem[];
  approveRequest: (id: number, interestPercent: number) => void;
  rejectRequest: (id: number, reason?: string) => void;
  acceptOffer: (id: number) => void;
  rejectOffer: (id: number, reason?: string) => void;
  updateRequestRepaymentDate: (id: number, newDate: string) => void;
  updateOfferRepaymentDate: (id: number, newDate: string) => void;
  addSentLoan: (item: Omit<SentLoanItem, "id">) => void;
}

const LoanContext = createContext<LoanContextType | null>(null);

export const useLoanContext = () => {
  const ctx = useContext(LoanContext);
  if (!ctx) throw new Error("useLoanContext must be used within LoanProvider");
  return ctx;
};

export const LoanProvider = ({ children }: { children: ReactNode }) => {
  const [requests, setRequests] = useState<LoanRequest[]>(mockRequests);
  const [loanOffers, setLoanOffers] = useState<LoanOffer[]>(mockLoanOffers);
  const [approvedLoans, setApprovedLoans] = useState<ApprovedLoan[]>([]);
  const [sentLoans, setSentLoans] = useState<SentLoanItem[]>([]);

  const approveRequest = (id: number, interestPercent: number) => {
    const req = requests.find((r) => r.id === id);
    if (!req) return;
    setRequests((prev) => prev.filter((r) => r.id !== id));
    setApprovedLoans((prev) => [
      ...prev,
      {
        id: req.id,
        borrowerName: req.senderName,
        borrowerAvatar: req.senderAvatar,
        amount: req.amount,
        repaymentPeriod: req.repaymentPeriod,
        interestPercent,
      },
    ]);
  };

  const rejectRequest = (id: number, reason?: string) => {
    setRequests((prev) =>
      prev.map((r) => (r.id === id ? { ...r, status: "Rejected" as const, rejectionReason: reason } : r))
    );
  };

  const updateRequestRepaymentDate = (id: number, newDate: string) => {
    setRequests((prev) =>
      prev.map((r) => (r.id === id ? { ...r, repaymentPeriod: newDate } : r))
    );
  };

  const acceptOffer = (id: number) => {
    const offer = loanOffers.find((o) => o.id === id);
    if (!offer) return;
    setLoanOffers((prev) => prev.filter((o) => o.id !== id));
    setApprovedLoans((prev) => [
      ...prev,
      {
        id: offer.id,
        borrowerName: offer.senderName,
        borrowerAvatar: offer.senderAvatar,
        amount: offer.amount,
        repaymentPeriod: offer.repaymentPeriod,
        interestPercent: offer.interestPercent,
      },
    ]);
  };

  const rejectOffer = (id: number, reason?: string) => {
    setLoanOffers((prev) =>
      prev.map((o) => (o.id === id ? { ...o, status: "Rejected" as const, rejectionReason: reason } : o))
    );
  };

  const updateOfferRepaymentDate = (id: number, newDate: string) => {
    setLoanOffers((prev) =>
      prev.map((o) => (o.id === id ? { ...o, repaymentPeriod: newDate } : o))
    );
  };

  const addSentLoan = (item: Omit<SentLoanItem, "id">) => {
    setSentLoans((prev) => [...prev, { ...item, id: Date.now() }]);
  };

  return (
    <LoanContext.Provider value={{ requests, loanOffers, approvedLoans, sentLoans, approveRequest, rejectRequest, acceptOffer, rejectOffer, updateRequestRepaymentDate, updateOfferRepaymentDate, addSentLoan }}>
      {children}
    </LoanContext.Provider>
  );
};