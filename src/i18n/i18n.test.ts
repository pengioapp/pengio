import { describe, it, expect } from "vitest";
import en from "./en";
import no from "./no";

/**
 * Norwegian is the default now, so a missing or untranslated string is what
 * most users would see. These check the whole file rather than one screen.
 */
describe("translations", () => {
  const enKeys = Object.keys(en);
  const noKeys = Object.keys(no);

  it("has the same keys in both languages", () => {
    expect(noKeys.sort()).toEqual(enKeys.sort());
  });

  it("has no empty values", () => {
    const empty = [...enKeys, ...noKeys].filter(
      (k) => !(en as Record<string, string>)[k]?.trim() || !(no as Record<string, string>)[k]?.trim()
    );
    expect(empty).toEqual([]);
  });

  it("keeps the same placeholders on both sides", () => {
    const placeholders = (s: string) => (s.match(/\{(\w+)\}/g) ?? []).sort();
    const mismatched = enKeys.filter((k) => {
      const a = placeholders((en as Record<string, string>)[k]);
      const b = placeholders((no as Record<string, string>)[k]);
      return JSON.stringify(a) !== JSON.stringify(b);
    });
    expect(mismatched).toEqual([]);
  });

  it("leaves no English text sitting in the Norwegian file", () => {
    // Words that would only appear if a string were never translated. "Status"
    // and "OK" are spelled the same in both languages, so they are not here.
    const tells = /\b(password|email address|the two|please|enter your|cannot|yourselves|account will)\b/i;
    const untranslated = noKeys.filter((k) => tells.test((no as Record<string, string>)[k]));
    expect(untranslated).toEqual([]);
  });

  it("does not claim loans are legally binding or BankID-signed", () => {
    // The prototype said both. Neither is true, and on a debt between two
    // people it is the kind of claim someone might rely on.
    const claims = /legally binding|juridisk bindende|BankID/i;
    const offenders = [...enKeys, ...noKeys].filter(
      (k) =>
        claims.test((en as Record<string, string>)[k] ?? "") ||
        claims.test((no as Record<string, string>)[k] ?? "")
    );
    // The Bank ID label on the profile form is the brand name, not a claim.
    expect(offenders.filter((k) => k !== "editInfo.bankId")).toEqual([]);
  });
});
