import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { initialsOf } from "@/lib/loans";

export interface Contact {
  id: string;
  /** The contact's Pengio account, or null if they have not joined yet. */
  userId: string | null;
  name: string;
  initials: string;
  phone: string | null;
  email: string | null;
  /** Only contacts with an account can be lent to or borrowed from. */
  onPengio: boolean;
}

export const contactsKey = ["contacts"] as const;

export function useContacts() {
  const { session } = useAuth();

  return useQuery({
    queryKey: contactsKey,
    enabled: !!session,
    queryFn: async (): Promise<Contact[]> => {
      const { data, error } = await supabase
        .from("contacts")
        .select("id, contact_user_id, display_name, phone, email")
        .order("display_name");

      if (error) throw new Error(error.message);

      return (data ?? []).map((row) => ({
        id: row.id,
        userId: row.contact_user_id,
        name: row.display_name,
        initials: initialsOf(row.display_name),
        phone: row.phone,
        email: row.email,
        onPengio: row.contact_user_id !== null,
      }));
    },
  });
}

export function useAddContact() {
  const { session } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: { name: string; email?: string; phone?: string }) => {
      if (!session?.user) throw new Error("You are not signed in.");

      // Linking happens in the database, not here. Looking the profile up from
      // the client cannot work: row level security hides a profile until the
      // two are connected, and connecting is what the lookup was for. The
      // link_contact_to_account trigger resolves the email server-side, and
      // the inserted row is read back to find out whether it matched.
      const { data, error } = await supabase
        .from("contacts")
        .insert({
          owner_id: session.user.id,
          display_name: input.name.trim(),
          email: input.email?.trim().toLowerCase() || null,
          phone: input.phone?.trim() || null,
        })
        .select("contact_user_id")
        .single();

      if (error) {
        if (error.code === "23505") throw new Error("That person is already in your contacts.");
        throw new Error(error.message);
      }

      return { linked: data.contact_user_id !== null };
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: contactsKey });
    },
  });
}

export function useRemoveContact() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (contactId: string) => {
      const { error } = await supabase.from("contacts").delete().eq("id", contactId);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: contactsKey });
    },
  });
}
