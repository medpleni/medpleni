"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { ACTIVE_INSTITUTION_COOKIE } from "./auth";

/**
 * Server Action para alternar a instituição ativa do usuário.
 */
export async function switchActiveInstitution(newSlug: string) {
  const cookieStore = await cookies();
  cookieStore.set(ACTIVE_INSTITUTION_COOKIE, newSlug, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365, // 1 ano
    sameSite: "lax",
  });

  revalidatePath("/instituicao");
  redirect("/instituicao");
}
