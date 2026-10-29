// Generated from the Supabase schema (project otldqopaahowfbongesg). Regenerate after every migration.
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
      activity_log: {
        Row: {
          action: string
          actor_id: string | null
          after: Json | null
          before: Json | null
          created_at: string
          entity_id: string | null
          entity_type: string
          id: string
          updated_at: string
        }
        Insert: {
          action: string
          actor_id?: string | null
          after?: Json | null
          before?: Json | null
          created_at?: string
          entity_id?: string | null
          entity_type: string
          id?: string
          updated_at?: string
        }
        Update: {
          action?: string
          actor_id?: string | null
          after?: Json | null
          before?: Json | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string
          id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "activity_log_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_applications: {
        Row: {
          city: string
          cnic: string | null
          created_at: string
          email: string
          full_name: string
          id: string
          note: string | null
          phone: string
          phone_normalized: string | null
          profile_id: string | null
          rejection_reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          source: string
          status: Database["public"]["Enums"]["application_status"]
          updated_at: string
          whatsapp: string | null
        }
        Insert: {
          city: string
          cnic?: string | null
          created_at?: string
          email: string
          full_name: string
          id?: string
          note?: string | null
          phone: string
          phone_normalized?: string | null
          profile_id?: string | null
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          source?: string
          status?: Database["public"]["Enums"]["application_status"]
          updated_at?: string
          whatsapp?: string | null
        }
        Update: {
          city?: string
          cnic?: string | null
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          note?: string | null
          phone?: string
          phone_normalized?: string | null
          profile_id?: string | null
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          source?: string
          status?: Database["public"]["Enums"]["application_status"]
          updated_at?: string
          whatsapp?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "agent_applications_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_applications_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_invites: {
        Row: {
          created_at: string
          created_by: string | null
          expires_at: string
          id: string
          profile_id: string
          revoked_at: string | null
          token_hash: string
          updated_at: string
          used_at: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          expires_at: string
          id?: string
          profile_id: string
          revoked_at?: string | null
          token_hash: string
          updated_at?: string
          used_at?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          expires_at?: string
          id?: string
          profile_id?: string
          revoked_at?: string | null
          token_hash?: string
          updated_at?: string
          used_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "agent_invites_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_invites_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_targets: {
        Row: {
          agent_id: string
          created_at: string
          id: string
          month: string
          target_amount_pkr: number
          updated_at: string
        }
        Insert: {
          agent_id: string
          created_at?: string
          id?: string
          month: string
          target_amount_pkr: number
          updated_at?: string
        }
        Update: {
          agent_id?: string
          created_at?: string
          id?: string
          month?: string
          target_amount_pkr?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "agent_targets_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      app_settings: {
        Row: {
          created_at: string
          id: string
          key: string
          updated_at: string
          value: Json
        }
        Insert: {
          created_at?: string
          id?: string
          key: string
          updated_at?: string
          value: Json
        }
        Update: {
          created_at?: string
          id?: string
          key?: string
          updated_at?: string
          value?: Json
        }
        Relationships: []
      }
      application_attempts: {
        Row: {
          created_at: string
          id: string
          ip_hash: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          ip_hash: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          ip_hash?: string
          updated_at?: string
        }
        Relationships: []
      }
      auth_attempts: {
        Row: {
          created_at: string
          email_hash: string
          id: number
          ip_hash: string
          kind: string
          success: boolean
        }
        Insert: {
          created_at?: string
          email_hash: string
          id?: never
          ip_hash: string
          kind: string
          success?: boolean
        }
        Update: {
          created_at?: string
          email_hash?: string
          id?: never
          ip_hash?: string
          kind?: string
          success?: boolean
        }
        Relationships: []
      }
      client_owner_history: {
        Row: {
          agent_id: string
          client_id: string
          created_at: string
          from_date: string
          id: string
          to_date: string | null
          updated_at: string
        }
        Insert: {
          agent_id: string
          client_id: string
          created_at?: string
          from_date: string
          id?: string
          to_date?: string | null
          updated_at?: string
        }
        Update: {
          agent_id?: string
          client_id?: string
          created_at?: string
          from_date?: string
          id?: string
          to_date?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_owner_history_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_owner_history_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      client_payments: {
        Row: {
          agent_id: string
          amount_pkr: number
          billing_month: string | null
          created_at: string
          deal_id: string
          id: string
          method: Database["public"]["Enums"]["payment_method"]
          note: string | null
          paid_on: string
          proof_file_path: string | null
          refund_of: string | null
          rejection_reason: string | null
          status: Database["public"]["Enums"]["payment_status"]
          updated_at: string
          verified_at: string | null
          verified_by: string | null
        }
        Insert: {
          agent_id: string
          amount_pkr: number
          billing_month?: string | null
          created_at?: string
          deal_id: string
          id?: string
          method: Database["public"]["Enums"]["payment_method"]
          note?: string | null
          paid_on: string
          proof_file_path?: string | null
          refund_of?: string | null
          rejection_reason?: string | null
          status?: Database["public"]["Enums"]["payment_status"]
          updated_at?: string
          verified_at?: string | null
          verified_by?: string | null
        }
        Update: {
          agent_id?: string
          amount_pkr?: number
          billing_month?: string | null
          created_at?: string
          deal_id?: string
          id?: string
          method?: Database["public"]["Enums"]["payment_method"]
          note?: string | null
          paid_on?: string
          proof_file_path?: string | null
          refund_of?: string | null
          rejection_reason?: string | null
          status?: Database["public"]["Enums"]["payment_status"]
          updated_at?: string
          verified_at?: string | null
          verified_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "client_payments_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_payments_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_payments_refund_of_fkey"
            columns: ["refund_of"]
            isOneToOne: false
            referencedRelation: "client_payments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_payments_verified_by_fkey"
            columns: ["verified_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          business_name: string | null
          city: string | null
          created_at: string
          email: string | null
          id: string
          lead_id: string | null
          name: string
          owner_agent_id: string
          phone: string
          phone_normalized: string | null
          updated_at: string
          whatsapp: string | null
        }
        Insert: {
          business_name?: string | null
          city?: string | null
          created_at?: string
          email?: string | null
          id?: string
          lead_id?: string | null
          name: string
          owner_agent_id: string
          phone: string
          phone_normalized?: string | null
          updated_at?: string
          whatsapp?: string | null
        }
        Update: {
          business_name?: string | null
          city?: string | null
          created_at?: string
          email?: string | null
          id?: string
          lead_id?: string | null
          name?: string
          owner_agent_id?: string
          phone?: string
          phone_normalized?: string | null
          updated_at?: string
          whatsapp?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "clients_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clients_owner_agent_id_fkey"
            columns: ["owner_agent_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      commission_entries: {
        Row: {
          adjusts_entry_id: string | null
          agent_id: string
          amount_pkr: number
          base_amount_pkr: number
          created_at: string
          deal_id: string
          description: string
          id: string
          kind: Database["public"]["Enums"]["entry_kind"]
          month: string
          note: string | null
          payment_id: string
          rate_percent: number
          updated_at: string
        }
        Insert: {
          adjusts_entry_id?: string | null
          agent_id: string
          amount_pkr: number
          base_amount_pkr: number
          created_at?: string
          deal_id: string
          description: string
          id?: string
          kind: Database["public"]["Enums"]["entry_kind"]
          month: string
          note?: string | null
          payment_id: string
          rate_percent: number
          updated_at?: string
        }
        Update: {
          adjusts_entry_id?: string | null
          agent_id?: string
          amount_pkr?: number
          base_amount_pkr?: number
          created_at?: string
          deal_id?: string
          description?: string
          id?: string
          kind?: Database["public"]["Enums"]["entry_kind"]
          month?: string
          note?: string | null
          payment_id?: string
          rate_percent?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "commission_entries_adjusts_entry_id_fkey"
            columns: ["adjusts_entry_id"]
            isOneToOne: false
            referencedRelation: "commission_entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commission_entries_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commission_entries_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commission_entries_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "client_payments"
            referencedColumns: ["id"]
          },
        ]
      }
      commission_payouts: {
        Row: {
          agent_id: string
          amount_pkr: number
          created_at: string
          id: string
          method: Database["public"]["Enums"]["payment_method"]
          note: string | null
          paid_on: string
          recorded_by: string
          reference: string | null
          updated_at: string
        }
        Insert: {
          agent_id: string
          amount_pkr: number
          created_at?: string
          id?: string
          method: Database["public"]["Enums"]["payment_method"]
          note?: string | null
          paid_on: string
          recorded_by: string
          reference?: string | null
          updated_at?: string
        }
        Update: {
          agent_id?: string
          amount_pkr?: number
          created_at?: string
          id?: string
          method?: Database["public"]["Enums"]["payment_method"]
          note?: string | null
          paid_on?: string
          recorded_by?: string
          reference?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "commission_payouts_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commission_payouts_recorded_by_fkey"
            columns: ["recorded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      commission_periods: {
        Row: {
          agent_id: string
          collected_amount_pkr: number
          commission_amount_pkr: number
          created_at: string
          id: string
          locked_at: string | null
          locked_by: string | null
          month: string
          status: Database["public"]["Enums"]["period_status"]
          updated_at: string
        }
        Insert: {
          agent_id: string
          collected_amount_pkr?: number
          commission_amount_pkr?: number
          created_at?: string
          id?: string
          locked_at?: string | null
          locked_by?: string | null
          month: string
          status?: Database["public"]["Enums"]["period_status"]
          updated_at?: string
        }
        Update: {
          agent_id?: string
          collected_amount_pkr?: number
          commission_amount_pkr?: number
          created_at?: string
          id?: string
          locked_at?: string | null
          locked_by?: string | null
          month?: string
          status?: Database["public"]["Enums"]["period_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "commission_periods_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commission_periods_locked_by_fkey"
            columns: ["locked_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      commission_tiers: {
        Row: {
          created_at: string
          created_by: string | null
          effective_from: string
          id: string
          kind: Database["public"]["Enums"]["tier_kind"]
          max_amount_pkr: number | null
          min_amount_pkr: number
          rate_percent: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          effective_from: string
          id?: string
          kind: Database["public"]["Enums"]["tier_kind"]
          max_amount_pkr?: number | null
          min_amount_pkr: number
          rate_percent: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          effective_from?: string
          id?: string
          kind?: Database["public"]["Enums"]["tier_kind"]
          max_amount_pkr?: number | null
          min_amount_pkr?: number
          rate_percent?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "commission_tiers_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      deal_notes: {
        Row: {
          author_id: string
          body: string
          created_at: string
          deal_id: string | null
          id: string
          lead_id: string | null
          updated_at: string
        }
        Insert: {
          author_id: string
          body: string
          created_at?: string
          deal_id?: string | null
          id?: string
          lead_id?: string | null
          updated_at?: string
        }
        Update: {
          author_id?: string
          body?: string
          created_at?: string
          deal_id?: string | null
          id?: string
          lead_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "deal_notes_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deal_notes_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deal_notes_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      deals: {
        Row: {
          agent_id: string
          approved_at: string | null
          approved_by: string | null
          cancelled_at: string | null
          client_id: string
          completed_at: string | null
          created_at: string
          deal_type: Database["public"]["Enums"]["deal_type"]
          description: string | null
          end_month: string | null
          follow_up_notified_at: string | null
          id: string
          monthly_fee_pkr: number | null
          new_sale_rate_percent: number | null
          new_sale_tier_id: string | null
          next_follow_up_at: string | null
          original_agent_id: string
          recurring_rate_percent: number | null
          recurring_tier_id: string | null
          rejection_reason: string | null
          service_id: string
          start_month: string | null
          status: Database["public"]["Enums"]["deal_status"]
          total_amount_pkr: number | null
          updated_at: string
        }
        Insert: {
          agent_id: string
          approved_at?: string | null
          approved_by?: string | null
          cancelled_at?: string | null
          client_id: string
          completed_at?: string | null
          created_at?: string
          deal_type: Database["public"]["Enums"]["deal_type"]
          description?: string | null
          end_month?: string | null
          follow_up_notified_at?: string | null
          id?: string
          monthly_fee_pkr?: number | null
          new_sale_rate_percent?: number | null
          new_sale_tier_id?: string | null
          next_follow_up_at?: string | null
          original_agent_id: string
          recurring_rate_percent?: number | null
          recurring_tier_id?: string | null
          rejection_reason?: string | null
          service_id: string
          start_month?: string | null
          status?: Database["public"]["Enums"]["deal_status"]
          total_amount_pkr?: number | null
          updated_at?: string
        }
        Update: {
          agent_id?: string
          approved_at?: string | null
          approved_by?: string | null
          cancelled_at?: string | null
          client_id?: string
          completed_at?: string | null
          created_at?: string
          deal_type?: Database["public"]["Enums"]["deal_type"]
          description?: string | null
          end_month?: string | null
          follow_up_notified_at?: string | null
          id?: string
          monthly_fee_pkr?: number | null
          new_sale_rate_percent?: number | null
          new_sale_tier_id?: string | null
          next_follow_up_at?: string | null
          original_agent_id?: string
          recurring_rate_percent?: number | null
          recurring_tier_id?: string | null
          rejection_reason?: string | null
          service_id?: string
          start_month?: string | null
          status?: Database["public"]["Enums"]["deal_status"]
          total_amount_pkr?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "deals_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deals_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deals_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deals_new_sale_tier_id_fkey"
            columns: ["new_sale_tier_id"]
            isOneToOne: false
            referencedRelation: "commission_tiers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deals_original_agent_id_fkey"
            columns: ["original_agent_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deals_recurring_tier_id_fkey"
            columns: ["recurring_tier_id"]
            isOneToOne: false
            referencedRelation: "commission_tiers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deals_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      leads: {
        Row: {
          business_name: string | null
          city: string | null
          client_id: string | null
          client_name: string
          created_at: string
          follow_up_notified_at: string | null
          id: string
          interested_services: string[]
          next_follow_up_at: string | null
          notes: string | null
          owner_agent_id: string
          phone: string
          phone_normalized: string | null
          source: string | null
          status: Database["public"]["Enums"]["lead_status"]
          updated_at: string
          whatsapp: string | null
        }
        Insert: {
          business_name?: string | null
          city?: string | null
          client_id?: string | null
          client_name: string
          created_at?: string
          follow_up_notified_at?: string | null
          id?: string
          interested_services?: string[]
          next_follow_up_at?: string | null
          notes?: string | null
          owner_agent_id: string
          phone: string
          phone_normalized?: string | null
          source?: string | null
          status?: Database["public"]["Enums"]["lead_status"]
          updated_at?: string
          whatsapp?: string | null
        }
        Update: {
          business_name?: string | null
          city?: string | null
          client_id?: string | null
          client_name?: string
          created_at?: string
          follow_up_notified_at?: string | null
          id?: string
          interested_services?: string[]
          next_follow_up_at?: string | null
          notes?: string | null
          owner_agent_id?: string
          phone?: string
          phone_normalized?: string | null
          source?: string | null
          status?: Database["public"]["Enums"]["lead_status"]
          updated_at?: string
          whatsapp?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "leads_client_fk"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_owner_agent_id_fkey"
            columns: ["owner_agent_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      monthly_due_alerts: {
        Row: {
          created_at: string
          deal_id: string
          id: string
          month: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          deal_id: string
          id?: string
          month: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          deal_id?: string
          id?: string
          month?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "monthly_due_alerts_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string
          emailed_at: string | null
          id: string
          link: string | null
          read_at: string | null
          title: string
          type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          emailed_at?: string | null
          id?: string
          link?: string | null
          read_at?: string | null
          title: string
          type: string
          updated_at?: string
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string
          emailed_at?: string | null
          id?: string
          link?: string | null
          read_at?: string | null
          title?: string
          type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      policy_acceptances: {
        Row: {
          accepted_at: string
          agent_id: string
          cnic: string
          created_at: string
          id: string
          ip_address: string | null
          language: string
          policy_version: string
          typed_name: string
          updated_at: string
          user_agent: string | null
        }
        Insert: {
          accepted_at?: string
          agent_id: string
          cnic: string
          created_at?: string
          id?: string
          ip_address?: string | null
          language: string
          policy_version: string
          typed_name: string
          updated_at?: string
          user_agent?: string | null
        }
        Update: {
          accepted_at?: string
          agent_id?: string
          cnic?: string
          created_at?: string
          id?: string
          ip_address?: string | null
          language?: string
          policy_version?: string
          typed_name?: string
          updated_at?: string
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "policy_acceptances_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          city: string | null
          created_at: string
          email: string
          full_name: string
          id: string
          is_active: boolean
          phone: string | null
          role: Database["public"]["Enums"]["user_role"]
          updated_at: string
          whatsapp: string | null
        }
        Insert: {
          avatar_url?: string | null
          city?: string | null
          created_at?: string
          email: string
          full_name: string
          id: string
          is_active?: boolean
          phone?: string | null
          role: Database["public"]["Enums"]["user_role"]
          updated_at?: string
          whatsapp?: string | null
        }
        Update: {
          avatar_url?: string | null
          city?: string | null
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          is_active?: boolean
          phone?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
          whatsapp?: string | null
        }
        Relationships: []
      }
      services: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      ceo_id: { Args: never; Returns: string }
      check_contact: { Args: { p_phone: string }; Returns: string }
      current_viewer: {
        Args: never
        Returns: {
          email: string
          full_name: string
          id: string
          is_active: boolean
          mfa_enrolled: boolean
          role: Database["public"]["Enums"]["user_role"]
        }[]
      }
      fmt_pkr: { Args: { v: number }; Returns: string }
      is_active_agent: { Args: never; Returns: boolean }
      is_ceo: { Args: never; Returns: boolean }
      is_service: { Args: never; Returns: boolean }
      karachi_today: { Args: never; Returns: string }
      leaderboard: {
        Args: { p_month: string }
        Returns: {
          agent_id: string
          collected_pkr: number
          full_name: string
          is_me: boolean
          rank: number
          share_percent: number
        }[]
      }
      month_start: { Args: { d: string }; Returns: string }
      normalize_phone: { Args: { p: string }; Returns: string }
      notify: {
        Args: {
          p_body: string
          p_link: string
          p_title: string
          p_type: string
          p_user: string
        }
        Returns: undefined
      }
      phone_owned_by_other: {
        Args: { p_owner: string; p_phone: string }
        Returns: boolean
      }
      record_refund: {
        Args: {
          p_amount: number
          p_entries: Json
          p_method: Database["public"]["Enums"]["payment_method"]
          p_note: string
          p_original: string
          p_paid_on: string
        }
        Returns: string
      }
      verify_payment: {
        Args: { p_entries: Json; p_payment_id: string }
        Returns: undefined
      }
    }
    Enums: {
      application_status: "pending" | "approved" | "rejected"
      deal_status:
        | "pending_approval"
        | "approved"
        | "rejected"
        | "completed"
        | "cancelled"
      deal_type: "one_time" | "monthly"
      entry_kind: "new_sale" | "recurring" | "adjustment"
      lead_status:
        | "new"
        | "contacted"
        | "interested"
        | "not_interested"
        | "converted"
        | "lost"
      payment_method:
        | "cash"
        | "bank_transfer"
        | "jazzcash"
        | "easypaisa"
        | "other"
      payment_status: "pending_verification" | "verified" | "rejected"
      period_status: "open" | "locked"
      tier_kind: "new_sale" | "recurring"
      user_role: "ceo" | "agent"
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
      application_status: ["pending", "approved", "rejected"],
      deal_status: [
        "pending_approval",
        "approved",
        "rejected",
        "completed",
        "cancelled",
      ],
      deal_type: ["one_time", "monthly"],
      entry_kind: ["new_sale", "recurring", "adjustment"],
      lead_status: [
        "new",
        "contacted",
        "interested",
        "not_interested",
        "converted",
        "lost",
      ],
      payment_method: [
        "cash",
        "bank_transfer",
        "jazzcash",
        "easypaisa",
        "other",
      ],
      payment_status: ["pending_verification", "verified", "rejected"],
      period_status: ["open", "locked"],
      tier_kind: ["new_sale", "recurring"],
      user_role: ["ceo", "agent"],
    },
  },
} as const
