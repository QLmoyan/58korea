export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type ModerationStatus =
  | "published"
  | "pending_review"
  | "hidden"
  | "rejected";

export type RiskLevel = "low" | "medium" | "high";

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          nickname: string;
          username: string | null;
          bio: string | null;
          avatar_url: string | null;
          gender: string | null;
          city: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          nickname: string;
          username?: string | null;
          bio?: string | null;
          avatar_url?: string | null;
          gender?: string | null;
          city?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          nickname?: string;
          username?: string | null;
          bio?: string | null;
          avatar_url?: string | null;
          gender?: string | null;
          city?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      merchant_profiles: {
        Row: {
          id: string;
          user_id: string;
          business_name: string;
          logo_url: string | null;
          description: string | null;
          address: string | null;
          phone: string | null;
          business_hours: string | null;
          navigation_url: string | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          business_name: string;
          logo_url?: string | null;
          description?: string | null;
          address?: string | null;
          phone?: string | null;
          business_hours?: string | null;
          navigation_url?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          business_name?: string;
          logo_url?: string | null;
          description?: string | null;
          address?: string | null;
          phone?: string | null;
          business_hours?: string | null;
          navigation_url?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "merchant_profiles_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: true;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      merchant_coupons: {
        Row: {
          id: string;
          merchant_id: string;
          title: string;
          discount_amount_krw: number;
          total_quantity: number;
          claimed_quantity: number;
          per_user_limit: number;
          starts_at: string | null;
          ends_at: string | null;
          usage_note: string | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          merchant_id: string;
          title: string;
          discount_amount_krw: number;
          total_quantity: number;
          claimed_quantity?: number;
          per_user_limit?: number;
          starts_at?: string | null;
          ends_at?: string | null;
          usage_note?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          merchant_id?: string;
          title?: string;
          discount_amount_krw?: number;
          total_quantity?: number;
          claimed_quantity?: number;
          per_user_limit?: number;
          starts_at?: string | null;
          ends_at?: string | null;
          usage_note?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "merchant_coupons_merchant_id_fkey";
            columns: ["merchant_id"];
            isOneToOne: false;
            referencedRelation: "merchant_profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      user_coupons: {
        Row: {
          id: string;
          coupon_id: string;
          user_id: string;
          status: string;
          claimed_at: string;
          used_at: string | null;
          redeem_code: string;
          redeemed_by: string | null;
          redeemed_at: string | null;
          expires_at: string | null;
          reminded_at: string | null;
        };
        Insert: {
          id?: string;
          coupon_id: string;
          user_id: string;
          status?: string;
          claimed_at?: string;
          used_at?: string | null;
          redeem_code: string;
          redeemed_by?: string | null;
          redeemed_at?: string | null;
          expires_at?: string | null;
          reminded_at?: string | null;
        };
        Update: {
          id?: string;
          coupon_id?: string;
          user_id?: string;
          status?: string;
          claimed_at?: string;
          used_at?: string | null;
          redeem_code?: string;
          redeemed_by?: string | null;
          redeemed_at?: string | null;
          expires_at?: string | null;
          reminded_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "user_coupons_coupon_id_fkey";
            columns: ["coupon_id"];
            isOneToOne: false;
            referencedRelation: "merchant_coupons";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "user_coupons_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      notifications: {
        Row: {
          id: string;
          user_id: string;
          actor_id: string | null;
          type: "comment" | "reply" | "like" | "system";
          post_id: number | null;
          comment_id: string | null;
          title: string;
          body: string;
          is_read: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          actor_id?: string | null;
          type: "comment" | "reply" | "like" | "system";
          post_id?: number | null;
          comment_id?: string | null;
          title: string;
          body: string;
          is_read?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          actor_id?: string | null;
          type?: "comment" | "reply" | "like" | "system";
          post_id?: number | null;
          comment_id?: string | null;
          title?: string;
          body?: string;
          is_read?: boolean;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "notifications_actor_id_fkey";
            columns: ["actor_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "notifications_post_id_fkey";
            columns: ["post_id"];
            isOneToOne: false;
            referencedRelation: "posts";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "notifications_comment_id_fkey";
            columns: ["comment_id"];
            isOneToOne: false;
            referencedRelation: "comments";
            referencedColumns: ["id"];
          },
        ];
      };
      posts: {
        Row: {
          id: number;
          title: string;
          content: string;
          author: string;
          author_id: string | null;
          linked_coupon_id: string | null;
          location: string;
          distance: string;
          likes: number;
          category: string;
          category_source: string;
          ai_category_confidence: number | null;
          ai_category_reason: string | null;
          image_url: string | null;
          image_height: number | null;
          nearby: boolean;
          following: boolean;
          created_at: string;
          moderation_status: ModerationStatus;
          risk_score: number;
          risk_level: RiskLevel;
          published_at: string | null;
          moderation_note: string | null;
        };
        Insert: {
          id?: number;
          title: string;
          content: string;
          author: string;
          author_id?: string | null;
          linked_coupon_id?: string | null;
          location: string;
          distance: string;
          likes?: number;
          category: string;
          category_source?: string;
          ai_category_confidence?: number | null;
          ai_category_reason?: string | null;
          image_url?: string | null;
          image_height?: number | null;
          nearby?: boolean;
          following?: boolean;
          created_at?: string;
          moderation_status?: ModerationStatus;
          risk_score?: number;
          risk_level?: RiskLevel;
          published_at?: string | null;
          moderation_note?: string | null;
        };
        Update: {
          id?: number;
          title?: string;
          content?: string;
          author?: string;
          author_id?: string | null;
          linked_coupon_id?: string | null;
          location?: string;
          distance?: string;
          likes?: number;
          category?: string;
          category_source?: string;
          ai_category_confidence?: number | null;
          ai_category_reason?: string | null;
          image_url?: string | null;
          image_height?: number | null;
          nearby?: boolean;
          following?: boolean;
          created_at?: string;
          moderation_status?: ModerationStatus;
          risk_score?: number;
          risk_level?: RiskLevel;
          published_at?: string | null;
          moderation_note?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "posts_author_id_fkey";
            columns: ["author_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "posts_linked_coupon_id_fkey";
            columns: ["linked_coupon_id"];
            isOneToOne: false;
            referencedRelation: "merchant_coupons";
            referencedColumns: ["id"];
          },
        ];
      };
      post_likes: {
        Row: {
          user_id: string;
          post_id: number;
          created_at: string;
        };
        Insert: {
          user_id: string;
          post_id: number;
          created_at?: string;
        };
        Update: {
          user_id?: string;
          post_id?: number;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "post_likes_post_id_fkey";
            columns: ["post_id"];
            isOneToOne: false;
            referencedRelation: "posts";
            referencedColumns: ["id"];
          },
        ];
      };
      post_favorites: {
        Row: {
          user_id: string;
          post_id: number;
          created_at: string;
        };
        Insert: {
          user_id: string;
          post_id: number;
          created_at?: string;
        };
        Update: {
          user_id?: string;
          post_id?: number;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "post_favorites_post_id_fkey";
            columns: ["post_id"];
            isOneToOne: false;
            referencedRelation: "posts";
            referencedColumns: ["id"];
          },
        ];
      };
      post_views: {
        Row: {
          user_id: string;
          post_id: number;
          viewed_at: string;
        };
        Insert: {
          user_id: string;
          post_id: number;
          viewed_at?: string;
        };
        Update: {
          user_id?: string;
          post_id?: number;
          viewed_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "post_views_post_id_fkey";
            columns: ["post_id"];
            isOneToOne: false;
            referencedRelation: "posts";
            referencedColumns: ["id"];
          },
        ];
      };
      post_images: {
        Row: {
          id: string;
          post_id: number;
          storage_path: string;
          public_url: string;
          sort_order: number;
          width: number | null;
          height: number | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          post_id: number;
          storage_path: string;
          public_url: string;
          sort_order: number;
          width?: number | null;
          height?: number | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          post_id?: number;
          storage_path?: string;
          public_url?: string;
          sort_order?: number;
          width?: number | null;
          height?: number | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "post_images_post_id_fkey";
            columns: ["post_id"];
            isOneToOne: false;
            referencedRelation: "posts";
            referencedColumns: ["id"];
          },
        ];
      };
      comment_images: {
        Row: {
          id: string;
          comment_id: string;
          image_url: string;
          sort_order: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          comment_id: string;
          image_url: string;
          sort_order?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          comment_id?: string;
          image_url?: string;
          sort_order?: number;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "comment_images_comment_id_fkey";
            columns: ["comment_id"];
            isOneToOne: false;
            referencedRelation: "comments";
            referencedColumns: ["id"];
          },
        ];
      };
      comments: {
        Row: {
          id: string;
          post_id: number;
          author: string;
          content: string;
          created_at: string;
          parent_id: string | null;
          reply_to_author: string | null;
          image_url: string | null;
          image_storage_path: string | null;
          user_id: string | null;
          moderation_status: ModerationStatus;
          risk_score: number;
          risk_level: RiskLevel;
          published_at: string | null;
          moderation_note: string | null;
        };
        Insert: {
          id?: string;
          post_id: number;
          author: string;
          content: string;
          created_at?: string;
          parent_id?: string | null;
          reply_to_author?: string | null;
          image_url?: string | null;
          image_storage_path?: string | null;
          user_id?: string | null;
          moderation_status?: ModerationStatus;
          risk_score?: number;
          risk_level?: RiskLevel;
          published_at?: string | null;
          moderation_note?: string | null;
        };
        Update: {
          id?: string;
          post_id?: number;
          author?: string;
          content?: string;
          created_at?: string;
          parent_id?: string | null;
          reply_to_author?: string | null;
          image_url?: string | null;
          image_storage_path?: string | null;
          user_id?: string | null;
          moderation_status?: ModerationStatus;
          risk_score?: number;
          risk_level?: RiskLevel;
          published_at?: string | null;
          moderation_note?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "comments_parent_id_fkey";
            columns: ["parent_id"];
            isOneToOne: false;
            referencedRelation: "comments";
            referencedColumns: ["id"];
          },
        ];
      };
      content_block_rules: {
        Row: {
          id: string;
          pattern: string;
          match_type: "keyword" | "contains" | "regex";
          scope: string[];
          category: string;
          severity: string;
          reason_code: string;
          reason_message: string;
          enabled: boolean;
          priority: number;
          hit_count: number;
          last_hit_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          pattern: string;
          match_type?: "keyword" | "contains" | "regex";
          scope?: string[];
          category: string;
          severity?: string;
          reason_code: string;
          reason_message: string;
          enabled?: boolean;
          priority?: number;
          hit_count?: number;
          last_hit_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          pattern?: string;
          match_type?: "keyword" | "contains" | "regex";
          scope?: string[];
          category?: string;
          severity?: string;
          reason_code?: string;
          reason_message?: string;
          enabled?: boolean;
          priority?: number;
          hit_count?: number;
          last_hit_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      content_risk_rules: {
        Row: {
          id: string;
          pattern: string;
          match_type: "keyword" | "contains" | "regex";
          scope: string[];
          category: string;
          risk_score: number;
          enabled: boolean;
          priority: number;
          note: string | null;
          hit_count: number;
          last_hit_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          pattern: string;
          match_type?: "keyword" | "contains" | "regex";
          scope?: string[];
          category: string;
          risk_score: number;
          enabled?: boolean;
          priority?: number;
          note?: string | null;
          hit_count?: number;
          last_hit_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          pattern?: string;
          match_type?: "keyword" | "contains" | "regex";
          scope?: string[];
          category?: string;
          risk_score?: number;
          enabled?: boolean;
          priority?: number;
          note?: string | null;
          hit_count?: number;
          last_hit_at?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      content_whitelist_rules: {
        Row: {
          id: string;
          pattern: string;
          match_type: "keyword" | "contains" | "regex";
          scope: string[];
          category: string;
          score_reduction: number;
          force_allow: boolean;
          enabled: boolean;
          priority: number;
          note: string | null;
          hit_count: number;
          last_hit_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          pattern: string;
          match_type?: "keyword" | "contains" | "regex";
          scope?: string[];
          category: string;
          score_reduction?: number;
          force_allow?: boolean;
          enabled?: boolean;
          priority?: number;
          note?: string | null;
          hit_count?: number;
          last_hit_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          pattern?: string;
          match_type?: "keyword" | "contains" | "regex";
          scope?: string[];
          category?: string;
          score_reduction?: number;
          force_allow?: boolean;
          enabled?: boolean;
          priority?: number;
          note?: string | null;
          hit_count?: number;
          last_hit_at?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      content_reviews: {
        Row: {
          id: string;
          target_type: "post" | "comment";
          target_id: string;
          post_id: number | null;
          risk_score: number;
          risk_level: "medium" | "high";
          status: "open" | "approved" | "hidden" | "deleted" | "dismissed";
          matched_block_rules: Json;
          matched_risk_rules: Json;
          matched_whitelist_rules: Json;
          content_snapshot: Json;
          decision: string | null;
          decided_by: string | null;
          decided_at: string | null;
          decision_note: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          target_type: "post" | "comment";
          target_id: string;
          post_id?: number | null;
          risk_score?: number;
          risk_level: "medium" | "high";
          status?: "open" | "approved" | "hidden" | "deleted" | "dismissed";
          matched_block_rules?: Json;
          matched_risk_rules?: Json;
          matched_whitelist_rules?: Json;
          content_snapshot?: Json;
          decision?: string | null;
          decided_by?: string | null;
          decided_at?: string | null;
          decision_note?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          target_type?: "post" | "comment";
          target_id?: string;
          post_id?: number | null;
          risk_score?: number;
          risk_level?: "medium" | "high";
          status?: "open" | "approved" | "hidden" | "deleted" | "dismissed";
          matched_block_rules?: Json;
          matched_risk_rules?: Json;
          matched_whitelist_rules?: Json;
          content_snapshot?: Json;
          decision?: string | null;
          decided_by?: string | null;
          decided_at?: string | null;
          decision_note?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "content_reviews_post_id_fkey";
            columns: ["post_id"];
            isOneToOne: false;
            referencedRelation: "posts";
            referencedColumns: ["id"];
          },
        ];
      };
      channels: {
        Row: {
          id: string;
          slug: string;
          name: string;
          description: string | null;
          cover_url: string | null;
          sort_order: number;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          slug: string;
          name: string;
          description?: string | null;
          cover_url?: string | null;
          sort_order?: number;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          slug?: string;
          name?: string;
          description?: string | null;
          cover_url?: string | null;
          sort_order?: number;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      channel_articles: {
        Row: {
          id: string;
          channel_id: string;
          author_id: string | null;
          title: string;
          cover_url: string | null;
          content_markdown: string;
          status: string;
          published_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          channel_id: string;
          author_id?: string | null;
          title: string;
          cover_url?: string | null;
          content_markdown: string;
          status?: string;
          published_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          channel_id?: string;
          author_id?: string | null;
          title?: string;
          cover_url?: string | null;
          content_markdown?: string;
          status?: string;
          published_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "channel_articles_channel_id_fkey";
            columns: ["channel_id"];
            isOneToOne: false;
            referencedRelation: "channels";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "channel_articles_author_id_fkey";
            columns: ["author_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      content_reports: {
        Row: {
          id: string;
          target_type: "post" | "comment";
          target_id: string;
          post_id: number | null;
          reason:
            | "porn"
            | "gambling"
            | "fraud"
            | "illegal"
            | "harassment"
            | "misinformation"
            | "other";
          detail: string | null;
          reporter_key: string | null;
          reporter_user_id: string | null;
          status: "open" | "reviewing" | "resolved" | "dismissed";
          linked_review_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          target_type: "post" | "comment";
          target_id: string;
          post_id?: number | null;
          reason:
            | "porn"
            | "gambling"
            | "fraud"
            | "illegal"
            | "harassment"
            | "misinformation"
            | "other";
          detail?: string | null;
          reporter_key?: string | null;
          reporter_user_id?: string | null;
          status?: "open" | "reviewing" | "resolved" | "dismissed";
          linked_review_id?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          target_type?: "post" | "comment";
          target_id?: string;
          post_id?: number | null;
          reason?:
            | "porn"
            | "gambling"
            | "fraud"
            | "illegal"
            | "harassment"
            | "misinformation"
            | "other";
          detail?: string | null;
          reporter_key?: string | null;
          reporter_user_id?: string | null;
          status?: "open" | "reviewing" | "resolved" | "dismissed";
          linked_review_id?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "content_reports_post_id_fkey";
            columns: ["post_id"];
            isOneToOne: false;
            referencedRelation: "posts";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "content_reports_linked_review_id_fkey";
            columns: ["linked_review_id"];
            isOneToOne: false;
            referencedRelation: "content_reviews";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: Record<string, never>;
    Functions: {
      claim_merchant_coupon: {
        Args: {
          p_coupon_id: string;
        };
        Returns: string;
      };
      redeem_user_coupon: {
        Args: {
          p_redeem_code: string;
        };
        Returns: string;
      };
      remove_post_linked_coupon: {
        Args: {
          p_post_id: number;
          p_coupon_id: string;
        };
        Returns: string;
      };
      delete_owned_post: {
        Args: {
          p_post_id: number;
        };
        Returns: undefined;
      };
      deactivate_or_delete_merchant_coupon: {
        Args: {
          p_coupon_id: string;
        };
        Returns: string;
      };
      mark_expired_user_coupons: {
        Args: Record<string, never>;
        Returns: number;
      };
      process_expiring_coupon_reminders: {
        Args: Record<string, never>;
        Returns: number;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
