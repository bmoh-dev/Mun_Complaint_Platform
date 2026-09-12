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
      attachments: {
        Row: {
          complaint_id: string
          created_at: string
          file_name: string
          id: string
          mime_type: string
          size_bytes: number
          storage_path: string
        }
        Insert: {
          complaint_id: string
          created_at?: string
          file_name: string
          id?: string
          mime_type: string
          size_bytes: number
          storage_path: string
        }
        Update: {
          complaint_id?: string
          created_at?: string
          file_name?: string
          id?: string
          mime_type?: string
          size_bytes?: number
          storage_path?: string
        }
        Relationships: [
          {
            foreignKeyName: "attachments_complaint_id_fkey"
            columns: ["complaint_id"]
            isOneToOne: false
            referencedRelation: "complaints"
            referencedColumns: ["id"]
          },
        ]
      }
      complaint_routing_history: {
        Row: {
          actor_user_id: string
          complaint_id: string
          created_at: string
          from_department_id: string | null
          id: string
          reason: string | null
          to_department_id: string
        }
        Insert: {
          actor_user_id: string
          complaint_id: string
          created_at?: string
          from_department_id?: string | null
          id?: string
          reason?: string | null
          to_department_id: string
        }
        Update: {
          actor_user_id?: string
          complaint_id?: string
          created_at?: string
          from_department_id?: string | null
          id?: string
          reason?: string | null
          to_department_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "complaint_routing_history_complaint_id_fkey"
            columns: ["complaint_id"]
            isOneToOne: false
            referencedRelation: "complaints"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "complaint_routing_history_from_department_id_fkey"
            columns: ["from_department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "complaint_routing_history_to_department_id_fkey"
            columns: ["to_department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
        ]
      }
      complaints: {
        Row: {
          address: string
          assigned_department_id: string | null
          category: Database["public"]["Enums"]["complaint_category"]
          complaint_number: string
          created_at: string
          description: string
          id: string
          internal_notes: string | null
          latitude: number | null
          legacy_imported: boolean
          longitude: number | null
          municipality_id: string
          status: Database["public"]["Enums"]["complaint_status"]
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          address: string
          assigned_department_id?: string | null
          category: Database["public"]["Enums"]["complaint_category"]
          complaint_number: string
          created_at?: string
          description: string
          id?: string
          internal_notes?: string | null
          latitude?: number | null
          legacy_imported?: boolean
          longitude?: number | null
          municipality_id: string
          status?: Database["public"]["Enums"]["complaint_status"]
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          address?: string
          assigned_department_id?: string | null
          category?: Database["public"]["Enums"]["complaint_category"]
          complaint_number?: string
          created_at?: string
          description?: string
          id?: string
          internal_notes?: string | null
          latitude?: number | null
          legacy_imported?: boolean
          longitude?: number | null
          municipality_id?: string
          status?: Database["public"]["Enums"]["complaint_status"]
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "complaints_assigned_department_id_fkey"
            columns: ["assigned_department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "complaints_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "municipalities"
            referencedColumns: ["id"]
          },
        ]
      }
      department_admins: {
        Row: {
          created_at: string
          department_id: string
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          department_id: string
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string
          department_id?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "department_admins_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
        ]
      }
      departments: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          legacy_imported: boolean
          municipality_id: string
          name_ar: string
          slug: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          legacy_imported?: boolean
          municipality_id: string
          name_ar: string
          slug: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          legacy_imported?: boolean
          municipality_id?: string
          name_ar?: string
          slug?: string
        }
        Relationships: [
          {
            foreignKeyName: "departments_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "municipalities"
            referencedColumns: ["id"]
          },
        ]
      }
      feedback: {
        Row: {
          admin_notes: string | null
          created_at: string
          description: string
          id: string
          page: string | null
          screenshot_url: string | null
          status: string
          title: string
          type: string
          user_id: string
        }
        Insert: {
          admin_notes?: string | null
          created_at?: string
          description: string
          id?: string
          page?: string | null
          screenshot_url?: string | null
          status?: string
          title: string
          type: string
          user_id: string
        }
        Update: {
          admin_notes?: string | null
          created_at?: string
          description?: string
          id?: string
          page?: string | null
          screenshot_url?: string | null
          status?: string
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      municipalities: {
        Row: {
          created_at: string
          id: string
          name: string
          owner_user_id: string
          rejection_reason: string | null
          status: Database["public"]["Enums"]["municipality_status"]
          updated_at: string
          verified_at: string | null
          verified_by: string | null
          wilaya: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          owner_user_id: string
          rejection_reason?: string | null
          status?: Database["public"]["Enums"]["municipality_status"]
          updated_at?: string
          verified_at?: string | null
          verified_by?: string | null
          wilaya: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          owner_user_id?: string
          rejection_reason?: string | null
          status?: Database["public"]["Enums"]["municipality_status"]
          updated_at?: string
          verified_at?: string | null
          verified_by?: string | null
          wilaya?: string
        }
        Relationships: []
      }
      municipality_members: {
        Row: {
          joined_at: string
          municipality_id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          joined_at?: string
          municipality_id: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          joined_at?: string
          municipality_id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "municipality_members_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "municipalities"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string | null
          complaint_id: string | null
          created_at: string
          id: string
          read: boolean
          title: string
          user_id: string
        }
        Insert: {
          body?: string | null
          complaint_id?: string | null
          created_at?: string
          id?: string
          read?: boolean
          title: string
          user_id: string
        }
        Update: {
          body?: string | null
          complaint_id?: string | null
          created_at?: string
          id?: string
          read?: boolean
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_complaint_id_fkey"
            columns: ["complaint_id"]
            isOneToOne: false
            referencedRelation: "complaints"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_settings: {
        Row: {
          id: boolean
          initialized_at: string | null
          initialized_by: string | null
        }
        Insert: {
          id?: boolean
          initialized_at?: string | null
          initialized_by?: string | null
        }
        Update: {
          id?: boolean
          initialized_at?: string | null
          initialized_by?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string | null
          full_name: string | null
          google_sub: string | null
          id: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          google_sub?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          google_sub?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      rate_limit_blocks_log: {
        Row: {
          action: string
          blocked_at: string
          id: string
          user_id: string | null
        }
        Insert: {
          action: string
          blocked_at?: string
          id?: string
          user_id?: string | null
        }
        Update: {
          action?: string
          blocked_at?: string
          id?: string
          user_id?: string | null
        }
        Relationships: []
      }
      rate_limit_counters: {
        Row: {
          action: string
          count: number
          subject: string
          window_seconds: number
          window_start: string
        }
        Insert: {
          action: string
          count?: number
          subject: string
          window_seconds: number
          window_start: string
        }
        Update: {
          action?: string
          count?: number
          subject?: string
          window_seconds?: number
          window_start?: string
        }
        Relationships: []
      }
      role_audit_log: {
        Row: {
          actor_admin_id: string
          created_at: string
          id: string
          new_role: Database["public"]["Enums"]["app_role"] | null
          previous_role: Database["public"]["Enums"]["app_role"] | null
          target_user_id: string
        }
        Insert: {
          actor_admin_id: string
          created_at?: string
          id?: string
          new_role?: Database["public"]["Enums"]["app_role"] | null
          previous_role?: Database["public"]["Enums"]["app_role"] | null
          target_user_id: string
        }
        Update: {
          actor_admin_id?: string
          created_at?: string
          id?: string
          new_role?: Database["public"]["Enums"]["app_role"] | null
          previous_role?: Database["public"]["Enums"]["app_role"] | null
          target_user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      abandon_global_admin: { Args: { p_caller: string }; Returns: undefined }
      assign_historical_complaints_to_department: {
        Args: { p_caller: string; p_department_id: string }
        Returns: number
      }
      bootstrap_global_admin: { Args: { p_caller: string }; Returns: undefined }
      bulk_transfer_complaints: {
        Args: {
          p_caller: string
          p_complaint_ids: string[]
          p_to_department_id: string
        }
        Returns: number
      }
      create_department: {
        Args: {
          p_caller: string
          p_municipality_id: string
          p_name_ar: string
          p_slug: string
        }
        Returns: string
      }
      delete_department_atomic: {
        Args: { p_caller: string; p_department_id: string }
        Returns: undefined
      }
      get_user_department: { Args: { p_uid: string }; Returns: string }
      is_global_admin: { Args: { p_uid: string }; Returns: boolean }
      is_municipality_admin: {
        Args: { p_muni: string; p_uid: string }
        Returns: boolean
      }
      promote_global_admin: {
        Args: { p_caller: string; target_user: string }
        Returns: undefined
      }
      rename_department: {
        Args: { p_caller: string; p_department_id: string; p_name_ar: string }
        Returns: undefined
      }
      rl_check_and_consume:
        | {
            Args: {
              p_action: string
              p_max: number
              p_subject: string
              p_user?: string
              p_window_seconds: number
            }
            Returns: Json
          }
        | {
            Args: {
              p_action: string
              p_amount?: number
              p_max: number
              p_subject: string
              p_user?: string
              p_window_seconds: number
            }
            Returns: Json
          }
      rl_cleanup_old: { Args: never; Returns: undefined }
      set_department_active: {
        Args: {
          p_caller: string
          p_department_id: string
          p_is_active: boolean
        }
        Returns: undefined
      }
      transfer_global_admin: {
        Args: { p_caller: string; target_user: string }
        Returns: undefined
      }
    }
    Enums: {
      app_role: "citizen" | "admin" | "super_admin" | "global_admin"
      complaint_category:
        | "infrastructure"
        | "public_lighting"
        | "cleanliness"
        | "other"
        | "roads"
        | "water_sewage"
        | "parks_green"
        | "markets"
        | "traffic_transport"
        | "environment"
        | "public_health"
        | "public_buildings"
      complaint_status: "pending" | "in_progress" | "resolved"
      municipality_status: "pending" | "verified" | "rejected"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      app_role: ["citizen", "admin", "super_admin", "global_admin"],
      complaint_category: [
        "infrastructure",
        "public_lighting",
        "cleanliness",
        "other",
        "roads",
        "water_sewage",
        "parks_green",
        "markets",
        "traffic_transport",
        "environment",
        "public_health",
        "public_buildings",
      ],
      complaint_status: ["pending", "in_progress", "resolved"],
      municipality_status: ["pending", "verified", "rejected"],
    },
  },
} as const
