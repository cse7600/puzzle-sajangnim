export type Json = string | number | boolean | null | { [key: string]: Json } | Json[]

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
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
          kakao_id?: string | null
          name: string
          phone?: string | null
          business_name?: string | null
          business_type?: string | null
          referral_code: string
          referred_by?: string | null
        }
        Update: {
          kakao_id?: string | null
          name?: string
          phone?: string | null
          business_name?: string | null
          business_type?: string | null
          referral_code?: string
          referred_by?: string | null
          total_points?: number
        }
        Relationships: []
      }
      ad_accounts: {
        Row: {
          id: string
          user_id: string
          platform: 'naver' | 'meta' | 'google' | 'kakao'
          account_id: string
          account_name: string
          monthly_spend: number
          payback_rate: number
          status: 'pending' | 'active' | 'rejected'
          verified_at: string | null
          created_at: string
        }
        Insert: {
          user_id: string
          platform: 'naver' | 'meta' | 'google' | 'kakao'
          account_id: string
          account_name: string
          monthly_spend: number
          payback_rate: number
          status: 'pending' | 'active' | 'rejected'
          verified_at?: string | null
        }
        Update: {
          user_id?: string
          platform?: 'naver' | 'meta' | 'google' | 'kakao'
          account_id?: string
          account_name?: string
          monthly_spend?: number
          payback_rate?: number
          status?: 'pending' | 'active' | 'rejected'
          verified_at?: string | null
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
          status: 'pending' | 'confirmed' | 'paid'
          processed_at: string | null
          created_at: string
        }
        Insert: {
          user_id: string
          ad_account_id: string
          amount: number
          period: string
          status: 'pending' | 'confirmed' | 'paid'
          processed_at?: string | null
        }
        Update: {
          user_id?: string
          ad_account_id?: string
          amount?: number
          period?: string
          status?: 'pending' | 'confirmed' | 'paid'
          processed_at?: string | null
        }
        Relationships: []
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
export type Payback = Database['public']['Tables']['paybacks']['Row']
export type Receipt = Database['public']['Tables']['receipts']['Row']
export type TeamDeal = Database['public']['Tables']['team_deals']['Row']
export type TeamDealMember = Database['public']['Tables']['team_deal_members']['Row']
export type Point = Database['public']['Tables']['points']['Row']
