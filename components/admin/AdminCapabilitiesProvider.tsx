"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import {
  getAdminPanelCapabilitiesAction,
  type AdminCapabilities,
} from "@/lib/actions/admin-capabilities";
import type { AdminPermission } from "@/lib/types/admin-auth";

const EMPTY_CAPABILITIES: AdminCapabilities = {
  isAdmin: false,
  role: null,
  permissions: [],
};

const AdminCapabilitiesContext =
  createContext<AdminCapabilities>(EMPTY_CAPABILITIES);

export function AdminCapabilitiesProvider({ children }: { children: ReactNode }) {
  const [capabilities, setCapabilities] =
    useState<AdminCapabilities>(EMPTY_CAPABILITIES);

  useEffect(() => {
    let cancelled = false;

    async function loadCapabilities() {
      try {
        const next = await getAdminPanelCapabilitiesAction();
        if (!cancelled) {
          setCapabilities(next);
        }
      } catch {
        if (!cancelled) {
          setCapabilities(EMPTY_CAPABILITIES);
        }
      }
    }

    void loadCapabilities();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <AdminCapabilitiesContext.Provider value={capabilities}>
      {children}
    </AdminCapabilitiesContext.Provider>
  );
}

export function useAdminCapabilities() {
  return useContext(AdminCapabilitiesContext);
}

export function useAdminPermission(permission: AdminPermission) {
  const { permissions } = useAdminCapabilities();
  return permissions.includes(permission);
}
