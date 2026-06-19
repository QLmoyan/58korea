"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { ViewerImage } from "@/lib/types/image-viewer";

interface ImageViewerProps {
  images: ViewerImage[];
  initialIndex: number;
  onClose: () => void;
}

const DRAG_THRESHOLD = 50;

export default function ImageViewer({
  images,
  initialIndex,
  onClose,
}: ImageViewerProps) {
  const mainRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const activeIndexRef = useRef(initialIndex);
  const mouseRef = useRef({
    active: false,
    pointerId: -1,
    startX: 0,
    currentX: 0,
  });
  const didDragRef = useRef(false);

  const [activeIndex, setActiveIndex] = useState(initialIndex);
  const [isDragging, setIsDragging] = useState(false);
  const hasMultiple = images.length > 1;

  const getSlideWidth = useCallback(() => {
    return scrollRef.current?.clientWidth ?? 0;
  }, []);

  const scrollToIndex = useCallback(
    (index: number, behavior: ScrollBehavior = "smooth") => {
      const nextIndex = Math.min(Math.max(index, 0), images.length - 1);
      setActiveIndex(nextIndex);
      activeIndexRef.current = nextIndex;

      const container = scrollRef.current;
      const slideWidth = getSlideWidth();
      if (container && slideWidth > 0) {
        container.scrollTo({
          left: nextIndex * slideWidth,
          behavior,
        });
      }
    },
    [getSlideWidth, images.length],
  );

  const updateActiveIndexFromScroll = useCallback(() => {
    const container = scrollRef.current;
    const slideWidth = getSlideWidth();
    if (!container || slideWidth <= 0) {
      return;
    }

    const index = Math.round(container.scrollLeft / slideWidth);
    const nextIndex = Math.min(Math.max(index, 0), images.length - 1);
    setActiveIndex(nextIndex);
    activeIndexRef.current = nextIndex;
  }, [getSlideWidth, images.length]);

  useEffect(() => {
    scrollToIndex(initialIndex, "auto");
  }, [images, initialIndex, scrollToIndex]);

  useEffect(() => {
    const container = scrollRef.current;
    if (!container || !hasMultiple) {
      return;
    }

    container.addEventListener("scroll", updateActiveIndexFromScroll, {
      passive: true,
    });
    window.addEventListener("resize", updateActiveIndexFromScroll);

    return () => {
      container.removeEventListener("scroll", updateActiveIndexFromScroll);
      window.removeEventListener("resize", updateActiveIndexFromScroll);
    };
  }, [hasMultiple, updateActiveIndexFromScroll]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose]);

  function handleOuterClick() {
    if (didDragRef.current) {
      didDragRef.current = false;
      return;
    }

    onClose();
  }

  function handleMainPointerDown(event: React.PointerEvent<HTMLDivElement>) {
    if (!hasMultiple || event.pointerType !== "mouse" || event.button !== 0) {
      return;
    }

    mouseRef.current = {
      active: true,
      pointerId: event.pointerId,
      startX: event.clientX,
      currentX: event.clientX,
    };
    didDragRef.current = false;
    setIsDragging(false);

    console.log("[ImageViewer] pointerdown x", event.clientX);

    event.currentTarget.setPointerCapture(event.pointerId);
    event.preventDefault();
  }

  function handleMainPointerMove(event: React.PointerEvent<HTMLDivElement>) {
    const mouse = mouseRef.current;
    if (!mouse.active || event.pointerId !== mouse.pointerId) {
      return;
    }

    if (event.pointerType !== "mouse") {
      return;
    }

    mouse.currentX = event.clientX;

    if (Math.abs(mouse.currentX - mouse.startX) > 4) {
      didDragRef.current = true;
      setIsDragging(true);
    }

    event.preventDefault();
  }

  function handleMainPointerUp(event: React.PointerEvent<HTMLDivElement>) {
    const mouse = mouseRef.current;
    if (!mouse.active || event.pointerId !== mouse.pointerId) {
      return;
    }

    if (event.pointerType !== "mouse") {
      return;
    }

    mouse.currentX = event.clientX;
    const deltaX = mouse.currentX - mouse.startX;

    mouseRef.current.active = false;
    setIsDragging(false);

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }

    let targetIndex = activeIndexRef.current;

    if (deltaX < -DRAG_THRESHOLD) {
      targetIndex = activeIndexRef.current + 1;
    } else if (deltaX > DRAG_THRESHOLD) {
      targetIndex = activeIndexRef.current - 1;
    }

    console.log("[ImageViewer] pointerup deltaX", deltaX, "target index", targetIndex);

    scrollToIndex(targetIndex);
    event.preventDefault();
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="图片预览"
      className="image-viewer-fade-in fixed inset-0 z-[100] bg-black/95"
      onClick={handleOuterClick}
    >
      <div
        ref={mainRef}
        className={`h-full w-full ${
          hasMultiple ? (isDragging ? "cursor-grabbing" : "cursor-grab") : ""
        }`}
        onPointerDown={handleMainPointerDown}
        onPointerMove={handleMainPointerMove}
        onPointerUp={handleMainPointerUp}
        onPointerCancel={handleMainPointerUp}
        onDragStart={(event) => event.preventDefault()}
      >
        <div
          ref={scrollRef}
          onDragStart={(event) => event.preventDefault()}
          className={`h-full w-full ${
            hasMultiple
              ? "flex touch-pan-x snap-x snap-mandatory overflow-x-auto scroll-smooth [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
              : "flex items-center justify-center"
          }`}
        >
          {images.map((image, index) => (
            <div
              key={image.id}
              onDragStart={(event) => event.preventDefault()}
              className={
                hasMultiple
                  ? "relative flex h-full w-full shrink-0 snap-center snap-always items-center justify-center"
                  : "relative flex h-full w-full items-center justify-center px-4"
              }
            >
              <img
                src={image.url}
                alt={image.alt ?? `图片 ${index + 1}`}
                className="max-h-[100dvh] max-w-[100vw] select-none object-contain"
                onClick={(event) => event.stopPropagation()}
                onDragStart={(event) => event.preventDefault()}
                draggable={false}
              />
            </div>
          ))}
        </div>
      </div>

      {hasMultiple ? (
        <div
          className="pointer-events-none absolute right-0 bottom-6 left-0 pb-safe text-center text-sm font-medium text-white/80"
          aria-live="polite"
          aria-atomic="true"
        >
          {activeIndex + 1}/{images.length}
        </div>
      ) : null}
    </div>
  );
}
