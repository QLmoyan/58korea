export const MERCHANT_CATEGORIES = [
  "餐饮美食",
  "美容美发",
  "搬家物流",
  "房产中介",
  "教育培训",
  "医疗健康",
  "生活服务",
  "其他",
] as const;

export type MerchantCategory = (typeof MERCHANT_CATEGORIES)[number];

export function isMerchantCategory(value: string): value is MerchantCategory {
  return (MERCHANT_CATEGORIES as readonly string[]).includes(value);
}
