import { defineTool } from "@lovable.dev/mcp-js";

const contacts = [
  { id: 1, name: "Anna Kristoffersen", avatar: "AK", phone: "+47 912 34 567", email: "anna@test.com" },
  { id: 2, name: "Erik Johansen", avatar: "EJ", phone: "+47 987 65 432", email: "erik@test.com" },
  { id: 3, name: "Lydia Bergson", avatar: "LB", phone: "+47 923 45 678" },
  { id: 4, name: "Cristofer Dias", avatar: "CD", phone: "+47 934 56 789" },
  { id: 5, name: "Miracle Saris", avatar: "MS", phone: "+47 945 67 890" },
];

export default defineTool({
  name: "list_contacts",
  title: "List contacts",
  description: "List all Pengio demo contacts available for lending or borrowing.",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: () => ({
    content: [{ type: "text", text: JSON.stringify(contacts, null, 2) }],
    structuredContent: { contacts },
  }),
});
