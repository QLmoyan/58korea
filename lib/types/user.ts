export interface Profile {
  id: string;
  nickname: string;
  username: string | null;
  bio: string | null;
  avatarUrl: string | null;
  gender: string | null;
  city: string | null;
  createdAt: string;
  updatedAt: string;
}
