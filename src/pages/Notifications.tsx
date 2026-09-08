import { useNavigate } from "react-router-dom";
import { ArrowLeft, Bell, CheckCheck, AlertTriangle, ArrowDownLeft, ArrowUpRight, CalendarClock, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { useNotifications, type Notification } from "@/context/NotificationContext";
import { useProposals } from "@/hooks/useProposals";
import { useTranslation } from "@/context/LanguageContext";
import { formatDateString } from "@/lib/dateLocale";

const iconMap: Record<Notification["type"], typeof Bell> = {
  request: ArrowDownLeft,
  approved: CheckCheck,
  rejected: AlertTriangle,
  repayment: ArrowUpRight,
  reminder: CalendarClock,
  overdue: AlertTriangle,
};

const Notifications = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { notifications, markAsRead, markAllAsRead } = useNotifications();
  const { data: proposals } = useProposals();

  const unread = notifications.filter((n) => !n.read);
  const read = notifications.filter((n) => n.read);

  /**
   * A notification is a pointer to something that needs an answer, so opening
   * one should land on that thing. Previously tapping only marked it read, and
   * only while it was still unread -- which is why testers found that a
   * notification could be opened exactly once and led nowhere either time.
   *
   * Marking read is now independent of navigation: both happen on every tap.
   */
  const open = (n: Notification) => {
    if (!n.read) markAsRead(n.id);

    if (n.proposalId) {
      // Requests and offers are answered on different screens, and only the
      // proposal itself knows which it is.
      const proposal = proposals?.find((p) => p.id === n.proposalId);
      if (!proposal) {
        toast.info(t("notifications.gone"));
        return;
      }
      navigate(proposal.kind === "request" ? `/inbox/${proposal.id}` : `/loan-request/${proposal.id}`);
      return;
    }

    if (n.loanId) {
      navigate("/loan-details", { state: { loanId: n.loanId } });
      return;
    }

    toast.info(t("notifications.gone"));
  };

  return (
    <div className="flex flex-col min-h-screen bg-background pb-28">
      <div className="px-6 pt-8 pb-4 flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="text-foreground">
          <ArrowLeft className="w-6 h-6" />
        </button>
        <h1 className="text-h4 font-bold text-foreground flex-1">{t("notifications.title")}</h1>
        {unread.length > 0 && (
          <button onClick={markAllAsRead} className="text-body-micro text-primary font-medium">
            {t("notifications.markAllRead")}
          </button>
        )}
      </div>

      <div className="px-6 flex flex-col gap-2">
        {unread.length > 0 && (
          <>
            <p className="text-body-micro text-muted-foreground font-medium mb-1">{t("notifications.new")}</p>
            {unread.map((n) => (
              <NotificationCard key={n.id} notification={n} onOpen={open} />
            ))}
          </>
        )}

        {read.length > 0 && (
          <>
            <p className="text-body-micro text-muted-foreground font-medium mt-4 mb-1">{t("notifications.earlier")}</p>
            {read.map((n) => (
              <NotificationCard key={n.id} notification={n} onOpen={open} />
            ))}
          </>
        )}

        {notifications.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
            <Bell className="w-10 h-10 mb-3 opacity-40" />
            <p className="text-body-small">{t("notifications.empty")}</p>
          </div>
        )}
      </div>
    </div>
  );
};

const NotificationCard = ({ notification, onOpen }: { notification: Notification; onOpen: (n: Notification) => void }) => {
  const { language } = useTranslation();
  const Icon = iconMap[notification.type];
  return (
    <button
      type="button"
      onClick={() => onOpen(notification)}
      className={`w-full text-left rounded-xl p-4 flex items-start gap-3 transition-opacity active:opacity-80 ${notification.read ? "bg-secondary" : "bg-secondary ring-1 ring-primary/20"}`}
    >
      <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${notification.read ? "bg-muted/30" : "bg-primary/20"}`}>
        <Icon className={`w-5 h-5 ${notification.read ? "text-muted-foreground" : "text-primary"}`} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className={`text-body-small font-medium ${notification.read ? "text-muted-foreground" : "text-foreground"}`}>{notification.title}</p>
          {!notification.read && <span className="w-2 h-2 rounded-full bg-primary shrink-0" />}
        </div>
        <p className="text-body-micro text-muted-foreground mt-0.5">{notification.message}</p>
        <p className="text-body-micro text-muted-foreground/60 mt-1">{formatDateString(notification.timestamp, language)}</p>
      </div>
      {/* Something to open is the normal case, so say so rather than leaving
          the card looking like static text. */}
      {(notification.proposalId || notification.loanId) && (
        <ChevronRight className="w-5 h-5 text-muted-foreground shrink-0 self-center" />
      )}
    </button>
  );
};

export default Notifications;
