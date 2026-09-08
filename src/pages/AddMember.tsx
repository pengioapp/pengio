import { useNavigate } from "react-router-dom";
import { ArrowLeft, User, Phone, Mail, Info } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useTranslation } from "@/context/LanguageContext";
import { useAddContact } from "@/hooks/useContacts";

const inputClass =
  "w-full bg-secondary/60 rounded-xl px-4 py-3.5 text-foreground text-base placeholder:text-muted-foreground outline-none border-none";

const AddMember = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const addContact = useAddContact();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState("");

  const handleSave = async () => {
    if (!name.trim()) {
      setError(t("addMember.nameRequired"));
      return;
    }
    // Email is what links this contact to their Pengio account, and that link
    // is what the database requires before either of you can propose a loan.
    if (!email.trim()) {
      setError(t("addMember.emailRequired"));
      return;
    }

    try {
      const { linked } = await addContact.mutateAsync({
        name,
        email,
        phone: phone.trim() ? `+47${phone.trim()}` : undefined,
      });

      toast.success(
        linked
          ? t("addMember.saved", { name: name.trim() })
          : t("addMember.savedUnlinked", { name: name.trim() })
      );
      navigate("/manage-members");
    } catch (e) {
      setError((e as Error).message);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-background pb-28">
      <div className="px-6 pt-8 pb-2 flex items-center relative">
        <button onClick={() => navigate(-1)} className="absolute left-4 p-2">
          <ArrowLeft className="w-6 h-6 text-foreground" />
        </button>
        <h1 className="text-title text-primary font-bold text-center w-full">{t("addMember.title")}</h1>
      </div>

      <div className="px-6 mt-4">
        <p className="text-muted-foreground text-sm">{t("addMember.subtitle")}</p>
      </div>

      <div className="px-6 mt-6 flex flex-col gap-4">
        <div className="relative">
          <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" strokeWidth={1.5} />
          <input
            type="text"
            autoComplete="name"
            placeholder={t("addMember.fullName")}
            value={name}
            onChange={(e) => { setName(e.target.value); setError(""); }}
            className={`${inputClass} pl-12`}
          />
        </div>

        <div className="relative">
          <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" strokeWidth={1.5} />
          <input
            type="email"
            autoComplete="email"
            placeholder={t("addMember.email")}
            value={email}
            onChange={(e) => { setEmail(e.target.value); setError(""); }}
            className={`${inputClass} pl-12`}
          />
        </div>

        <div className="relative flex items-center bg-secondary/60 rounded-xl overflow-hidden">
          <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" strokeWidth={1.5} />
          <span className="pl-12 pr-2 text-foreground text-base select-none">+47</span>
          <input
            type="tel"
            autoComplete="tel"
            placeholder={t("addMember.phoneNumber")}
            value={phone}
            onChange={(e) => { setPhone(e.target.value); setError(""); }}
            className="flex-1 bg-transparent py-3.5 pr-4 text-foreground text-base placeholder:text-muted-foreground outline-none border-none"
          />
        </div>
      </div>

      <div className="px-6 mt-6">
        <div className="bg-secondary/40 rounded-xl px-4 py-3.5 flex items-start gap-3">
          <Info className="w-5 h-5 text-muted-foreground shrink-0 mt-0.5" strokeWidth={1.5} />
          <p className="text-muted-foreground text-sm leading-relaxed">{t("addMember.emailInfo")}</p>
        </div>
      </div>

      {error && <p className="px-6 mt-4 text-destructive text-body-small text-center">{error}</p>}

      <div className="flex-1" />

      <div className="px-6 mt-6">
        <button
          onClick={handleSave}
          disabled={addContact.isPending}
          className="w-full py-3.5 rounded-full bg-primary text-background text-base font-bold disabled:opacity-60"
        >
          {addContact.isPending ? "…" : t("addMember.save")}
        </button>
      </div>
    </div>
  );
};

export default AddMember;
