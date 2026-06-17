"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import type { PostImage } from "@/lib/data/posts";

interface PostImageCarouselProps {
  images: PostImage[];
  title: string;
}

const DRAG_THRESHOLD = 48;

export default function PostImageCarousel({
  images,
  title,
}: PostImageCarouselProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef({
    active: false,
    pointerId: -1,
    startX: 0,
    startScrollLeft: 0,
  });
  const [activeIndex, setActiveIndex] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const hasMultiple = images.length > 1;

  const getSlideWidth = useCallback(() => {
    return scrollRef.current?.clientWidth ?? 0;
  }, []);

  const goToIndex = useCallback(
    (index: number, behavior: ScrollBehavior = "smooth") => {
      const container = scrollRef.current;
      const slideWidth = getSlideWidth();
      if (!container || slideWidth <= 0) {
        return;
      }

      const nextIndex = Math.min(Math.max(index, 0), images.length - 1);
      container.scrollTo({
        left: nextIndex * slideWidth,
        behavior,
      });
      setActiveIndex(nextIndex);
    },
    [getSlideWidth, images.length],
  );

  const updateActiveIndex = useCallback(() => {
    const container = scrollRef.current;
    const slideWidth = getSlideWidth();
    if (!container || slideWidth <= 0) {
      return;
    }

    const index = Math.round(container.scrollLeft / slideWidth);
    setActiveIndex(Math.min(Math.max(index, 0), images.length - 1));
  }, [getSlideWidth, images.length]);

  useEffect(() => {
    setActiveIndex(0);
    scrollRef.current?.scrollTo({ left: 0, behavior: "auto" });
  }, [images]);

  useEffect(() => {
    const container = scrollRef.current;
    if (!container || !hasMultiple) {
      return;
    }

    container.addEventListener("scroll", updateActiveIndex, { passive: true });
    window.addEventListener("resize", updateActiveIndex);

    return () => {
      container.removeEventListener("scroll", updateActiveIndex);
      window.removeEventListener("resize", updateActiveIndex);
    };
  }, [hasMultiple, updateActiveIndex]);

  function handlePointerDown(event: React.PointerEvent<HTMLDivElement>) {
    if (!hasMultiple || event.pointerType !== "mouse" || event.button !== 0) {
      return;
    }

    const container = scrollRef.current;
    if (!container) {
      return;
    }

    dragRef.current = {
      active: true,
      pointerId: event.pointerId,
      startX: event.clientX,
      startScrollLeft: container.scrollLeft,
    };
    container.dataset.dragging = "true";
    setIsDragging(true);
    container.setPointerCapture(event.pointerId);
    event.preventDefault();
  }

  function handlePointerMove(event: React.PointerEvent<HTMLDivElement>) {
    const drag = dragRef.current;
    if (!drag.active || event.pointerId !== drag.pointerId) {
      return;
    }

    const container = scrollRef.current;
    if (!container) {
      return;
    }

    const deltaX = drag.startX - event.clientX;
    container.scrollLeft = drag.startScrollLeft + deltaX;
    updateActiveIndex();
    event.preventDefault();
  }

  function finishMouseDrag(event: React.PointerEvent<HTMLDivElement>) {
    const drag = dragRef.current;
    if (!drag.active || event.pointerId !== drag.pointerId) {
      return;
    }

    const container = scrollRef.current;
    if (!container) {
      return;
    }

    dragRef.current.active = false;
    delete container.dataset.dragging;
    setIsDragging(false);

    if (container.hasPointerCapture(event.pointerId)) {
      container.releasePointerCapture(event.pointerId);
    }

    const slideWidth = getSlideWidth();
    const dragStartIndex =
      slideWidth > 0
        ? Math.round(drag.startScrollLeft / slideWidth)
        : activeIndex;
    const dragDistance = drag.startX - event.clientX;
    let nextIndex = dragStartIndex;

    if (dragDistance > DRAG_THRESHOLD) {
      nextIndex = dragStartIndex + 1;
    } else if (dragDistance < -DRAG_THRESHOLD) {
      nextIndex = dragStartIndex - 1;
    }

    goToIndex(nextIndex);
    event.preventDefault();
  }

  if (images.length === 0) {
    return null;
  }

  return (
    <div className="w-full bg-white px-4 pt-4">
      <div className="relative overflow-hidden rounded-2xl bg-zinc-100 ring-1 ring-zinc-100">
        {hasMultiple ? (
          <div
            className="pointer-events-none absolute top-3 right-3 z-10 rounded-full bg-black/45 px-2.5 py-0.5 text-[11px] font-medium text-white backdrop-blur-sm"
            aria-live="polite"
            aria-atomic="true"
          >
            {activeIndex + 1}/{images.length}
          </div>
        ) : null}

        <div
          ref={scrollRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={finishMouseDrag}
          onPointerCancel={finishMouseDrag}
          onDragStart={(event) => event.preventDefault()}
          className={`flex aspect-[4/5] w-full touch-pan-x snap-x snap-mandatory overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden ${
            hasMultiple ? "cursor-grab select-none data-[dragging=true]:cursor-grabbing" : ""
          } ${isDragging ? "scroll-auto" : "scroll-smooth"}`}
        >
          {images.map((image, index) => (
            <div
              key={image.id}
              className="relative aspect-[4/5] w-full shrink-0 snap-center snap-always"
            >
              <Image
                src={image.url}
                alt={`${title} - 第 ${index + 1} 张`}
                fill
                priority={index === 0}
                sizes="(max-width: 448px) 100vw, 448px"
                className="pointer-events-none object-cover"
                draggable={false}
              />
            </div>
          ))}
        </div>

        {hasMultiple ? (
          <div
            className="pointer-events-none absolute right-0 bottom-3 left-0 flex justify-center gap-1.5"
            aria-hidden="true"
          >
            {images.map((image, index) => (
              <span
                key={image.id}
                className={`h-1.5 rounded-full transition-all duration-200 ${
                  index === activeIndex ? "w-4 bg-white" : "w-1.5 bg-white/50"
                }`}
              />
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}
