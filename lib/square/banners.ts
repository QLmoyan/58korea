export type SquareBannerLinkType = "post" | "merchant" | "external";

export interface SquareBannerItem {
  id: string;
  image: string;
  title: string;
  description: string;
  linkType: SquareBannerLinkType;
  link: string;
}

export const SQUARE_BANNERS: SquareBannerItem[] = [
  {
    id: "banner-1",
    image: "https://picsum.photos/seed/square-banner-food/1200/480",
    title: "本周探店精选",
    description: "发现建大、新村附近的宝藏韩餐",
    linkType: "post",
    link: "/posts/2",
  },
  {
    id: "banner-2",
    image: "https://picsum.photos/seed/square-banner-merchant/1200/480",
    title: "认证商家推荐",
    description: "本地生活优惠与服务一站直达",
    linkType: "merchant",
    link: "/profile/ql860430",
  },
  {
    id: "banner-3",
    image: "https://picsum.photos/seed/square-banner-guide/1200/480",
    title: "韩国生活攻略",
    description: "银行卡、通信、租房经验合集",
    linkType: "external",
    link: "https://58korea.com",
  },
];

export function resolveSquareBannerHref(banner: SquareBannerItem) {
  if (banner.linkType === "external") {
    return banner.link;
  }

  return banner.link.startsWith("/") ? banner.link : `/${banner.link}`;
}

export function isExternalSquareBanner(banner: SquareBannerItem) {
  return banner.linkType === "external";
}
