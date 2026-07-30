import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, UserPlus, FileText, Coins, CalendarDays, CheckCircle2 } from "lucide-react";
import { formatDate, getDateLocale } from "@/lib/dateLocale";
import { toast } from "sonner";
import { useTranslation } from "@/context/LanguageContext";
import { useLoanContext } from "@/context/LoanContext";
import { useAuth } from "@/context/AuthContext";
import { getContactsForUser, avatarColors } from "@/data/mockContacts";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";

const presetAmounts = [1000, 1500, 2000, 4000];

const BorrowMoney = () => {
  const navigate = useNavigate();
  const { t, language } = useTranslation();
  const { addSentLoan } = useLoanContext();
  const { user } = useAuth();
  const mockContacts = getContactsForUser(user?.email);
  const [amount, setAmount] = useState("1 000");
  const [selectedContact, setSelectedContact] = useState<number | null>(null);
  const [showContactPicker, setShowContactPicker] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [message, setMessage] = useState("");
  const [repaymentDate, setRepaymentDate] = useState<Date | undefined>(undefined);

  const handlePresetClick = (val: number) => setAmount(val.toLocaleString("nb-NO"));
  const filteredContacts = mockContacts.filter((c) => c.name.toLowerCase().includes(searchQuery.toLowerCase()) || c.phone.replace(/\s/g, '').includes(searchQuery.replace(/\s/g, '')));
  const noMatch = searchQuery.trim() !== "" && filteredContacts.length === 0;
  const selectedContactData = mockContacts.find((c) => c.id === selectedContact);

  const [showSuccess, setShowSuccess] = useState(false);

  const handleSendRequest = () => {
    if (!selectedContact) { toast.error(t("borrow.selectError")); return; }
    const contact = mockContacts.find((c) => c.id === selectedContact);
    if (contact) {
      addSentLoan({
        name: contact.name,
        avatarInitials: contact.avatar,
        amount: parseInt(amount.replace(/\s/g, ''), 10) || 0,
        repaymentDate: repaymentDate ? formatDate(repaymentDate, language) : "—",
        status: "Pending",
        type: "borrowed",
      });
    }
    setShowSuccess(true);
    setTimeout(() => {
      setShowSuccess(false);
      navigate("/overview", { state: { tab: "borrowed" } });
    }, 2000);
  };

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <div className="px-6 pt-6 pb-4 flex items-center">
        <button onClick={() => navigate("/home")} className="w-10 h-10 rounded-full flex items-center justify-center text-foreground">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6" /></svg>
        </button>
        <h1 className="flex-1 text-title text-primary font-bold text-center pr-10">{t("borrow.title")}</h1>
      </div>

      <div className="flex-1 px-6 pb-8 flex flex-col">
        <div className="mb-6">
          <h2 className="text-body-standard font-medium text-foreground mb-3">{t("borrow.howMuch")}</h2>
          <div className="bg-secondary rounded-xl px-4 py-3.5 flex items-center gap-3 mb-3">
            <Coins className="w-5 h-5 text-muted-foreground" />
            <div className="flex-1 flex items-center">
              <input type="text" inputMode="numeric" value={amount} onChange={(e) => { const v = e.target.value.replace(/[^0-9]/g, ''); setAmount(v); }} className="bg-transparent text-body-standard text-foreground outline-none w-auto" placeholder="0" style={{ width: `${Math.max(1, amount.length)}ch` }} />
              <span className="text-body-small text-muted-foreground ml-1">kr</span>
            </div>
          </div>
          <div className="flex gap-2">
            {presetAmounts.map((val) => {
              const formatted = val.toLocaleString("nb-NO");
              const isSelected = amount === formatted;
              return (
                <button key={val} onClick={() => handlePresetClick(val)} className={`px-3 py-1.5 rounded-full text-body-small font-medium border transition-all ${isSelected ? "bg-primary text-primary-foreground border-primary" : "bg-transparent text-primary border-primary/50 hover:border-primary"}`}>
                  {formatted} kr
                </button>
              );
            })}
          </div>
        </div>

        <div className="mb-6 relative">
          <h2 className="text-body-standard font-medium text-foreground mb-3">{t("borrow.selectContact")}</h2>
          <button onClick={() => setShowContactPicker(!showContactPicker)} className="w-full bg-secondary rounded-xl px-4 py-3.5 flex items-center gap-3">
            {selectedContactData ? (
              <>
                <div className={`w-8 h-8 rounded-full ${avatarColors[mockContacts.indexOf(selectedContactData) % avatarColors.length]} flex items-center justify-center text-body-micro font-bold text-foreground`}>{selectedContactData.avatar}</div>
                <span className="flex-1 text-left text-body-standard text-foreground">{selectedContactData.name}</span>
              </>
            ) : (
              <>
                <UserPlus className="w-5 h-5 text-muted-foreground" />
                <span className="flex-1 text-left text-body-standard text-muted-foreground">{t("borrow.selectContactPlaceholder")}</span>
              </>
            )}
            <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center"><UserPlus className="w-4 h-4 text-primary-foreground" /></div>
          </button>

          {showContactPicker && (
            <div className="absolute left-0 right-0 top-full mt-1 bg-secondary rounded-xl p-3 z-50 shadow-lg border border-foreground/10">
              <div className="flex items-center gap-2 bg-background/30 rounded-lg px-3 py-2 mb-2">
                <Search className="w-4 h-4 text-muted-foreground" />
                <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder={t("borrow.searchContact")} className="flex-1 bg-transparent text-body-small text-foreground placeholder:text-muted-foreground outline-none" />
              </div>
              <div className="flex flex-col max-h-48 overflow-y-auto">
                {filteredContacts.map((contact, idx) => (
                  <button key={contact.id} onClick={() => { setSelectedContact(contact.id); setShowContactPicker(false); setSearchQuery(""); }} className="flex items-center gap-3 px-2 py-2.5 rounded-lg hover:bg-background/20 transition-colors">
                    <div className={`w-8 h-8 rounded-full ${avatarColors[idx % avatarColors.length]} flex items-center justify-center text-body-micro font-bold text-foreground`}>{contact.avatar}</div>
                    <div className="flex flex-col items-start">
                      <span className="text-body-small text-foreground">{contact.name}</span>
                      <span className="text-body-micro text-muted-foreground">{contact.phone}</span>
                    </div>
                  </button>
                ))}
                {noMatch && (
                  <button onClick={() => { toast.success(`Contact with ${searchQuery} will be added`); setShowContactPicker(false); setSearchQuery(""); }} className="flex items-center gap-3 px-2 py-2.5 rounded-lg hover:bg-background/20 transition-colors text-primary">
                    <UserPlus className="w-5 h-5" />
                    <span className="text-body-small font-medium">{t("borrow.addNewContact")}</span>
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="mb-6">
          <h2 className="text-body-standard font-medium text-foreground mb-3">{t("lend.repaymentPeriod")}</h2>
          <Popover>
            <PopoverTrigger asChild>
              <button className="w-full bg-secondary rounded-xl px-4 py-3.5 flex items-center gap-3">
                <CalendarDays className="w-5 h-5 text-muted-foreground" />
                <span className={`flex-1 text-left text-body-standard ${repaymentDate ? "text-foreground" : "text-muted-foreground"}`}>
                  {repaymentDate ? formatDate(repaymentDate, language) : t("lend.selectDate")}
                </span>
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={repaymentDate}
                onSelect={setRepaymentDate}
                disabled={(date) => date <= new Date()}
                locale={getDateLocale(language)}
                initialFocus
                className="p-3 pointer-events-auto"
              />
            </PopoverContent>
          </Popover>
        </div>

        <div className="mb-6">
          <h2 className="text-body-standard font-medium text-foreground mb-3">{t("borrow.message")}</h2>
          <div className="bg-secondary rounded-xl px-4 py-3.5 flex items-start gap-3">
            <FileText className="w-5 h-5 text-muted-foreground mt-0.5" />
            <textarea value={message} onChange={(e) => setMessage(e.target.value)} placeholder={t("borrow.typeHere")} rows={4} className="flex-1 bg-transparent text-body-standard text-foreground placeholder:text-muted-foreground outline-none resize-none" />
          </div>
        </div>

        <div className="mt-auto pt-4">
          <button onClick={handleSendRequest} className="w-full py-4 rounded-full bg-primary text-primary-foreground text-title font-bold hover:brightness-95 transition-all">
            {t("borrow.sendRequest")}
          </button>
        </div>
      </div>

      <Dialog open={showSuccess}>
        <DialogContent className="bg-secondary border-none rounded-2xl max-w-[280px] flex flex-col items-center gap-4 p-8 [&>button]:hidden">
          <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center">
            <CheckCircle2 className="w-10 h-10 text-green-500" />
          </div>
          <h2 className="text-title font-bold text-primary text-center">{t("borrow.requestSent")}</h2>
          <p className="text-body-small text-muted-foreground text-center">{t("borrow.requestSentSubtitle")}</p>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default BorrowMoney;
