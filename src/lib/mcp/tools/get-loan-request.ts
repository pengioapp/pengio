import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";

const mockRequests = [
  { id: 1, senderName: "Kaia Lunde", senderAvatar: "KL", amount: 2000, repaymentPeriod: "28 March 2025", interestPercent: 5, message: "Hope this helps 😊", status: "Pending", receivedAt: "Today" },
  { id: 2, senderName: "Erik Johansen", senderAvatar: "EJ", amount: 4000, repaymentPeriod: "15 April 2025", interestPercent: 3, message: "Need it for rent this month, will pay back ASAP.", status: "Pending", receivedAt: "Yesterday" },
  { id: 3, senderName: "Anna Kristoffersen", senderAvatar: "AK", amount: 1500, repaymentPeriod: "10 April 2025", interestPercent: 0, message: "Thanks in advance!", status: "Pending", receivedAt: "2 days ago" },
];

export default defineTool({
  name: "get_loan_request",
  title: "Get loan request",
  description: "Get a single loan request by its numeric id.",
  inputSchema: { id: z.number().int().describe("Loan request id") },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: ({ id }) => {
    const req = mockRequests.find((r) => r.id === id);
    if (!req) return { content: [{ type: "text", text: `No loan request with id ${id}` }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(req, null, 2) }],
      structuredContent: { request: req },
    };
  },
});
