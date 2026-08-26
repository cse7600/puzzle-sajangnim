export type Json = string | number | boolean | null | { [key: string]: Json } | Json[]

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          email: string
          role: string | null
          profile_data: Json
          kakao_id: string | null
          name: string
          phone: string | null
          business_name: string | null
          business_type: string | null
          total_points: number
          referral_code: string
          referred_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          email?: string
          role?: string | null
          profile_data?: Json
          kakao_id?: string | null
          name: string
          phone?: string | null
          business_name?: string | null
          business_type?: string | null
          referral_code: string
          referred_by?: string | null
        }
        Update: {
          email?: string
          role?: string | null
          profile_data?: Json
          kakao_id?: string | null
          name?: string
          phone?: string | null
          business_name?: string | null
          business_type?: string | null
          referral_code?: string
          referred_by?: string | null
          total_points?: number
          updated_at?: string
        }
        Relationships: []
      }
      ad_accounts: {
        Row: {
          id: string
          user_id: string
          platform: 'naver' | 'meta' | 'google' | 'kakao' | 'toss' | 'danggeun' | 'naver_gfa'
          account_id: string
          account_name: string
          monthly_spend: number
          payback_rate: number
          status: 'pending' | 'approval_requested' | 'active' | 'rejected'
          verified_at: string | null
          created_at: string
          transfer_status: 'waiting' | 'transfer_needed' | 'verifying' | 'completed'
          connection_status: 'duplicate' | 'reviewing' | 'connected'
          duplicate_of: string | null
          api_credentials: Json
          cost_verification_status: 'not_configured' | 'configured' | 'verified' | 'failed'
          verified_spend: number | null
          contact_email: string | null
          contact_phone: string | null
          tax_invoice_direct: boolean
        }
        Insert: {
          user_id: string
          platform: 'naver' | 'meta' | 'google' | 'kakao' | 'toss' | 'danggeun' | 'naver_gfa'
          account_id: string
          account_name: string
          monthly_spend: number
          payback_rate: number
          status?: 'pending' | 'approval_requested' | 'active' | 'rejected'
          verified_at?: string | null
          transfer_status?: 'waiting' | 'transfer_needed' | 'verifying' | 'completed'
          connection_status?: 'duplicate' | 'reviewing' | 'connected'
          duplicate_of?: string | null
          api_credentials?: Json
          cost_verification_status?: 'not_configured' | 'configured' | 'verified' | 'failed'
          verified_spend?: number | null
          contact_email?: string | null
          contact_phone?: string | null
          tax_invoice_direct?: boolean
        }
        Update: {
          user_id?: string
          platform?: 'naver' | 'meta' | 'google' | 'kakao' | 'toss' | 'danggeun' | 'naver_gfa'
          account_id?: string
          account_name?: string
          monthly_spend?: number
          payback_rate?: number
          status?: 'pending' | 'approval_requested' | 'active' | 'rejected'
          verified_at?: string | null
          transfer_status?: 'waiting' | 'transfer_needed' | 'verifying' | 'completed'
          connection_status?: 'duplicate' | 'reviewing' | 'connected'
          duplicate_of?: string | null
          api_credentials?: Json
          cost_verification_status?: 'not_configured' | 'configured' | 'verified' | 'failed'
          verified_spend?: number | null
          contact_email?: string | null
          contact_phone?: string | null
          tax_invoice_direct?: boolean
        }
        Relationships: []
      }
      business_verifications: {
        Row: {
          id: string
          user_id: string
          business_number: string
          certificate_path: string | null
          status: 'pending' | 'approved' | 'rejected'
          reviewer_note: string | null
          submitted_at: string
          reviewed_at: string | null
          tax_invoice_email: string | null
          business_address: string | null
          naver_place_url: string | null
          bank_name: string | null
          account_number: string | null
          account_holder: string | null
          bankbook_copy_path: string | null
          industry_category: string | null
          founded_date: string | null
          annual_revenue_krw: number | null
          employee_count: number | null
          region_sido: string | null
          region_sigungu: string | null
        }
        Insert: {
          user_id: string
          business_number: string
          certificate_path?: string | null
          status?: 'pending' | 'approved' | 'rejected'
          reviewer_note?: string | null
          submitted_at?: string
          reviewed_at?: string | null
          tax_invoice_email?: string | null
          business_address?: string | null
          naver_place_url?: string | null
          bank_name?: string | null
          account_number?: string | null
          account_holder?: string | null
          bankbook_copy_path?: string | null
          industry_category?: string | null
          founded_date?: string | null
          annual_revenue_krw?: number | null
          employee_count?: number | null
          region_sido?: string | null
          region_sigungu?: string | null
        }
        Update: {
          user_id?: string
          business_number?: string
          certificate_path?: string | null
          status?: 'pending' | 'approved' | 'rejected'
          reviewer_note?: string | null
          submitted_at?: string
          reviewed_at?: string | null
          tax_invoice_email?: string | null
          business_address?: string | null
          naver_place_url?: string | null
          bank_name?: string | null
          account_number?: string | null
          account_holder?: string | null
          bankbook_copy_path?: string | null
          industry_category?: string | null
          founded_date?: string | null
          annual_revenue_krw?: number | null
          employee_count?: number | null
          region_sido?: string | null
          region_sigungu?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'business_verifications_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'users'
            referencedColumns: ['id']
          }
        ]
      }
      gov_support_listings: {
        Row: {
          pblanc_id: string
          title: string
          url: string | null
          jrsdinsttnm: string | null
          trgetnm: string | null
          reqst_end_de: string | null
          is_marketing: boolean
          region_sido: string | null
          is_puzzle_transactable: boolean
          puzzle_note: string | null
          summary: string | null
          apply_method: string | null
          contact: string | null
          source: string | null
        }
        Insert: {
          pblanc_id: string
          title: string
          url?: string | null
          jrsdinsttnm?: string | null
          trgetnm?: string | null
          reqst_end_de?: string | null
          is_marketing?: boolean
          region_sido?: string | null
          is_puzzle_transactable?: boolean
          puzzle_note?: string | null
          summary?: string | null
          apply_method?: string | null
          contact?: string | null
          source?: string | null
        }
        Update: {
          pblanc_id?: string
          title?: string
          url?: string | null
          jrsdinsttnm?: string | null
          trgetnm?: string | null
          reqst_end_de?: string | null
          is_marketing?: boolean
          region_sido?: string | null
          is_puzzle_transactable?: boolean
          puzzle_note?: string | null
          summary?: string | null
          apply_method?: string | null
          contact?: string | null
          source?: string | null
        }
        Relationships: []
      }
      paybacks: {
        Row: {
          id: string
          user_id: string
          ad_account_id: string
          amount: number
          period: string
          status: 'draft' | 'review_1' | 'review_2' | 'confirmed' | 'paid' | 'converted_to_points'
          processed_at: string | null
          created_at: string
          scheduled_pay_date: string | null
          cost_basis: 'submitted' | 'verified' | 'manual'
          reviewed_by_1: string | null
          reviewed_at_1: string | null
          reviewed_by_2: string | null
          reviewed_at_2: string | null
          confirmed_by: string | null
          confirmed_at: string | null
          withdrawal_deadline: string | null
          converted_at: string | null
        }
        Insert: {
          user_id: string
          ad_account_id: string
          amount: number
          period: string
          status: 'draft' | 'review_1' | 'review_2' | 'confirmed' | 'paid' | 'converted_to_points'
          processed_at?: string | null
          scheduled_pay_date?: string | null
          cost_basis?: 'submitted' | 'verified' | 'manual'
          reviewed_by_1?: string | null
          reviewed_at_1?: string | null
          reviewed_by_2?: string | null
          reviewed_at_2?: string | null
          confirmed_by?: string | null
          confirmed_at?: string | null
          withdrawal_deadline?: string | null
          converted_at?: string | null
        }
        Update: {
          user_id?: string
          ad_account_id?: string
          amount?: number
          period?: string
          status?: 'draft' | 'review_1' | 'review_2' | 'confirmed' | 'paid' | 'converted_to_points'
          processed_at?: string | null
          scheduled_pay_date?: string | null
          cost_basis?: 'submitted' | 'verified' | 'manual'
          reviewed_by_1?: string | null
          reviewed_at_1?: string | null
          reviewed_by_2?: string | null
          reviewed_at_2?: string | null
          confirmed_by?: string | null
          confirmed_at?: string | null
          withdrawal_deadline?: string | null
          converted_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'paybacks_ad_account_id_fkey'
            columns: ['ad_account_id']
            isOneToOne: false
            referencedRelation: 'ad_accounts'
            referencedColumns: ['id']
          }
        ]
      }
      ad_account_monthly_spend: {
        Row: {
          id: string
          ad_account_id: string
          period: string
          spend_vat_excluded: number
          entered_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          ad_account_id: string
          period: string
          spend_vat_excluded: number
          entered_by?: string | null
        }
        Update: {
          ad_account_id?: string
          period?: string
          spend_vat_excluded?: number
          entered_by?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'ad_account_monthly_spend_ad_account_id_fkey'
            columns: ['ad_account_id']
            isOneToOne: false
            referencedRelation: 'ad_accounts'
            referencedColumns: ['id']
          }
        ]
      }
      settlement_settings: {
        Row: {
          id: number
          settlement_day: number
          withdrawal_deadline_days: number
          withdrawal_min_amount: number
          updated_at: string
        }
        Insert: {
          id?: number
          settlement_day?: number
          withdrawal_deadline_days?: number
          withdrawal_min_amount?: number
        }
        Update: {
          settlement_day?: number
          withdrawal_deadline_days?: number
          withdrawal_min_amount?: number
          updated_at?: string
        }
        Relationships: []
      }
      withdrawal_requests: {
        Row: {
          id: string
          user_id: string
          payback_id: string
          amount: number
          status: 'requested' | 'processing' | 'paid' | 'rejected' | 'canceled'
          bank_name: string
          account_number: string
          account_holder: string
          requested_at: string
          processed_by: string | null
          processed_at: string | null
          reject_reason: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          user_id: string
          payback_id: string
          amount: number
          status?: 'requested' | 'processing' | 'paid' | 'rejected' | 'canceled'
          bank_name: string
          account_number: string
          account_holder: string
          processed_by?: string | null
          processed_at?: string | null
          reject_reason?: string | null
        }
        Update: {
          status?: 'requested' | 'processing' | 'paid' | 'rejected' | 'canceled'
          processed_by?: string | null
          processed_at?: string | null
          reject_reason?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'withdrawal_requests_payback_id_fkey'
            columns: ['payback_id']
            isOneToOne: false
            referencedRelation: 'paybacks'
            referencedColumns: ['id']
          }
        ]
      }
      receipts: {
        Row: {
          id: string
          user_id: string
          image_url: string
          store_name: string | null
          amount: number | null
          points_earned: number
          status: 'pending' | 'approved' | 'rejected'
          ocr_data: Json | null
          created_at: string
        }
        Insert: {
          user_id: string
          image_url: string
          store_name?: string | null
          amount?: number | null
          points_earned: number
          status: 'pending' | 'approved' | 'rejected'
          ocr_data?: Json | null
        }
        Update: {
          user_id?: string
          image_url?: string
          store_name?: string | null
          amount?: number | null
          points_earned?: number
          status?: 'pending' | 'approved' | 'rejected'
          ocr_data?: Json | null
        }
        Relationships: []
      }
      team_deals: {
        Row: {
          id: string
          creator_id: string
          title: string
          description: string | null
          category: string
          original_price: number
          deal_price: number
          leader_price: number
          target_count: number
          current_count: number
          deadline: string
          status: 'active' | 'completed' | 'failed' | 'cancelled'
          created_at: string
        }
        Insert: {
          creator_id: string
          title: string
          description?: string | null
          category: string
          original_price: number
          deal_price: number
          leader_price: number
          target_count: number
          deadline: string
          status: 'active' | 'completed' | 'failed' | 'cancelled'
        }
        Update: {
          creator_id?: string
          title?: string
          description?: string | null
          category?: string
          original_price?: number
          deal_price?: number
          leader_price?: number
          target_count?: number
          current_count?: number
          deadline?: string
          status?: 'active' | 'completed' | 'failed' | 'cancelled'
        }
        Relationships: []
      }
      team_deal_members: {
        Row: {
          id: string
          deal_id: string
          user_id: string
          is_leader: boolean
          price_paid: number
          joined_at: string
        }
        Insert: {
          deal_id: string
          user_id: string
          is_leader: boolean
          price_paid: number
        }
        Update: {
          deal_id?: string
          user_id?: string
          is_leader?: boolean
          price_paid?: number
        }
        Relationships: []
      }
      points: {
        Row: {
          id: string
          user_id: string
          amount: number
          source_type: 'receipt' | 'payback' | 'referral' | 'team_deal' | 'bonus'
          source_id: string | null
          description: string
          created_at: string
        }
        Insert: {
          user_id: string
          amount: number
          source_type: 'receipt' | 'payback' | 'referral' | 'team_deal' | 'bonus'
          source_id?: string | null
          description: string
        }
        Update: {
          user_id?: string
          amount?: number
          source_type?: 'receipt' | 'payback' | 'referral' | 'team_deal' | 'bonus'
          source_id?: string | null
          description?: string
        }
        Relationships: []
      }
      referrals: {
        Row: {
          id: string
          referrer_id: string
          referee_id: string
          commission_rate: number
          total_earned: number
          created_at: string
        }
        Insert: {
          referrer_id: string
          referee_id: string
          commission_rate: number
        }
        Update: {
          referrer_id?: string
          referee_id?: string
          commission_rate?: number
          total_earned?: number
        }
        Relationships: []
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
  }
}

export type User = Database['public']['Tables']['users']['Row']
export type AdAccount = Database['public']['Tables']['ad_accounts']['Row']
export type BusinessVerification = Database['public']['Tables']['business_verifications']['Row']
export type Payback = Database['public']['Tables']['paybacks']['Row']
export type AdAccountMonthlySpend = Database['public']['Tables']['ad_account_monthly_spend']['Row']
export type Receipt = Database['public']['Tables']['receipts']['Row']
export type TeamDeal = Database['public']['Tables']['team_deals']['Row']
export type TeamDealMember = Database['public']['Tables']['team_deal_members']['Row']
export type Point = Database['public']['Tables']['points']['Row']
