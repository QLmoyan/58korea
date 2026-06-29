"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import {
  isExternalSquareBanner,
  resolveSquareBannerHref,
  type SquareBannerItem,
} from "@/lib/square/banners";

interface SquareBannerProps {
  banners: SquareBannerItem[];
}

const AUTO_PLAY_MS = 4500;

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
  const href = resolveSquareBannerHref(activeBanner);
  const external = isExternalSquareBanner(activeBanner);

  return (
    <section className="px-3 pt-3 lg:px-0">
      <div className="relative overflow-hidden rounded-2xl bg-zinc-900 shadow-sm ring-1 ring-zinc-200/80">
        <div
          className="flex transition-transform duration-500 ease-out"
          style={{ transform: `translateX(-${activeIndex * 100}%)` }}
        >
          {banners.map((banner) => {
            const bannerHref = resolveSquareBannerHref(banner);
            const bannerExternal = isExternalSquareBanner(banner);

            return (
              <Link
                key={banner.id}
                href={bannerHref}
                target={bannerExternal ? "_blank" : undefined}
                rel={bannerExternal ? "noopener noreferrer" : undefined}
                className="relative block min-w-full"
              >
                <div className="relative aspect-[5/2] w-full sm:aspect-[3/1]">
                  <Image
                    src={banner.image}
                    alt={banner.title}
                    fill
                    className="object-cover"
                    sizes="(max-width: 768px) 100vw, 720px"
                    priority={banner.id === banners[0]?.id}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                  <div className="absolute inset-x-0 bottom-0 p-4 text-white">
                    <h2 className="text-base font-semibold sm:text-lg">{banner.title}</h2>
                    <p className="mt-1 line-clamp-2 text-xs leading-5 text-white/85 sm:text-sm">
                      {banner.description}
                    </p>
                  </div>
                </div>
              </Link>
            );
          })}
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

      <p className="sr-only">
        当前 Banner：{activeBanner.title}，链接 {href}
        {external ? "（外部链接）" : ""}
      </p>
    </section>
  );
}
