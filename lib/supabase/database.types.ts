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
          image_url: string;
          image_height: number;
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
          image_url: string;
          image_height: number;
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
          image_url?: string;
          image_height?: number;
          nearby?: boolean;
          following?: boolean;
          created_at?: string;
        };
        Relationships: [];
      };
      comments: {
        Row: {
          id: string;
          post_id: number;
          author: string;
          content: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          post_id: number;
          author: string;
          content: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          post_id?: number;
          author?: string;
          content?: string;
          created_at?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
