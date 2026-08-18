"use server";

import { auth } from "@/auth";
import { savePreference } from "@/lib/preferences";

export async function setThemeAction(theme: string): Promise<void> {
  if (theme !== "dark" && theme !== "light") return;

  const session = await auth();
  if (session?.user?.id) {
    await savePreference(Number(session.user.id), "tema", theme);
  }
}
