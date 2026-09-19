import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import DateField from "./DateField";

vi.mock("@/context/LanguageContext", () => ({
  useTranslation: () => ({
    language: "en",
    t: (key: string) => key,
  }),
}));

describe("DateField", () => {
  it("opens the calendar when the field is tapped", () => {
    render(<DateField value={undefined} onChange={vi.fn()} />);
    expect(screen.queryByText("common.ok")).not.toBeInTheDocument();

    fireEvent.click(screen.getByText("lend.selectDate"));
    expect(screen.getByText("common.ok")).toBeInTheDocument();
  });

  it("closes when OK is pressed", () => {
    render(<DateField value={undefined} onChange={vi.fn()} />);
    fireEvent.click(screen.getByText("lend.selectDate"));
    expect(screen.getByText("common.ok")).toBeInTheDocument();

    fireEvent.click(screen.getByText("common.ok"));
    expect(screen.queryByText("common.ok")).not.toBeInTheDocument();
  });

  it("stays open after picking a date, so the choice can be reviewed", () => {
    const onChange = vi.fn();
    render(<DateField value={undefined} onChange={onChange} />);
    fireEvent.click(screen.getByText("lend.selectDate"));

    // Any selectable day in the rendered month.
    const days = screen.getAllByRole("gridcell").filter((d) => !d.hasAttribute("aria-disabled"));
    fireEvent.click(days[days.length - 1]);

    expect(onChange).toHaveBeenCalled();
    expect(screen.getByText("common.ok")).toBeInTheDocument();
  });

  it("shows the chosen date on the trigger instead of the placeholder", () => {
    render(<DateField value={new Date(2026, 11, 24)} onChange={vi.fn()} />);
    expect(screen.queryByText("lend.selectDate")).not.toBeInTheDocument();
    expect(screen.getByText(/24 December 2026/)).toBeInTheDocument();
  });
});
