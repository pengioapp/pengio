import { useNavigate } from "react-router-dom";
import { ArrowLeft, Pencil, CheckCircle, MapPin, User, Mail, Phone, Briefcase, Globe, FileText, Check, ChevronDown } from "lucide-react";
import { useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useTranslation } from "@/context/LanguageContext";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/hooks/use-toast";

const CustomCheckbox = ({ checked, onChange, label }: { checked: boolean; onChange: () => void; label: string }) => (
  <label className="flex items-center gap-2.5 text-sm text-foreground cursor-pointer" onClick={onChange}>
    <div className={`w-5 h-5 rounded-[3px] border-2 flex items-center justify-center shrink-0 transition-colors ${checked ? "bg-primary border-primary" : "bg-transparent border-primary"}`}>
      {checked && <Check className="w-3.5 h-3.5 text-black" strokeWidth={3} />}
    </div>
    {label}
  </label>
);

const inputClass = "w-full pl-10 pr-3 py-3 bg-secondary/60 rounded-xl text-foreground text-sm placeholder:text-muted-foreground border-0 outline-none focus:ring-1 focus:ring-primary/50";

const EditPersonalInfo = () => {
  const navigate = useNavigate();
  const { t, language, setLanguage } = useTranslation();
  const { profile, updateProfile } = useAuth();
  const { toast } = useToast();
  const [assessment, setAssessment] = useState({ borrow: true, lend: false, both: false });
  const [countryCode, setCountryCode] = useState("+47");

  const [fullName, setFullName] = useState(profile.fullName);
  const [email, setEmail] = useState(profile.email);
  const [phone, setPhone] = useState(profile.phone);
  const [residence, setResidence] = useState(profile.residence);
  const [age, setAge] = useState(profile.age);
  const [profession, setProfession] = useState(profile.profession);
  const [aboutMe, setAboutMe] = useState(profile.aboutMe);

  const handleUpdate = async () => {
    if (!fullName.trim() || !email.trim()) {
      toast({
        title: t("editInfo.errorTitle"),
        description: t("editInfo.errorRequired"),
        variant: "destructive",
      });
      return;
    }

    // The save now hits the database, so it can fail. Awaiting the result before
    // reporting success avoids telling someone their details were stored when
    // the write was actually rejected.
    const { error } = await updateProfile({
      fullName: fullName.trim(),
      email: email.trim(),
      phone: phone.trim(),
      residence: residence.trim(),
      age: age.trim(),
      profession: profession.trim(),
      aboutMe: aboutMe.trim(),
    });

    if (error) {
      toast({
        title: t("editInfo.errorTitle"),
        description: error,
        variant: "destructive",
      });
      return;
    }

    toast({
      title: t("editInfo.successTitle"),
      description: t("editInfo.successMessage"),
    });

    setTimeout(() => navigate("/profile"), 600);
  };

  return (
    <div className="flex flex-col min-h-screen bg-background pb-28">
      <div className="px-6 pt-8 pb-2 flex items-center relative">
        <button onClick={() => navigate(-1)} className="absolute left-4 p-2"><ArrowLeft className="w-6 h-6 text-foreground" /></button>
        <h1 className="text-lg text-primary font-bold text-center w-full">{t("editInfo.title")}</h1>
      </div>

      <div className="flex justify-center mt-6">
        <div className="relative">
          <div className="w-24 h-24 rounded-full bg-pengio-blue flex items-center justify-center text-3xl font-bold text-background border-4 border-primary">
            {fullName.trim() ? fullName.trim().split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2) : "?"}
          </div>
          <div className="absolute bottom-0 right-0 w-7 h-7 rounded-full bg-primary flex items-center justify-center border-2 border-background"><Pencil className="w-3.5 h-3.5 text-primary-foreground" /></div>
        </div>
      </div>

      <div className="px-6 mt-6 flex flex-col gap-6">
        <div className="flex items-center gap-2">
          <span className="text-sm text-foreground font-medium">{t("editInfo.bankId")}</span>
          <CheckCircle className="w-4 h-4 text-pengio-green" />
        </div>

        <div>
          <p className="text-sm text-foreground font-medium mb-3">{t("editInfo.assessment")}</p>
          <div className="flex flex-col gap-2.5">
            <CustomCheckbox checked={assessment.borrow} onChange={() => setAssessment(p => ({ ...p, borrow: !p.borrow }))} label={t("editInfo.wantBorrow")} />
            <CustomCheckbox checked={assessment.lend} onChange={() => setAssessment(p => ({ ...p, lend: !p.lend }))} label={t("editInfo.wantLend")} />
            <CustomCheckbox checked={assessment.both} onChange={() => setAssessment(p => ({ ...p, both: !p.both }))} label={t("editInfo.wantBoth")} />
          </div>
        </div>

        <div>
          <p className="text-base text-primary font-bold mb-4">{t("editInfo.personalInfo")}</p>
          <div className="flex flex-col gap-4">
            <div>
              <label className="text-sm text-foreground font-medium mb-1.5 block">{t("editInfo.fullName")}</label>
              <div className="relative"><User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" strokeWidth={1.5} /><input value={fullName} onChange={e => setFullName(e.target.value)} placeholder={t("editInfo.enterName")} className={inputClass} /></div>
            </div>
            <div>
              <label className="text-sm text-foreground font-medium mb-1.5 block">{t("editInfo.email")}</label>
              <div className="relative"><Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" strokeWidth={1.5} /><input value={email} onChange={e => setEmail(e.target.value)} placeholder={t("editInfo.enterEmail")} className={inputClass} /></div>
            </div>
            <div>
              <label className="text-sm text-foreground font-medium mb-1.5 block">{t("editInfo.phoneNumber")}</label>
              <div className="relative flex items-center">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground z-10" strokeWidth={1.5} />
                <div className="flex items-center w-full bg-secondary/60 rounded-xl">
                  <Select value={countryCode} onValueChange={setCountryCode}>
                    <SelectTrigger className="pl-10 pr-1 bg-transparent border-0 shadow-none h-11 w-auto gap-0.5 focus:ring-0 focus:ring-offset-0 text-sm text-foreground [&>svg]:opacity-100 [&>svg]:w-3.5 [&>svg]:h-3.5">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-secondary border-muted-foreground/30 min-w-[120px]">
                      <SelectItem value="+47">🇳🇴 +47</SelectItem>
                      <SelectItem value="+46">🇸🇪 +46</SelectItem>
                      <SelectItem value="+45">🇩🇰 +45</SelectItem>
                      <SelectItem value="+358">🇫🇮 +358</SelectItem>
                      <SelectItem value="+44">🇬🇧 +44</SelectItem>
                      <SelectItem value="+1">🇺🇸 +1</SelectItem>
                      <SelectItem value="+49">🇩🇪 +49</SelectItem>
                      <SelectItem value="+33">🇫🇷 +33</SelectItem>
                      <SelectItem value="+91">🇮🇳 +91</SelectItem>
                    </SelectContent>
                  </Select>
                  <input value={phone} onChange={e => setPhone(e.target.value)} placeholder={t("editInfo.enterNumber")} className="flex-1 bg-transparent py-3 pr-3 pl-1 text-foreground text-sm outline-none border-0 placeholder:text-muted-foreground" />
                </div>
              </div>
            </div>
            <div>
              <label className="text-sm text-foreground font-medium mb-1.5 block">{t("editInfo.residence")}</label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" strokeWidth={1.5} />
                <input value={residence} onChange={e => setResidence(e.target.value)} placeholder={t("editInfo.enterAddress")} className={`${inputClass} pr-10`} />
                <div className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full border border-primary flex items-center justify-center"><div className="w-2 h-2 rounded-full bg-primary" /></div>
              </div>
            </div>
            <div>
              <label className="text-sm text-foreground font-medium mb-1.5 block">{t("editInfo.age")}</label>
              <div className="relative"><User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" strokeWidth={1.5} /><input value={age} onChange={e => setAge(e.target.value)} placeholder={t("editInfo.enterAge")} className={inputClass} /></div>
            </div>
            <div>
              <label className="text-sm text-foreground font-medium mb-1.5 block">{t("editInfo.profession")}</label>
              <div className="relative"><Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" strokeWidth={1.5} /><input value={profession} onChange={e => setProfession(e.target.value)} placeholder={t("editInfo.enterProfession")} className={inputClass} /></div>
            </div>
            <div>
              <label className="text-sm text-foreground font-medium mb-1.5 block">{t("editInfo.language")}</label>
              <div className="relative">
                <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground z-10" strokeWidth={1.5} />
                <Select value={language} onValueChange={(val) => setLanguage(val as "en" | "no")}>
                  <SelectTrigger className="pl-10 bg-secondary/60 rounded-xl border-0 text-foreground focus:ring-1 focus:ring-primary/50 h-11">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-secondary border-muted-foreground/30">
                    <SelectItem value="en">{t("editInfo.english")}</SelectItem>
                    <SelectItem value="no">{t("editInfo.norwegian")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <label className="text-sm text-foreground font-medium mb-1.5 block">{t("editInfo.aboutMe")}</label>
              <div className="relative">
                <FileText className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" strokeWidth={1.5} />
                <Textarea value={aboutMe} onChange={e => setAboutMe(e.target.value)} placeholder={t("editInfo.enterText")} className="pl-10 bg-secondary/60 rounded-xl border-0 text-foreground focus-visible:ring-1 focus-visible:ring-primary/50 min-h-[80px] resize-none placeholder:text-muted-foreground" />
              </div>
            </div>
          </div>
        </div>

        <button onClick={handleUpdate} className="w-full py-4 rounded-full bg-primary text-primary-foreground text-base font-bold mt-2">{t("editInfo.updateInfo")}</button>
      </div>
    </div>
  );
};

export default EditPersonalInfo;
