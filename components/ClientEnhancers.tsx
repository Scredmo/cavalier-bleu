"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

export default function ClientEnhancers() {
  const pathname = usePathname();

  // ✅ Active nav (sidebar + bottom nav)
  useEffect(() => {
    const normalize = (p: string) => {
      if (!p) return "/dashboard";
      if (p.length > 1 && p.endsWith("/")) return p.slice(0, -1);
      return p;
    };

    const current = normalize(pathname === "/" ? "/dashboard" : pathname);

    document.querySelectorAll<HTMLElement>("[data-nav][data-path]").forEach((el) => {
      el.classList.remove("cb-nav-item--active", "cb-bottom-nav__item--active");
      el.removeAttribute("aria-current");

      const p = normalize(el.getAttribute("data-path") || "");
      if (p === current) {
        if (el.classList.contains("cb-nav-item")) el.classList.add("cb-nav-item--active");
        if (el.classList.contains("cb-bottom-nav__item")) el.classList.add("cb-bottom-nav__item--active");
        el.setAttribute("aria-current", "page");
      }
    });
  }, [pathname]);

  // ✅ Close user menu on outside click / Escape + haptic tap
  useEffect(() => {
    const closeAll = () => {
      document.querySelectorAll<HTMLDetailsElement>("details.cb-user-menu[open]").forEach((d) => {
        d.removeAttribute("open");
      });
    };

    const onPointerDown = (e: PointerEvent) => {
      const t = e.target as Element | null;
      if (!t) return;
      if (t.closest('summary[data-haptic="tap"]')) {
        try {
          navigator.vibrate?.(12);
        } catch {}
      }
    };

    // click (pas pointerdown) pour éviter de casser la navigation Link
    const onClick = (e: MouseEvent) => {
      const t = e.target as Element | null;
      if (!t) return;

      const insideMenu = t.closest("details.cb-user-menu");
      if (insideMenu) {
        // si on clique un item du menu, on ferme après le clic
        if (t.closest(".cb-user-menu__panel a")) {
          setTimeout(closeAll, 0);
        }
        return;
      }
      closeAll();
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeAll();
    };

    document.addEventListener("pointerdown", onPointerDown, { capture: true, passive: true });
    document.addEventListener("click", onClick, true);
    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.removeEventListener("pointerdown", onPointerDown, true as any);
      document.removeEventListener("click", onClick, true as any);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, []);

  return null;
}