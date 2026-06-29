"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  isExternalSquareBannerLink,
  resolveSquareBannerHref,
  type SquareBannerItem,
} from "@/lib/square/banners";

interface SquareBannerProps {
  banners: SquareBannerItem[];
}

const AUTO_PLAY_MS = 4500;

function BannerSlide({
  banner,
  priority,
}: {
  banner: SquareBannerItem;
  priority?: boolean;
}) {
  const href = resolveSquareBannerHref(banner.linkUrl);
  const external = isExternalSquareBannerLink(banner.linkUrl);
  const image = (
    <div className="relative aspect-[5/2] w-full sm:aspect-[3/1]">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={banner.imageUrl}
        alt={banner.title}
        className="h-full w-full object-cover"
        loading={priority ? "eager" : "lazy"}
        decoding="async"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
      <div className="absolute inset-x-0 bottom-0 p-4 text-white">
        <h2 className="text-base font-semibold sm:text-lg">{banner.title}</h2>
      </div>
    </div>
  );

  if (!href) {
    return <div className="relative block min-w-full">{image}</div>;
  }

  return (
    <Link
      href={href}
      target={external ? "_blank" : undefined}
      rel={external ? "noopener noreferrer" : undefined}
      className="relative block min-w-full"
    >
      {image}
    </Link>
  );
}

export default function SquareBanner({ banners }: SquareBannerProps) {
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    if (banners.length <= 1) {
      return;
    }

    const timer = window.setInterval(() => {
      setActiveIndex((current) => (current + 1) % banners.length);
    }, AUTO_PLAY_MS);

    return () => window.clearInterval(timer);
  }, [banners.length]);

  if (banners.length === 0) {
    return null;
  }

  const activeBanner = banners[activeIndex];
  const activeHref = resolveSquareBannerHref(activeBanner.linkUrl);

  return (
    <section className="px-3 pt-3 lg:px-0">
      <div className="relative overflow-hidden rounded-2xl bg-zinc-900 shadow-sm ring-1 ring-zinc-200/80">
        <div
          className="flex transition-transform duration-500 ease-out"
          style={{ transform: `translateX(-${activeIndex * 100}%)` }}
        >
          {banners.map((banner, index) => (
            <BannerSlide
              key={banner.id}
              banner={banner}
              priority={index === 0}
            />
          ))}
        </div>

        {banners.length > 1 ? (
          <div className="absolute bottom-3 right-3 z-10 flex items-center gap-1.5">
            {banners.map((banner, index) => (
              <button
                key={banner.id}
                type="button"
                aria-label={`切换到 Banner ${index + 1}`}
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  setActiveIndex(index);
                }}
                className={`h-1.5 rounded-full transition-all ${
                  index === activeIndex ? "w-4 bg-white" : "w-1.5 bg-white/50"
                }`}
              />
            ))}
          </div>
        ) : null}
      </div>

      {activeHref ? (
        <p className="sr-only">
          当前 Banner：{activeBanner.title}，链接 {activeHref}
          {isExternalSquareBannerLink(activeBanner.linkUrl) ? "（外部链接）" : ""}
        </p>
      ) : (
        <p className="sr-only">当前 Banner：{activeBanner.title}</p>
      )}
    </section>
  );
}
