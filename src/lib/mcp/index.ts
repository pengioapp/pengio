import { defineMcp } from "@lovable.dev/mcp-js";
import listLoanRequests from "./tools/list-loan-requests";
import listLoanOffers from "./tools/list-loan-offers";
import listContacts from "./tools/list-contacts";
import getLoanRequest from "./tools/get-loan-request";

export default defineMcp({
  name: "pengio-first-steps",
  title: "Pengio: First Steps",
  version: "0.1.0",
  instructions:
    "Read-only tools that expose Pengio's demo lending dataset: loan requests, loan offers, and contacts. All data is mock/demo data — nothing is persisted.",
  tools: [listLoanRequests, listLoanOffers, listContacts, getLoanRequest],
});
