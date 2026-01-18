export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      roles: {
        Row: {
          id: string;
          name: string;
          description: string | null;
          permissions: string[];
          is_system: boolean;
          is_super_admin: boolean;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          description?: string | null;
          permissions?: string[];
          is_system?: boolean;
          is_super_admin?: boolean;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          description?: string | null;
          permissions?: string[];
          is_system?: boolean;
          is_super_admin?: boolean;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      users: {
        Row: {
          id: string;
          username: string;
          password_hash: string;
          role_id: string;
          display_name: string | null;
          avatar: string | null;
          last_login_at: string | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          username: string;
          password_hash: string;
          role_id: string;
          display_name?: string | null;
          avatar?: string | null;
          last_login_at?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          username?: string;
          password_hash?: string;
          role_id?: string;
          display_name?: string | null;
          avatar?: string | null;
          last_login_at?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "users_role_id_fkey";
            columns: ["role_id"];
            isOneToOne: false;
            referencedRelation: "roles";
            referencedColumns: ["id"];
          }
        ];
      };
      sessions: {
        Row: {
          id: string;
          user_id: string;
          token: string;
          expires_at: string;
          user_agent: string | null;
          ip_address: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          token: string;
          expires_at: string;
          user_agent?: string | null;
          ip_address?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          token?: string;
          expires_at?: string;
          user_agent?: string | null;
          ip_address?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "sessions_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          }
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
}

// Helper types
export type Role = Database["public"]["Tables"]["roles"]["Row"];
export type User = Database["public"]["Tables"]["users"]["Row"];
export type Session = Database["public"]["Tables"]["sessions"]["Row"];

// Safe user type without password hash
export type SafeUser = Omit<User, "password_hash">;

// User with role information
export interface UserWithRole extends SafeUser {
  role: Role;
  permissions: string[];
  isSuperAdmin: boolean;
}
