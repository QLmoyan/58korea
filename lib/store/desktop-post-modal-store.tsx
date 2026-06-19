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

const DESKTOP_POST_MODAL_HISTORY_STATE = { desktopPostModalOpen: true } as const;

interface DesktopPostModalContextValue {
  openPostId: number | null;
  openPostModal: (postId: number) => void;
  closePostModal: () => void;
}

const DesktopPostModalContext =
  createContext<DesktopPostModalContextValue | null>(null);

export function DesktopPostModalProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [openPostId, setOpenPostId] = useState<number | null>(null);
  const historyActiveRef = useRef(false);

  const closePostModal = useCallback((fromPopstate = false) => {
    setOpenPostId(null);

    if (fromPopstate) {
      historyActiveRef.current = false;
      return;
    }

    if (historyActiveRef.current) {
      historyActiveRef.current = false;
      window.history.back();
    }
  }, []);

  const openPostModal = useCallback((postId: number) => {
    setOpenPostId(postId);

    if (!historyActiveRef.current) {
      const nextUrl = `/posts/${postId}`;
      window.history.pushState(DESKTOP_POST_MODAL_HISTORY_STATE, "", nextUrl);
      historyActiveRef.current = true;
    }
  }, []);

  useEffect(() => {
    function handlePopstate() {
      if (historyActiveRef.current) {
        closePostModal(true);
      }
    }

    window.addEventListener("popstate", handlePopstate);
    return () => window.removeEventListener("popstate", handlePopstate);
  }, [closePostModal]);

  useEffect(() => {
    if (openPostId === null) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        closePostModal(false);
      }
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [openPostId, closePostModal]);

  const value = useMemo(
    () => ({
      openPostId,
      openPostModal,
      closePostModal: () => closePostModal(false),
    }),
    [openPostId, openPostModal, closePostModal],
  );

  return (
    <DesktopPostModalContext.Provider value={value}>
      {children}
    </DesktopPostModalContext.Provider>
  );
}

export function useDesktopPostModal() {
  const context = useContext(DesktopPostModalContext);
  if (!context) {
    throw new Error(
      "useDesktopPostModal must be used within DesktopPostModalProvider",
    );
  }
  return context;
}

export function useDesktopPostModalOptional() {
  return useContext(DesktopPostModalContext);
}
