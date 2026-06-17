export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          nickname: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          nickname: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          nickname?: string;
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
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
