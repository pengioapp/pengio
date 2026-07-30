import { defineTool } from "@lovable.dev/mcp-js";

const mockLoanOffers = [
  { id: 101, senderName: "Jenny", senderAvatar: "JN", amount: 1000, repaymentPeriod: "28 March 2025", interestPercent: 5, message: "Hope this helps 😊", condition: "", status: "Pending", receivedAt: "Today" },
];

export default defineTool({
  name: "list_loan_offers",
  title: "List loan offers",
  description: "List all incoming loan offers from the Pengio demo dataset.",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: () => ({
    content: [{ type: "text", text: JSON.stringify(mockLoanOffers, null, 2) }],
    structuredContent: { offers: mockLoanOffers },
  }),
});
