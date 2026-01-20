export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      chat_kb_permissions: {
        Row: {
          can_ask: boolean | null
          can_read: boolean | null
          created_at: string | null
          id: string
          kb_id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          can_ask?: boolean | null
          can_read?: boolean | null
          created_at?: string | null
          id?: string
          kb_id: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          can_ask?: boolean | null
          can_read?: boolean | null
          created_at?: string | null
          id?: string
          kb_id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_kb_permissions_kb_id_fkey"
            columns: ["kb_id"]
            isOneToOne: false
            referencedRelation: "knowledge_bases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_kb_permissions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_messages: {
        Row: {
          content: string
          created_at: string | null
          id: string
          metadata: Json | null
          role: string
          session_id: string
        }
        Insert: {
          content: string
          created_at?: string | null
          id?: string
          metadata?: Json | null
          role: string
          session_id: string
        }
        Update: {
          content?: string
          created_at?: string | null
          id?: string
          metadata?: Json | null
          role?: string
          session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "chat_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_sessions: {
        Row: {
          created_at: string | null
          id: string
          is_archived: boolean | null
          kb_id: string
          last_message_at: string | null
          title: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_archived?: boolean | null
          kb_id: string
          last_message_at?: string | null
          title?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          is_archived?: boolean | null
          kb_id?: string
          last_message_at?: string | null
          title?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_sessions_kb_id_fkey"
            columns: ["kb_id"]
            isOneToOne: false
            referencedRelation: "knowledge_bases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_sessions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      crawl_jobs: {
        Row: {
          completed_at: string | null
          created_at: string
          error: string | null
          failed_pages: number | null
          id: string
          kb_id: string
          max_depth: number
          max_pages: number
          mode: string
          pages_crawled: number
          progress: number
          settings: Json | null
          source_label: string | null
          status: string
          total_pages: number | null
          url: string
          user_id: string | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          error?: string | null
          failed_pages?: number | null
          id?: string
          kb_id: string
          max_depth?: number
          max_pages?: number
          mode?: string
          pages_crawled?: number
          progress?: number
          settings?: Json | null
          source_label?: string | null
          status?: string
          total_pages?: number | null
          url: string
          user_id?: string | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          error?: string | null
          failed_pages?: number | null
          id?: string
          kb_id?: string
          max_depth?: number
          max_pages?: number
          mode?: string
          pages_crawled?: number
          progress?: number
          settings?: Json | null
          source_label?: string | null
          status?: string
          total_pages?: number | null
          url?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "crawl_jobs_kb_id_fkey"
            columns: ["kb_id"]
            isOneToOne: false
            referencedRelation: "knowledge_bases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crawl_jobs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      crawl_pages: {
        Row: {
          content_hash: string | null
          crawled_at: string | null
          created_at: string
          depth: number | null
          document_id: string | null
          error_message: string | null
          id: string
          job_id: string
          status: string
          title: string | null
          url: string
        }
        Insert: {
          content_hash?: string | null
          crawled_at?: string | null
          created_at?: string
          depth?: number | null
          document_id?: string | null
          error_message?: string | null
          id?: string
          job_id: string
          status?: string
          title?: string | null
          url: string
        }
        Update: {
          content_hash?: string | null
          crawled_at?: string | null
          created_at?: string
          depth?: number | null
          document_id?: string | null
          error_message?: string | null
          id?: string
          job_id?: string
          status?: string
          title?: string | null
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "crawl_pages_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crawl_pages_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "crawl_jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      crawl_site_configs: {
        Row: {
          analysis_prompt: string | null
          confidence: number | null
          created_at: string
          created_by: string | null
          css_selector: string | null
          domain: string
          excluded_selector: string | null
          excluded_tags: string[] | null
          failure_count: number | null
          framework_detected: string | null
          id: string
          last_failure_at: string | null
          last_success_at: string | null
          path_pattern: string
          sample_url: string | null
          success_count: number | null
          title_selector: string | null
          updated_at: string
        }
        Insert: {
          analysis_prompt?: string | null
          confidence?: number | null
          created_at?: string
          created_by?: string | null
          css_selector?: string | null
          domain: string
          excluded_selector?: string | null
          excluded_tags?: string[] | null
          failure_count?: number | null
          framework_detected?: string | null
          id?: string
          last_failure_at?: string | null
          last_success_at?: string | null
          path_pattern?: string
          sample_url?: string | null
          success_count?: number | null
          title_selector?: string | null
          updated_at?: string
        }
        Update: {
          analysis_prompt?: string | null
          confidence?: number | null
          created_at?: string
          created_by?: string | null
          css_selector?: string | null
          domain?: string
          excluded_selector?: string | null
          excluded_tags?: string[] | null
          failure_count?: number | null
          framework_detected?: string | null
          id?: string
          last_failure_at?: string | null
          last_success_at?: string | null
          path_pattern?: string
          sample_url?: string | null
          success_count?: number | null
          title_selector?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "crawl_site_configs_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      document_chunks: {
        Row: {
          chunk_index: number
          content_hash: string
          context_hash: string | null
          context_summary: string | null
          contextualized_content: string
          created_at: string
          document_id: string
          embedding: string | null
          id: string
          original_content: string
          search_vector: unknown
          token_count: number
        }
        Insert: {
          chunk_index: number
          content_hash: string
          context_hash?: string | null
          context_summary?: string | null
          contextualized_content: string
          created_at?: string
          document_id: string
          embedding?: string | null
          id?: string
          original_content: string
          search_vector?: unknown
          token_count?: number
        }
        Update: {
          chunk_index?: number
          content_hash?: string
          context_hash?: string | null
          context_summary?: string | null
          contextualized_content?: string
          created_at?: string
          document_id?: string
          embedding?: string | null
          id?: string
          original_content?: string
          search_vector?: unknown
          token_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "document_chunks_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
        ]
      }
      documents: {
        Row: {
          char_count: number
          content: string | null
          content_hash: string | null
          crawl_depth: number | null
          crawled_at: string | null
          created_at: string
          embedding_status: string | null
          file_type: string
          id: string
          kb_id: string
          metadata: Json | null
          parent_url: string | null
          source_label: string | null
          source_type: string | null
          source_url: string | null
          status: string
          title: string
          updated_at: string
          user_id: string
          word_count: number
        }
        Insert: {
          char_count?: number
          content?: string | null
          content_hash?: string | null
          crawl_depth?: number | null
          crawled_at?: string | null
          created_at?: string
          embedding_status?: string | null
          file_type?: string
          id?: string
          kb_id: string
          metadata?: Json | null
          parent_url?: string | null
          source_label?: string | null
          source_type?: string | null
          source_url?: string | null
          status?: string
          title: string
          updated_at?: string
          user_id: string
          word_count?: number
        }
        Update: {
          char_count?: number
          content?: string | null
          content_hash?: string | null
          crawl_depth?: number | null
          crawled_at?: string | null
          created_at?: string
          embedding_status?: string | null
          file_type?: string
          id?: string
          kb_id?: string
          metadata?: Json | null
          parent_url?: string | null
          source_label?: string | null
          source_type?: string | null
          source_url?: string | null
          status?: string
          title?: string
          updated_at?: string
          user_id?: string
          word_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "documents_kb_id_fkey"
            columns: ["kb_id"]
            isOneToOne: false
            referencedRelation: "knowledge_bases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      knowledge_bases: {
        Row: {
          created_at: string
          description: string | null
          document_count: number
          id: string
          name: string
          settings: Json | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          document_count?: number
          id?: string
          name: string
          settings?: Json | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          document_count?: number
          id?: string
          name?: string
          settings?: Json | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "knowledge_bases_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      roles: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          is_super_admin: boolean
          is_system: boolean
          name: string
          permissions: string[]
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_super_admin?: boolean
          is_system?: boolean
          name: string
          permissions?: string[]
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_super_admin?: boolean
          is_system?: boolean
          name?: string
          permissions?: string[]
          updated_at?: string
        }
        Relationships: []
      }
      sessions: {
        Row: {
          created_at: string
          expires_at: string
          id: string
          ip_address: string | null
          token: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          expires_at: string
          id?: string
          ip_address?: string | null
          token: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          expires_at?: string
          id?: string
          ip_address?: string | null
          token?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sessions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      system_settings: {
        Row: {
          created_at: string
          description: string | null
          id: string
          key: string
          updated_at: string
          updated_by: string | null
          value: Json
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          key: string
          updated_at?: string
          updated_by?: string | null
          value?: Json
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          key?: string
          updated_at?: string
          updated_by?: string | null
          value?: Json
        }
        Relationships: [
          {
            foreignKeyName: "system_settings_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          avatar: string | null
          created_at: string
          display_name: string | null
          id: string
          is_active: boolean
          last_login_at: string | null
          password_hash: string
          role_id: string
          updated_at: string
          username: string
        }
        Insert: {
          avatar?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          is_active?: boolean
          last_login_at?: string | null
          password_hash: string
          role_id: string
          updated_at?: string
          username: string
        }
        Update: {
          avatar?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          is_active?: boolean
          last_login_at?: string | null
          password_hash?: string
          role_id?: string
          updated_at?: string
          username?: string
        }
        Relationships: [
          {
            foreignKeyName: "users_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      bm25_search_chunks: {
        Args: { match_count?: number; query_text: string; target_kb_id: string }
        Returns: {
          bm25_score: number
          chunk_content: string
          chunk_context: string
          chunk_id: string
          chunk_index: number
          document_id: string
          document_title: string
        }[]
      }
      decrement_document_count: {
        Args: { decrement_by?: number; kb_id_param: string }
        Returns: undefined
      }
      get_kb_embedding_stats: {
        Args: { target_kb_id: string }
        Returns: {
          embedded_documents: number
          failed_documents: number
          outdated_documents: number
          pending_documents: number
          total_chunks: number
          total_documents: number
        }[]
      }
      get_search_stats: {
        Args: { target_kb_id: string }
        Returns: {
          avg_chunk_tokens: number
          chunks_with_embedding: number
          chunks_with_search_vector: number
          index_coverage_percent: number
          total_chunks: number
          total_documents: number
        }[]
      }
      hybrid_search_chunks: {
        Args: {
          match_count?: number
          match_threshold?: number
          query_embedding: string
          query_text: string
          rrf_k?: number
          target_kb_id: string
          vector_weight?: number
        }
        Returns: {
          bm25_rank: number
          chunk_content: string
          chunk_context: string
          chunk_id: string
          chunk_index: number
          combined_score: number
          document_id: string
          document_source_url: string
          document_title: string
          search_type: string
          similarity: number
          vector_rank: number
        }[]
      }
      hybrid_search_chunks_multi_kb: {
        Args: {
          match_count?: number
          match_threshold?: number
          query_embedding: string
          query_text: string
          rrf_k?: number
          target_kb_ids: string[]
          vector_weight?: number
        }
        Returns: {
          bm25_rank: number
          chunk_content: string
          chunk_context: string
          chunk_id: string
          chunk_index: number
          combined_score: number
          document_id: string
          document_source_url: string
          document_title: string
          kb_id: string
          search_type: string
          similarity: number
          vector_rank: number
        }[]
      }
      hybrid_search_document_chunks: {
        Args: {
          match_count?: number
          match_threshold?: number
          query_embedding: string
          query_text: string
          rrf_k?: number
          target_document_id: string
          vector_weight?: number
        }
        Returns: {
          bm25_rank: number
          chunk_content: string
          chunk_context: string
          chunk_id: string
          chunk_index: number
          combined_score: number
          document_id: string
          search_type: string
          similarity: number
          vector_rank: number
        }[]
      }
      hybrid_search_for_reranking: {
        Args: {
          candidate_count?: number
          match_threshold?: number
          query_embedding: string
          query_text: string
          rrf_k?: number
          target_kb_id: string
          vector_weight?: number
        }
        Returns: {
          bm25_rank: number
          chunk_content: string
          chunk_context: string
          chunk_id: string
          chunk_index: number
          combined_score: number
          document_id: string
          document_source_url: string
          document_title: string
          search_type: string
          similarity: number
          token_count: number
          vector_rank: number
        }[]
      }
      increment_document_count: {
        Args: { increment_by?: number; kb_id_param: string }
        Returns: undefined
      }
      increment_site_config_failure: {
        Args: { config_id: string }
        Returns: undefined
      }
      increment_site_config_success: {
        Args: { config_id: string }
        Returns: undefined
      }
      rebuild_search_vectors: {
        Args: { target_kb_id: string }
        Returns: {
          duration_ms: number
          updated_count: number
        }[]
      }
      search_similar_chunks: {
        Args: {
          match_count?: number
          match_threshold?: number
          query_embedding: string
          target_kb_id: string
        }
        Returns: {
          chunk_content: string
          chunk_context: string
          chunk_id: string
          chunk_index: number
          document_id: string
          document_source_url: string
          document_title: string
          similarity: number
        }[]
      }
      tokenize_mixed_content: { Args: { content: string }; Returns: unknown }
      tokenize_mixed_query: { Args: { query_text: string }; Returns: unknown }
    }
    Enums: {
      [_ in never]: never
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const

