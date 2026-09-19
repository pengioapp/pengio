import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import ProposalWizard from "./ProposalWizard";

// The wizard's job is to ask one question at a time and refuse to advance past
// an unanswered one. That logic is what these cover; the network layer and the
// contact list are stubbed so the steps can be walked without a session.

const navigate = vi.fn();
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>("react-router-dom");
  return { ...actual, useNavigate: () => navigate };
});

const mutateAsync = vi.fn().mockResolvedValue("new-proposal-id");
vi.mock("@/hooks/useProposals", () => ({
  useCreateProposal: () => ({ mutateAsync, isPending: false }),
}));

const contact = {
  id: "c1", userId: "u1", name: "Kaia Hansen", initials: "KH",
  phone: null, email: "kaia@example.com", onPengio: true,
};

// Stubbed to a single button that selects Kaia, so the person step can be
// answered without the contacts query.
vi.mock("@/components/ContactPicker", () => ({
  default: ({ onSelect, selected }: { onSelect: (c: typeof contact) => void; selected: unknown }) => (
    <button onClick={() => onSelect(contact)}>
      {selected ? "Kaia Hansen" : "pick-contact"}
    </button>
  ),
}));

const toastError = vi.fn();
vi.mock("sonner", () => ({ toast: { error: (m: string) => toastError(m), success: vi.fn() } }));

vi.mock("@/context/LanguageContext", () => ({
  useTranslation: () => ({
    language: "en",
    // Keys are returned verbatim so assertions do not depend on copy.
    t: (key: string, vars?: Record<string, unknown>) =>
      vars ? `${key}:${Object.values(vars).join(",")}` : key,
  }),
}));

const renderWizard = () =>
  render(
    <MemoryRouter>
      <ProposalWizard direction="borrow" presetAmounts={[1000, 2000]} />
    </MemoryRouter>
  );

const next = () => fireEvent.click(screen.getByText("wizard.next"));
const back = () => fireEvent.click(screen.getByText("wizard.back"));

beforeEach(() => {
  navigate.mockClear();
  mutateAsync.mockClear();
  toastError.mockClear();
});

describe("ProposalWizard", () => {
  it("shows one question at a time, starting at step 1 of 6", () => {
    renderWizard();
    expect(screen.getByText("wizard.step:1,6")).toBeInTheDocument();
    expect(screen.getByText("borrow.howMuch")).toBeInTheDocument();
    // The later questions are not on the page at all, which is the point.
    expect(screen.queryByText("borrow.selectContact")).not.toBeInTheDocument();
    expect(screen.queryByText("wizard.review")).not.toBeInTheDocument();
  });

  it("will not advance past the person step until someone is chosen", () => {
    renderWizard();
    next(); // amount is prefilled, so this one passes
    expect(screen.getByText("wizard.step:2,6")).toBeInTheDocument();

    next(); // nobody chosen yet
    expect(toastError).toHaveBeenCalledWith("wizard.pickPersonFirst");
    expect(screen.getByText("wizard.step:2,6")).toBeInTheDocument();

    fireEvent.click(screen.getByText("pick-contact"));
    next();
    expect(screen.getByText("wizard.step:3,6")).toBeInTheDocument();
  });

  it("will not advance past the date step without a date", () => {
    renderWizard();
    next();
    fireEvent.click(screen.getByText("pick-contact"));
    next();
    expect(screen.getByText("wizard.step:3,6")).toBeInTheDocument();

    next();
    expect(toastError).toHaveBeenCalledWith("proposal.dateRequired");
    expect(screen.getByText("wizard.step:3,6")).toBeInTheDocument();
  });

  it("refuses an amount of zero", () => {
    renderWizard();
    const input = screen.getByPlaceholderText("0");
    fireEvent.change(input, { target: { value: "0" } });
    next();
    expect(toastError).toHaveBeenCalledWith("proposal.amountRequired");
    expect(screen.getByText("wizard.step:1,6")).toBeInTheDocument();
  });

  it("goes back a step without losing what was entered", () => {
    renderWizard();
    const input = screen.getByPlaceholderText("0");
    fireEvent.change(input, { target: { value: "2500" } });
    next();
    expect(screen.getByText("wizard.step:2,6")).toBeInTheDocument();

    back();
    expect(screen.getByText("wizard.step:1,6")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("0")).toHaveValue("2500");
  });

  it("leaves the flow when going back from the first question", () => {
    renderWizard();
    back();
    expect(navigate).toHaveBeenCalledWith("/home");
  });

  it("blocks a contact who has not joined Pengio, naming them", () => {
    renderWizard();
    next();
    fireEvent.click(screen.getByText("pick-contact"));
    // Simulate the picker having handed back someone without an account.
    contact.userId = null as unknown as string;
    next();
    expect(toastError).toHaveBeenCalledWith("proposal.notOnPengio:Kaia Hansen");
    contact.userId = "u1";
  });
});
