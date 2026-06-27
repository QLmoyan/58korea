import { pexelsPhoto } from "./pexels-url";
import type { AutoPostTemplate } from "./types";

/** Single public Han River (汉江) post — Pexels license, original Chinese caption. */
export const AUTO_POST_TEMPLATES_K: AutoPostTemplate[] = [
  {
    seedId: 91,
    title: "周末汉江边散步 风大但特别舒服",
    content:
      "汝矣岛汉江公园周末沿江边走一圈，大概三四十分钟。江面开阔，风有点大，带件外套就行。铺块垫子就能野餐， sunset 前后最好看。免费入场，地铁9号线国会站出来步行10分钟。",
    author: "汉江散步",
    location: "汝矣岛",
    distance: "2.4km",
    likes: 523,
    category: "攻略",
    nearby: true,
    following: true,
    imageFirst: true,
    requireImages: true,
    topicKeywords: ["汉江", "汝矣岛", "散步", "野餐", "周末"],
    allowedImageKeywords: ["han river", "seoul river", "river park", "city river", "outdoor"],
    forbiddenImageKeywords: ["europe", "food", "bedroom"],
    imageSearchQuery: "han river seoul park",
    imageCount: 2,
    curatedImages: [
      pexelsPhoto(2894944, "han river seoul"),
      pexelsPhoto(1563356, "seoul river park"),
    ],
  },
];
