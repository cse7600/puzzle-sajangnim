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
        Insert: Omit<Database['public']['Tables']['users']['Row'], 'id' | 'created_at' | 'updated_at' | 'total_points'>
        Update: Partial<Database['public']['Tables']['users']['Insert']>
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
        Insert: Omit<Database['public']['Tables']['ad_accounts']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['ad_accounts']['Insert']>
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
        Insert: Omit<Database['public']['Tables']['paybacks']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['paybacks']['Insert']>
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
        Insert: Omit<Database['public']['Tables']['receipts']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['receipts']['Insert']>
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
        Insert: Omit<Database['public']['Tables']['team_deals']['Row'], 'id' | 'created_at' | 'current_count'>
        Update: Partial<Database['public']['Tables']['team_deals']['Insert']>
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
        Insert: Omit<Database['public']['Tables']['team_deal_members']['Row'], 'id' | 'joined_at'>
        Update: Partial<Database['public']['Tables']['team_deal_members']['Insert']>
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
        Insert: Omit<Database['public']['Tables']['points']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['points']['Insert']>
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
        Insert: Omit<Database['public']['Tables']['referrals']['Row'], 'id' | 'created_at' | 'total_earned'>
        Update: Partial<Database['public']['Tables']['referrals']['Insert']>
      }
    }
  }
}

export type User = Database['public']['Tables']['users']['Row']
export type AdAccount = Database['public']['Tables']['ad_accounts']['Row']
export type Payback = Database['public']['Tables']['paybacks']['Row']
export type Receipt = Database['public']['Tables']['receipts']['Row']
export type TeamDeal = Database['public']['Tables']['team_deals']['Row']
export type TeamDealMember = Database['public']['Tables']['team_deal_members']['Row']
export type Point = Database['public']['Tables']['points']['Row']
