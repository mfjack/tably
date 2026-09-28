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
      categories: {
        Row: {
          created_at: string
          id: string
          name: string
          organization_id: string
          position: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          organization_id: string
          position?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          organization_id?: string
          position?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "categories_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      ingredients: {
        Row: {
          created_at: string
          current_stock: number
          id: string
          minimum_stock: number
          name: string
          organization_id: string
          unit: Database["public"]["Enums"]["measure_unit"]
          unit_cost: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          current_stock?: number
          id?: string
          minimum_stock?: number
          name: string
          organization_id: string
          unit: Database["public"]["Enums"]["measure_unit"]
          unit_cost?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          current_stock?: number
          id?: string
          minimum_stock?: number
          name?: string
          organization_id?: string
          unit?: Database["public"]["Enums"]["measure_unit"]
          unit_cost?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ingredients_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      memberships: {
        Row: {
          created_at: string
          organization_id: string
          role: Database["public"]["Enums"]["member_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          organization_id: string
          role: Database["public"]["Enums"]["member_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          organization_id?: string
          role?: Database["public"]["Enums"]["member_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "memberships_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          created_at: string
          created_by: string | null
          hidden_modules: Database["public"]["Enums"]["app_module"][]
          id: string
          name: string
          slug: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          hidden_modules?: Database["public"]["Enums"]["app_module"][]
          id?: string
          name: string
          slug: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          hidden_modules?: Database["public"]["Enums"]["app_module"][]
          id?: string
          name?: string
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      product_ingredients: {
        Row: {
          ingredient_id: string
          organization_id: string
          product_id: string
          quantity: number
        }
        Insert: {
          ingredient_id: string
          organization_id: string
          product_id: string
          quantity: number
        }
        Update: {
          ingredient_id?: string
          organization_id?: string
          product_id?: string
          quantity?: number
        }
        Relationships: [
          {
            foreignKeyName: "product_ingredients_ingredient_id_organization_id_fkey"
            columns: ["ingredient_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "ingredients"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "product_ingredients_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_ingredients_product_id_organization_id_fkey"
            columns: ["product_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "product_costs"
            referencedColumns: ["product_id", "organization_id"]
          },
          {
            foreignKeyName: "product_ingredients_product_id_organization_id_fkey"
            columns: ["product_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id", "organization_id"]
          },
        ]
      }
      products: {
        Row: {
          category_id: string | null
          created_at: string
          id: string
          image_url: string | null
          is_active: boolean
          name: string
          organization_id: string
          price: number
          updated_at: string
        }
        Insert: {
          category_id?: string | null
          created_at?: string
          id?: string
          image_url?: string | null
          is_active?: boolean
          name: string
          organization_id: string
          price: number
          updated_at?: string
        }
        Update: {
          category_id?: string | null
          created_at?: string
          id?: string
          image_url?: string | null
          is_active?: boolean
          name?: string
          organization_id?: string
          price?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "products_category_id_organization_id_fkey"
            columns: ["category_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "products_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          full_name: string | null
          id: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      stock_entries: {
        Row: {
          created_at: string
          created_by: string | null
          entered_at: string
          id: string
          ingredient_id: string
          organization_id: string
          quantity: number
          supplier_id: string | null
          total_cost: number
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          entered_at?: string
          id?: string
          ingredient_id: string
          organization_id: string
          quantity: number
          supplier_id?: string | null
          total_cost: number
        }
        Update: {
          created_at?: string
          created_by?: string | null
          entered_at?: string
          id?: string
          ingredient_id?: string
          organization_id?: string
          quantity?: number
          supplier_id?: string | null
          total_cost?: number
        }
        Relationships: [
          {
            foreignKeyName: "stock_entries_ingredient_id_organization_id_fkey"
            columns: ["ingredient_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "ingredients"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "stock_entries_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_entries_supplier_id_organization_id_fkey"
            columns: ["supplier_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id", "organization_id"]
          },
        ]
      }
      suppliers: {
        Row: {
          created_at: string
          document: string | null
          email: string | null
          id: string
          name: string
          notes: string | null
          organization_id: string
          phone: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          document?: string | null
          email?: string | null
          id?: string
          name: string
          notes?: string | null
          organization_id: string
          phone?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          document?: string | null
          email?: string | null
          id?: string
          name?: string
          notes?: string | null
          organization_id?: string
          phone?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "suppliers_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      product_costs: {
        Row: {
          organization_id: string | null
          product_id: string | null
          unit_cost: number | null
        }
        Relationships: [
          {
            foreignKeyName: "products_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      create_organization: {
        Args: { p_name: string; p_slug: string }
        Returns: {
          created_at: string
          created_by: string | null
          hidden_modules: Database["public"]["Enums"]["app_module"][]
          id: string
          name: string
          slug: string
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "organizations"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      has_role: {
        Args: {
          org_id: string
          roles: Database["public"]["Enums"]["member_role"][]
        }
        Returns: boolean
      }
      is_member: { Args: { org_id: string }; Returns: boolean }
    }
    Enums: {
      app_module:
        | "pos"
        | "order_tabs"
        | "kitchen"
        | "customer_accounts"
        | "tasks"
        | "categories"
        | "products"
        | "ingredients"
        | "suppliers"
        | "sales_report"
      measure_unit: "unit" | "g" | "kg" | "ml" | "l"
      member_role: "owner" | "manager" | "cashier" | "kitchen" | "waiter"
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      app_module: [
        "pos",
        "order_tabs",
        "kitchen",
        "customer_accounts",
        "tasks",
        "categories",
        "products",
        "ingredients",
        "suppliers",
        "sales_report",
      ],
      measure_unit: ["unit", "g", "kg", "ml", "l"],
      member_role: ["owner", "manager", "cashier", "kitchen", "waiter"],
    },
  },
} as const
