import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

/**
 * Ephemeral, client-only UI state.
 *
 * Rule of thumb (see architecture doc): if it can be re-derived from the
 * server, it belongs in React Query; if it touches the chain, in wagmi.
 * What's left — chrome toggles, command-palette state, etc. — lives here.
 *
 * Only `sidebarCollapsed` is persisted; everything else resets on reload.
 */
interface UiState {
  sidebarCollapsed: boolean;
  commandPaletteOpen: boolean;
  mobileNavOpen: boolean;

  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;

  openCommandPalette: () => void;
  closeCommandPalette: () => void;
  toggleCommandPalette: () => void;

  openMobileNav: () => void;
  closeMobileNav: () => void;
}

export const useUiStore = create<UiState>()(
  persist(
    (set) => ({
      sidebarCollapsed: false,
      commandPaletteOpen: false,
      mobileNavOpen: false,

      toggleSidebar: () =>
        set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
      setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),

      openCommandPalette: () => set({ commandPaletteOpen: true }),
      closeCommandPalette: () => set({ commandPaletteOpen: false }),
      toggleCommandPalette: () =>
        set((s) => ({ commandPaletteOpen: !s.commandPaletteOpen })),

      openMobileNav: () => set({ mobileNavOpen: true }),
      closeMobileNav: () => set({ mobileNavOpen: false }),
    }),
    {
      name: "land-registry:ui",
      storage: createJSONStorage(() => localStorage),
      // Only the sidebar-collapsed preference survives reloads; modal /
      // palette state must NOT, or users land in a half-open UI on refresh.
      partialize: (state) => ({ sidebarCollapsed: state.sidebarCollapsed }),
    },
  ),
);
