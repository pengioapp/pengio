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
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Dialog, DialogContent } from "@/components/ui/dialog";

const presetAmounts = [500, 1000, 1500, 3000];

const LendMoney = () => {
  const navigate = useNavigate();
  const { t, language } = useTranslation();
  const createProposal = useCreateProposal();

  const [amount, setAmount] = useState("1000");
  const [contact, setContact] = useState<Contact | null>(null);
  const [message, setMessage] = useState("");
  const [repaymentDate, setRepaymentDate] = useState<Date | undefined>(undefined);
  const [interestRate, setInterestRate] = useState("0");
  const [showSuccess, setShowSuccess] = useState(false);

  const amountValue = parseInt(amount.replace(/\s/g, ""), 10) || 0;
  const interestValue = parseInt(interestRate || "0", 10);

  const handleSendOffer = async () => {
    if (!contact?.userId) {
      toast.error(contact ? t("proposal.notOnPengio", { name: contact.name }) : t("lend.selectError"));
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
        direction: "lend",
        amount: amountValue,
        interestPercent: interestValue,
        // Stored as a date without a timezone, so format locally rather than
        // via toISOString(), which would shift the day for users behind UTC.
        repaymentDate: format(repaymentDate, "yyyy-MM-dd"),
        message,
      });

      setShowSuccess(true);
      setTimeout(() => {
        setShowSuccess(false);
        navigate("/overview", { state: { tab: "lent" } });
      }, 1600);
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-background overflow-y-auto">
      <div className="px-6 pt-6 pb-4 flex items-center">
        <button onClick={() => navigate("/home")} className="w-10 h-10 rounded-full flex items-center justify-center text-foreground">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6" /></svg>
        </button>
        <h1 className="flex-1 text-title text-primary font-bold text-center pr-10">{t("lend.title")}</h1>
      </div>

      <div className="flex-1 px-6 pb-8 flex flex-col">
        <div className="mb-6">
          <h2 className="text-body-standard font-medium text-foreground mb-3">{t("lend.howMuch")}</h2>
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
          <h2 className="text-body-standard font-medium text-foreground mb-3">{t("lend.selectRecipient")}</h2>
          <ContactPicker
            selected={contact}
            onSelect={setContact}
            placeholder={t("lend.chooseRecipient")}
            searchPlaceholder={t("lend.searchContact")}
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

        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-body-standard font-medium text-foreground">{t("lend.interestRate")}</h2>
            <p className="text-body-micro text-primary">{t("lend.allowedRange")}</p>
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
              placeholder={t("lend.enterInterestRate")}
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
          <h2 className="text-body-standard font-medium text-foreground mb-3">{t("lend.message")}</h2>
          <div className="bg-secondary rounded-xl px-4 py-3.5 flex items-start gap-3">
            <FileText className="w-5 h-5 text-muted-foreground mt-0.5" />
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder={t("lend.typeHere")}
              rows={4}
              maxLength={500}
              className="flex-1 bg-transparent text-body-standard text-foreground placeholder:text-muted-foreground outline-none resize-none"
            />
          </div>
        </div>

        <div className="mb-6">
          <h2 className="text-body-standard font-medium text-foreground mb-3">{t("lend.loanFollowUp")}</h2>
          <div className="rounded-xl px-4 py-3.5 bg-secondary border border-foreground/10">
            <p className="text-body-small text-muted-foreground">{t("lend.followUpWarning")}</p>
          </div>
        </div>

        {/* This section previously promised a legally binding agreement signed
            with BankID. Neither exists, and saying so about a debt between two
            people is a claim they might rely on. It now describes what the app
            actually does. */}
        <div className="mb-6">
          <h2 className="text-body-standard font-medium text-primary mb-3">{t("lend.loanAgreement")}</h2>
          <div className="rounded-xl px-4 py-4 bg-secondary border border-foreground/10">
            <ul className="list-disc list-outside pl-4 space-y-3">
              <li className="text-body-small text-foreground">{t("lend.agreementText1")}</li>
              <li className="text-body-small text-foreground">{t("lend.agreementText2")}</li>
            </ul>
          </div>
        </div>

        <div className="h-20" />
      </div>

      <div className="sticky bottom-0 left-0 right-0 px-6 pb-6 pt-3 bg-gradient-to-t from-background via-background to-transparent">
        <button
          onClick={handleSendOffer}
          disabled={createProposal.isPending}
          className="w-full py-4 rounded-full bg-primary text-primary-foreground text-title font-bold hover:brightness-95 transition-all disabled:opacity-60"
        >
          {createProposal.isPending ? "…" : t("lend.sendOffer")}
        </button>
      </div>

      <Dialog open={showSuccess}>
        <DialogContent className="bg-secondary border-none rounded-2xl max-w-[280px] flex flex-col items-center gap-4 p-8 [&>button]:hidden">
          <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center">
            <CheckCircle2 className="w-10 h-10 text-green-500" />
          </div>
          <h2 className="text-title font-bold text-primary text-center">{t("lend.successTitle")}</h2>
          <p className="text-body-small text-muted-foreground text-center">{t("lend.successSubtitle")}</p>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default LendMoney;
