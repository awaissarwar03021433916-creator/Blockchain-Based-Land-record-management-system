"use client";

import { Toaster } from "sonner";

/**
 * Sonner toast portal.
 *
 * Mounted once at the app root so any feature can fire `toast.success(...)`
 * without local setup. Styling defers to the design tokens declared in
 * `globals.css` — backgrounds, borders, and colors come from CSS variables
 * so toasts shift cleanly if a dark theme is added later.
 *
 * Positioning: top-right matches the institutional pattern (status surfaces
 * at the upper edge, not over content); offset accounts for the 64px TopBar.
 */
export function ToastProvider() {
  return (
    <Toaster
      position="top-right"
      offset={80}
      gap={8}
      duration={4000}
      richColors
      closeButton
      toastOptions={{
        classNames: {
          toast:
            "border border-border bg-card text-card-foreground shadow-sm",
          title: "font-sans font-medium",
          description: "text-muted-foreground",
          success: "border-brand-200 bg-brand-100 text-brand-900",
          error: "border-destructive/30",
          actionButton:
            "bg-primary text-primary-foreground hover:bg-primary/90",
          cancelButton:
            "bg-muted text-muted-foreground hover:bg-muted/80",
        },
      }}
    />
  );
}
