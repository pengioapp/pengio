import { useState } from "react";
import { Search, UserPlus } from "lucide-react";
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
  onSelect: (contact: Contact) => void;
  placeholder: string;
  searchPlaceholder: string;
}

/**
 * Shared between the borrow and lend flows, which previously each carried their
 * own copy of this picker.
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
  const [open, setOpen] = useState(false);
  const [adding, setAdding] = useState(false);
  const [query, setQuery] = useState("");

  const normalised = query.trim().toLowerCase();
  const filtered = (contacts ?? []).filter(
    (c) =>
      c.name.toLowerCase().includes(normalised) ||
      (c.phone ?? "").replace(/\s/g, "").includes(query.replace(/\s/g, "")) ||
      (c.email ?? "").toLowerCase().includes(normalised)
  );

  const colorFor = (contact: Contact) => {
    const idx = (contacts ?? []).findIndex((c) => c.id === contact.id);
    return avatarColors[Math.max(0, idx) % avatarColors.length];
  };

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="w-full bg-secondary rounded-xl px-4 py-3.5 flex items-center gap-3"
      >
        {selected ? (
          <>
            <div className={`w-8 h-8 rounded-full ${colorFor(selected)} flex items-center justify-center text-body-micro font-bold text-foreground`}>
              {selected.initials}
            </div>
            <span className="flex-1 text-left text-body-standard text-foreground">{selected.name}</span>
          </>
        ) : (
          <>
            <UserPlus className="w-5 h-5 text-muted-foreground" />
            <span className="flex-1 text-left text-body-standard text-muted-foreground">{placeholder}</span>
          </>
        )}
        <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
          <UserPlus className="w-4 h-4 text-primary-foreground" />
        </div>
      </button>

      {open && (
        <div className="absolute left-0 right-0 top-full mt-1 bg-secondary rounded-xl p-3 z-50 shadow-lg border border-foreground/10">
          <div className="flex items-center gap-2 bg-background/30 rounded-lg px-3 py-2 mb-2">
            <Search className="w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={searchPlaceholder}
              className="flex-1 bg-transparent text-body-small text-foreground placeholder:text-muted-foreground outline-none"
            />
          </div>

          <div className="flex flex-col max-h-48 overflow-y-auto">
            {isLoading && (
              <p className="text-body-micro text-muted-foreground px-2 py-3">…</p>
            )}

            {!isLoading && contacts?.length === 0 && (
              <p className="text-body-micro text-muted-foreground px-2 py-3">{t("proposal.noContacts")}</p>
            )}

            {filtered.map((contact) => (
              <button
                key={contact.id}
                disabled={!contact.onPengio}
                onClick={() => {
                  onSelect(contact);
                  setOpen(false);
                  setQuery("");
                }}
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
              onClick={() => { setOpen(false); setAdding(true); }}
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
