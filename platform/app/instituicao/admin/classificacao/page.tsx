import { redirect } from "next/navigation";
import { getB2BUserContext } from "@/lib/b2b/auth";
import {
  getCanonicalAreas,
  getCenarios,
  getTemas,
  getCompetencias,
  getTaxonomyMigrationReport,
} from "@/lib/b2b/taxonomy";
import ClassificacaoClient from "./ClassificacaoClient";

export const dynamic = "force-dynamic";

export default async function ClassificacaoAdminPage() {
  const context = await getB2BUserContext();

  // Apenas Administradores e Editores MedPleni podem gerenciar taxonomias globais
  if (!context || !context.isMedPleniAdmin) {
    redirect("/instituicao");
  }

  const [areas, cenarios, temas, competencias, report] = await Promise.all([
    getCanonicalAreas("todas"),
    getCenarios(),
    getTemas(),
    getCompetencias(),
    getTaxonomyMigrationReport(),
  ]);

  return (
    <ClassificacaoClient
      areas={areas}
      cenarios={cenarios}
      temas={temas}
      competencias={competencias}
      report={report}
    />
  );
}
