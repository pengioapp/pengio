import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render } from "@testing-library/react";
import Splash from "./Splash";

// The screen that decides where a returning user lands. It used to send
// everyone to /login, so a signed-in user was asked to log in again every
// time even though their session had been restored.

const navigate = vi.fn();
vi.mock("react-router-dom", () => ({ useNavigate: () => navigate }));

let auth: { session: unknown; loading: boolean };
vi.mock("@/context/AuthContext", () => ({ useAuth: () => auth }));

beforeEach(() => {
  vi.useFakeTimers();
  navigate.mockReset();
});
afterEach(() => vi.useRealTimers());

describe("Splash", () => {
  it("sends a signed-in user to the home screen", () => {
    auth = { session: { user: { id: "u1" } }, loading: false };
    render(<Splash />);
    vi.advanceTimersByTime(2000);
    expect(navigate).toHaveBeenCalledWith("/home", { replace: true });
  });

  it("sends a signed-out user to the login screen", () => {
    auth = { session: null, loading: false };
    render(<Splash />);
    vi.advanceTimersByTime(2000);
    expect(navigate).toHaveBeenCalledWith("/login", { replace: true });
  });

  it("waits for the session to be restored before deciding", () => {
    // Restoring from storage is asynchronous. Deciding early would send a
    // signed-in user to /login a moment before their session arrived.
    auth = { session: null, loading: true };
    render(<Splash />);
    vi.advanceTimersByTime(5000);
    expect(navigate).not.toHaveBeenCalled();
  });

  it("replaces history, so Back does not return to the splash", () => {
    auth = { session: null, loading: false };
    render(<Splash />);
    vi.advanceTimersByTime(2000);
    expect(navigate).toHaveBeenCalledWith(expect.any(String), { replace: true });
  });
});
