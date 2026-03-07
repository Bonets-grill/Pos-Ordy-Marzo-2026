export interface Database {
  public: {
    Tables: {
      tenants: {
        Row: {
          id: string;
          name: string;
          slug: string;
          plan: string;
          settings: Record<string, unknown>;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          slug: string;
          plan?: string;
          settings?: Record<string, unknown>;
        };
        Update: Partial<Database["public"]["Tables"]["tenants"]["Insert"]>;
      };
      profiles: {
        Row: {
          id: string;
          user_id: string;
          tenant_id: string;
          role: string;
          display_name: string;
          avatar_url: string | null;
          language: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          tenant_id: string;
          role?: string;
          display_name: string;
          avatar_url?: string | null;
          language?: string;
        };
        Update: Partial<Database["public"]["Tables"]["profiles"]["Insert"]>;
      };
      projects: {
        Row: {
          id: string;
          tenant_id: string;
          name: string;
          description: string;
          system_type: string;
          status: string;
          version: string;
          settings: Record<string, unknown>;
          created_by: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          name: string;
          description?: string;
          system_type: string;
          status?: string;
          version?: string;
          settings?: Record<string, unknown>;
          created_by: string;
        };
        Update: Partial<Database["public"]["Tables"]["projects"]["Insert"]>;
      };
      project_snapshots: {
        Row: {
          id: string;
          project_id: string;
          label: string;
          data: Record<string, unknown>;
          created_by: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          project_id: string;
          label: string;
          data: Record<string, unknown>;
          created_by: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["project_snapshots"]["Insert"]
        >;
      };
      support_sessions: {
        Row: {
          id: string;
          project_id: string;
          admin_id: string;
          status: string;
          context: Record<string, unknown>;
          changes_applied: Record<string, unknown>[];
          created_at: string;
          closed_at: string | null;
        };
        Insert: {
          id?: string;
          project_id: string;
          admin_id: string;
          status?: string;
          context?: Record<string, unknown>;
        };
        Update: Partial<
          Database["public"]["Tables"]["support_sessions"]["Insert"]
        >;
      };
      audit_logs: {
        Row: {
          id: string;
          tenant_id: string | null;
          actor_id: string;
          action: string;
          resource_type: string;
          resource_id: string;
          metadata: Record<string, unknown>;
          ip_address: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          tenant_id?: string | null;
          actor_id: string;
          action: string;
          resource_type: string;
          resource_id: string;
          metadata?: Record<string, unknown>;
          ip_address?: string | null;
        };
        Update: never;
      };
    };
  };
}

export type Tables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Row"];
export type InsertTables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Insert"];
