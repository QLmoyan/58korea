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
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          nickname: string;
          username?: string | null;
          bio?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          nickname?: string;
          username?: string | null;
          bio?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      posts: {
        Row: {
          id: number;
          title: string;
          content: string;
          author: string;
          location: string;
          distance: string;
          likes: number;
          category: string;
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
          location: string;
          distance: string;
          likes?: number;
          category: string;
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
          location?: string;
          distance?: string;
          likes?: number;
          category?: string;
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
        Relationships: [];
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
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
