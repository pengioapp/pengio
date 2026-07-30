export type RequestStatus = "Pending" | "Approved" | "Rejected";

export interface LoanRequest {
  id: number;
  senderName: string;
  senderAvatar: string;
  amount: number;
  repaymentPeriod: string;
  interestPercent: number;
  message: string;
  status: RequestStatus;
  receivedAt: string;
  rejectionReason?: string;
}

export interface LoanOffer {
  id: number;
  senderName: string;
  senderAvatar: string;
  amount: number;
  repaymentPeriod: string;
  interestPercent: number;
  message: string;
  condition: string;
  status: RequestStatus;
  receivedAt: string;
  rejectionReason?: string;
}

export const mockRequests: LoanRequest[] = [
  {
    id: 1,
    senderName: "Kaia Lunde",
    senderAvatar: "KL",
    amount: 2000,
    repaymentPeriod: "28 March 2025",
    interestPercent: 5,
    message: "Hope this helps 😊",
    status: "Pending",
    receivedAt: "Today",
  },
  {
    id: 2,
    senderName: "Erik Johansen",
    senderAvatar: "EJ",
    amount: 4000,
    repaymentPeriod: "15 April 2025",
    interestPercent: 3,
    message: "Need it for rent this month, will pay back ASAP.",
    status: "Pending",
    receivedAt: "Yesterday",
  },
  {
    id: 3,
    senderName: "Anna Kristoffersen",
    senderAvatar: "AK",
    amount: 1500,
    repaymentPeriod: "10 April 2025",
    interestPercent: 0,
    message: "Thanks in advance!",
    status: "Pending",
    receivedAt: "2 days ago",
  },
];

export const mockLoanOffers: LoanOffer[] = [
  {
    id: 101,
    senderName: "Jenny",
    senderAvatar: "JN",
    amount: 1000,
    repaymentPeriod: "28 March 2025",
    interestPercent: 5,
    message: "Hope this helps 😊",
    condition: "",
    status: "Pending",
    receivedAt: "Today",
  },
];