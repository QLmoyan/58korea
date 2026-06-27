import type { AutoPostTemplate } from "./types";
import { AUTO_POST_TEMPLATES_B } from "./templates-b";
import { AUTO_POST_TEMPLATES_C } from "./templates-c";
import { AUTO_POST_TEMPLATES_D } from "./templates-d";
import { AUTO_POST_TEMPLATES_E } from "./templates-e";
import { AUTO_POST_TEMPLATES_F } from "./templates-f";
import { AUTO_POST_TEMPLATES_G } from "./templates-g";
import { AUTO_POST_TEMPLATES_H } from "./templates-h";
import { AUTO_POST_TEMPLATES_I } from "./templates-i";
import { AUTO_POST_TEMPLATES_J } from "./templates-j";
import { AUTO_POST_TEMPLATES_K } from "./templates-k";

const AUTO_POST_TEMPLATES_A: AutoPostTemplate[] = [
  {
    seedId: 1,
    title: "首尔转租单间 近2号线",
    content:
      "建国大学附近单间转租，近2号线步行5分钟。房间带独立卫浴，采光好，适合留学生。合同可转，押金可议，欢迎看房。",
    author: "在韩小张",
    location: "建国大学",
    distance: "350m",
    likes: 328,
    category: "房屋",
    nearby: true,
    following: true,
    topicKeywords: ["转租", "单间", "2号线", "建国大学", "租房"],
    allowedImageKeywords: ["apartment", "bedroom", "room", "studio", "interior", "housing"],
    forbiddenImageKeywords: ["food", "landscape", "mountain", "school", "phone", "laptop"],
    imageSearchQuery: "bright apartment bedroom natural light",
    imageCount: 2,
    curatedImages: [
      {
        url: "https://images.pexels.com/photos/1571460/pexels-photo-1571460.jpeg?auto=compress&cs=tinysrgb&w=800",
        width: 800,
        height: 1067,
        keyword: "apartment bedroom",
        source: "pexels",
      },
      {
        url: "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800&q=80",
        width: 800,
        height: 533,
        keyword: "apartment interior",
        source: "unsplash",
      },
    ],
  },
  {
    seedId: 2,
    title: "建大附近好吃烤肉推荐",
    content:
      "建大入口这家韩式烤肉真的不错，五花肉厚切，小菜免费续。周末人多建议早点去，人均2-3万韩币，学生党友好。",
    author: "吃货阿琳",
    location: "建大",
    distance: "100m",
    likes: 1247,
    category: "探店",
    nearby: true,
    following: true,
    topicKeywords: ["烤肉", "建大", "韩餐", "探店", "美食"],
    allowedImageKeywords: ["bbq", "korean food", "grill", "meat", "restaurant", "dining"],
    forbiddenImageKeywords: ["apartment", "bedroom", "landscape", "laptop", "school"],
    imageSearchQuery: "korean bbq grill restaurant bright",
    imageCount: 2,
    curatedImages: [
      {
        url: "https://images.unsplash.com/photo-1590301157890-4810ed3947cb?w=800&q=80",
        width: 800,
        height: 533,
        keyword: "korean bbq",
        source: "unsplash",
      },
      {
        url: "https://images.pexels.com/photos/1267320/pexels-photo-1267320.jpeg?auto=compress&cs=tinysrgb&w=800",
        width: 800,
        height: 533,
        keyword: "grilled meat",
        source: "pexels",
      },
    ],
  },
];

/** Seed templates: batch 1–3 (1–70) + 당근风格 (71–80) + 美食 (81–90). */
export const AUTO_POST_TEMPLATES: AutoPostTemplate[] = [
  ...AUTO_POST_TEMPLATES_A,
  ...AUTO_POST_TEMPLATES_B,
  ...AUTO_POST_TEMPLATES_C,
  ...AUTO_POST_TEMPLATES_D,
  ...AUTO_POST_TEMPLATES_E,
  ...AUTO_POST_TEMPLATES_F,
  ...AUTO_POST_TEMPLATES_G,
  ...AUTO_POST_TEMPLATES_H,
  ...AUTO_POST_TEMPLATES_I,
  ...AUTO_POST_TEMPLATES_J,
  ...AUTO_POST_TEMPLATES_K,
];

export const AUTO_POST_SEED_MARKER = "[auto-post-seed-v1]";
