"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { signOutAction } from "@/app/actions/auth";

interface UserMenuProps {
  name: string | null;
  email: string | null;
}

function initialsOf(name: string | null, email: string | null): string {
  const source = name?.trim() || email || "?";
  const words = source.split(/\s+/).filter(Boolean);
  if (words.length >= 2) return (words[0][0] + words[1][0]).toUpperCase();
  return source.slice(0, 2).toUpperCase();
}

export function UserMenu({ name, email }: UserMenuProps) {
  const t = useTranslations("ui");
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    function onPointerDown(event: PointerEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label={t("account")}
        className="flex h-9 w-9 items-center justify-center rounded-full bg-intess text-xs font-bold text-white transition-colors hover:bg-intess/85 focus:outline-none focus-visible:ring-2 focus-visible:ring-intess focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-900"
      >
        {initialsOf(name, email)}
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-11 z-50 w-60 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl dark:border-slate-700 dark:bg-slate-900"
        >
            <div className="border-b border-slate-100 px-4 py-3 dark:border-slate-800">
              <p className="truncate text-sm font-semibold text-slate-800 dark:text-slate-100">
                {name ?? email}
              </p>
              {name && (
                <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                  {email}
                </p>
              )}
            </div>
            <Link
              href="/dashboard/cuenta"
              role="menuitem"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-slate-600 transition-colors hover:bg-intess-light hover:text-intess dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-intess-accent"
            >
              <svg
                aria-hidden="true"
                className="h-4 w-4"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="12" cy="8" r="3.5" />
                <path d="M5 20c.9-3.5 3.7-5.5 7-5.5s6.1 2 7 5.5" />
              </svg>
              {t("account")}
            </Link>
            <form action={signOutAction}>
              <button
                type="submit"
                role="menuitem"
                className="flex w-full items-center gap-2.5 border-t border-slate-100 px-4 py-2.5 text-left text-sm text-reprobado transition-colors hover:bg-reprobado-bg dark:border-slate-800 dark:hover:bg-reprobado/10"
              >
                <svg
                  aria-hidden="true"
                  className="h-4 w-4"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />
                </svg>
                {t("signOut")}
              </button>
            </form>
        </div>
      )}
    </div>
  );
}
