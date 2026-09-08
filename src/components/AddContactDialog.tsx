import { useState } from "react";
import { Mail, User } from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { useTranslation } from "@/context/LanguageContext";
import { useAddContact, type Contact } from "@/hooks/useContacts";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Called with the new contact once it is saved and linked to an account. */
  onAdded: (contact: Contact) => void;
}

/**
 * Adding someone without leaving the screen you were on.
 *
 * The contact picker used to send people to /add-member, which meant the
 * half-filled loan form behind it was thrown away: pick an amount, realise the
 * person is missing, add them, come back to a blank form. Testers described
 * this as having to add members before they could do anything.
 *
 * A contact who has not joined Pengio still cannot be lent to -- the database
 * requires both parties to be registered -- so they are saved but not selected,
 * and the dialog says why rather than silently doing nothing.
 */
const AddContactDialog = ({ open, onOpenChange, onAdded }: Props) => {
  const { t } = useTranslation();
  const addContact = useAddContact();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [savedUnlinked, setSavedUnlinked] = useState<string | null>(null);

  const reset = () => {
    setName("");
    setEmail("");
    setError("");
    setSavedUnlinked(null);
  };

  const close = (next: boolean) => {
    if (!next) reset();
    onOpenChange(next);
  };

  const handleSave = async () => {
    if (!name.trim()) {
      setError(t("addMember.nameRequired"));
      return;
    }
    if (!email.trim()) {
      setError(t("addMember.emailRequired"));
      return;
    }

    try {
      const { linked, contact } = await addContact.mutateAsync({ name, email });

      if (!linked) {
        setSavedUnlinked(contact.name);
        return;
      }

      onAdded(contact);
      reset();
      onOpenChange(false);
    } catch (e) {
      setError((e as Error).message);
    }
  };

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{t("addMember.title")}</DialogTitle>
          <DialogDescription>{t("addMember.subtitle")}</DialogDescription>
        </DialogHeader>

        {savedUnlinked ? (
          <>
            <p className="text-body-small text-muted-foreground">
              {t("addMember.savedUnlinked", { name: savedUnlinked })}
            </p>
            <DialogFooter>
              <button
                type="button"
                onClick={() => close(false)}
                className="w-full py-3 rounded-full bg-primary text-primary-foreground font-bold"
              >
                {t("common.ok")}
              </button>
            </DialogFooter>
          </>
        ) : (
          <>
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-3 bg-secondary rounded-xl px-4 py-3">
                <User className="w-4 h-4 text-muted-foreground shrink-0" />
                <input
                  type="text"
                  autoComplete="name"
                  value={name}
                  onChange={(e) => { setName(e.target.value); setError(""); }}
                  placeholder={t("addMember.fullName")}
                  className="flex-1 bg-transparent text-body-standard text-foreground placeholder:text-muted-foreground outline-none"
                />
              </div>

              <div className="flex items-center gap-3 bg-secondary rounded-xl px-4 py-3">
                <Mail className="w-4 h-4 text-muted-foreground shrink-0" />
                <input
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setError(""); }}
                  placeholder={t("addMember.email")}
                  className="flex-1 bg-transparent text-body-standard text-foreground placeholder:text-muted-foreground outline-none"
                />
              </div>

              <p className="text-body-micro text-muted-foreground">{t("addMember.emailInfo")}</p>

              {error && <p className="text-destructive text-body-small text-center">{error}</p>}
            </div>

            <DialogFooter>
              <button
                type="button"
                onClick={handleSave}
                disabled={addContact.isPending}
                className="w-full py-3 rounded-full bg-primary text-primary-foreground font-bold disabled:opacity-60"
              >
                {addContact.isPending ? "…" : t("addMember.save")}
              </button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default AddContactDialog;
