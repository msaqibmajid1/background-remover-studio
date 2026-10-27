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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      aitext_batch_instructions: {
        Row: {
          batch_id: string
          created_at: string
          id: string
          instructions: string
          version: number
        }
        Insert: {
          batch_id: string
          created_at?: string
          id?: string
          instructions: string
          version?: number
        }
        Update: {
          batch_id?: string
          created_at?: string
          id?: string
          instructions?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "aitext_batch_instructions_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "aitext_batches"
            referencedColumns: ["id"]
          },
        ]
      }
      aitext_batch_logs: {
        Row: {
          batch_id: string
          created_at: string
          event: string
          id: string
          message: string | null
        }
        Insert: {
          batch_id: string
          created_at?: string
          event: string
          id?: string
          message?: string | null
        }
        Update: {
          batch_id?: string
          created_at?: string
          event?: string
          id?: string
          message?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "aitext_batch_logs_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "aitext_batches"
            referencedColumns: ["id"]
          },
        ]
      }
      aitext_batches: {
        Row: {
          banned_words: string[]
          cancelled_at: string | null
          completed_at: string | null
          content_rules: string | null
          created_at: string
          desc_max_words: number
          desc_min_words: number
          done_rows: number
          failed_rows: number
          id: string
          image_max_words: number
          image_min_words: number
          instruction_version: number
          instructions: string | null
          model: string
          openai_batch_id: string | null
          parent_batch_id: string | null
          paused_at: string | null
          resumed_at: string | null
          started_at: string | null
          status: string
          tone: string | null
          total_rows: number
          user_id: string
        }
        Insert: {
          banned_words?: string[]
          cancelled_at?: string | null
          completed_at?: string | null
          content_rules?: string | null
          created_at?: string
          desc_max_words?: number
          desc_min_words?: number
          done_rows?: number
          failed_rows?: number
          id?: string
          image_max_words?: number
          image_min_words?: number
          instruction_version?: number
          instructions?: string | null
          model?: string
          openai_batch_id?: string | null
          parent_batch_id?: string | null
          paused_at?: string | null
          resumed_at?: string | null
          started_at?: string | null
          status?: string
          tone?: string | null
          total_rows?: number
          user_id?: string
        }
        Update: {
          banned_words?: string[]
          cancelled_at?: string | null
          completed_at?: string | null
          content_rules?: string | null
          created_at?: string
          desc_max_words?: number
          desc_min_words?: number
          done_rows?: number
          failed_rows?: number
          id?: string
          image_max_words?: number
          image_min_words?: number
          instruction_version?: number
          instructions?: string | null
          model?: string
          openai_batch_id?: string | null
          parent_batch_id?: string | null
          paused_at?: string | null
          resumed_at?: string | null
          started_at?: string | null
          status?: string
          tone?: string | null
          total_rows?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "aitext_batches_parent_batch_id_fkey"
            columns: ["parent_batch_id"]
            isOneToOne: false
            referencedRelation: "aitext_batches"
            referencedColumns: ["id"]
          },
        ]
      }
      aitext_inputs: {
        Row: {
          batch_id: string | null
          batch_ref_id: string | null
          created_at: string
          error_message: string | null
          id: string
          raw_text: string
          serial_no: number | null
          status: string
          user_id: string
        }
        Insert: {
          batch_id?: string | null
          batch_ref_id?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          raw_text: string
          serial_no?: number | null
          status?: string
          user_id?: string
        }
        Update: {
          batch_id?: string | null
          batch_ref_id?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          raw_text?: string
          serial_no?: number | null
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      aitext_outputs: {
        Row: {
          completion_tokens: number | null
          content_type: string | null
          created_at: string
          desc_completion_tokens: number | null
          desc_model: string | null
          desc_prompt_tokens: number | null
          detail_description: string | null
          id: string
          image_completion_tokens: number | null
          image_model: string | null
          image_prompt_tokens: number | null
          image_text: string | null
          input_id: string
          instructions: string | null
          is_current: boolean
          model: string | null
          original_data: Json | null
          prompt_tokens: number | null
          title: string | null
          user_id: string
          version: number
        }
        Insert: {
          completion_tokens?: number | null
          content_type?: string | null
          created_at?: string
          desc_completion_tokens?: number | null
          desc_model?: string | null
          desc_prompt_tokens?: number | null
          detail_description?: string | null
          id?: string
          image_completion_tokens?: number | null
          image_model?: string | null
          image_prompt_tokens?: number | null
          image_text?: string | null
          input_id: string
          instructions?: string | null
          is_current?: boolean
          model?: string | null
          original_data?: Json | null
          prompt_tokens?: number | null
          title?: string | null
          user_id?: string
          version?: number
        }
        Update: {
          completion_tokens?: number | null
          content_type?: string | null
          created_at?: string
          desc_completion_tokens?: number | null
          desc_model?: string | null
          desc_prompt_tokens?: number | null
          detail_description?: string | null
          id?: string
          image_completion_tokens?: number | null
          image_model?: string | null
          image_prompt_tokens?: number | null
          image_text?: string | null
          input_id?: string
          instructions?: string | null
          is_current?: boolean
          model?: string | null
          original_data?: Json | null
          prompt_tokens?: number | null
          title?: string | null
          user_id?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "aitext_outputs_input_id_fkey"
            columns: ["input_id"]
            isOneToOne: false
            referencedRelation: "aitext_inputs"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string | null
          id: string
          preferences: Json | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id: string
          preferences?: Json | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          preferences?: Json | null
          updated_at?: string
        }
        Relationships: []
      }
      user_activity_logs: {
        Row: {
          action: string
          created_at: string
          details: Json | null
          id: string
          user_id: string
        }
        Insert: {
          action: string
          created_at?: string
          details?: Json | null
          id?: string
          user_id: string
        }
        Update: {
          action?: string
          created_at?: string
          details?: Json | null
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      user_devices: {
        Row: {
          device_id: string
          device_name: string | null
          id: string
          last_active_at: string
          registered_at: string
          user_id: string
        }
        Insert: {
          device_id: string
          device_name?: string | null
          id?: string
          last_active_at?: string
          registered_at?: string
          user_id: string
        }
        Update: {
          device_id?: string
          device_name?: string | null
          id?: string
          last_active_at?: string
          registered_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      user_tool_access: {
        Row: {
          expires_at: string | null
          granted_at: string
          granted_by: string | null
          id: string
          tool_slug: string
          user_id: string
        }
        Insert: {
          expires_at?: string | null
          granted_at?: string
          granted_by?: string | null
          id?: string
          tool_slug: string
          user_id: string
        }
        Update: {
          expires_at?: string | null
          granted_at?: string
          granted_by?: string | null
          id?: string
          tool_slug?: string
          user_id?: string
        }
        Relationships: []
      }
      utg_generation_runs: {
        Row: {
          ended_at: string | null
          id: string
          project_id: string | null
          started_at: string
          status: string
          totals: Json
          user_id: string
        }
        Insert: {
          ended_at?: string | null
          id?: string
          project_id?: string | null
          started_at?: string
          status?: string
          totals?: Json
          user_id: string
        }
        Update: {
          ended_at?: string | null
          id?: string
          project_id?: string | null
          started_at?: string
          status?: string
          totals?: Json
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "utg_generation_runs_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "utg_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      utg_inputs: {
        Row: {
          created_at: string
          id: string
          project_id: string | null
          raw_text: string
          serial_no: number | null
          status: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          project_id?: string | null
          raw_text: string
          serial_no?: number | null
          status?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          project_id?: string | null
          raw_text?: string
          serial_no?: number | null
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "utg_inputs_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "utg_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      utg_outputs: {
        Row: {
          cost: number
          created_at: string
          desc_model: string | null
          desc_tokens: Json | null
          description: string | null
          id: string
          image_model: string | null
          image_text: string | null
          image_tokens: Json | null
          input_id: string
          is_current: boolean
          provider: string | null
          regenerated_from: string | null
          user_id: string
          version: number
        }
        Insert: {
          cost?: number
          created_at?: string
          desc_model?: string | null
          desc_tokens?: Json | null
          description?: string | null
          id?: string
          image_model?: string | null
          image_text?: string | null
          image_tokens?: Json | null
          input_id: string
          is_current?: boolean
          provider?: string | null
          regenerated_from?: string | null
          user_id: string
          version?: number
        }
        Update: {
          cost?: number
          created_at?: string
          desc_model?: string | null
          desc_tokens?: Json | null
          description?: string | null
          id?: string
          image_model?: string | null
          image_text?: string | null
          image_tokens?: Json | null
          input_id?: string
          is_current?: boolean
          provider?: string | null
          regenerated_from?: string | null
          user_id?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "utg_outputs_input_id_fkey"
            columns: ["input_id"]
            isOneToOne: false
            referencedRelation: "utg_inputs"
            referencedColumns: ["id"]
          },
        ]
      }
      utg_presets: {
        Row: {
          created_at: string
          data: Json
          id: string
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          data?: Json
          id?: string
          name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          data?: Json
          id?: string
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      utg_projects: {
        Row: {
          created_at: string
          data: Json
          id: string
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          data?: Json
          id?: string
          name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          data?: Json
          id?: string
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      check_device: {
        Args: { _device_id: string; _user_id: string }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      has_tool_access: {
        Args: { _tool_slug: string; _user_id: string }
        Returns: boolean
      }
      register_device: {
        Args: { _device_id: string; _device_name: string; _user_id: string }
        Returns: undefined
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
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
      app_role: ["admin", "moderator", "user"],
    },
  },
} as const
