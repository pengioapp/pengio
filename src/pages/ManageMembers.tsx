import { useNavigate } from "react-router-dom";
import { ArrowLeft, Phone, Mail, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useTranslation } from "@/context/LanguageContext";
import { useContacts, useRemoveContact } from "@/hooks/useContacts";

const avatarColors = [
  "bg-pengio-green",
  "bg-pengio-blue",
  "bg-pengio-orange",
  "bg-pengio-purple",
];

const ManageMembers = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { data: contacts, isLoading, error } = useContacts();
  const removeContact = useRemoveContact();

  const handleRemove = async (id: string, name: string) => {
    try {
      await removeContact.mutateAsync(id);
      toast.success(t("members.removed", { name }));
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-background pb-28">
      <div className="px-6 pt-8 pb-2 flex items-center relative">
        <button onClick={() => navigate(-1)} className="absolute left-4 p-2">
          <ArrowLeft className="w-6 h-6 text-foreground" />
        </button>
        <h1 className="text-title text-primary font-bold text-center w-full">{t("members.title")}</h1>
      </div>

      <div className="px-6 mt-4">
        <p className="text-muted-foreground text-sm">{t("members.subtitle")}</p>
      </div>

      <div className="px-6 mt-6">
        <h2 className="text-primary font-semibold text-base">{t("members.currentMembers")}</h2>
      </div>

      <div className="px-6 mt-4 flex flex-col gap-3">
        {isLoading && (
          <div className="flex justify-center mt-6">
            <div
              className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent"
              role="status"
              aria-label="Loading"
            />
          </div>
        )}

        {error && <p className="text-destructive text-sm text-center">{(error as Error).message}</p>}

        {!isLoading && !error && contacts?.length === 0 && (
          <p className="text-muted-foreground text-sm text-center mt-4">{t("members.empty")}</p>
        )}

        {contacts?.map((contact, idx) => (
          <div key={contact.id} className="bg-secondary rounded-2xl px-4 py-4 flex items-center gap-3.5">
            <div className={`w-12 h-12 rounded-full ${avatarColors[idx % avatarColors.length]} flex items-center justify-center text-body-small font-bold text-foreground shrink-0`}>
              {contact.initials}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-foreground font-medium text-base truncate">{contact.name}</p>
              <div className="flex items-center gap-1.5 mt-0.5">
                {contact.phone ? (
                  <>
                    <Phone className="w-3.5 h-3.5 text-muted-foreground shrink-0" strokeWidth={1.5} />
                    <span className="text-muted-foreground text-sm truncate">{contact.phone}</span>
                  </>
                ) : (
                  <>
                    <Mail className="w-3.5 h-3.5 text-muted-foreground shrink-0" strokeWidth={1.5} />
                    <span className="text-muted-foreground text-sm truncate">{contact.email}</span>
                  </>
                )}
              </div>
            </div>
            {/* Only contacts with a Pengio account can be lent to, so the
                distinction is worth surfacing rather than hiding. */}
            <span className={`text-sm font-medium shrink-0 ${contact.onPengio ? "text-pengio-green" : "text-primary"}`}>
              {contact.onPengio ? t("status.active") : t("status.pending")}
            </span>
            <button
              onClick={() => handleRemove(contact.id, contact.name)}
              disabled={removeContact.isPending}
              aria-label={t("members.remove")}
              className="p-2 text-muted-foreground hover:text-destructive transition-colors disabled:opacity-50"
            >
              <Trash2 className="w-4 h-4" strokeWidth={1.5} />
            </button>
          </div>
        ))}
      </div>

      <div className="flex-1" />

      <div className="px-6 mt-6">
        <button
          onClick={() => navigate("/add-member")}
          className="w-full py-3.5 rounded-full bg-primary text-background text-base font-bold"
        >
          {t("members.addNew")}
        </button>
      </div>
    </div>
  );
};

export default ManageMembers;
