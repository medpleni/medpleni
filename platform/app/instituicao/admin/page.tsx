import { redirect } from "next/navigation";
import { getB2BUserContext } from "@/lib/b2b/auth";
import { createClient } from "@/lib/supabase/server";
import AdminInstituicaoClient from "./AdminInstituicaoClient";
import type { Institution } from "@/lib/b2b/types";

export const dynamic = "force-dynamic";

export default async function AdminInstituicaoPage() {
  const context = await getB2BUserContext();

  // Guarda rígida: apenas Administradores MedPleni têm acesso à gestão global
  if (!context || !context.isMedPleniAdmin) {
    redirect("/instituicao");
  }

  const supabase = await createClient();

  // Busca todas as instituições cadastradas
  const { data: instData } = await supabase
    .from("institutions")
    .select("*")
    .order("created_at", { ascending: false });

  const institutions = (instData || []) as Institution[];

  return <AdminInstituicaoClient context={context} institutions={institutions} />;
}
