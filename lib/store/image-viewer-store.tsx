"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import ImageViewer from "@/components/image/ImageViewer";
import type { OpenViewerPayload, ViewerImage } from "@/lib/types/image-viewer";

const IMAGE_VIEWER_HISTORY_STATE = { imageViewerOpen: true } as const;

interface ImageViewerContextValue {
  open: boolean;
  images: ViewerImage[];
  initialIndex: number;
  openViewer: (payload: OpenViewerPayload) => void;
  closeViewer: () => void;
}

const ImageViewerContext = createContext<ImageViewerContextValue | null>(null);

export function ImageViewerProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [images, setImages] = useState<ViewerImage[]>([]);
  const [initialIndex, setInitialIndex] = useState(0);
  const viewerHistoryActiveRef = useRef(false);

  const resetViewerState = useCallback(() => {
    setOpen(false);
    setImages([]);
    setInitialIndex(0);
  }, []);

  const closeViewer = useCallback((fromPopstate = false) => {
    resetViewerState();

    if (fromPopstate) {
      viewerHistoryActiveRef.current = false;
      return;
    }

    if (viewerHistoryActiveRef.current) {
      viewerHistoryActiveRef.current = false;
      window.history.back();
    }
  }, [resetViewerState]);

  const openViewer = useCallback(
    ({ images: nextImages, initialIndex: index = 0 }: OpenViewerPayload) => {
      if (nextImages.length === 0) {
        return;
      }

      const safeIndex = Math.min(
        Math.max(index, 0),
        nextImages.length - 1,
      );

      setImages(nextImages);
      setInitialIndex(safeIndex);
      setOpen(true);

      if (!viewerHistoryActiveRef.current) {
        window.history.pushState(IMAGE_VIEWER_HISTORY_STATE, "");
        viewerHistoryActiveRef.current = true;
      }
    },
    [],
  );

  useEffect(() => {
    function handlePopstate() {
      if (viewerHistoryActiveRef.current) {
        closeViewer(true);
      }
    }

    window.addEventListener("popstate", handlePopstate);
    return () => window.removeEventListener("popstate", handlePopstate);
  }, [closeViewer]);

  useEffect(() => {
    if (!open) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  const value = useMemo(
    () => ({
      open,
      images,
      initialIndex,
      openViewer,
      closeViewer: () => closeViewer(false),
    }),
    [open, images, initialIndex, openViewer, closeViewer],
  );

  return (
    <ImageViewerContext.Provider value={value}>
      {children}
      {open ? (
        <ImageViewer
          images={images}
          initialIndex={initialIndex}
          onClose={() => closeViewer(false)}
        />
      ) : null}
    </ImageViewerContext.Provider>
  );
}

export function useImageViewer() {
  const context = useContext(ImageViewerContext);
  if (!context) {
    throw new Error("useImageViewer must be used within ImageViewerProvider");
  }
  return context;
}
