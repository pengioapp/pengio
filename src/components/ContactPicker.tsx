import { useState } from "react";
import { Search, UserPlus, X } from "lucide-react";
import { useTranslation } from "@/context/LanguageContext";
import { useContacts, type Contact } from "@/hooks/useContacts";
import AddContactDialog from "@/components/AddContactDialog";

const avatarColors = [
  "bg-pengio-green",
  "bg-pengio-blue",
  "bg-pengio-orange",
  "bg-pengio-purple",
];

interface Props {
  selected: Contact | null;
  /** null clears the choice, which the X button does. */
  onSelect: (contact: Contact | null) => void;
  placeholder: string;
}

/**
 * Choosing who a loan is with.
 *
 * The field is the search box. It used to be a button that opened a panel
 * containing a second search box with the same placeholder, so finding someone
 * took two taps on two identical-looking fields -- and the first one looked
 * like it should work.
 *
 * Contacts without a Pengio account are shown but not selectable: the database
 * requires both parties to be registered and connected before a proposal can
 * exist, so offering them as options would only produce a rejected insert.
 *
 * Adding someone happens in a dialog rather than on its own screen. Navigating
 * away discarded whatever had already been typed into the loan form behind it.
 */
const ContactPicker = ({ selected, onSelect, placeholder, searchPlaceholder }: Props) => {
  const { t } = useTranslation();
  const { data: contacts, isLoading } = useContacts();
  const [adding, setAdding] = useState(false);
  const [query, setQuery] = useState("");
  const [focused, setFocused] = useState(false);

  const normalised = query.trim().toLowerCase();
  const digits = query.replace(/\D/g, "");
  const filtered = (contacts ?? []).filter(
    (c) =>
      c.name.toLowerCase().includes(normalised) ||
      (digits.length > 0 && (c.phone ?? "").replace(/\D/g, "").includes(digits)) ||
      (c.email ?? "").toLowerCase().includes(normalised)
  );

  const colorFor = (contact: Contact) => {
    const idx = (contacts ?? []).findIndex((c) => c.id === contact.id);
    return avatarColors[Math.max(0, idx) % avatarColors.length];
  };

  const choose = (contact: Contact) => {
    onSelect(contact);
    setQuery("");
    setFocused(false);
  };

  // Open while typing or focused. Blur is delayed so a tap on a result in the
  // list below registers before the list is torn down.
  const open = focused && !selected;

  return (
    <div className="relative">
      {selected ? (
        <div className="w-full bg-secondary rounded-xl px-4 py-3.5 flex items-center gap-3">
          <div className={`w-8 h-8 rounded-full ${colorFor(selected)} flex items-center justify-center text-body-micro font-bold text-foreground shrink-0`}>
            {selected.initials}
          </div>
          <span className="flex-1 min-w-0 truncate text-body-standard text-foreground">{selected.name}</span>
          {/* Changing your mind should not mean starting the loan again. */}
          <button
            type="button"
            onClick={() => { onSelect(null); setFocused(true); }}
            aria-label={t("picker.change")}
            className="w-8 h-8 rounded-full bg-background/30 flex items-center justify-center shrink-0"
          >
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>
      ) : (
        <div className="w-full bg-secondary rounded-xl px-4 py-3.5 flex items-center gap-3">
          <Search className="w-5 h-5 text-muted-foreground shrink-0" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => setFocused(true)}
            onBlur={() => window.setTimeout(() => setFocused(false), 150)}
            placeholder={placeholder}
            className="flex-1 min-w-0 bg-transparent text-body-standard text-foreground placeholder:text-muted-foreground outline-none"
          />
          <button
            type="button"
            onClick={() => setAdding(true)}
            aria-label={t("borrow.addNewContact")}
            className="w-8 h-8 rounded-full bg-primary flex items-center justify-center shrink-0"
          >
            <UserPlus className="w-4 h-4 text-primary-foreground" />
          </button>
        </div>
      )}

      {open && (
        <div className="absolute left-0 right-0 top-full mt-1 bg-secondary rounded-xl p-2 z-50 shadow-lg border border-foreground/10">
          <div className="flex flex-col max-h-56 overflow-y-auto">
            {isLoading && (
              <p className="text-body-micro text-muted-foreground px-2 py-3">…</p>
            )}

            {!isLoading && contacts?.length === 0 && (
              <p className="text-body-micro text-muted-foreground px-2 py-3">{t("proposal.noContacts")}</p>
            )}

            {!isLoading && (contacts?.length ?? 0) > 0 && filtered.length === 0 && (
              <p className="text-body-micro text-muted-foreground px-2 py-3">{t("picker.noMatch")}</p>
            )}

            {filtered.map((contact) => (
              <button
                key={contact.id}
                type="button"
                disabled={!contact.onPengio}
                onClick={() => choose(contact)}
                className="flex items-center gap-3 px-2 py-2.5 rounded-lg hover:bg-background/20 transition-colors disabled:opacity-40 disabled:hover:bg-transparent disabled:cursor-not-allowed"
              >
                <div className={`w-8 h-8 rounded-full ${colorFor(contact)} flex items-center justify-center text-body-micro font-bold text-foreground shrink-0`}>
                  {contact.initials}
                </div>
                <div className="flex flex-col items-start min-w-0">
                  <span className="text-body-small text-foreground truncate">{contact.name}</span>
                  <span className="text-body-micro text-muted-foreground truncate">
                    {contact.onPengio ? (contact.phone ?? contact.email) : t("addMember.notOnPengio")}
                  </span>
                </div>
              </button>
            ))}

            <button
              type="button"
              onClick={() => { setFocused(false); setAdding(true); }}
              className="flex items-center gap-3 px-2 py-2.5 rounded-lg hover:bg-background/20 transition-colors text-primary"
            >
              <UserPlus className="w-5 h-5" />
              <span className="text-body-small font-medium">{t("borrow.addNewContact")}</span>
            </button>
          </div>
        </div>
      )}

      <AddContactDialog
        open={adding}
        onOpenChange={setAdding}
        onAdded={(contact) => {
          // Straight into the slot they were trying to fill.
          onSelect(contact);
          setQuery("");
        }}
      />
    </div>
  );
};

export default ContactPicker;
