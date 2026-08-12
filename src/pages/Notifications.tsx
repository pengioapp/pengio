import { useNavigate } from "react-router-dom";
import { ArrowLeft, Bell, CheckCheck, AlertTriangle, ArrowDownLeft, ArrowUpRight, CalendarClock } from "lucide-react";
import { useNotifications, type Notification } from "@/context/NotificationContext";
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
  const { notifications, markAsRead, markAllAsRead } = useNotifications();

  const unread = notifications.filter((n) => !n.read);
  const read = notifications.filter((n) => n.read);

  return (
    <div className="flex flex-col min-h-screen bg-background pb-6">
      <div className="px-6 pt-8 pb-4 flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="text-foreground">
          <ArrowLeft className="w-6 h-6" />
        </button>
        <h1 className="text-h4 font-bold text-foreground flex-1">Notifications</h1>
        {unread.length > 0 && (
          <button onClick={markAllAsRead} className="text-body-micro text-primary font-medium">
            Mark all read
          </button>
        )}
      </div>

      <div className="px-6 flex flex-col gap-2">
        {unread.length > 0 && (
          <>
            <p className="text-body-micro text-muted-foreground font-medium mb-1">New</p>
            {unread.map((n) => (
              <NotificationCard key={n.id} notification={n} onRead={markAsRead} />
            ))}
          </>
        )}

        {read.length > 0 && (
          <>
            <p className="text-body-micro text-muted-foreground font-medium mt-4 mb-1">Earlier</p>
            {read.map((n) => (
              <NotificationCard key={n.id} notification={n} onRead={markAsRead} />
            ))}
          </>
        )}

        {notifications.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
            <Bell className="w-10 h-10 mb-3 opacity-40" />
            <p className="text-body-small">No notifications yet</p>
          </div>
        )}
      </div>
    </div>
  );
};

const NotificationCard = ({ notification, onRead }: { notification: Notification; onRead: (id: string) => void }) => {
  const { language } = useTranslation();
  const Icon = iconMap[notification.type];
  return (
    <div
      onClick={() => !notification.read && onRead(notification.id)}
      className={`rounded-xl p-4 flex items-start gap-3 cursor-pointer transition-opacity active:opacity-80 ${notification.read ? "bg-secondary" : "bg-secondary ring-1 ring-primary/20"}`}
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
    </div>
  );
};

export default Notifications;
