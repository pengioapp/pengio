import { createContext, useContext, useState, type ReactNode } from "react";

export interface Notification {
  id: number;
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  type: "request" | "approved" | "rejected" | "repayment" | "reminder" | "overdue" | "date-change";
}

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  addNotification: (n: Omit<Notification, "id" | "read">) => void;
  markAsRead: (id: number) => void;
  markAllAsRead: () => void;
}

const NotificationContext = createContext<NotificationContextType | null>(null);

export const useNotifications = () => {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error("useNotifications must be used within NotificationProvider");
  return ctx;
};

const initialNotifications: Notification[] = [
  { id: 1, title: "Loan request received", message: "Erik Johansen wants to borrow 5 000 kr", timestamp: "2 hours ago", read: false, type: "request" },
  { id: 2, title: "Repayment received", message: "Anna Kristoffersen repaid 2 000 kr", timestamp: "Yesterday", read: false, type: "repayment" },
  { id: 3, title: "Upcoming payment", message: "Payment of 1 000 kr due in 3 days", timestamp: "Yesterday", read: true, type: "reminder" },
  { id: 4, title: "Request approved", message: "Your loan request of 5 000 kr was approved", timestamp: "3 days ago", read: true, type: "approved" },
  { id: 5, title: "Overdue payment", message: "Payment of 500 kr is overdue", timestamp: "Last week", read: true, type: "overdue" },
  { id: 6, title: "Repayment date changed", message: "Erik updated repayment date to 15 May 2025", timestamp: "Last week", read: true, type: "date-change" },
];

export const NotificationProvider = ({ children }: { children: ReactNode }) => {
  const [notifications, setNotifications] = useState<Notification[]>(initialNotifications);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const addNotification = (n: Omit<Notification, "id" | "read">) => {
    setNotifications((prev) => [{ ...n, id: Date.now(), read: false }, ...prev]);
  };

  const markAsRead = (id: number) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
  };

  const markAllAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  return (
    <NotificationContext.Provider value={{ notifications, unreadCount, addNotification, markAsRead, markAllAsRead }}>
      {children}
    </NotificationContext.Provider>
  );
};
