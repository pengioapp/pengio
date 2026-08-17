export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      contacts: {
        Row: {
          contact_user_id: string | null
          created_at: string
          display_name: string
          email: string | null
          id: string
          owner_id: string
          phone: string | null
        }
        Insert: {
          contact_user_id?: string | null
          created_at?: string
          display_name: string
          email?: string | null
          id?: string
          owner_id: string
          phone?: string | null
        }
        Update: {
          contact_user_id?: string | null
          created_at?: string
          display_name?: string
          email?: string | null
          id?: string
          owner_id?: string
          phone?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contacts_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contacts_contact_user_id_fkey"
            columns: ["contact_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      loan_proposals: {
        Row: {
          amount: number
          borrower_id: string
          condition: string | null
          counter_to: string | null
          created_at: string
          currency: string
          id: string
          initiated_by: string
          interest_percent: number
          lender_id: string
          message: string | null
          rejection_reason: string | null
          repayment_date: string
          responded_at: string | null
          status: Database["public"]["Enums"]["proposal_status"]
        }
        Insert: {
          amount: number
          borrower_id: string
          condition?: string | null
          counter_to?: string | null
          created_at?: string
          currency?: string
          id?: string
          initiated_by: string
          interest_percent?: number
          lender_id: string
          message?: string | null
          rejection_reason?: string | null
          repayment_date: string
          responded_at?: string | null
          status?: Database["public"]["Enums"]["proposal_status"]
        }
        Update: {
          amount?: number
          borrower_id?: string
          condition?: string | null
          counter_to?: string | null
          created_at?: string
          currency?: string
          id?: string
          initiated_by?: string
          interest_percent?: number
          lender_id?: string
          message?: string | null
          rejection_reason?: string | null
          repayment_date?: string
          responded_at?: string | null
          status?: Database["public"]["Enums"]["proposal_status"]
        }
        Relationships: [
          {
            foreignKeyName: "loan_proposals_borrower_id_fkey"
            columns: ["borrower_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "loan_proposals_lender_id_fkey"
            columns: ["lender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "loan_proposals_counter_to_fkey"
            columns: ["counter_to"]
            isOneToOne: true
            referencedRelation: "loan_proposals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "loan_proposals_initiated_by_fkey"
            columns: ["initiated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      loans: {
        Row: {
          agreed_at: string
          borrower_id: string
          closed_at: string | null
          currency: string
          id: string
          interest_percent: number
          lender_id: string
          principal: number
          proposal_id: string | null
          repayment_date: string
          status: Database["public"]["Enums"]["loan_status"]
        }
        Insert: {
          agreed_at?: string
          borrower_id: string
          closed_at?: string | null
          currency?: string
          id?: string
          interest_percent?: number
          lender_id: string
          principal: number
          proposal_id?: string | null
          repayment_date: string
          status?: Database["public"]["Enums"]["loan_status"]
        }
        Update: {
          agreed_at?: string
          borrower_id?: string
          closed_at?: string | null
          currency?: string
          id?: string
          interest_percent?: number
          lender_id?: string
          principal?: number
          proposal_id?: string | null
          repayment_date?: string
          status?: Database["public"]["Enums"]["loan_status"]
        }
        Relationships: [
          {
            foreignKeyName: "loans_proposal_id_fkey"
            columns: ["proposal_id"]
            isOneToOne: true
            referencedRelation: "loan_proposals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "loans_borrower_id_fkey"
            columns: ["borrower_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "loans_lender_id_fkey"
            columns: ["lender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string
          id: string
          loan_id: string | null
          proposal_id: string | null
          read_at: string | null
          title: string
          type: Database["public"]["Enums"]["notification_type"]
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          id?: string
          loan_id?: string | null
          proposal_id?: string | null
          read_at?: string | null
          title: string
          type: Database["public"]["Enums"]["notification_type"]
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string
          id?: string
          loan_id?: string | null
          proposal_id?: string | null
          read_at?: string | null
          title?: string
          type?: Database["public"]["Enums"]["notification_type"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_proposal_id_fkey"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "loan_proposals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_loan_id_fkey"
            columns: ["loan_id"]
            isOneToOne: false
            referencedRelation: "loans"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number
          confirmed_at: string | null
          confirmed_by: string | null
          created_at: string
          id: string
          loan_id: string
          note: string | null
          paid_at: string
          recorded_by: string
        }
        Insert: {
          amount: number
          confirmed_at?: string | null
          confirmed_by?: string | null
          created_at?: string
          id?: string
          loan_id: string
          note?: string | null
          paid_at?: string
          recorded_by: string
        }
        Update: {
          amount?: number
          confirmed_at?: string | null
          confirmed_by?: string | null
          created_at?: string
          id?: string
          loan_id?: string
          note?: string | null
          paid_at?: string
          recorded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_loan_id_fkey"
            columns: ["loan_id"]
            isOneToOne: false
            referencedRelation: "loans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_recorded_by_fkey"
            columns: ["recorded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_confirmed_by_fkey"
            columns: ["confirmed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          about_me: string | null
          birth_date: string | null
          created_at: string
          email: string
          full_name: string
          id: string
          phone: string | null
          profession: string | null
          residence: string | null
          updated_at: string
        }
        Insert: {
          about_me?: string | null
          birth_date?: string | null
          created_at?: string
          email: string
          full_name: string
          id: string
          phone?: string | null
          profession?: string | null
          residence?: string | null
          updated_at?: string
        }
        Update: {
          about_me?: string | null
          birth_date?: string | null
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          phone?: string | null
          profession?: string | null
          residence?: string | null
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      confirm_payment: {
        Args: { payment: string }
        Returns: undefined
      }
      counter_proposal: {
        Args: {
          proposal: string
          new_amount: number
          new_interest_percent: number
          new_repayment_date: string
          new_message?: string
          new_condition?: string
        }
        Returns: string
      }
      loan_amount_repaid: {
        Args: { loan: string }
        Returns: number
      }
      respond_to_proposal: {
        Args: { proposal: string; accept: boolean; reason?: string }
        Returns: string
      }
      users_are_connected: {
        Args: { a: string; b: string }
        Returns: boolean
      }
    }
    Enums: {
      loan_status: "active" | "repaid" | "cancelled"
      notification_type:
        | "proposal_received"
        | "proposal_accepted"
        | "proposal_rejected"
        | "payment_recorded"
        | "payment_confirmed"
        | "loan_repaid"
        | "repayment_due_soon"
        | "proposal_countered"
      proposal_status: "pending" | "accepted" | "rejected" | "cancelled" | "countered"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      loan_status: ["active", "repaid", "cancelled"],
      notification_type: [
        "proposal_received",
        "proposal_accepted",
        "proposal_rejected",
        "payment_recorded",
        "payment_confirmed",
        "loan_repaid",
        "repayment_due_soon",
        "proposal_countered",
      ],
      proposal_status: ["pending", "accepted", "rejected", "cancelled", "countered"],
    },
  },
} as const
