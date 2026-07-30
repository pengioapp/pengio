import { defineTool } from "@lovable.dev/mcp-js";

const mockRequests = [
  { id: 1, senderName: "Kaia Lunde", senderAvatar: "KL", amount: 2000, repaymentPeriod: "28 March 2025", interestPercent: 5, message: "Hope this helps 😊", status: "Pending", receivedAt: "Today" },
  { id: 2, senderName: "Erik Johansen", senderAvatar: "EJ", amount: 4000, repaymentPeriod: "15 April 2025", interestPercent: 3, message: "Need it for rent this month, will pay back ASAP.", status: "Pending", receivedAt: "Yesterday" },
  { id: 3, senderName: "Anna Kristoffersen", senderAvatar: "AK", amount: 1500, repaymentPeriod: "10 April 2025", interestPercent: 0, message: "Thanks in advance!", status: "Pending", receivedAt: "2 days ago" },
];

export default defineTool({
  name: "list_loan_requests",
  title: "List loan requests",
  description: "List all incoming loan requests from the Pengio demo dataset.",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: () => ({
    content: [{ type: "text", text: JSON.stringify(mockRequests, null, 2) }],
    structuredContent: { requests: mockRequests },
  }),
});
