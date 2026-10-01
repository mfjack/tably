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
          cash_session_id: string | null
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
          cash_session_id?: string | null
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
          cash_session_id?: string | null
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
            foreignKeyName: "account_entries_cash_session_id_fkey"
            columns: ["cash_session_id"]
            isOneToOne: false
            referencedRelation: "cash_sessions"
            referencedColumns: ["id"]
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
      cash_movements: {
        Row: {
          amount: number
          created_at: string
          created_by: string | null
          created_by_name: string | null
          id: string
          kind: Database["public"]["Enums"]["cash_movement_kind"]
          note: string | null
          organization_id: string
          session_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          created_by?: string | null
          created_by_name?: string | null
          id?: string
          kind: Database["public"]["Enums"]["cash_movement_kind"]
          note?: string | null
          organization_id: string
          session_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          created_by?: string | null
          created_by_name?: string | null
          id?: string
          kind?: Database["public"]["Enums"]["cash_movement_kind"]
          note?: string | null
          organization_id?: string
          session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cash_movements_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cash_movements_session_id_organization_id_fkey"
            columns: ["session_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "cash_sessions"
            referencedColumns: ["id", "organization_id"]
          },
        ]
      }
      cash_sessions: {
        Row: {
          closed_at: string | null
          closed_by: string | null
          closed_by_name: string | null
          closing_note: string | null
          counted_cash: number | null
          expected_cash: number | null
          id: string
          opened_at: string
          opened_by: string | null
          opened_by_name: string | null
          opening_amount: number
          organization_id: string
        }
        Insert: {
          closed_at?: string | null
          closed_by?: string | null
          closed_by_name?: string | null
          closing_note?: string | null
          counted_cash?: number | null
          expected_cash?: number | null
          id?: string
          opened_at?: string
          opened_by?: string | null
          opened_by_name?: string | null
          opening_amount?: number
          organization_id: string
        }
        Update: {
          closed_at?: string | null
          closed_by?: string | null
          closed_by_name?: string | null
          closing_note?: string | null
          counted_cash?: number | null
          expected_cash?: number | null
          id?: string
          opened_at?: string
          opened_by?: string | null
          opened_by_name?: string | null
          opening_amount?: number
          organization_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cash_sessions_organization_id_fkey"
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
          is_on_menu: boolean
          name: string
          organization_id: string
          position: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_on_menu?: boolean
          name: string
          organization_id: string
          position?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_on_menu?: boolean
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
      employee_salary_history: {
        Row: {
          changed_at: string
          changed_by_name: string | null
          employee_id: string
          id: string
          organization_id: string
          salary: number
        }
        Insert: {
          changed_at?: string
          changed_by_name?: string | null
          employee_id: string
          id?: string
          organization_id: string
          salary: number
        }
        Update: {
          changed_at?: string
          changed_by_name?: string | null
          employee_id?: string
          id?: string
          organization_id?: string
          salary?: number
        }
        Relationships: [
          {
            foreignKeyName: "employee_salary_history_employee_id_organization_id_fkey"
            columns: ["employee_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "employee_salary_history_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      employee_time_off: {
        Row: {
          created_at: string
          created_by_name: string | null
          employee_id: string
          end_date: string
          id: string
          kind: Database["public"]["Enums"]["time_off_kind"]
          notes: string | null
          organization_id: string
          start_date: string
        }
        Insert: {
          created_at?: string
          created_by_name?: string | null
          employee_id: string
          end_date: string
          id?: string
          kind: Database["public"]["Enums"]["time_off_kind"]
          notes?: string | null
          organization_id: string
          start_date: string
        }
        Update: {
          created_at?: string
          created_by_name?: string | null
          employee_id?: string
          end_date?: string
          id?: string
          kind?: Database["public"]["Enums"]["time_off_kind"]
          notes?: string | null
          organization_id?: string
          start_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "employee_time_off_employee_id_organization_id_fkey"
            columns: ["employee_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "employee_time_off_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      employees: {
        Row: {
          admission_date: string
          birth_date: string | null
          cbo: string | null
          cpf: string
          created_at: string
          dependents: number
          effective_date: string | null
          employment_type: Database["public"]["Enums"]["employment_type"]
          failed_pin_attempts: number
          has_pin: boolean | null
          has_transport_voucher: boolean
          id: string
          job_title: string
          name: string
          notes: string | null
          organization_id: string
          overtime_policy: Database["public"]["Enums"]["overtime_policy"]
          phone: string | null
          pin_hash: string | null
          pin_locked_until: string | null
          pis: string | null
          salary: number
          termination_date: string | null
          updated_at: string
          work_schedule_id: string | null
        }
        Insert: {
          admission_date: string
          birth_date?: string | null
          cbo?: string | null
          cpf: string
          created_at?: string
          dependents?: number
          effective_date?: string | null
          employment_type?: Database["public"]["Enums"]["employment_type"]
          failed_pin_attempts?: number
          has_pin?: boolean | null
          has_transport_voucher?: boolean
          id?: string
          job_title: string
          name: string
          notes?: string | null
          organization_id: string
          overtime_policy?: Database["public"]["Enums"]["overtime_policy"]
          phone?: string | null
          pin_hash?: string | null
          pin_locked_until?: string | null
          pis?: string | null
          salary: number
          termination_date?: string | null
          updated_at?: string
          work_schedule_id?: string | null
        }
        Update: {
          admission_date?: string
          birth_date?: string | null
          cbo?: string | null
          cpf?: string
          created_at?: string
          dependents?: number
          effective_date?: string | null
          employment_type?: Database["public"]["Enums"]["employment_type"]
          failed_pin_attempts?: number
          has_pin?: boolean | null
          has_transport_voucher?: boolean
          id?: string
          job_title?: string
          name?: string
          notes?: string | null
          organization_id?: string
          overtime_policy?: Database["public"]["Enums"]["overtime_policy"]
          phone?: string | null
          pin_hash?: string | null
          pin_locked_until?: string | null
          pis?: string | null
          salary?: number
          termination_date?: string | null
          updated_at?: string
          work_schedule_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "employees_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employees_work_schedule_id_organization_id_fkey"
            columns: ["work_schedule_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "work_schedules"
            referencedColumns: ["id", "organization_id"]
          },
        ]
      }
      finance_automation_settings: {
        Row: {
          is_customer_payments_enabled: boolean
          is_payroll_enabled: boolean
          is_sales_enabled: boolean
          is_stock_purchases_enabled: boolean
          organization_id: string
          start_date: string
          stock_purchase_account_id: string | null
          updated_at: string
        }
        Insert: {
          is_customer_payments_enabled?: boolean
          is_payroll_enabled?: boolean
          is_sales_enabled?: boolean
          is_stock_purchases_enabled?: boolean
          organization_id: string
          start_date: string
          stock_purchase_account_id?: string | null
          updated_at?: string
        }
        Update: {
          is_customer_payments_enabled?: boolean
          is_payroll_enabled?: boolean
          is_sales_enabled?: boolean
          is_stock_purchases_enabled?: boolean
          organization_id?: string
          start_date?: string
          stock_purchase_account_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "finance_automation_settings_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: true
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "finance_automation_settings_stock_purchase_account_id_orga_fkey"
            columns: ["stock_purchase_account_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "financial_accounts"
            referencedColumns: ["id", "organization_id"]
          },
        ]
      }
      finance_payment_method_settings: {
        Row: {
          account_id: string | null
          fee_percent: number
          organization_id: string
          payment_method: Database["public"]["Enums"]["payment_method"]
          settlement_days: number
        }
        Insert: {
          account_id?: string | null
          fee_percent?: number
          organization_id: string
          payment_method: Database["public"]["Enums"]["payment_method"]
          settlement_days?: number
        }
        Update: {
          account_id?: string | null
          fee_percent?: number
          organization_id?: string
          payment_method?: Database["public"]["Enums"]["payment_method"]
          settlement_days?: number
        }
        Relationships: [
          {
            foreignKeyName: "finance_payment_method_settings_account_id_organization_id_fkey"
            columns: ["account_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "financial_accounts"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "finance_payment_method_settings_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      financial_accounts: {
        Row: {
          created_at: string
          id: string
          is_archived: boolean
          kind: Database["public"]["Enums"]["financial_account_kind"]
          name: string
          opening_balance: number
          organization_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_archived?: boolean
          kind: Database["public"]["Enums"]["financial_account_kind"]
          name: string
          opening_balance?: number
          organization_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_archived?: boolean
          kind?: Database["public"]["Enums"]["financial_account_kind"]
          name?: string
          opening_balance?: number
          organization_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "financial_accounts_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      financial_categories: {
        Row: {
          created_at: string
          id: string
          is_archived: boolean
          kind: Database["public"]["Enums"]["financial_entry_kind"]
          name: string
          organization_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_archived?: boolean
          kind: Database["public"]["Enums"]["financial_entry_kind"]
          name: string
          organization_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_archived?: boolean
          kind?: Database["public"]["Enums"]["financial_entry_kind"]
          name?: string
          organization_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "financial_categories_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      financial_entries: {
        Row: {
          account_id: string | null
          amount: number
          barcode: string | null
          category_id: string | null
          created_at: string
          created_by_name: string | null
          description: string
          document_path: string | null
          due_date: string
          id: string
          installment_count: number | null
          installment_group_id: string | null
          installment_number: number | null
          kind: Database["public"]["Enums"]["financial_entry_kind"]
          notes: string | null
          organization_id: string
          paid_amount: number | null
          paid_at: string | null
          paid_by_name: string | null
          receipt_path: string | null
          recurrence_id: string | null
          source: Database["public"]["Enums"]["financial_entry_source"]
          source_date: string | null
          source_key: string | null
          supplier_id: string | null
          updated_at: string
        }
        Insert: {
          account_id?: string | null
          amount: number
          barcode?: string | null
          category_id?: string | null
          created_at?: string
          created_by_name?: string | null
          description: string
          document_path?: string | null
          due_date: string
          id?: string
          installment_count?: number | null
          installment_group_id?: string | null
          installment_number?: number | null
          kind: Database["public"]["Enums"]["financial_entry_kind"]
          notes?: string | null
          organization_id: string
          paid_amount?: number | null
          paid_at?: string | null
          paid_by_name?: string | null
          receipt_path?: string | null
          recurrence_id?: string | null
          source?: Database["public"]["Enums"]["financial_entry_source"]
          source_date?: string | null
          source_key?: string | null
          supplier_id?: string | null
          updated_at?: string
        }
        Update: {
          account_id?: string | null
          amount?: number
          barcode?: string | null
          category_id?: string | null
          created_at?: string
          created_by_name?: string | null
          description?: string
          document_path?: string | null
          due_date?: string
          id?: string
          installment_count?: number | null
          installment_group_id?: string | null
          installment_number?: number | null
          kind?: Database["public"]["Enums"]["financial_entry_kind"]
          notes?: string | null
          organization_id?: string
          paid_amount?: number | null
          paid_at?: string | null
          paid_by_name?: string | null
          receipt_path?: string | null
          recurrence_id?: string | null
          source?: Database["public"]["Enums"]["financial_entry_source"]
          source_date?: string | null
          source_key?: string | null
          supplier_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "financial_entries_account_id_organization_id_fkey"
            columns: ["account_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "financial_accounts"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "financial_entries_category_id_organization_id_fkey"
            columns: ["category_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "financial_categories"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "financial_entries_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_entries_recurrence_id_organization_id_fkey"
            columns: ["recurrence_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "financial_recurrences"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "financial_entries_supplier_id_organization_id_fkey"
            columns: ["supplier_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "supplier_purchase_summaries"
            referencedColumns: ["supplier_id", "organization_id"]
          },
          {
            foreignKeyName: "financial_entries_supplier_id_organization_id_fkey"
            columns: ["supplier_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id", "organization_id"]
          },
        ]
      }
      financial_recurrences: {
        Row: {
          account_id: string | null
          amount: number
          category_id: string | null
          created_at: string
          description: string
          end_date: string | null
          frequency: Database["public"]["Enums"]["recurrence_frequency"]
          generated_until: string | null
          id: string
          kind: Database["public"]["Enums"]["financial_entry_kind"]
          notes: string | null
          organization_id: string
          start_date: string
          supplier_id: string | null
          updated_at: string
        }
        Insert: {
          account_id?: string | null
          amount: number
          category_id?: string | null
          created_at?: string
          description: string
          end_date?: string | null
          frequency: Database["public"]["Enums"]["recurrence_frequency"]
          generated_until?: string | null
          id?: string
          kind: Database["public"]["Enums"]["financial_entry_kind"]
          notes?: string | null
          organization_id: string
          start_date: string
          supplier_id?: string | null
          updated_at?: string
        }
        Update: {
          account_id?: string | null
          amount?: number
          category_id?: string | null
          created_at?: string
          description?: string
          end_date?: string | null
          frequency?: Database["public"]["Enums"]["recurrence_frequency"]
          generated_until?: string | null
          id?: string
          kind?: Database["public"]["Enums"]["financial_entry_kind"]
          notes?: string | null
          organization_id?: string
          start_date?: string
          supplier_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "financial_recurrences_account_id_organization_id_fkey"
            columns: ["account_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "financial_accounts"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "financial_recurrences_category_id_organization_id_fkey"
            columns: ["category_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "financial_categories"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "financial_recurrences_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_recurrences_supplier_id_organization_id_fkey"
            columns: ["supplier_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "supplier_purchase_summaries"
            referencedColumns: ["supplier_id", "organization_id"]
          },
          {
            foreignKeyName: "financial_recurrences_supplier_id_organization_id_fkey"
            columns: ["supplier_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id", "organization_id"]
          },
        ]
      }
      financial_transfers: {
        Row: {
          amount: number
          created_at: string
          created_by_name: string | null
          from_account_id: string
          id: string
          notes: string | null
          organization_id: string
          to_account_id: string
          transferred_on: string
        }
        Insert: {
          amount: number
          created_at?: string
          created_by_name?: string | null
          from_account_id: string
          id?: string
          notes?: string | null
          organization_id: string
          to_account_id: string
          transferred_on: string
        }
        Update: {
          amount?: number
          created_at?: string
          created_by_name?: string | null
          from_account_id?: string
          id?: string
          notes?: string | null
          organization_id?: string
          to_account_id?: string
          transferred_on?: string
        }
        Relationships: [
          {
            foreignKeyName: "financial_transfers_from_account_id_organization_id_fkey"
            columns: ["from_account_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "financial_accounts"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "financial_transfers_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_transfers_to_account_id_organization_id_fkey"
            columns: ["to_account_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "financial_accounts"
            referencedColumns: ["id", "organization_id"]
          },
        ]
      }
      holidays: {
        Row: {
          created_at: string
          holiday_date: string
          id: string
          name: string
          organization_id: string
        }
        Insert: {
          created_at?: string
          holiday_date: string
          id?: string
          name: string
          organization_id: string
        }
        Update: {
          created_at?: string
          holiday_date?: string
          id?: string
          name?: string
          organization_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "holidays_organization_id_fkey"
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
          note: string | null
          organization_id: string
          product_name: string
          quantity: number
          sort_order: number
          ticket_id: string
          unit_price: number
        }
        Insert: {
          id?: string
          note?: string | null
          organization_id: string
          product_name: string
          quantity: number
          sort_order?: number
          ticket_id: string
          unit_price?: number
        }
        Update: {
          id?: string
          note?: string | null
          organization_id?: string
          product_name?: string
          quantity?: number
          sort_order?: number
          ticket_id?: string
          unit_price?: number
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
      online_orders: {
        Row: {
          accepted_customer_name: string | null
          created_at: string
          customer_name: string
          decided_at: string | null
          decided_by: string | null
          device_id: string
          id: string
          items: Json
          note: string | null
          order_id: string | null
          organization_id: string
          status: Database["public"]["Enums"]["online_order_status"]
          total: number
        }
        Insert: {
          accepted_customer_name?: string | null
          created_at?: string
          customer_name: string
          decided_at?: string | null
          decided_by?: string | null
          device_id: string
          id: string
          items: Json
          note?: string | null
          order_id?: string | null
          organization_id: string
          status?: Database["public"]["Enums"]["online_order_status"]
          total: number
        }
        Update: {
          accepted_customer_name?: string | null
          created_at?: string
          customer_name?: string
          decided_at?: string | null
          decided_by?: string | null
          device_id?: string
          id?: string
          items?: Json
          note?: string | null
          order_id?: string | null
          organization_id?: string
          status?: Database["public"]["Enums"]["online_order_status"]
          total?: number
        }
        Relationships: [
          {
            foreignKeyName: "online_orders_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "online_orders_organization_id_fkey"
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
          employee_id: string | null
          has_pin: boolean | null
          id: string
          name: string
          organization_id: string
          pin_hash: string | null
          updated_at: string
        }
        Insert: {
          allowed_modules?: Database["public"]["Enums"]["app_module"][]
          can_access_settings?: boolean
          created_at?: string
          employee_id?: string | null
          has_pin?: boolean | null
          id?: string
          name: string
          organization_id: string
          pin_hash?: string | null
          updated_at?: string
        }
        Update: {
          allowed_modules?: Database["public"]["Enums"]["app_module"][]
          can_access_settings?: boolean
          created_at?: string
          employee_id?: string | null
          has_pin?: boolean | null
          id?: string
          name?: string
          organization_id?: string
          pin_hash?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "operators_employee_fkey"
            columns: ["employee_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id", "organization_id"]
          },
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
          note: string | null
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
          note?: string | null
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
          note?: string | null
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
      order_payments: {
        Row: {
          amount: number
          amount_received: number | null
          cash_session_id: string | null
          created_at: string
          created_by: string | null
          customer_account_id: string | null
          id: string
          method: Database["public"]["Enums"]["payment_method"]
          order_id: string
          organization_id: string
        }
        Insert: {
          amount: number
          amount_received?: number | null
          cash_session_id?: string | null
          created_at?: string
          created_by?: string | null
          customer_account_id?: string | null
          id?: string
          method: Database["public"]["Enums"]["payment_method"]
          order_id: string
          organization_id: string
        }
        Update: {
          amount?: number
          amount_received?: number | null
          cash_session_id?: string | null
          created_at?: string
          created_by?: string | null
          customer_account_id?: string | null
          id?: string
          method?: Database["public"]["Enums"]["payment_method"]
          order_id?: string
          organization_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_payments_cash_session_id_fkey"
            columns: ["cash_session_id"]
            isOneToOne: false
            referencedRelation: "cash_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_payments_order_id_organization_id_fkey"
            columns: ["order_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "order_payments_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      order_requests: {
        Row: {
          created_at: string
          id: string
          order_id: string
          organization_id: string
        }
        Insert: {
          created_at?: string
          id: string
          order_id: string
          organization_id: string
        }
        Update: {
          created_at?: string
          id?: string
          order_id?: string
          organization_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_requests_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_requests_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
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
          discount_amount: number
          discount_type: string | null
          discount_value: number | null
          discounted_by: string | null
          id: string
          is_takeaway: boolean
          note: string | null
          number: number
          organization_id: string
          paid_at: string | null
          paid_by: string | null
          paid_by_operator_name: string | null
          payment_method: Database["public"]["Enums"]["payment_method"] | null
          service_fee_amount: number
          service_fee_percent: number | null
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
          discount_amount?: number
          discount_type?: string | null
          discount_value?: number | null
          discounted_by?: string | null
          id?: string
          is_takeaway?: boolean
          note?: string | null
          number: number
          organization_id: string
          paid_at?: string | null
          paid_by?: string | null
          paid_by_operator_name?: string | null
          payment_method?: Database["public"]["Enums"]["payment_method"] | null
          service_fee_amount?: number
          service_fee_percent?: number | null
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
          discount_amount?: number
          discount_type?: string | null
          discount_value?: number | null
          discounted_by?: string | null
          id?: string
          is_takeaway?: boolean
          note?: string | null
          number?: number
          organization_id?: string
          paid_at?: string | null
          paid_by?: string | null
          paid_by_operator_name?: string | null
          payment_method?: Database["public"]["Enums"]["payment_method"] | null
          service_fee_amount?: number
          service_fee_percent?: number | null
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
          is_customer_account_payment_enabled: boolean
          is_discount_enabled: boolean
          is_menu_published: boolean
          is_online_ordering_enabled: boolean
          is_service_fee_enabled: boolean
          is_split_bill_enabled: boolean
          is_takeaway_enabled: boolean
          last_order_number: number
          menu_instagram: string | null
          menu_note: string | null
          menu_tagline: string | null
          menu_title: string | null
          name: string
          phone: string | null
          pos_seen_at: string | null
          service_fee_percent: number
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
          is_customer_account_payment_enabled?: boolean
          is_discount_enabled?: boolean
          is_menu_published?: boolean
          is_online_ordering_enabled?: boolean
          is_service_fee_enabled?: boolean
          is_split_bill_enabled?: boolean
          is_takeaway_enabled?: boolean
          last_order_number?: number
          menu_instagram?: string | null
          menu_note?: string | null
          menu_tagline?: string | null
          menu_title?: string | null
          name: string
          phone?: string | null
          pos_seen_at?: string | null
          service_fee_percent?: number
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
          is_customer_account_payment_enabled?: boolean
          is_discount_enabled?: boolean
          is_menu_published?: boolean
          is_online_ordering_enabled?: boolean
          is_service_fee_enabled?: boolean
          is_split_bill_enabled?: boolean
          is_takeaway_enabled?: boolean
          last_order_number?: number
          menu_instagram?: string | null
          menu_note?: string | null
          menu_tagline?: string | null
          menu_title?: string | null
          name?: string
          phone?: string | null
          pos_seen_at?: string | null
          service_fee_percent?: number
          slug?: string
          takeaway_fee?: number
          tax_id?: string | null
          timezone?: string
          updated_at?: string
        }
        Relationships: []
      }
      payroll_settings: {
        Row: {
          inss_brackets: Json
          irrf_brackets: Json
          irrf_dependent_deduction: number
          irrf_exempt_up_to: number
          irrf_reduction_constant: number
          irrf_reduction_factor: number
          irrf_reduction_up_to: number
          irrf_simplified_deduction: number
          night_shift_rate: number
          organization_id: string
          overtime_rate: number
          rest_day_overtime_rate: number
          transport_voucher_rate: number
          updated_at: string
        }
        Insert: {
          inss_brackets?: Json
          irrf_brackets?: Json
          irrf_dependent_deduction?: number
          irrf_exempt_up_to?: number
          irrf_reduction_constant?: number
          irrf_reduction_factor?: number
          irrf_reduction_up_to?: number
          irrf_simplified_deduction?: number
          night_shift_rate?: number
          organization_id: string
          overtime_rate?: number
          rest_day_overtime_rate?: number
          transport_voucher_rate?: number
          updated_at?: string
        }
        Update: {
          inss_brackets?: Json
          irrf_brackets?: Json
          irrf_dependent_deduction?: number
          irrf_exempt_up_to?: number
          irrf_reduction_constant?: number
          irrf_reduction_factor?: number
          irrf_reduction_up_to?: number
          irrf_simplified_deduction?: number
          night_shift_rate?: number
          organization_id?: string
          overtime_rate?: number
          rest_day_overtime_rate?: number
          transport_voucher_rate?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payroll_settings_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: true
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      payslips: {
        Row: {
          created_at: string
          deduction_amount: number
          details: Json
          employee_id: string
          employee_snapshot: Json
          fgts_amount: number
          fgts_base: number
          gross_amount: number
          hour_bank_balance_minutes: number
          id: string
          inss_base: number
          irrf_base: number
          issued_at: string | null
          issued_by_name: string | null
          items: Json
          kind: Database["public"]["Enums"]["payslip_kind"]
          manual_items: Json
          net_amount: number
          organization_id: string
          payment_due_date: string | null
          reference_month: string
          status: Database["public"]["Enums"]["payslip_status"]
          time_off_id: string | null
          timesheet_summary: Json
          updated_at: string
        }
        Insert: {
          created_at?: string
          deduction_amount?: number
          details?: Json
          employee_id: string
          employee_snapshot: Json
          fgts_amount?: number
          fgts_base?: number
          gross_amount?: number
          hour_bank_balance_minutes?: number
          id?: string
          inss_base?: number
          irrf_base?: number
          issued_at?: string | null
          issued_by_name?: string | null
          items?: Json
          kind?: Database["public"]["Enums"]["payslip_kind"]
          manual_items?: Json
          net_amount?: number
          organization_id: string
          payment_due_date?: string | null
          reference_month: string
          status?: Database["public"]["Enums"]["payslip_status"]
          time_off_id?: string | null
          timesheet_summary?: Json
          updated_at?: string
        }
        Update: {
          created_at?: string
          deduction_amount?: number
          details?: Json
          employee_id?: string
          employee_snapshot?: Json
          fgts_amount?: number
          fgts_base?: number
          gross_amount?: number
          hour_bank_balance_minutes?: number
          id?: string
          inss_base?: number
          irrf_base?: number
          issued_at?: string | null
          issued_by_name?: string | null
          items?: Json
          kind?: Database["public"]["Enums"]["payslip_kind"]
          manual_items?: Json
          net_amount?: number
          organization_id?: string
          payment_due_date?: string | null
          reference_month?: string
          status?: Database["public"]["Enums"]["payslip_status"]
          time_off_id?: string | null
          timesheet_summary?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payslips_employee_id_organization_id_fkey"
            columns: ["employee_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "payslips_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payslips_time_off_id_fkey"
            columns: ["time_off_id"]
            isOneToOne: false
            referencedRelation: "employee_time_off"
            referencedColumns: ["id"]
          },
        ]
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
          is_on_menu: boolean
          menu_detail: string | null
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
          is_on_menu?: boolean
          menu_detail?: string | null
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
          is_on_menu?: boolean
          menu_detail?: string | null
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
          payment_due_date: string | null
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
          payment_due_date?: string | null
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
          payment_due_date?: string | null
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
      time_punch_counters: {
        Row: {
          last_hash: string
          last_nsr: number
          organization_id: string
        }
        Insert: {
          last_hash?: string
          last_nsr?: number
          organization_id: string
        }
        Update: {
          last_hash?: string
          last_nsr?: number
          organization_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "time_punch_counters_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: true
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      time_punch_voids: {
        Row: {
          created_at: string
          id: string
          organization_id: string
          punch_id: string
          reason: string
          voided_by: string | null
          voided_by_name: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          organization_id: string
          punch_id: string
          reason: string
          voided_by?: string | null
          voided_by_name?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          organization_id?: string
          punch_id?: string
          reason?: string
          voided_by?: string | null
          voided_by_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "time_punch_voids_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "time_punch_voids_punch_id_organization_id_fkey"
            columns: ["punch_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "time_punches"
            referencedColumns: ["id", "organization_id"]
          },
        ]
      }
      time_punches: {
        Row: {
          created_at: string
          employee_id: string
          hash: string
          id: string
          nsr: number
          organization_id: string
          punched_at: string
          reason: string | null
          recorded_by: string | null
          recorded_by_name: string | null
          source: Database["public"]["Enums"]["time_punch_source"]
          work_date: string
        }
        Insert: {
          created_at?: string
          employee_id: string
          hash: string
          id?: string
          nsr: number
          organization_id: string
          punched_at: string
          reason?: string | null
          recorded_by?: string | null
          recorded_by_name?: string | null
          source: Database["public"]["Enums"]["time_punch_source"]
          work_date: string
        }
        Update: {
          created_at?: string
          employee_id?: string
          hash?: string
          id?: string
          nsr?: number
          organization_id?: string
          punched_at?: string
          reason?: string | null
          recorded_by?: string | null
          recorded_by_name?: string | null
          source?: Database["public"]["Enums"]["time_punch_source"]
          work_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "time_punches_employee_id_organization_id_fkey"
            columns: ["employee_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "time_punches_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      work_schedule_days: {
        Row: {
          break_end: string | null
          break_start: string | null
          end_time: string
          id: string
          organization_id: string
          schedule_id: string
          start_time: string
          weekday: number
        }
        Insert: {
          break_end?: string | null
          break_start?: string | null
          end_time: string
          id?: string
          organization_id: string
          schedule_id: string
          start_time: string
          weekday: number
        }
        Update: {
          break_end?: string | null
          break_start?: string | null
          end_time?: string
          id?: string
          organization_id?: string
          schedule_id?: string
          start_time?: string
          weekday?: number
        }
        Relationships: [
          {
            foreignKeyName: "work_schedule_days_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_schedule_days_schedule_id_organization_id_fkey"
            columns: ["schedule_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "work_schedules"
            referencedColumns: ["id", "organization_id"]
          },
        ]
      }
      work_schedules: {
        Row: {
          created_at: string
          daily_tolerance_minutes: number
          id: string
          mark_tolerance_minutes: number
          name: string
          organization_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          daily_tolerance_minutes?: number
          id?: string
          mark_tolerance_minutes?: number
          name: string
          organization_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          daily_tolerance_minutes?: number
          id?: string
          mark_tolerance_minutes?: number
          name?: string
          organization_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "work_schedules_organization_id_fkey"
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
      accept_online_order: {
        Args: { p_online_order_id: string }
        Returns: {
          customer_name: string
          order_id: string
        }[]
      }
      add_cash_movement: {
        Args: {
          p_amount: number
          p_kind: Database["public"]["Enums"]["cash_movement_kind"]
          p_note: string
          p_organization_id: string
        }
        Returns: undefined
      }
      add_manual_time_punch: {
        Args: {
          p_employee_id: string
          p_punched_at: string
          p_reason: string
          p_work_date: string
        }
        Returns: number
      }
      add_order_items: {
        Args: {
          p_items: Json
          p_note?: string
          p_order_id: string
          p_placed_at?: string
          p_request_id?: string
        }
        Returns: number
      }
      adjust_ingredient_stock: {
        Args: { p_ingredient_id: string; p_quantity: number }
        Returns: undefined
      }
      append_time_punch: {
        Args: {
          p_employee_id: string
          p_organization_id: string
          p_punched_at: string
          p_reason: string
          p_source: Database["public"]["Enums"]["time_punch_source"]
          p_work_date: string
        }
        Returns: {
          created_at: string
          employee_id: string
          hash: string
          id: string
          nsr: number
          organization_id: string
          punched_at: string
          reason: string | null
          recorded_by: string | null
          recorded_by_name: string | null
          source: Database["public"]["Enums"]["time_punch_source"]
          work_date: string
        }
        SetofOptions: {
          from: "*"
          to: "time_punches"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      apply_order_adjustments: {
        Args: {
          p_discount_type: string
          p_discount_value: number
          p_has_service_fee: boolean
          p_order_id: string
        }
        Returns: number
      }
      apply_person_pin_hash: {
        Args: {
          p_employee_id: string
          p_operator_id: string
          p_pin_hash: string
        }
        Returns: undefined
      }
      build_cash_session_summary: {
        Args: { p_session_id: string }
        Returns: Json
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
      close_cash_session: {
        Args: {
          p_counted_cash: number
          p_note: string
          p_organization_id: string
        }
        Returns: Json
      }
      close_stale_orders: { Args: never; Returns: undefined }
      complete_order_if_done: {
        Args: { p_order_id: string }
        Returns: undefined
      }
      create_employee_pin: {
        Args: { p_employee_id: string; p_pin: string }
        Returns: undefined
      }
      create_ingredient: {
        Args: {
          p_brand?: string
          p_expires_at?: string
          p_minimum_stock: number
          p_name: string
          p_organization_id: string
          p_payment_due_date?: string
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
      create_operator_pin: {
        Args: { p_operator_id: string; p_pin: string }
        Returns: undefined
      }
      create_organization: {
        Args: { p_name: string; p_slug: string }
        Returns: {
          address: string | null
          created_at: string
          created_by: string | null
          hidden_modules: Database["public"]["Enums"]["app_module"][]
          id: string
          is_customer_account_payment_enabled: boolean
          is_discount_enabled: boolean
          is_menu_published: boolean
          is_online_ordering_enabled: boolean
          is_service_fee_enabled: boolean
          is_split_bill_enabled: boolean
          is_takeaway_enabled: boolean
          last_order_number: number
          menu_instagram: string | null
          menu_note: string | null
          menu_tagline: string | null
          menu_title: string | null
          name: string
          phone: string | null
          pos_seen_at: string | null
          service_fee_percent: number
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
      current_actor_name: {
        Args: { p_organization_id: string }
        Returns: string
      }
      current_operator_name: {
        Args: { p_organization_id: string }
        Returns: string
      }
      delete_customer_account: {
        Args: { p_account_id: string }
        Returns: undefined
      }
      delete_my_account: { Args: never; Returns: undefined }
      delete_operator: { Args: { p_operator_id: string }; Returns: undefined }
      deliver_offline_kitchen_ticket: {
        Args: { p_delivered_at: string; p_ticket_id: string }
        Returns: undefined
      }
      ensure_operator_with_settings: {
        Args: { p_organization_id: string }
        Returns: undefined
      }
      get_account_balance: { Args: { p_account_id: string }; Returns: number }
      get_financial_analysis: {
        Args: {
          p_from: string
          p_horizon_days: number
          p_organization_id: string
          p_to: string
        }
        Returns: Json
      }
      get_financial_overview: {
        Args: { p_from: string; p_organization_id: string; p_to: string }
        Returns: Json
      }
      get_online_order_status: {
        Args: { p_online_order_id: string }
        Returns: Json
      }
      get_open_cash_session: {
        Args: { p_organization_id: string }
        Returns: Json
      }
      get_public_menu: { Args: { p_slug: string }; Returns: Json }
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
      is_accepting_online_orders: {
        Args: {
          p_organization: Database["public"]["Tables"]["organizations"]["Row"]
        }
        Returns: boolean
      }
      is_customer_name_in_use: {
        Args: { p_customer_name: string; p_organization_id: string }
        Returns: boolean
      }
      is_member: { Args: { org_id: string }; Returns: boolean }
      is_operator_employee_active: {
        Args: { p_operator_id: string }
        Returns: boolean
      }
      list_cash_sessions: {
        Args: {
          p_end_date: string
          p_organization_id: string
          p_start_date: string
        }
        Returns: Json
      }
      list_my_owned_organizations: {
        Args: never
        Returns: {
          id: string
          name: string
        }[]
      }
      list_time_clock_employees: {
        Args: { p_organization_id: string }
        Returns: {
          has_pin: boolean
          id: string
          job_title: string
          name: string
        }[]
      }
      lock_open_order: {
        Args: { p_order_id: string }
        Returns: {
          amount_received: number | null
          created_at: string
          created_by: string | null
          created_by_operator_name: string | null
          customer_account_id: string | null
          customer_name: string | null
          discount_amount: number
          discount_type: string | null
          discount_value: number | null
          discounted_by: string | null
          id: string
          is_takeaway: boolean
          note: string | null
          number: number
          organization_id: string
          paid_at: string | null
          paid_by: string | null
          paid_by_operator_name: string | null
          payment_method: Database["public"]["Enums"]["payment_method"] | null
          service_fee_amount: number
          service_fee_percent: number | null
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
          p_allow_negative?: boolean
          p_is_return: boolean
          p_items: Json
          p_order_id: string
          p_organization_id: string
        }
        Returns: undefined
      }
      normalize_order_payments: {
        Args: {
          p_amount_received: number
          p_customer_account_id: string
          p_payment_method: Database["public"]["Enums"]["payment_method"]
          p_payments: Json
        }
        Returns: Json
      }
      nth_business_day: {
        Args: {
          p_count: number
          p_month_start: string
          p_organization_id: string
        }
        Returns: string
      }
      open_cash_session: {
        Args: { p_opening_amount: number; p_organization_id: string }
        Returns: string
      }
      organization_today: {
        Args: { p_organization_id: string }
        Returns: string
      }
      pay_order: {
        Args: {
          p_amount_received?: number
          p_customer_account_id?: string
          p_discount_type?: string
          p_discount_value?: number
          p_has_service_fee?: boolean
          p_order_id: string
          p_payment_method?: Database["public"]["Enums"]["payment_method"]
          p_payments?: Json
        }
        Returns: number
      }
      payment_method_label: {
        Args: { p_method: Database["public"]["Enums"]["payment_method"] }
        Returns: string
      }
      place_online_order: {
        Args: {
          p_customer_name: string
          p_device_id: string
          p_items: Json
          p_note?: string
          p_online_order_id: string
          p_slug: string
        }
        Returns: string
      }
      place_order: {
        Args: {
          p_amount_received?: number
          p_customer_account_id?: string
          p_customer_name?: string
          p_discount_type?: string
          p_discount_value?: number
          p_has_service_fee?: boolean
          p_is_takeaway?: boolean
          p_items: Json
          p_note?: string
          p_organization_id: string
          p_payment_method?: Database["public"]["Enums"]["payment_method"]
          p_payments?: Json
          p_placed_at?: string
          p_request_id?: string
          p_send_to_kitchen?: boolean
        }
        Returns: {
          order_id: string
          order_number: number
          order_total: number
        }[]
      }
      record_order_payments: {
        Args: {
          p_order_id: string
          p_organization_id: string
          p_paid_at: string
          p_payments: Json
          p_total: number
        }
        Returns: undefined
      }
      recurrence_step: {
        Args: {
          p_frequency: Database["public"]["Enums"]["recurrence_frequency"]
          p_index: number
        }
        Returns: string
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
      register_time_punch: {
        Args: { p_employee_id: string; p_pin: string }
        Returns: Json
      }
      reject_online_order: {
        Args: { p_online_order_id: string }
        Returns: undefined
      }
      remove_order_item: {
        Args: { p_order_item_id: string; p_quantity?: number }
        Returns: number
      }
      reset_person_pin: {
        Args: { p_employee_id?: string; p_operator_id?: string }
        Returns: undefined
      }
      resolve_offline_customer_name: {
        Args: { p_customer_name: string; p_organization_id: string }
        Returns: string
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
      save_employee_access: {
        Args: {
          p_allowed_modules: Database["public"]["Enums"]["app_module"][]
          p_can_access_settings: boolean
          p_employee_id: string
          p_is_enabled: boolean
        }
        Returns: undefined
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
      set_employee_pin: {
        Args: { p_employee_id: string; p_pin: string }
        Returns: undefined
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
      sync_financial_automations: {
        Args: { p_organization_id: string }
        Returns: undefined
      }
      sync_financial_recurrences: {
        Args: { p_organization_id: string; p_until: string }
        Returns: undefined
      }
      task_period_start: {
        Args: {
          p_day: string
          p_frequency: Database["public"]["Enums"]["task_frequency"]
        }
        Returns: string
      }
      touch_pos_presence: {
        Args: { p_organization_id: string }
        Returns: undefined
      }
      upsert_automatic_entry: {
        Args: {
          p_account_id: string
          p_amount: number
          p_category_id: string
          p_description: string
          p_due_date: string
          p_keep_when_paid: boolean
          p_kind: Database["public"]["Enums"]["financial_entry_kind"]
          p_mark_paid_until: string
          p_organization_id: string
          p_source: Database["public"]["Enums"]["financial_entry_source"]
          p_source_date: string
          p_source_key: string
          p_supplier_id: string
        }
        Returns: undefined
      }
      verify_operator_pin: {
        Args: { p_operator_id: string; p_pin: string }
        Returns: boolean
      }
      void_time_punch: {
        Args: { p_punch_id: string; p_reason: string }
        Returns: undefined
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
        | "time_clock"
        | "employees"
        | "payroll"
        | "finance"
        | "dashboard"
      cash_movement_kind: "withdrawal" | "supply"
      employment_type: "clt" | "apprentice" | "intern"
      financial_account_kind:
        | "cash"
        | "bank"
        | "card_acquirer"
        | "digital_wallet"
      financial_entry_kind: "income" | "expense"
      financial_entry_source:
        | "manual"
        | "sales"
        | "sales_fee"
        | "customer_payments"
        | "customer_payments_fee"
        | "stock_purchase"
        | "payroll_salary"
        | "payroll_fgts"
        | "payroll_taxes"
      kitchen_ticket_status: "waiting" | "preparing" | "ready" | "delivered"
      measure_unit: "unit" | "g" | "kg" | "ml" | "l"
      member_role: "owner" | "manager" | "cashier" | "kitchen" | "waiter"
      online_order_status: "pending" | "accepted" | "rejected"
      order_status: "in_kitchen" | "ready" | "completed" | "canceled"
      overtime_policy: "paid" | "hour_bank"
      payment_method:
        | "cash"
        | "pix"
        | "credit_card"
        | "debit_card"
        | "customer_account"
      payslip_kind:
        | "monthly"
        | "vacation"
        | "thirteenth_first"
        | "thirteenth_second"
      payslip_status: "draft" | "issued"
      recurrence_frequency:
        | "weekly"
        | "biweekly"
        | "monthly"
        | "bimonthly"
        | "quarterly"
        | "semiannual"
        | "yearly"
      sales_report_period:
        | "today"
        | "yesterday"
        | "last_7_days"
        | "last_30_days"
        | "this_month"
        | "last_month"
      task_frequency: "daily" | "weekly" | "monthly"
      time_off_kind:
        | "medical_certificate"
        | "vacation"
        | "day_off"
        | "justified_absence"
      time_punch_source: "clock" | "manual"
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
        "time_clock",
        "employees",
        "payroll",
        "finance",
        "dashboard",
      ],
      cash_movement_kind: ["withdrawal", "supply"],
      employment_type: ["clt", "apprentice", "intern"],
      financial_account_kind: [
        "cash",
        "bank",
        "card_acquirer",
        "digital_wallet",
      ],
      financial_entry_kind: ["income", "expense"],
      financial_entry_source: [
        "manual",
        "sales",
        "sales_fee",
        "customer_payments",
        "customer_payments_fee",
        "stock_purchase",
        "payroll_salary",
        "payroll_fgts",
        "payroll_taxes",
      ],
      kitchen_ticket_status: ["waiting", "preparing", "ready", "delivered"],
      measure_unit: ["unit", "g", "kg", "ml", "l"],
      member_role: ["owner", "manager", "cashier", "kitchen", "waiter"],
      online_order_status: ["pending", "accepted", "rejected"],
      order_status: ["in_kitchen", "ready", "completed", "canceled"],
      overtime_policy: ["paid", "hour_bank"],
      payment_method: [
        "cash",
        "pix",
        "credit_card",
        "debit_card",
        "customer_account",
      ],
      payslip_kind: [
        "monthly",
        "vacation",
        "thirteenth_first",
        "thirteenth_second",
      ],
      payslip_status: ["draft", "issued"],
      recurrence_frequency: [
        "weekly",
        "biweekly",
        "monthly",
        "bimonthly",
        "quarterly",
        "semiannual",
        "yearly",
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
      time_off_kind: [
        "medical_certificate",
        "vacation",
        "day_off",
        "justified_absence",
      ],
      time_punch_source: ["clock", "manual"],
    },
  },
} as const
