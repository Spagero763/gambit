"use client";

import { useEffect } from "react";

// Which way the next page slides in. Links declare it with data-nav, the
// phone's back gesture always means back, and .page-in reads it from <html>.
export function useNavDirection() {
  useEffect(() => {
    const html = document.documentElement;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const clear = () => {
      delete html.dataset.nav;
    };
    const mark = (dir: string) => {
      html.dataset.nav = dir;
      clearTimeout(timer);
      timer = setTimeout(clear, 4000);
    };
    const onClick = (e: MouseEvent) => {
      const a = (e.target as Element | null)?.closest?.("a[data-nav]");
      if (a) mark(a.getAttribute("data-nav") ?? "");
    };
    const onPop = () => mark("back");
    const arrived = (el: Element) => el.setAttribute("data-in", "");
    const onEnd = (e: AnimationEvent) => {
      const el = e.target as Element | null;
      if (!el?.classList?.contains("page-in")) return;
      arrived(el);
      clear();
    };
    // the first page usually finished arriving before this ran
    document.querySelectorAll(".page-in").forEach((el) => {
      if (!el.getAnimations?.().length) arrived(el);
    });
    document.addEventListener("click", onClick, true);
    window.addEventListener("popstate", onPop);
    document.addEventListener("animationend", onEnd);
    return () => {
      clearTimeout(timer);
      document.removeEventListener("click", onClick, true);
      window.removeEventListener("popstate", onPop);
      document.removeEventListener("animationend", onEnd);
    };
  }, []);
}
