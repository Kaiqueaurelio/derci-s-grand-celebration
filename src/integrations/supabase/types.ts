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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      admin_users: {
        Row: {
          created_at: string
          email: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          email: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          email?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      check_in_logs: {
        Row: {
          action: string
          created_at: string
          guest_id: string
          id: string
          performed_by: string | null
          performed_by_email: string | null
        }
        Insert: {
          action: string
          created_at?: string
          guest_id: string
          id?: string
          performed_by?: string | null
          performed_by_email?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          guest_id?: string
          id?: string
          performed_by?: string | null
          performed_by_email?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "check_in_logs_guest_id_fkey"
            columns: ["guest_id"]
            isOneToOne: false
            referencedRelation: "guests"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          event_date: string
          event_time: string
          gallery_access: Database["public"]["Enums"]["gallery_access"]
          gallery_code_hash: string | null
          gallery_enabled: boolean
          honoree: string
          id: string
          location: string
          maps_url: string | null
          max_companions: number
          max_image_mb: number
          max_video_mb: number
          moderation_required: boolean
          phone_required: boolean
          rsvp_open: boolean
          slug: string
          updated_at: string
          uploads_enabled: boolean
          uploads_per_hour: number
          weekday_label: string | null
        }
        Insert: {
          event_date: string
          event_time: string
          gallery_access?: Database["public"]["Enums"]["gallery_access"]
          gallery_code_hash?: string | null
          gallery_enabled?: boolean
          honoree?: string
          id?: string
          location: string
          maps_url?: string | null
          max_companions?: number
          max_image_mb?: number
          max_video_mb?: number
          moderation_required?: boolean
          phone_required?: boolean
          rsvp_open?: boolean
          slug?: string
          updated_at?: string
          uploads_enabled?: boolean
          uploads_per_hour?: number
          weekday_label?: string | null
        }
        Update: {
          event_date?: string
          event_time?: string
          gallery_access?: Database["public"]["Enums"]["gallery_access"]
          gallery_code_hash?: string | null
          gallery_enabled?: boolean
          honoree?: string
          id?: string
          location?: string
          maps_url?: string | null
          max_companions?: number
          max_image_mb?: number
          max_video_mb?: number
          moderation_required?: boolean
          phone_required?: boolean
          rsvp_open?: boolean
          slug?: string
          updated_at?: string
          uploads_enabled?: boolean
          uploads_per_hour?: number
          weekday_label?: string | null
        }
        Relationships: []
      }
      guest_groups: {
        Row: {
          attending: boolean | null
          created_at: string
          edit_token_hash: string | null
          event_id: string
          id: string
          normalized_name: string
          notes: string | null
          phone: string | null
          responsible_name: string
          source: string
          submission_id: string | null
          updated_at: string
        }
        Insert: {
          attending?: boolean | null
          created_at?: string
          edit_token_hash?: string | null
          event_id: string
          id?: string
          normalized_name: string
          notes?: string | null
          phone?: string | null
          responsible_name: string
          source?: string
          submission_id?: string | null
          updated_at?: string
        }
        Update: {
          attending?: boolean | null
          created_at?: string
          edit_token_hash?: string | null
          event_id?: string
          id?: string
          normalized_name?: string
          notes?: string | null
          phone?: string | null
          responsible_name?: string
          source?: string
          submission_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "guest_groups_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      guests: {
        Row: {
          checked_in_at: string | null
          checked_in_by: string | null
          created_at: string
          full_name: string
          group_id: string
          id: string
          is_responsible: boolean
          normalized_name: string
          position: number
        }
        Insert: {
          checked_in_at?: string | null
          checked_in_by?: string | null
          created_at?: string
          full_name: string
          group_id: string
          id?: string
          is_responsible?: boolean
          normalized_name: string
          position?: number
        }
        Update: {
          checked_in_at?: string | null
          checked_in_by?: string | null
          created_at?: string
          full_name?: string
          group_id?: string
          id?: string
          is_responsible?: boolean
          normalized_name?: string
          position?: number
        }
        Relationships: [
          {
            foreignKeyName: "guests_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "guest_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      integration_settings: {
        Row: {
          key: string
          updated_at: string
          value: Json
        }
        Insert: {
          key: string
          updated_at?: string
          value?: Json
        }
        Update: {
          key?: string
          updated_at?: string
          value?: Json
        }
        Relationships: []
      }
      media_files: {
        Row: {
          captured_at: string | null
          client_upload_id: string | null
          created_at: string
          drive_attempts: number
          drive_error: string | null
          drive_file_id: string | null
          drive_status: string
          event_id: string
          id: string
          kind: string
          mime_type: string
          original_name: string
          size_bytes: number
          source: string
          status: Database["public"]["Enums"]["media_status"]
          storage_path: string | null
          updated_at: string
          uploader_fingerprint: string | null
          uploader_name: string | null
        }
        Insert: {
          captured_at?: string | null
          client_upload_id?: string | null
          created_at?: string
          drive_attempts?: number
          drive_error?: string | null
          drive_file_id?: string | null
          drive_status?: string
          event_id: string
          id?: string
          kind: string
          mime_type: string
          original_name: string
          size_bytes: number
          source?: string
          status?: Database["public"]["Enums"]["media_status"]
          storage_path?: string | null
          updated_at?: string
          uploader_fingerprint?: string | null
          uploader_name?: string | null
        }
        Update: {
          captured_at?: string | null
          client_upload_id?: string | null
          created_at?: string
          drive_attempts?: number
          drive_error?: string | null
          drive_file_id?: string | null
          drive_status?: string
          event_id?: string
          id?: string
          kind?: string
          mime_type?: string
          original_name?: string
          size_bytes?: number
          source?: string
          status?: Database["public"]["Enums"]["media_status"]
          storage_path?: string | null
          updated_at?: string
          uploader_fingerprint?: string | null
          uploader_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "media_files_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "door"
      gallery_access: "link" | "code" | "auth"
      media_status:
        | "pending_upload"
        | "pending_approval"
        | "approved"
        | "rejected"
        | "failed"
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
      app_role: ["admin", "door"],
      gallery_access: ["link", "code", "auth"],
      media_status: [
        "pending_upload",
        "pending_approval",
        "approved",
        "rejected",
        "failed",
      ],
    },
  },
} as const
