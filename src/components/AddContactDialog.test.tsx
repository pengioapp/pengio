import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import AddContactDialog from "./AddContactDialog";

// The dialog has three states -- asking for a number, found, and not found --
// and the lookup needs a signed-in session, so the hooks are stubbed and the
// states driven directly.

const findMock = vi.fn();
const addMock = vi.fn();
vi.mock("@/hooks/useContacts", () => ({
  useFindByPhone: () => ({ mutateAsync: findMock, isPending: false }),
  useAddContact: () => ({ mutateAsync: addMock, isPending: false }),
}));

vi.mock("@/context/LanguageContext", () => ({
  useTranslation: () => ({
    language: "no",
    t: (key: string, vars?: Record<string, unknown>) =>
      vars ? `${key}:${Object.values(vars).join(",")}` : key,
  }),
}));

const onAdded = vi.fn();
const renderDialog = () =>
  render(<AddContactDialog open onOpenChange={vi.fn()} onAdded={onAdded} />);

const numberField = () => screen.getByPlaceholderText("phone.enterNumber");

beforeEach(() => {
  findMock.mockReset();
  addMock.mockReset();
  onAdded.mockReset();
});

describe("AddContactDialog", () => {
  it("asks for a number and nothing else to begin with", () => {
    renderDialog();
    expect(numberField()).toBeInTheDocument();
    expect(screen.getByText("phone.find")).toBeInTheDocument();
    // No name or email field until there is something to report.
    expect(screen.queryByPlaceholderText("phone.nameForUnlinked")).not.toBeInTheDocument();
  });

  it("will not look up an empty number", async () => {
    renderDialog();
    fireEvent.click(screen.getByText("phone.find"));
    await waitFor(() => expect(screen.getByText("phone.required")).toBeInTheDocument());
    expect(findMock).not.toHaveBeenCalled();
  });

  it("sends the number with its country code", async () => {
    findMock.mockResolvedValue(null);
    renderDialog();
    fireEvent.change(numberField(), { target: { value: "91234567" } });
    fireEvent.click(screen.getByText("phone.find"));
    await waitFor(() => expect(findMock).toHaveBeenCalledWith("+4791234567"));
  });

  it("shows the name it found, and warns that numbers are unverified", async () => {
    findMock.mockResolvedValue({ id: "u1", name: "Kaia Hansen" });
    renderDialog();
    fireEvent.change(numberField(), { target: { value: "91234567" } });
    fireEvent.click(screen.getByText("phone.find"));

    await waitFor(() => expect(screen.getByText("Kaia Hansen")).toBeInTheDocument());
    expect(screen.getByText("phone.unverified")).toBeInTheDocument();
    // The button names them, so confirming is a recognition rather than a guess.
    expect(screen.getByText("phone.addPerson:Kaia")).toBeInTheDocument();
  });

  it("adds the person under the name the lookup returned", async () => {
    findMock.mockResolvedValue({ id: "u1", name: "Kaia Hansen" });
    addMock.mockResolvedValue({ linked: true, contact: { id: "c1", name: "Kaia Hansen" } });
    renderDialog();
    fireEvent.change(numberField(), { target: { value: "91234567" } });
    fireEvent.click(screen.getByText("phone.find"));
    await waitFor(() => screen.getByText("phone.addPerson:Kaia"));

    fireEvent.click(screen.getByText("phone.addPerson:Kaia"));
    await waitFor(() =>
      expect(addMock).toHaveBeenCalledWith({ name: "Kaia Hansen", phone: "+4791234567" })
    );
    expect(onAdded).toHaveBeenCalled();
  });

  it("offers to save someone who has not joined, asking for a name", async () => {
    findMock.mockResolvedValue(null);
    renderDialog();
    fireEvent.change(numberField(), { target: { value: "99887766" } });
    fireEvent.click(screen.getByText("phone.find"));

    await waitFor(() => expect(screen.getByText("phone.notFound")).toBeInTheDocument());
    expect(screen.getByPlaceholderText("phone.nameForUnlinked")).toBeInTheDocument();
  });

  it("does not hand back an unlinked contact for selection", async () => {
    findMock.mockResolvedValue(null);
    addMock.mockResolvedValue({ linked: false, contact: { id: "c2", name: "Ola" } });
    renderDialog();
    fireEvent.change(numberField(), { target: { value: "99887766" } });
    fireEvent.click(screen.getByText("phone.find"));
    await waitFor(() => screen.getByPlaceholderText("phone.nameForUnlinked"));

    fireEvent.change(screen.getByPlaceholderText("phone.nameForUnlinked"), { target: { value: "Ola" } });
    fireEvent.click(screen.getByText("phone.saveUnlinked"));

    await waitFor(() => expect(addMock).toHaveBeenCalled());
    // They have no account, so no loan can be proposed to them yet.
    expect(onAdded).not.toHaveBeenCalled();
  });

  it("surfaces the rate limit the database raises", async () => {
    findMock.mockRejectedValue(new Error("phone.rateLimited"));
    renderDialog();
    fireEvent.change(numberField(), { target: { value: "91234567" } });
    fireEvent.click(screen.getByText("phone.find"));
    await waitFor(() => expect(screen.getByText("phone.rateLimited")).toBeInTheDocument());
  });

  it("drops a stale result when the number is edited", async () => {
    findMock.mockResolvedValue({ id: "u1", name: "Kaia Hansen" });
    renderDialog();
    fireEvent.change(numberField(), { target: { value: "91234567" } });
    fireEvent.click(screen.getByText("phone.find"));
    await waitFor(() => screen.getByText("Kaia Hansen"));

    fireEvent.change(numberField(), { target: { value: "9123456" } });
    expect(screen.queryByText("Kaia Hansen")).not.toBeInTheDocument();
    expect(screen.getByText("phone.find")).toBeInTheDocument();
  });
});
