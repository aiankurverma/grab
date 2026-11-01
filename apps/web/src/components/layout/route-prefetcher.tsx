"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

const ROUTES = [
  "/",
  "/platforms",
  "/formats",
  "/faq",
  "/history",
  "/login",
  "/signup",
  "/terms",
  "/privacy",
  "/dmca",
];

export function RoutePrefetcher() {
  const router = useRouter();

  useEffect(() => {
    // Aggressively prefetch all top routes immediately on idle so every route change is 100% instant
    const prefetchRoutes = () => {
      for (const route of ROUTES) {
        try {
          router.prefetch(route);
        } catch {
          // Ignore prefetch aborts
        }
      }
    };

    if (typeof window !== "undefined") {
      if ("requestIdleCallback" in window) {
        const id = (window as unknown as { requestIdleCallback: (fn: () => void) => number }).requestIdleCallback(prefetchRoutes);
        return () => (window as unknown as { cancelIdleCallback: (id: number) => void }).cancelIdleCallback(id);
      } else {
        const timer = setTimeout(prefetchRoutes, 200);
        return () => clearTimeout(timer);
      }
    }
  }, [router]);

  return null;
}
