"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import ImageViewer from "@/components/image/ImageViewer";
import type { OpenViewerPayload, ViewerImage } from "@/lib/types/image-viewer";

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

  const closeViewer = useCallback(() => {
    setOpen(false);
    setImages([]);
    setInitialIndex(0);
  }, []);

  const openViewer = useCallback(({ images: nextImages, initialIndex: index = 0 }: OpenViewerPayload) => {
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
  }, []);

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
      closeViewer,
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
          onClose={closeViewer}
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
