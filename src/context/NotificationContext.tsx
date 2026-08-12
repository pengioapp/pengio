import { createContext, useContext, type ReactNode } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import type { Database } from "@/integrations/supabase/types";

type DbNotificationType = Database["public"]["Enums"]["notification_type"];

/** The icon vocabulary the UI renders, deliberately smaller than the db enum. */
export type NotificationKind =
  | "request"
  | "approved"
  | "rejected"
  | "repayment"
  | "reminder"
  | "overdue";

export interface Notification {
  id: string;
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  type: NotificationKind;
}

const kindOf = (type: DbNotificationType): NotificationKind => {
  switch (type) {
    case "proposal_received": return "request";
    case "proposal_accepted": return "approved";
    case "proposal_rejected": return "rejected";
    case "payment_recorded":
    case "payment_confirmed":
    case "loan_repaid": return "repayment";
    case "repayment_due_soon": return "reminder";
    default: return "reminder";
  }
};

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
}

const NotificationContext = createContext<NotificationContextType | null>(null);

export const useNotifications = () => {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error("useNotifications must be used within NotificationProvider");
  return ctx;
};

const notificationsKey = ["notifications"] as const;

export const NotificationProvider = ({ children }: { children: ReactNode }) => {
  const { session } = useAuth();
  const queryClient = useQueryClient();

  // Notifications are written by database triggers when proposals and payments
  // happen, so the client only reads them and marks them read. There is
  // deliberately no addNotification: a client-created notification could claim
  // anything, which is why RLS grants no insert policy on this table.
  const { data } = useQuery({
    queryKey: notificationsKey,
    enabled: !!session,
    queryFn: async (): Promise<Notification[]> => {
      const { data, error } = await supabase
        .from("notifications")
        .select("id, type, title, body, read_at, created_at")
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) throw new Error(error.message);

      return (data ?? []).map((row) => ({
        id: row.id,
        title: row.title,
        message: row.body ?? "",
        timestamp: row.created_at,
        read: row.read_at !== null,
        type: kindOf(row.type),
      }));
    },
  });

  const notifications = data ?? [];
  const unreadCount = notifications.filter((n) => !n.read).length;

  const markRead = useMutation({
    mutationFn: async (ids: string[]) => {
      if (ids.length === 0) return;
      const { error } = await supabase
        .from("notifications")
        .update({ read_at: new Date().toISOString() })
        .in("id", ids);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: notificationsKey });
    },
  });

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        markAsRead: (id) => markRead.mutate([id]),
        markAllAsRead: () =>
          markRead.mutate(notifications.filter((n) => !n.read).map((n) => n.id)),
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
};
