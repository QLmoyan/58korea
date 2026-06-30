"use client";

import {
  createContext,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { FeedChannel } from "@/lib/data/posts";
import {
  DEFAULT_SELECTED_REGION,
  type SelectedRegion,
} from "@/lib/feed/regions";

interface HomeSearchContextValue {
  channel: FeedChannel;
  region: SelectedRegion;
  setChannel: (channel: FeedChannel) => void;
  setRegion: (region: SelectedRegion) => void;
}

const HomeSearchContext = createContext<HomeSearchContextValue | null>(null);

export function HomeSearchContextProvider({ children }: { children: ReactNode }) {
  const [channel, setChannel] = useState<FeedChannel>("推荐");
  const [region, setRegion] = useState<SelectedRegion>(DEFAULT_SELECTED_REGION);

  const value = useMemo(
    () => ({
      channel,
      region,
      setChannel,
      setRegion,
    }),
    [channel, region],
  );

  return (
    <HomeSearchContext.Provider value={value}>
      {children}
    </HomeSearchContext.Provider>
  );
}

export function useHomeSearchContext() {
  const context = useContext(HomeSearchContext);

  if (!context) {
    return {
      channel: "推荐" as FeedChannel,
      region: DEFAULT_SELECTED_REGION,
      setChannel: () => {},
      setRegion: () => {},
    };
  }

  return context;
}
