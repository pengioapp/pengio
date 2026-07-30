import { useNavigate } from "react-router-dom";
import { ArrowLeft, User, Phone, Info } from "lucide-react";
import { useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useTranslation } from "@/context/LanguageContext";

const inputClass = "w-full bg-secondary/60 rounded-xl px-4 py-3.5 text-foreground text-base placeholder:text-muted-foreground outline-none border-none";

const AddMember = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");

  return (
    <div className="flex flex-col min-h-screen bg-background pb-8">
      <div className="px-6 pt-8 pb-2 flex items-center relative">
        <button onClick={() => navigate(-1)} className="absolute left-4 p-2"><ArrowLeft className="w-6 h-6 text-foreground" /></button>
        <h1 className="text-title text-primary font-bold text-center w-full">{t("addMember.title")}</h1>
      </div>
      <div className="px-6 mt-4"><p className="text-muted-foreground text-sm">{t("addMember.subtitle")}</p></div>
      <div className="px-6 mt-6 flex flex-col gap-4">
        <div className="relative">
          <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" strokeWidth={1.5} />
          <input type="text" placeholder={t("addMember.fullName")} value={name} onChange={(e) => setName(e.target.value)} className={`${inputClass} pl-12`} />
        </div>
        <div className="relative flex items-center bg-secondary/60 rounded-xl overflow-hidden">
          <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" strokeWidth={1.5} />
          <span className="pl-12 pr-2 text-foreground text-base select-none">+47</span>
          <input type="tel" placeholder={t("addMember.phoneNumber")} value={phone} onChange={(e) => setPhone(e.target.value)} className="flex-1 bg-transparent py-3.5 pr-4 text-foreground text-base placeholder:text-muted-foreground outline-none border-none" />
        </div>
        <Select>
          <SelectTrigger className="w-full bg-secondary/60 rounded-xl px-4 py-3.5 h-auto text-base text-muted-foreground border-none focus:ring-0 focus:ring-offset-0 [&>svg]:text-muted-foreground">
            <SelectValue placeholder={t("addMember.relationship")} />
          </SelectTrigger>
          <SelectContent className="bg-secondary border-muted">
            <SelectItem value="parent">{t("addMember.parent")}</SelectItem>
            <SelectItem value="sibling">{t("addMember.sibling")}</SelectItem>
            <SelectItem value="spouse">{t("addMember.spouse")}</SelectItem>
            <SelectItem value="child">{t("addMember.child")}</SelectItem>
            <SelectItem value="other">{t("addMember.other")}</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="px-6 mt-6">
        <div className="bg-secondary/40 rounded-xl px-4 py-3.5 flex items-start gap-3">
          <Info className="w-5 h-5 text-muted-foreground shrink-0 mt-0.5" strokeWidth={1.5} />
          <p className="text-muted-foreground text-sm leading-relaxed">{t("addMember.smsInfo")}</p>
        </div>
      </div>
      <div className="flex-1" />
      <div className="px-6 mt-6">
        <button className="w-full py-3.5 rounded-full bg-primary text-background text-base font-bold">{t("addMember.sendInvitation")}</button>
      </div>
    </div>
  );
};

export default AddMember;
