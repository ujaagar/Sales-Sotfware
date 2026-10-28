"use client";

import Script from "next/script";
import { useEffect, useRef } from "react";

type TurnstileApi = {
  render: (el: HTMLElement, opts: Record<string, unknown>) => string;
  remove: (id: string) => void;
};

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

/** Cloudflare Turnstile captcha. Calls onToken with the token (or null when it expires). */
export function Turnstile({ onToken }: { onToken: (token: string | null) => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

  useEffect(() => {
    let id: string | null = null;
    let timer: ReturnType<typeof setInterval> | null = null;
    const mount = () => {
      if (!ref.current || !window.turnstile || !siteKey) return false;
      id = window.turnstile.render(ref.current, {
        sitekey: siteKey,
        callback: (t: string) => onToken(t),
        "expired-callback": () => onToken(null),
        "error-callback": () => onToken(null),
      });
      return true;
    };
    if (!mount()) {
      timer = setInterval(() => {
        if (mount() && timer) clearInterval(timer);
      }, 250);
    }
    return () => {
      if (timer) clearInterval(timer);
      if (id && window.turnstile) window.turnstile.remove(id);
    };
  }, [siteKey, onToken]);

  if (!siteKey) return null;
  return (
    <>
      <Script src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit" strategy="afterInteractive" />
      <div ref={ref} className="min-h-[65px]" />
    </>
  );
}
