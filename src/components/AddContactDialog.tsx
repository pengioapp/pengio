import { useState } from "react";
import { User, CheckCircle2 } from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { useTranslation } from "@/context/LanguageContext";
import { useAddContact, useFindByPhone, type Contact } from "@/hooks/useContacts";
import PhoneField from "@/components/PhoneField";
import { fullNumber } from "@/lib/phone";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Called with the new contact once it is saved and linked to an account. */
  onAdded: (contact: Contact) => void;
}

/**
 * Adding someone by phone number, without leaving the screen you were on.
 *
 * Testers found adding by email cumbersome, and they were right: nobody knows
 * a friend's email by heart, but everyone knows their number. So the number is
 * the way in, and the name comes back from the lookup rather than being typed.
 *
 * Confirming the name matters more than usual here. Numbers are not verified
 * until there is an SMS provider, so the name on screen is the one claimed by
 * whoever registered that number -- which is exactly what the person adding
 * them is in a position to recognise, or not.
 */
const AddContactDialog = ({ open, onOpenChange, onAdded }: Props) => {
  const { t } = useTranslation();
  const addContact = useAddContact();
  const findByPhone = useFindByPhone();

  const [code, setCode] = useState("+47");
  const [number, setNumber] = useState("");
  const [found, setFound] = useState<{ id: string; name: string } | null>(null);
  const [missing, setMissing] = useState(false);
  const [unlinkedName, setUnlinkedName] = useState("");
  const [error, setError] = useState("");

  const reset = () => {
    setNumber("");
    setFound(null);
    setMissing(false);
    setUnlinkedName("");
    setError("");
  };

  const close = (next: boolean) => {
    if (!next) reset();
    onOpenChange(next);
  };

  // Editing the number invalidates whatever the last lookup said.
  const changeNumber = (value: string) => {
    setNumber(value);
    setFound(null);
    setMissing(false);
    setError("");
  };

  const handleFind = async () => {
    if (!number.trim()) {
      setError(t("phone.required"));
      return;
    }
    setError("");
    try {
      const hit = await findByPhone.mutateAsync(fullNumber(code, number));
      if (hit) setFound(hit);
      else setMissing(true);
    } catch (e) {
      // The database raises translation keys; t() passes anything else through.
      setError(t((e as Error).message));
    }
  };

  const save = async (name: string) => {
    try {
      const { contact, linked } = await addContact.mutateAsync({
        name,
        phone: fullNumber(code, number),
      });
      // An unlinked contact cannot be lent to yet, so it is saved but not
      // handed back for selection.
      if (linked) onAdded(contact);
      reset();
      onOpenChange(false);
    } catch (e) {
      setError(t((e as Error).message));
    }
  };

  const busy = findByPhone.isPending || addContact.isPending;

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{t("addMember.title")}</DialogTitle>
          <DialogDescription>{t("phone.enterNumber")}</DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-3">
          <PhoneField
            code={code}
            onCodeChange={setCode}
            number={number}
            onNumberChange={changeNumber}
            autoFocus
          />

          {found && (
            <div className="bg-pengio-green/15 rounded-xl px-4 py-3 flex items-center gap-3">
              <CheckCircle2 className="w-5 h-5 text-pengio-green shrink-0" />
              <div className="min-w-0">
                <p className="text-body-standard text-foreground font-medium truncate">{found.name}</p>
                <p className="text-body-micro text-muted-foreground">{t("phone.found")}</p>
              </div>
            </div>
          )}

          {found && (
            <p className="text-body-micro text-muted-foreground">{t("phone.unverified")}</p>
          )}

          {missing && (
            <>
              <p className="text-body-small text-muted-foreground">{t("phone.notFound")}</p>
              <p className="text-body-micro text-muted-foreground">{t("phone.saveAnyway")}</p>
              <div className="flex items-center gap-3 bg-secondary rounded-xl px-4 py-3">
                <User className="w-4 h-4 text-muted-foreground shrink-0" />
                <input
                  type="text"
                  autoComplete="name"
                  value={unlinkedName}
                  onChange={(e) => { setUnlinkedName(e.target.value); setError(""); }}
                  placeholder={t("phone.nameForUnlinked")}
                  className="flex-1 bg-transparent text-body-standard text-foreground placeholder:text-muted-foreground outline-none"
                />
              </div>
            </>
          )}

          {error && <p className="text-destructive text-body-small text-center">{error}</p>}
        </div>

        <DialogFooter>
          {found ? (
            <button
              type="button"
              onClick={() => save(found.name)}
              disabled={busy}
              className="w-full py-3 rounded-full bg-primary text-primary-foreground font-bold disabled:opacity-60"
            >
              {busy ? "…" : t("phone.addPerson", { name: found.name.split(" ")[0] })}
            </button>
          ) : missing ? (
            <button
              type="button"
              onClick={() => {
                if (!unlinkedName.trim()) { setError(t("addMember.nameRequired")); return; }
                void save(unlinkedName);
              }}
              disabled={busy}
              className="w-full py-3 rounded-full bg-secondary text-foreground font-bold disabled:opacity-60"
            >
              {busy ? "…" : t("phone.saveUnlinked")}
            </button>
          ) : (
            <button
              type="button"
              onClick={handleFind}
              disabled={busy}
              className="w-full py-3 rounded-full bg-primary text-primary-foreground font-bold disabled:opacity-60"
            >
              {findByPhone.isPending ? t("phone.searching") : t("phone.find")}
            </button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AddContactDialog;
