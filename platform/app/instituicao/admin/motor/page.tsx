import { Metadata } from "next";
import { redirect } from "next/navigation";
import { getB2BUserContext } from "@/lib/b2b/auth";
import { getCanonicalAreas, getTemas } from "@/lib/b2b/taxonomy";
import {
  listGenerationInputsAction,
  getEngineOverviewAction,
} from "@/lib/b2b/engine/engine-actions";
import MotorClient from "./MotorClient";

export const metadata: Metadata = {
  title: "Motor de Geração de Questões | MedPleni Admin",
  description: "Piloto controlado de geração de itens médicos assistida por IA e validação por amostragem",
};

export default async function MotorAdminPage() {
  const context = await getB2BUserContext();

  // Acesso estritamente restrito a Editor e Admin MedPleni
  if (!context?.isMedPleniAdmin) {
    redirect("/instituicao");
  }

  const [areas, temas, inputs, overview] = await Promise.all([
    getCanonicalAreas("todas"),
    getTemas(),
    listGenerationInputsAction(),
    getEngineOverviewAction(),
  ]);

  return (
    <MotorClient
      context={context}
      areas={areas}
      temas={temas}
      inputs={inputs}
      batches={overview.batches}
      stats={overview.stats}
    />
  );
}
