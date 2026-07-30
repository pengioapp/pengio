import { useNavigate } from "react-router-dom";
import { ArrowLeft, Phone } from "lucide-react";
import { useTranslation } from "@/context/LanguageContext";

interface FamilyMember {
  name: string;
  phone: string;
  status: "Active" | "Pending";
  avatar: string;
}

const members: FamilyMember[] = [
  { name: "Maria Kristoffersen", phone: "+47 900 45 221", status: "Active", avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=80&h=80&fit=crop&crop=face" },
  { name: "Elias Kristoffersen", phone: "+47 982 11 430", status: "Active", avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=80&h=80&fit=crop&crop=face" },
  { name: "John Kristoffersen", phone: "+47 901 67 980", status: "Pending", avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=80&h=80&fit=crop&crop=face" },
];

const ManageMembers = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();

  return (
    <div className="flex flex-col min-h-screen bg-background pb-8">
      <div className="px-6 pt-8 pb-2 flex items-center relative">
        <button onClick={() => navigate(-1)} className="absolute left-4 p-2"><ArrowLeft className="w-6 h-6 text-foreground" /></button>
        <h1 className="text-title text-primary font-bold text-center w-full">{t("members.title")}</h1>
      </div>
      <div className="px-6 mt-4"><p className="text-muted-foreground text-sm">{t("members.subtitle")}</p></div>
      <div className="px-6 mt-6"><h2 className="text-primary font-semibold text-base">{t("members.currentMembers")}</h2></div>
      <div className="px-6 mt-4 flex flex-col gap-3">
        {members.map((member) => (
          <div key={member.phone} className="bg-secondary rounded-2xl px-4 py-4 flex items-center gap-3.5">
            <img src={member.avatar} alt={member.name} className="w-12 h-12 rounded-full object-cover shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-foreground font-medium text-base">{member.name}</p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <Phone className="w-3.5 h-3.5 text-muted-foreground" strokeWidth={1.5} />
                <span className="text-muted-foreground text-sm">{member.phone}</span>
              </div>
            </div>
            <span className={`text-sm font-medium shrink-0 ${member.status === "Active" ? "text-pengio-green" : "text-primary"}`}>
              {member.status === "Active" ? t("status.active") : t("status.pending")}
            </span>
          </div>
        ))}
      </div>
      <div className="flex-1" />
      <div className="px-6 mt-6">
        <button onClick={() => navigate("/add-member")} className="w-full py-3.5 rounded-full bg-primary text-background text-base font-bold">{t("members.addNew")}</button>
      </div>
    </div>
  );
};

export default ManageMembers;
