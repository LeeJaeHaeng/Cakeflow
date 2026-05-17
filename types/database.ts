// Auto-generated from Supabase + app aliases.
// Run: supabase gen types typescript --linked > types/database.ts (then re-add aliases below)

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      analytics_daily: {
        Row: {
          created_at: string
          date: string
          new_customers: number
          order_count: number
          revenue: number
          review_count: number
          simulator_used: number
        }
        Insert: {
          created_at?: string
          date: string
          new_customers?: number
          order_count?: number
          revenue?: number
          review_count?: number
          simulator_used?: number
        }
        Update: {
          created_at?: string
          date?: string
          new_customers?: number
          order_count?: number
          revenue?: number
          review_count?: number
          simulator_used?: number
        }
        Relationships: []
      }
      cake_designs: {
        Row: {
          categories: Database["public"]["Enums"]["design_category"][]
          color_tags: string[]
          created_at: string
          deleted_at: string | null
          description: string | null
          display_status: string
          id: string
          order_count: number
          price_from: number
          simulator_enabled: boolean
          simulator_template_url: string | null
          style_tags: string[]
          thumbnail_url: string
          title: string
          updated_at: string
          view_count: number
        }
        Insert: {
          categories?: Database["public"]["Enums"]["design_category"][]
          color_tags?: string[]
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          display_status?: string
          id?: string
          order_count?: number
          price_from: number
          simulator_enabled?: boolean
          simulator_template_url?: string | null
          style_tags?: string[]
          thumbnail_url: string
          title: string
          updated_at?: string
          view_count?: number
        }
        Update: {
          categories?: Database["public"]["Enums"]["design_category"][]
          color_tags?: string[]
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          display_status?: string
          id?: string
          order_count?: number
          price_from?: number
          simulator_enabled?: boolean
          simulator_template_url?: string | null
          style_tags?: string[]
          thumbnail_url?: string
          title?: string
          updated_at?: string
          view_count?: number
        }
        Relationships: []
      }
      customers: {
        Row: {
          allergy: string | null
          created_at: string
          id: string
          memo: string | null
          name: string
          phone: string
          total_amount: number
          total_orders: number
          updated_at: string
          vip_flag: boolean
        }
        Insert: {
          allergy?: string | null
          created_at?: string
          id?: string
          memo?: string | null
          name: string
          phone: string
          total_amount?: number
          total_orders?: number
          updated_at?: string
          vip_flag?: boolean
        }
        Update: {
          allergy?: string | null
          created_at?: string
          id?: string
          memo?: string | null
          name?: string
          phone?: string
          total_amount?: number
          total_orders?: number
          updated_at?: string
          vip_flag?: boolean
        }
        Relationships: []
      }
      design_images: {
        Row: {
          design_id: string
          id: string
          sort_order: number
          url: string
        }
        Insert: {
          design_id: string
          id?: string
          sort_order?: number
          url: string
        }
        Update: {
          design_id?: string
          id?: string
          sort_order?: number
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "design_images_design_id_fkey"
            columns: ["design_id"]
            isOneToOne: false
            referencedRelation: "cake_designs"
            referencedColumns: ["id"]
          },
        ]
      }
      dessert_products: {
        Row: {
          category: string | null
          cost: number | null
          created_at: string
          deleted_at: string | null
          description: string | null
          id: string
          options_json: Json | null
          price: number
          status: string
          stock_count: number
          thumbnail_url: string | null
          title: string
          updated_at: string
        }
        Insert: {
          category?: string | null
          cost?: number | null
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          id?: string
          options_json?: Json | null
          price: number
          status?: string
          stock_count?: number
          thumbnail_url?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          category?: string | null
          cost?: number | null
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          id?: string
          options_json?: Json | null
          price?: number
          status?: string
          stock_count?: number
          thumbnail_url?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      order_images: {
        Row: {
          created_at: string
          id: string
          order_id: string
          url: string
        }
        Insert: {
          created_at?: string
          id?: string
          order_id: string
          url: string
        }
        Update: {
          created_at?: string
          id?: string
          order_id?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_images_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      order_items: {
        Row: {
          cake_design_id: string | null
          dessert_id: string | null
          id: string
          options_json: Json | null
          order_id: string
          product_type: Database["public"]["Enums"]["order_type"]
          quantity: number
          unit_price: number
        }
        Insert: {
          cake_design_id?: string | null
          dessert_id?: string | null
          id?: string
          options_json?: Json | null
          order_id: string
          product_type: Database["public"]["Enums"]["order_type"]
          quantity: number
          unit_price: number
        }
        Update: {
          cake_design_id?: string | null
          dessert_id?: string | null
          id?: string
          options_json?: Json | null
          order_id?: string
          product_type?: Database["public"]["Enums"]["order_type"]
          quantity?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "order_items_cake_design_id_fkey"
            columns: ["cake_design_id"]
            isOneToOne: false
            referencedRelation: "cake_designs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_dessert_id_fkey"
            columns: ["dessert_id"]
            isOneToOne: false
            referencedRelation: "dessert_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          admin_memo: string | null
          created_at: string
          customer_id: string
          customer_message: string | null
          delivery_method: Database["public"]["Enums"]["delivery_method"]
          deposit_amount: number
          id: string
          order_number: string
          order_type: Database["public"]["Enums"]["order_type"]
          payment_status: Database["public"]["Enums"]["payment_status"]
          pickup_date: string
          pickup_time: string | null
          simulator_session_id: string | null
          status: Database["public"]["Enums"]["order_status"]
          total_price: number
          updated_at: string
        }
        Insert: {
          admin_memo?: string | null
          created_at?: string
          customer_id: string
          customer_message?: string | null
          delivery_method?: Database["public"]["Enums"]["delivery_method"]
          deposit_amount?: number
          id?: string
          order_number: string
          order_type: Database["public"]["Enums"]["order_type"]
          payment_status?: Database["public"]["Enums"]["payment_status"]
          pickup_date: string
          pickup_time?: string | null
          simulator_session_id?: string | null
          status?: Database["public"]["Enums"]["order_status"]
          total_price: number
          updated_at?: string
        }
        Update: {
          admin_memo?: string | null
          created_at?: string
          customer_id?: string
          customer_message?: string | null
          delivery_method?: Database["public"]["Enums"]["delivery_method"]
          deposit_amount?: number
          id?: string
          order_number?: string
          order_type?: Database["public"]["Enums"]["order_type"]
          payment_status?: Database["public"]["Enums"]["payment_status"]
          pickup_date?: string
          pickup_time?: string | null
          simulator_session_id?: string | null
          status?: Database["public"]["Enums"]["order_status"]
          total_price?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_simulator_session_id_fkey"
            columns: ["simulator_session_id"]
            isOneToOne: false
            referencedRelation: "simulator_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      otp_requests: {
        Row: {
          code: string
          created_at: string
          expires_at: string
          id: string
          phone: string
          verified: boolean
        }
        Insert: {
          code: string
          created_at?: string
          expires_at: string
          id?: string
          phone: string
          verified?: boolean
        }
        Update: {
          code?: string
          created_at?: string
          expires_at?: string
          id?: string
          phone?: string
          verified?: boolean
        }
        Relationships: []
      }
      payments: {
        Row: {
          amount: number
          created_at: string
          id: string
          method: string
          order_id: string
          paid_at: string | null
          pg_transaction_id: string | null
          status: string
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          method: string
          order_id: string
          paid_at?: string | null
          pg_transaction_id?: string | null
          status?: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          method?: string
          order_id?: string
          paid_at?: string | null
          pg_transaction_id?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      product_images: {
        Row: {
          id: string
          product_id: string
          sort_order: number
          url: string
        }
        Insert: {
          id?: string
          product_id: string
          sort_order?: number
          url: string
        }
        Update: {
          id?: string
          product_id?: string
          sort_order?: number
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_images_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "dessert_products"
            referencedColumns: ["id"]
          },
        ]
      }
      reviews: {
        Row: {
          content: string | null
          created_at: string
          customer_id: string
          id: string
          image_url: string | null
          order_id: string
          rating: number
        }
        Insert: {
          content?: string | null
          created_at?: string
          customer_id: string
          id?: string
          image_url?: string | null
          order_id: string
          rating: number
        }
        Update: {
          content?: string | null
          created_at?: string
          customer_id?: string
          id?: string
          image_url?: string | null
          order_id?: string
          rating?: number
        }
        Relationships: [
          {
            foreignKeyName: "reviews_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      shop_capacity: {
        Row: {
          current_count: number
          date: string
          is_holiday: boolean
          max_orders: number
          note: string | null
        }
        Insert: {
          current_count?: number
          date: string
          is_holiday?: boolean
          max_orders?: number
          note?: string | null
        }
        Update: {
          current_count?: number
          date?: string
          is_holiday?: boolean
          max_orders?: number
          note?: string | null
        }
        Relationships: []
      }
      simulator_sessions: {
        Row: {
          anonymous_token: string
          created_at: string
          design_id: string | null
          expires_at: string
          finalized_at: string | null
          id: string
          preview_url: string | null
          production_url: string | null
          state_json: Json
          summary: Json | null
        }
        Insert: {
          anonymous_token: string
          created_at?: string
          design_id?: string | null
          expires_at: string
          finalized_at?: string | null
          id?: string
          preview_url?: string | null
          production_url?: string | null
          state_json?: Json
          summary?: Json | null
        }
        Update: {
          anonymous_token?: string
          created_at?: string
          design_id?: string | null
          expires_at?: string
          finalized_at?: string | null
          id?: string
          preview_url?: string | null
          production_url?: string | null
          state_json?: Json
          summary?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "simulator_sessions_design_id_fkey"
            columns: ["design_id"]
            isOneToOne: false
            referencedRelation: "cake_designs"
            referencedColumns: ["id"]
          },
        ]
      }
      sns_posts: {
        Row: {
          caption: string | null
          created_at: string
          hashtags: string[]
          id: string
          image_urls: string[]
          platform: string
          published_at: string | null
          scheduled_at: string | null
          status: string
        }
        Insert: {
          caption?: string | null
          created_at?: string
          hashtags?: string[]
          id?: string
          image_urls?: string[]
          platform?: string
          published_at?: string | null
          scheduled_at?: string | null
          status?: string
        }
        Update: {
          caption?: string | null
          created_at?: string
          hashtags?: string[]
          id?: string
          image_urls?: string[]
          platform?: string
          published_at?: string | null
          scheduled_at?: string | null
          status?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      delivery_method: "pickup" | "delivery"
      design_category:
        | "birthday"
        | "first_birthday"
        | "anniversary"
        | "couple"
        | "wedding"
        | "parents_day"
        | "custom"
        | "rice_cake"
        | "flower"
      order_status:
        | "pending"
        | "confirmed"
        | "producing"
        | "ready"
        | "completed"
        | "cancelled"
        | "refunded"
      order_type: "cake" | "dessert"
      payment_status: "unpaid" | "partial" | "paid" | "refunded"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

// ============================================================
// Convenience type aliases for application code
// ============================================================

export type DesignCategory = Database["public"]["Enums"]["design_category"]
export type OrderType = Database["public"]["Enums"]["order_type"]
export type OrderStatus = Database["public"]["Enums"]["order_status"]
export type DeliveryMethod = Database["public"]["Enums"]["delivery_method"]
export type PaymentStatus = Database["public"]["Enums"]["payment_status"]
export type QuoteStatus = "not_required" | "pending_quote" | "quoted" | "accepted" | "expired"
export type NotificationChannel = "alimtalk" | "sms"
export type NotificationStatus = "pending" | "sent" | "failed" | "fallback_sent"

export type CakeDesign = Database["public"]["Tables"]["cake_designs"]["Row"]
export type DesignImage = Database["public"]["Tables"]["design_images"]["Row"]
export type Customer = Database["public"]["Tables"]["customers"]["Row"]
export type DessertProduct = Database["public"]["Tables"]["dessert_products"]["Row"]
export type SimulatorSession = Database["public"]["Tables"]["simulator_sessions"]["Row"]
export type Order = Database["public"]["Tables"]["orders"]["Row"]
export type OrderItem = Database["public"]["Tables"]["order_items"]["Row"]
export type Payment = Database["public"]["Tables"]["payments"]["Row"]
export type Review = Database["public"]["Tables"]["reviews"]["Row"]
export type ShopCapacity = Database["public"]["Tables"]["shop_capacity"]["Row"]
export type OtpRequest = Database["public"]["Tables"]["otp_requests"]["Row"]

export interface PortOnePaymentRecord {
  id: string
  order_id: string
  payment_id: string
  portone_transaction_id: string | null
  channel_key: string | null
  method: string
  amount: number
  status: string
  raw_payload: Json
  paid_at: string | null
  created_at: string
}

export interface SimulatorSummary {
  fonts: string[]
  texts: string[]
  colors: string[]
  stickers: string[]
}
