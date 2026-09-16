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
      activity_log: {
        Row: {
          amount: number | null
          created_at: string
          description: string
          id: string
          reference_id: string | null
          reference_type: string | null
          status: string | null
          type: string
          user_id: string
        }
        Insert: {
          amount?: number | null
          created_at?: string
          description: string
          id?: string
          reference_id?: string | null
          reference_type?: string | null
          status?: string | null
          type: string
          user_id?: string
        }
        Update: {
          amount?: number | null
          created_at?: string
          description?: string
          id?: string
          reference_id?: string | null
          reference_type?: string | null
          status?: string | null
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      cash_closures: {
        Row: {
          closing: number
          closure_date: string
          created_at: string
          id: string
          inflow: number
          note: string | null
          opening: number
          outflow: number
          user_id: string
        }
        Insert: {
          closing?: number
          closure_date: string
          created_at?: string
          id?: string
          inflow?: number
          note?: string | null
          opening?: number
          outflow?: number
          user_id?: string
        }
        Update: {
          closing?: number
          closure_date?: string
          created_at?: string
          id?: string
          inflow?: number
          note?: string | null
          opening?: number
          outflow?: number
          user_id?: string
        }
        Relationships: []
      }
      cash_transactions: {
        Row: {
          amount: number
          category: string | null
          created_at: string
          description: string
          id: string
          number: string
          occurred_at: string
          reference_id: string | null
          reference_type: string | null
          type: string
          user_id: string
        }
        Insert: {
          amount: number
          category?: string | null
          created_at?: string
          description: string
          id?: string
          number: string
          occurred_at?: string
          reference_id?: string | null
          reference_type?: string | null
          type: string
          user_id?: string
        }
        Update: {
          amount?: number
          category?: string | null
          created_at?: string
          description?: string
          id?: string
          number?: string
          occurred_at?: string
          reference_id?: string | null
          reference_type?: string | null
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      customers: {
        Row: {
          address: string | null
          archived: boolean
          code: string | null
          created_at: string
          id: string
          name: string
          note: string | null
          phone: string | null
          user_id: string
          whatsapp: string | null
        }
        Insert: {
          address?: string | null
          archived?: boolean
          code?: string | null
          created_at?: string
          id?: string
          name: string
          note?: string | null
          phone?: string | null
          user_id?: string
          whatsapp?: string | null
        }
        Update: {
          address?: string | null
          archived?: boolean
          code?: string | null
          created_at?: string
          id?: string
          name?: string
          note?: string | null
          phone?: string | null
          user_id?: string
          whatsapp?: string | null
        }
        Relationships: []
      }
      doc_counters: {
        Row: {
          prefix: string
          seq: number
          user_id: string
          year: number
        }
        Insert: {
          prefix: string
          seq?: number
          user_id: string
          year: number
        }
        Update: {
          prefix?: string
          seq?: number
          user_id?: string
          year?: number
        }
        Relationships: []
      }
      expenses: {
        Row: {
          amount: number
          category: string
          created_at: string
          description: string
          expense_date: string
          id: string
          method: string
          note: string | null
          number: string
          user_id: string
        }
        Insert: {
          amount: number
          category?: string
          created_at?: string
          description: string
          expense_date?: string
          id?: string
          method?: string
          note?: string | null
          number: string
          user_id?: string
        }
        Update: {
          amount?: number
          category?: string
          created_at?: string
          description?: string
          expense_date?: string
          id?: string
          method?: string
          note?: string | null
          number?: string
          user_id?: string
        }
        Relationships: []
      }
      payments: {
        Row: {
          amount: number
          created_at: string
          customer_id: string | null
          direction: string
          id: string
          method: string
          note: string | null
          number: string
          paid_at: string
          purchase_id: string | null
          sale_id: string | null
          supplier_id: string | null
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          customer_id?: string | null
          direction: string
          id?: string
          method?: string
          note?: string | null
          number: string
          paid_at?: string
          purchase_id?: string | null
          sale_id?: string | null
          supplier_id?: string | null
          user_id?: string
        }
        Update: {
          amount?: number
          created_at?: string
          customer_id?: string | null
          direction?: string
          id?: string
          method?: string
          note?: string | null
          number?: string
          paid_at?: string
          purchase_id?: string | null
          sale_id?: string | null
          supplier_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_purchase_id_fkey"
            columns: ["purchase_id"]
            isOneToOne: false
            referencedRelation: "purchases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          archived: boolean
          category: string | null
          cost_price: number
          created_at: string
          description: string | null
          id: string
          min_stock: number
          name: string
          sale_price: number
          sku: string | null
          status: string
          stock: number
          supplier_id: string | null
          track_stock: boolean
          unit: string
          user_id: string
        }
        Insert: {
          archived?: boolean
          category?: string | null
          cost_price?: number
          created_at?: string
          description?: string | null
          id?: string
          min_stock?: number
          name: string
          sale_price?: number
          sku?: string | null
          status?: string
          stock?: number
          supplier_id?: string | null
          track_stock?: boolean
          unit?: string
          user_id?: string
        }
        Update: {
          archived?: boolean
          category?: string | null
          cost_price?: number
          created_at?: string
          description?: string | null
          id?: string
          min_stock?: number
          name?: string
          sale_price?: number
          sku?: string | null
          status?: string
          stock?: number
          supplier_id?: string | null
          track_stock?: boolean
          unit?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "products_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          business_name: string | null
          created_at: string
          currency: string
          date_format: string
          full_name: string | null
          id: string
          logo_url: string | null
          notifications_enabled: boolean
          opening_cash: number
          phone: string | null
          theme: string
          updated_at: string
        }
        Insert: {
          business_name?: string | null
          created_at?: string
          currency?: string
          date_format?: string
          full_name?: string | null
          id: string
          logo_url?: string | null
          notifications_enabled?: boolean
          opening_cash?: number
          phone?: string | null
          theme?: string
          updated_at?: string
        }
        Update: {
          business_name?: string | null
          created_at?: string
          currency?: string
          date_format?: string
          full_name?: string | null
          id?: string
          logo_url?: string | null
          notifications_enabled?: boolean
          opening_cash?: number
          phone?: string | null
          theme?: string
          updated_at?: string
        }
        Relationships: []
      }
      purchase_items: {
        Row: {
          id: string
          line_total: number
          product_id: string | null
          product_name: string
          purchase_id: string
          quantity: number
          unit_cost: number
          user_id: string
        }
        Insert: {
          id?: string
          line_total: number
          product_id?: string | null
          product_name: string
          purchase_id: string
          quantity: number
          unit_cost: number
          user_id?: string
        }
        Update: {
          id?: string
          line_total?: number
          product_id?: string | null
          product_name?: string
          purchase_id?: string
          quantity?: number
          unit_cost?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "purchase_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_items_purchase_id_fkey"
            columns: ["purchase_id"]
            isOneToOne: false
            referencedRelation: "purchases"
            referencedColumns: ["id"]
          },
        ]
      }
      purchases: {
        Row: {
          created_at: string
          id: string
          note: string | null
          number: string
          paid: number
          payment_method: string | null
          purchase_date: string
          status: string
          supplier_id: string | null
          total: number
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          note?: string | null
          number: string
          paid?: number
          payment_method?: string | null
          purchase_date?: string
          status?: string
          supplier_id?: string | null
          total?: number
          user_id?: string
        }
        Update: {
          created_at?: string
          id?: string
          note?: string | null
          number?: string
          paid?: number
          payment_method?: string | null
          purchase_date?: string
          status?: string
          supplier_id?: string | null
          total?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "purchases_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      return_items: {
        Row: {
          id: string
          product_id: string | null
          product_name: string
          quantity: number
          return_id: string
          sale_item_id: string | null
          unit_cost: number
          unit_price: number
          user_id: string
        }
        Insert: {
          id?: string
          product_id?: string | null
          product_name: string
          quantity: number
          return_id: string
          sale_item_id?: string | null
          unit_cost?: number
          unit_price: number
          user_id?: string
        }
        Update: {
          id?: string
          product_id?: string | null
          product_name?: string
          quantity?: number
          return_id?: string
          sale_item_id?: string | null
          unit_cost?: number
          unit_price?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "return_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "return_items_return_id_fkey"
            columns: ["return_id"]
            isOneToOne: false
            referencedRelation: "returns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "return_items_sale_item_id_fkey"
            columns: ["sale_item_id"]
            isOneToOne: false
            referencedRelation: "sale_items"
            referencedColumns: ["id"]
          },
        ]
      }
      returns: {
        Row: {
          cogs_returned: number
          customer_id: string | null
          id: string
          number: string
          reason: string | null
          restock: boolean
          returned_at: string
          sale_id: string
          total_refund: number
          user_id: string
        }
        Insert: {
          cogs_returned?: number
          customer_id?: string | null
          id?: string
          number: string
          reason?: string | null
          restock?: boolean
          returned_at?: string
          sale_id: string
          total_refund?: number
          user_id?: string
        }
        Update: {
          cogs_returned?: number
          customer_id?: string | null
          id?: string
          number?: string
          reason?: string | null
          restock?: boolean
          returned_at?: string
          sale_id?: string
          total_refund?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "returns_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "returns_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
        ]
      }
      sale_items: {
        Row: {
          id: string
          line_total: number
          product_id: string | null
          product_name: string
          quantity: number
          returned_quantity: number
          sale_id: string
          unit_cost: number
          unit_price: number
          user_id: string
        }
        Insert: {
          id?: string
          line_total: number
          product_id?: string | null
          product_name: string
          quantity: number
          returned_quantity?: number
          sale_id: string
          unit_cost?: number
          unit_price: number
          user_id?: string
        }
        Update: {
          id?: string
          line_total?: number
          product_id?: string | null
          product_name?: string
          quantity?: number
          returned_quantity?: number
          sale_id?: string
          unit_cost?: number
          unit_price?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sale_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sale_items_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
        ]
      }
      sales: {
        Row: {
          cogs: number
          created_at: string
          customer_id: string | null
          discount: number
          id: string
          note: string | null
          number: string
          paid: number
          payment_method: string | null
          refunded: number
          sale_date: string
          status: string
          subtotal: number
          total: number
          user_id: string
        }
        Insert: {
          cogs?: number
          created_at?: string
          customer_id?: string | null
          discount?: number
          id?: string
          note?: string | null
          number: string
          paid?: number
          payment_method?: string | null
          refunded?: number
          sale_date?: string
          status?: string
          subtotal?: number
          total?: number
          user_id?: string
        }
        Update: {
          cogs?: number
          created_at?: string
          customer_id?: string | null
          discount?: number
          id?: string
          note?: string | null
          number?: string
          paid?: number
          payment_method?: string | null
          refunded?: number
          sale_date?: string
          status?: string
          subtotal?: number
          total?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sales_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_movements: {
        Row: {
          id: string
          note: string | null
          occurred_at: string
          product_id: string
          quantity_delta: number
          reference_id: string | null
          reference_type: string | null
          type: string
          user_id: string
        }
        Insert: {
          id?: string
          note?: string | null
          occurred_at?: string
          product_id: string
          quantity_delta: number
          reference_id?: string | null
          reference_type?: string | null
          type: string
          user_id?: string
        }
        Update: {
          id?: string
          note?: string | null
          occurred_at?: string
          product_id?: string
          quantity_delta?: number
          reference_id?: string | null
          reference_type?: string | null
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "stock_movements_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      suppliers: {
        Row: {
          address: string | null
          archived: boolean
          created_at: string
          id: string
          name: string
          note: string | null
          phone: string | null
          user_id: string
          whatsapp: string | null
        }
        Insert: {
          address?: string | null
          archived?: boolean
          created_at?: string
          id?: string
          name: string
          note?: string | null
          phone?: string | null
          user_id?: string
          whatsapp?: string | null
        }
        Update: {
          address?: string | null
          archived?: boolean
          created_at?: string
          id?: string
          name?: string
          note?: string | null
          phone?: string | null
          user_id?: string
          whatsapp?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      next_doc_number: { Args: { _prefix: string }; Returns: string }
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
    Enums: {},
  },
} as const
