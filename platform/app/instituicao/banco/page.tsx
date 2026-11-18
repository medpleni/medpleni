import { Metadata } from "next";
import { requireB2BMember } from "@/lib/b2b/auth";
import { getTaxonomyBundle } from "@/lib/b2b/taxonomy";
import { getBankOverview, searchBankQuestionsAction } from "@/lib/b2b/bank-actions";
import BancoClient from "./BancoClient";

export const metadata: Metadata = {
  title: "Banco de Questões | MedPleni B2B",
  description: "Acervo institucional e MedPleni de itens médicos catalogados e revisados",
};

export default async function BancoPage() {
  const context = await requireB2BMember({
    requiredRoles: ["dirigente", "coordenador", "docente"],
  });

  const [taxonomy, overview, initialSearch] = await Promise.all([
    getTaxonomyBundle(),
    getBankOverview(context.institution.id),
    searchBankQuestionsAction({
      status: "published",
      pageSize: 15,
      page: 1,
    }),
  ]);

  return (
    <BancoClient
      context={context}
      overview={overview}
      initialQuestions={initialSearch.questions}
      initialTotalCount={initialSearch.totalCount}
      taxonomy={taxonomy}
    />
  );
}
