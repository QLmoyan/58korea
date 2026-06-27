import type { AutoPostImageCandidate } from "./types";

export function pexelsPhoto(
  id: number,
  keyword: string,
  options?: { width?: number; height?: number; portrait?: boolean },
): AutoPostImageCandidate {
  const width = options?.width ?? 800;
  const height = options?.height ?? (options?.portrait ? 1067 : 533);

  return {
    url: `https://images.pexels.com/photos/${id}/pexels-photo-${id}.jpeg?auto=compress&cs=tinysrgb&w=800`,
    width,
    height,
    keyword,
    source: "pexels",
  };
}
