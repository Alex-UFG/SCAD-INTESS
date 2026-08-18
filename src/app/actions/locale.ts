"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { isLocale, LOCALE_COOKIE } from "@/i18n/config";
import { savePreference } from "@/lib/preferences";

export async function setLocaleAction(locale: string): Promise<void> {
  if (!isLocale(locale)) return;

  const store = await cookies();
  store.set(LOCALE_COOKIE, locale, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
  });

  const session = await auth();
  if (session?.user?.id) {
    await savePreference(Number(session.user.id), "idioma", locale);
  }

  revalidatePath("/", "layout");
}
