import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { FileText, Coins, CalendarDays, CheckCircle2 } from "lucide-react";
import { format } from "date-fns";
import { formatDate, getDateLocale } from "@/lib/dateLocale";
import { toast } from "sonner";
import { useTranslation } from "@/context/LanguageContext";
import { useCreateProposal } from "@/hooks/useProposals";
import type { Contact } from "@/hooks/useContacts";
import ContactPicker from "@/components/ContactPicker";
import { totalDue, formatAmount } from "@/lib/loans";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";

const presetAmounts = [1000, 1500, 2000, 4000];

const BorrowMoney = () => {
  const navigate = useNavigate();
  const { t, language } = useTranslation();
  const createProposal = useCreateProposal();

  const [amount, setAmount] = useState("1000");
  const [contact, setContact] = useState<Contact | null>(null);
  const [message, setMessage] = useState("");
  const [interestRate, setInterestRate] = useState("0");
  const [repaymentDate, setRepaymentDate] = useState<Date | undefined>(undefined);
  const [showSuccess, setShowSuccess] = useState(false);

  const amountValue = parseInt(amount.replace(/\s/g, ""), 10) || 0;
  const interestValue = parseInt(interestRate || "0", 10);

  const handleSendRequest = async () => {
    if (!contact?.userId) {
      toast.error(contact ? t("proposal.notOnPengio", { name: contact.name }) : t("borrow.selectError"));
      return;
    }
    if (amountValue <= 0) {
      toast.error(t("proposal.amountRequired"));
      return;
    }
    if (!repaymentDate) {
      toast.error(t("proposal.dateRequired"));
      return;
    }

    try {
      await createProposal.mutateAsync({
        counterpartyId: contact.userId,
        direction: "borrow",
        amount: amountValue,
        interestPercent: interestValue,
        // The column is a date, so it is stored without a timezone. Formatting
        // locally avoids toISOString() shifting the day for users behind UTC.
        repaymentDate: format(repaymentDate, "yyyy-MM-dd"),
        message,
      });

      setShowSuccess(true);
      setTimeout(() => {
        setShowSuccess(false);
        navigate("/overview", { state: { tab: "borrowed" } });
      }, 1600);
    } catch (e) {
      toast.error((e as Error).message);
    }
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
              <input
                type="text"
                inputMode="numeric"
                value={amount}
                onChange={(e) => setAmount(e.target.value.replace(/[^0-9]/g, ""))}
                className="bg-transparent text-body-standard text-foreground outline-none w-auto"
                placeholder="0"
                style={{ width: `${Math.max(1, amount.length)}ch` }}
              />
              <span className="text-body-small text-muted-foreground ml-1">kr</span>
            </div>
          </div>
          <div className="flex gap-2">
            {presetAmounts.map((val) => (
              <button
                key={val}
                onClick={() => setAmount(String(val))}
                className={`px-3 py-1.5 rounded-full text-body-small font-medium border transition-all ${
                  amountValue === val
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-transparent text-primary border-primary/50 hover:border-primary"
                }`}
              >
                {val.toLocaleString("nb-NO")} kr
              </button>
            ))}
          </div>
        </div>

        <div className="mb-6">
          <h2 className="text-body-standard font-medium text-foreground mb-3">{t("borrow.selectContact")}</h2>
          <ContactPicker
            selected={contact}
            onSelect={setContact}
            placeholder={t("borrow.selectContactPlaceholder")}
            searchPlaceholder={t("borrow.searchContact")}
          />
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

        {/* The borrower states the rate they are offering. The lender can accept
            or decline it, but cannot alter it and call that agreement. */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-body-standard font-medium text-foreground">{t("borrow.interestRate")}</h2>
            <p className="text-body-micro text-primary">{t("borrow.allowedRange")}</p>
          </div>
          <div className="bg-secondary rounded-xl px-4 py-3.5 flex items-center gap-3">
            <div className="w-8 h-8 rounded-full border-[1.5px] border-muted-foreground flex items-center justify-center shrink-0">
              <span className="text-[13px] font-semibold text-muted-foreground leading-none">%</span>
            </div>
            <input
              type="text"
              inputMode="numeric"
              value={interestRate}
              onChange={(e) => {
                const val = e.target.value.replace(/[^0-9]/g, "");
                if (val === "") setInterestRate("");
                else if (parseInt(val, 10) <= 10) setInterestRate(String(parseInt(val, 10)));
              }}
              placeholder={t("borrow.enterInterestRate")}
              className="bg-transparent text-body-standard text-foreground outline-none"
              style={{ width: interestRate ? `${Math.max(interestRate.length, 1)}ch` : "14ch" }}
            />
            {interestRate && <span className="text-body-standard text-foreground -ml-1">%</span>}
            <span className="flex-1" />
            {amountValue > 0 && (
              <span className="text-body-micro text-muted-foreground">
                {formatAmount(totalDue(amountValue, interestValue))}
              </span>
            )}
          </div>
        </div>

        <div className="mb-6">
          <h2 className="text-body-standard font-medium text-foreground mb-3">{t("borrow.message")}</h2>
          <div className="bg-secondary rounded-xl px-4 py-3.5 flex items-start gap-3">
            <FileText className="w-5 h-5 text-muted-foreground mt-0.5" />
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder={t("borrow.typeHere")}
              rows={4}
              maxLength={500}
              className="flex-1 bg-transparent text-body-standard text-foreground placeholder:text-muted-foreground outline-none resize-none"
            />
          </div>
        </div>

        <div className="mt-auto pt-4">
          <button
            onClick={handleSendRequest}
            disabled={createProposal.isPending}
            className="w-full py-4 rounded-full bg-primary text-primary-foreground text-title font-bold hover:brightness-95 transition-all disabled:opacity-60"
          >
            {createProposal.isPending ? "…" : t("borrow.sendRequest")}
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
