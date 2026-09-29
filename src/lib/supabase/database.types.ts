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
      account_entries: {
        Row: {
          account_id: string
          amount: number
          created_at: string
          created_by: string | null
          id: string
          kind: Database["public"]["Enums"]["account_entry_kind"]
          note: string | null
          operator_name: string | null
          order_id: string | null
          organization_id: string
          payment_method: Database["public"]["Enums"]["payment_method"] | null
        }
        Insert: {
          account_id: string
          amount: number
          created_at?: string
          created_by?: string | null
          id?: string
          kind: Database["public"]["Enums"]["account_entry_kind"]
          note?: string | null
          operator_name?: string | null
          order_id?: string | null
          organization_id: string
          payment_method?: Database["public"]["Enums"]["payment_method"] | null
        }
        Update: {
          account_id?: string
          amount?: number
          created_at?: string
          created_by?: string | null
          id?: string
          kind?: Database["public"]["Enums"]["account_entry_kind"]
          note?: string | null
          operator_name?: string | null
          order_id?: string | null
          organization_id?: string
          payment_method?: Database["public"]["Enums"]["payment_method"] | null
        }
        Relationships: [
          {
            foreignKeyName: "account_entries_account_id_organization_id_fkey"
            columns: ["account_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "customer_account_balances"
            referencedColumns: ["account_id", "organization_id"]
          },
          {
            foreignKeyName: "account_entries_account_id_organization_id_fkey"
            columns: ["account_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "customer_accounts"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "account_entries_order_id_organization_id_fkey"
            columns: ["order_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "account_entries_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
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
      customer_accounts: {
        Row: {
          archived_at: string | null
          created_at: string
          credit_limit: number | null
          id: string
          is_active: boolean
          name: string
          note: string | null
          organization_id: string
          phone: string | null
          updated_at: string
        }
        Insert: {
          archived_at?: string | null
          created_at?: string
          credit_limit?: number | null
          id?: string
          is_active?: boolean
          name: string
          note?: string | null
          organization_id: string
          phone?: string | null
          updated_at?: string
        }
        Update: {
          archived_at?: string | null
          created_at?: string
          credit_limit?: number | null
          id?: string
          is_active?: boolean
          name?: string
          note?: string | null
          organization_id?: string
          phone?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_accounts_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      ingredients: {
        Row: {
          brand: string | null
          created_at: string
          current_stock: number
          expires_at: string | null
          id: string
          minimum_stock: number
          name: string
          organization_id: string
          supplier_id: string | null
          unit: Database["public"]["Enums"]["measure_unit"]
          unit_cost: number
          updated_at: string
        }
        Insert: {
          brand?: string | null
          created_at?: string
          current_stock?: number
          expires_at?: string | null
          id?: string
          minimum_stock?: number
          name: string
          organization_id: string
          supplier_id?: string | null
          unit: Database["public"]["Enums"]["measure_unit"]
          unit_cost?: number
          updated_at?: string
        }
        Update: {
          brand?: string | null
          created_at?: string
          current_stock?: number
          expires_at?: string | null
          id?: string
          minimum_stock?: number
          name?: string
          organization_id?: string
          supplier_id?: string | null
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
          {
            foreignKeyName: "ingredients_supplier_id_organization_id_fkey"
            columns: ["supplier_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "supplier_purchase_summaries"
            referencedColumns: ["supplier_id", "organization_id"]
          },
          {
            foreignKeyName: "ingredients_supplier_id_organization_id_fkey"
            columns: ["supplier_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id", "organization_id"]
          },
        ]
      }
      kitchen_ticket_items: {
        Row: {
          id: string
          organization_id: string
          product_name: string
          quantity: number
          ticket_id: string
        }
        Insert: {
          id?: string
          organization_id: string
          product_name: string
          quantity: number
          ticket_id: string
        }
        Update: {
          id?: string
          organization_id?: string
          product_name?: string
          quantity?: number
          ticket_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "kitchen_ticket_items_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kitchen_ticket_items_ticket_id_organization_id_fkey"
            columns: ["ticket_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "kitchen_tickets"
            referencedColumns: ["id", "organization_id"]
          },
        ]
      }
      kitchen_tickets: {
        Row: {
          created_at: string
          delivered_at: string | null
          id: string
          is_addition: boolean
          note: string | null
          order_id: string
          organization_id: string
          ready_at: string | null
          status: Database["public"]["Enums"]["kitchen_ticket_status"]
        }
        Insert: {
          created_at?: string
          delivered_at?: string | null
          id?: string
          is_addition?: boolean
          note?: string | null
          order_id: string
          organization_id: string
          ready_at?: string | null
          status?: Database["public"]["Enums"]["kitchen_ticket_status"]
        }
        Update: {
          created_at?: string
          delivered_at?: string | null
          id?: string
          is_addition?: boolean
          note?: string | null
          order_id?: string
          organization_id?: string
          ready_at?: string | null
          status?: Database["public"]["Enums"]["kitchen_ticket_status"]
        }
        Relationships: [
          {
            foreignKeyName: "kitchen_tickets_order_id_organization_id_fkey"
            columns: ["order_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "kitchen_tickets_organization_id_fkey"
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
      operators: {
        Row: {
          allowed_modules: Database["public"]["Enums"]["app_module"][]
          can_access_settings: boolean
          created_at: string
          id: string
          name: string
          organization_id: string
          pin_hash: string
          updated_at: string
        }
        Insert: {
          allowed_modules?: Database["public"]["Enums"]["app_module"][]
          can_access_settings?: boolean
          created_at?: string
          id?: string
          name: string
          organization_id: string
          pin_hash: string
          updated_at?: string
        }
        Update: {
          allowed_modules?: Database["public"]["Enums"]["app_module"][]
          can_access_settings?: boolean
          created_at?: string
          id?: string
          name?: string
          organization_id?: string
          pin_hash?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "operators_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      order_items: {
        Row: {
          id: string
          order_id: string
          organization_id: string
          product_id: string | null
          product_name: string
          quantity: number
          unit_cost: number
          unit_price: number
        }
        Insert: {
          id?: string
          order_id: string
          organization_id: string
          product_id?: string | null
          product_name: string
          quantity: number
          unit_cost?: number
          unit_price: number
        }
        Update: {
          id?: string
          order_id?: string
          organization_id?: string
          product_id?: string | null
          product_name?: string
          quantity?: number
          unit_cost?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_organization_id_fkey"
            columns: ["order_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "order_items_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_product_id_organization_id_fkey"
            columns: ["product_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "product_costs"
            referencedColumns: ["product_id", "organization_id"]
          },
          {
            foreignKeyName: "order_items_product_id_organization_id_fkey"
            columns: ["product_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id", "organization_id"]
          },
        ]
      }
      orders: {
        Row: {
          amount_received: number | null
          created_at: string
          created_by: string | null
          created_by_operator_name: string | null
          customer_account_id: string | null
          customer_name: string | null
          id: string
          is_takeaway: boolean
          note: string | null
          number: number
          organization_id: string
          paid_at: string | null
          paid_by: string | null
          paid_by_operator_name: string | null
          payment_method: Database["public"]["Enums"]["payment_method"] | null
          status: Database["public"]["Enums"]["order_status"]
          subtotal: number
          takeaway_fee: number
          total: number
          updated_at: string
        }
        Insert: {
          amount_received?: number | null
          created_at?: string
          created_by?: string | null
          created_by_operator_name?: string | null
          customer_account_id?: string | null
          customer_name?: string | null
          id?: string
          is_takeaway?: boolean
          note?: string | null
          number: number
          organization_id: string
          paid_at?: string | null
          paid_by?: string | null
          paid_by_operator_name?: string | null
          payment_method?: Database["public"]["Enums"]["payment_method"] | null
          status: Database["public"]["Enums"]["order_status"]
          subtotal: number
          takeaway_fee?: number
          total: number
          updated_at?: string
        }
        Update: {
          amount_received?: number | null
          created_at?: string
          created_by?: string | null
          created_by_operator_name?: string | null
          customer_account_id?: string | null
          customer_name?: string | null
          id?: string
          is_takeaway?: boolean
          note?: string | null
          number?: number
          organization_id?: string
          paid_at?: string | null
          paid_by?: string | null
          paid_by_operator_name?: string | null
          payment_method?: Database["public"]["Enums"]["payment_method"] | null
          status?: Database["public"]["Enums"]["order_status"]
          subtotal?: number
          takeaway_fee?: number
          total?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_created_by_profile_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_customer_account_fkey"
            columns: ["customer_account_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "customer_account_balances"
            referencedColumns: ["account_id", "organization_id"]
          },
          {
            foreignKeyName: "orders_customer_account_fkey"
            columns: ["customer_account_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "customer_accounts"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "orders_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_paid_by_profile_fkey"
            columns: ["paid_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          address: string | null
          created_at: string
          created_by: string | null
          hidden_modules: Database["public"]["Enums"]["app_module"][]
          id: string
          is_takeaway_enabled: boolean
          last_order_number: number
          name: string
          phone: string | null
          slug: string
          takeaway_fee: number
          tax_id: string | null
          timezone: string
          updated_at: string
        }
        Insert: {
          address?: string | null
          created_at?: string
          created_by?: string | null
          hidden_modules?: Database["public"]["Enums"]["app_module"][]
          id?: string
          is_takeaway_enabled?: boolean
          last_order_number?: number
          name: string
          phone?: string | null
          slug: string
          takeaway_fee?: number
          tax_id?: string | null
          timezone?: string
          updated_at?: string
        }
        Update: {
          address?: string | null
          created_at?: string
          created_by?: string | null
          hidden_modules?: Database["public"]["Enums"]["app_module"][]
          id?: string
          is_takeaway_enabled?: boolean
          last_order_number?: number
          name?: string
          phone?: string | null
          slug?: string
          takeaway_fee?: number
          tax_id?: string | null
          timezone?: string
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
          expires_at: string | null
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
          expires_at?: string | null
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
          expires_at?: string | null
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
            referencedRelation: "supplier_purchase_summaries"
            referencedColumns: ["supplier_id", "organization_id"]
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
      stock_movements: {
        Row: {
          created_at: string
          id: string
          ingredient_id: string
          order_id: string | null
          organization_id: string
          quantity: number
        }
        Insert: {
          created_at?: string
          id?: string
          ingredient_id: string
          order_id?: string | null
          organization_id: string
          quantity: number
        }
        Update: {
          created_at?: string
          id?: string
          ingredient_id?: string
          order_id?: string | null
          organization_id?: string
          quantity?: number
        }
        Relationships: [
          {
            foreignKeyName: "stock_movements_ingredient_id_organization_id_fkey"
            columns: ["ingredient_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "ingredients"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "stock_movements_order_id_organization_id_fkey"
            columns: ["order_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "stock_movements_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      suppliers: {
        Row: {
          contact_name: string | null
          created_at: string
          id: string
          name: string
          notes: string | null
          organization_id: string
          phone: string | null
          purchase_url: string | null
          supplied_items: string | null
          updated_at: string
        }
        Insert: {
          contact_name?: string | null
          created_at?: string
          id?: string
          name: string
          notes?: string | null
          organization_id: string
          phone?: string | null
          purchase_url?: string | null
          supplied_items?: string | null
          updated_at?: string
        }
        Update: {
          contact_name?: string | null
          created_at?: string
          id?: string
          name?: string
          notes?: string | null
          organization_id?: string
          phone?: string | null
          purchase_url?: string | null
          supplied_items?: string | null
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
      task_completions: {
        Row: {
          completed_at: string
          completed_by: string | null
          completed_on: string
          id: string
          operator_name: string | null
          organization_id: string
          period_start: string
          task_id: string
        }
        Insert: {
          completed_at?: string
          completed_by?: string | null
          completed_on: string
          id?: string
          operator_name?: string | null
          organization_id: string
          period_start: string
          task_id: string
        }
        Update: {
          completed_at?: string
          completed_by?: string | null
          completed_on?: string
          id?: string
          operator_name?: string | null
          organization_id?: string
          period_start?: string
          task_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_completions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_completions_task_id_organization_id_fkey"
            columns: ["task_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id", "organization_id"]
          },
        ]
      }
      task_lists: {
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
            foreignKeyName: "task_lists_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          assigned_operator_id: string | null
          created_at: string
          due_day: number | null
          due_weekday: number | null
          frequency: Database["public"]["Enums"]["task_frequency"]
          id: string
          list_id: string
          organization_id: string
          position: number
          title: string
          updated_at: string
        }
        Insert: {
          assigned_operator_id?: string | null
          created_at?: string
          due_day?: number | null
          due_weekday?: number | null
          frequency?: Database["public"]["Enums"]["task_frequency"]
          id?: string
          list_id: string
          organization_id: string
          position?: number
          title: string
          updated_at?: string
        }
        Update: {
          assigned_operator_id?: string | null
          created_at?: string
          due_day?: number | null
          due_weekday?: number | null
          frequency?: Database["public"]["Enums"]["task_frequency"]
          id?: string
          list_id?: string
          organization_id?: string
          position?: number
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tasks_assigned_operator_fkey"
            columns: ["assigned_operator_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "operators"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "tasks_list_id_organization_id_fkey"
            columns: ["list_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "task_lists"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "tasks_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      customer_account_balances: {
        Row: {
          account_id: string | null
          balance: number | null
          last_entry_at: string | null
          organization_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customer_accounts_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
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
      supplier_purchase_summaries: {
        Row: {
          entry_count: number | null
          last_entry_at: string | null
          organization_id: string | null
          supplier_id: string | null
          total_spent: number | null
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
    Functions: {
      add_order_items: {
        Args: { p_items: Json; p_note?: string; p_order_id: string }
        Returns: number
      }
      can_manage_storage_folder: {
        Args: { p_object_name: string }
        Returns: boolean
      }
      cancel_order: { Args: { p_order_id: string }; Returns: undefined }
      charge_customer_account: {
        Args: {
          p_account_id: string
          p_amount: number
          p_order_id: string
          p_organization_id: string
        }
        Returns: undefined
      }
      complete_order_if_done: {
        Args: { p_order_id: string }
        Returns: undefined
      }
      create_ingredient: {
        Args: {
          p_brand?: string
          p_expires_at?: string
          p_minimum_stock: number
          p_name: string
          p_organization_id: string
          p_quantity: number
          p_supplier_id?: string
          p_total_cost: number
          p_unit: Database["public"]["Enums"]["measure_unit"]
        }
        Returns: string
      }
      create_kitchen_ticket: {
        Args: {
          p_is_addition: boolean
          p_items: Json
          p_note: string
          p_order_id: string
          p_organization_id: string
        }
        Returns: string
      }
      create_organization: {
        Args: { p_name: string; p_slug: string }
        Returns: {
          address: string | null
          created_at: string
          created_by: string | null
          hidden_modules: Database["public"]["Enums"]["app_module"][]
          id: string
          is_takeaway_enabled: boolean
          last_order_number: number
          name: string
          phone: string | null
          slug: string
          takeaway_fee: number
          tax_id: string | null
          timezone: string
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "organizations"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      current_operator_name: {
        Args: { p_organization_id: string }
        Returns: string
      }
      delete_customer_account: {
        Args: { p_account_id: string }
        Returns: undefined
      }
      delete_operator: { Args: { p_operator_id: string }; Returns: undefined }
      ensure_operator_with_settings: {
        Args: { p_organization_id: string }
        Returns: undefined
      }
      get_account_balance: { Args: { p_account_id: string }; Returns: number }
      get_sales_report: {
        Args: {
          p_organization_id: string
          p_period: Database["public"]["Enums"]["sales_report_period"]
        }
        Returns: Json
      }
      has_role: {
        Args: {
          org_id: string
          roles: Database["public"]["Enums"]["member_role"][]
        }
        Returns: boolean
      }
      is_customer_name_in_use: {
        Args: { p_customer_name: string; p_organization_id: string }
        Returns: boolean
      }
      is_member: { Args: { org_id: string }; Returns: boolean }
      lock_open_order: {
        Args: { p_order_id: string }
        Returns: {
          amount_received: number | null
          created_at: string
          created_by: string | null
          created_by_operator_name: string | null
          customer_account_id: string | null
          customer_name: string | null
          id: string
          is_takeaway: boolean
          note: string | null
          number: number
          organization_id: string
          paid_at: string | null
          paid_by: string | null
          paid_by_operator_name: string | null
          payment_method: Database["public"]["Enums"]["payment_method"] | null
          status: Database["public"]["Enums"]["order_status"]
          subtotal: number
          takeaway_fee: number
          total: number
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "orders"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      move_order_stock: {
        Args: {
          p_is_return: boolean
          p_items: Json
          p_order_id: string
          p_organization_id: string
        }
        Returns: undefined
      }
      organization_today: {
        Args: { p_organization_id: string }
        Returns: string
      }
      pay_order: {
        Args: {
          p_amount_received?: number
          p_customer_account_id?: string
          p_order_id: string
          p_payment_method: Database["public"]["Enums"]["payment_method"]
        }
        Returns: number
      }
      place_order: {
        Args: {
          p_amount_received?: number
          p_customer_account_id?: string
          p_customer_name?: string
          p_is_takeaway?: boolean
          p_items: Json
          p_note?: string
          p_organization_id: string
          p_payment_method?: Database["public"]["Enums"]["payment_method"]
          p_send_to_kitchen?: boolean
        }
        Returns: {
          order_id: string
          order_number: number
          order_total: number
        }[]
      }
      register_account_payment: {
        Args: {
          p_account_id: string
          p_amount: number
          p_note?: string
          p_payment_method: Database["public"]["Enums"]["payment_method"]
        }
        Returns: number
      }
      remove_order_item: {
        Args: { p_order_item_id: string; p_quantity?: number }
        Returns: number
      }
      save_customer_account: {
        Args: {
          p_account_id?: string
          p_credit_limit?: number
          p_is_active?: boolean
          p_name: string
          p_note?: string
          p_organization_id: string
          p_phone?: string
        }
        Returns: string
      }
      save_operator: {
        Args: {
          p_allowed_modules: Database["public"]["Enums"]["app_module"][]
          p_can_access_settings: boolean
          p_name: string
          p_operator_id?: string
          p_organization_id: string
          p_pin?: string
        }
        Returns: string
      }
      save_product: {
        Args: {
          p_category_id?: string
          p_image_url?: string
          p_is_active: boolean
          p_name: string
          p_organization_id: string
          p_price: number
          p_product_id?: string
          p_recipe: Json
        }
        Returns: string
      }
      set_kitchen_ticket_status: {
        Args: {
          p_status: Database["public"]["Enums"]["kitchen_ticket_status"]
          p_ticket_id: string
        }
        Returns: undefined
      }
      set_task_done: {
        Args: { p_is_done: boolean; p_task_id: string }
        Returns: undefined
      }
      task_period_start: {
        Args: {
          p_day: string
          p_frequency: Database["public"]["Enums"]["task_frequency"]
        }
        Returns: string
      }
      verify_operator_pin: {
        Args: { p_operator_id: string; p_pin: string }
        Returns: boolean
      }
    }
    Enums: {
      account_entry_kind: "charge" | "payment"
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
      kitchen_ticket_status: "preparing" | "ready" | "delivered"
      measure_unit: "unit" | "g" | "kg" | "ml" | "l"
      member_role: "owner" | "manager" | "cashier" | "kitchen" | "waiter"
      order_status: "in_kitchen" | "ready" | "completed" | "canceled"
      payment_method:
        | "cash"
        | "pix"
        | "credit_card"
        | "debit_card"
        | "customer_account"
      sales_report_period:
        | "today"
        | "yesterday"
        | "last_7_days"
        | "last_30_days"
        | "this_month"
        | "last_month"
      task_frequency: "daily" | "weekly" | "monthly"
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
      account_entry_kind: ["charge", "payment"],
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
      kitchen_ticket_status: ["preparing", "ready", "delivered"],
      measure_unit: ["unit", "g", "kg", "ml", "l"],
      member_role: ["owner", "manager", "cashier", "kitchen", "waiter"],
      order_status: ["in_kitchen", "ready", "completed", "canceled"],
      payment_method: [
        "cash",
        "pix",
        "credit_card",
        "debit_card",
        "customer_account",
      ],
      sales_report_period: [
        "today",
        "yesterday",
        "last_7_days",
        "last_30_days",
        "this_month",
        "last_month",
      ],
      task_frequency: ["daily", "weekly", "monthly"],
    },
  },
} as const
