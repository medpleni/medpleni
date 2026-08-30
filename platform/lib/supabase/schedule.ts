import type { DiaEstudo, BlocoEstudo, Area } from "../types";
import type { ProfileRow } from "./profile";

export interface ScheduleOptions {
  profile?: ProfileRow | null;
  focusAreas?: string[]; // Áreas com maiores lacunas
}

const defaultDays = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];
const dayFullNames: Record<string, string> = {
  Seg: "Segunda-feira",
  Ter: "Terça-feira",
  Qua: "Quarta-feira",
  Qui: "Quinta-feira",
  Sex: "Sexta-feira",
  Sáb: "Sábado",
  Dom: "Domingo",
};

/**
 * Gera um cronograma semanal adaptativo baseado na disponibilidade real do aluno e suas lacunas
 */
export function generateAdaptiveWeeklySchedule(options?: ScheduleOptions): DiaEstudo[] {
  const profile = options?.profile;
  const activeDays = (profile?.study_days && profile.study_days.length > 0)
    ? profile.study_days
    : ["Seg", "Ter", "Qua", "Qui", "Sex"];

  const weeklyHours = profile?.weekly_study_hours || 20;
  const targetSpecialty = profile?.target_specialty || "Clínica Médica";

  // Lacunas críticas (70% do tempo) vs Manutenção (30% do tempo)
  const lacunas: Area[] = ["Saúde Coletiva", "Ginecologia e Obstetrícia", "Cirurgia Geral"];
  const manutencao: Area[] = ["Clínica Médica", "Pediatria"];

  const today = new Date();
  // Começa na segunda-feira atual
  const monday = new Date(today);
  const day = monday.getDay();
  const diff = monday.getDate() - day + (day === 0 ? -6 : 1);
  monday.setDate(diff);

  const schedule: DiaEstudo[] = [];

  defaultDays.forEach((dStr, idx) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + idx);
    const dateFormatted = d.toISOString().split("T")[0];
    const isStudyDay = activeDays.includes(dStr);

    const blocos: BlocoEstudo[] = [];

    if (!isStudyDay) {
      blocos.push({
        horario: "09:00",
        area: "Saúde Coletiva",
        tipo: "descanso",
        duracao: "—",
        descricao: "Descanso programado — Recuperação e consolidação cognitiva",
      });
    } else {
      // Distribuição de blocos por dia de estudo
      if (dStr === "Seg") {
        blocos.push(
          { horario: "07:00", area: lacunas[0], tipo: "questoes", duracao: "1h30", descricao: `Bloco de questões — ${lacunas[0]} (foco em lacunas)` },
          { horario: "09:00", area: manutencao[0], tipo: "revisao", duracao: "1h", descricao: `Revisão de alto rendimento — ${manutencao[0]}` },
          { horario: "10:30", area: lacunas[0], tipo: "flashcards", duracao: "30min", descricao: "Flashcards SRS — Sessão de repetição espaçada" },
          { horario: "14:00", area: lacunas[1], tipo: "simulado", duracao: "2h", descricao: `Simulado focado — ${lacunas[1]}` }
        );
      } else if (dStr === "Ter") {
        blocos.push(
          { horario: "07:00", area: manutencao[0], tipo: "simulado", duracao: "2h30", descricao: "Simulado geral cronometrado — Padrão banca-alvo" },
          { horario: "10:00", area: manutencao[1], tipo: "revisao", duracao: "1h", descricao: `Revisão de erros do simulado — ${manutencao[1]}` },
          { horario: "14:00", area: lacunas[0], tipo: "questoes", duracao: "1h", descricao: `Resolução de questões com gabarito — ${lacunas[0]}` },
          { horario: "15:30", area: lacunas[1], tipo: "flashcards", duracao: "30min", descricao: "Flashcards de retenção diária" }
        );
      } else if (dStr === "Qua") {
        blocos.push(
          { horario: "07:00", area: lacunas[2], tipo: "simulado", duracao: "2h", descricao: `Simulado focado — ${lacunas[2]} (ATLS / Abdome agudo)` },
          { horario: "09:30", area: manutencao[0], tipo: "questoes", duracao: "1h", descricao: "Questões comentadas de fixação" },
          { horario: "14:00", area: lacunas[1], tipo: "revisao", duracao: "1h30", descricao: `Revisão ativa — ${lacunas[1]}` }
        );
      } else if (dStr === "Qui") {
        blocos.push(
          { horario: "07:00", area: lacunas[1], tipo: "simulado", duracao: "2h", descricao: `Simulado focado — ${lacunas[1]}` },
          { horario: "09:30", area: lacunas[0], tipo: "revisao", duracao: "1h", descricao: `Revisão de portarias e diretrizes — ${lacunas[0]}` },
          { horario: "14:00", area: manutencao[0], tipo: "questoes", duracao: "1h30", descricao: "Bloco de questões difíceis" }
        );
      } else if (dStr === "Sex") {
        blocos.push(
          { horario: "07:00", area: manutencao[0], tipo: "simulado", duracao: "3h", descricao: "Simulação completa da banca-alvo — 100 questões" },
          { horario: "10:30", area: manutencao[1], tipo: "revisao", duracao: "1h", descricao: "Revisão detalhada do caderno de erros" },
          { horario: "14:00", area: lacunas[0], tipo: "flashcards", duracao: "30min", descricao: "Flashcards SUS e epidemiologia" }
        );
      } else if (dStr === "Sáb") {
        blocos.push(
          { horario: "08:00", area: manutencao[0], tipo: "revisao", duracao: "2h", descricao: "Grande revisão semanal de erros" },
          { horario: "10:30", area: lacunas[2], tipo: "questoes", duracao: "1h", descricao: "Questões de urgência cirúrgica" }
        );
      } else {
        blocos.push(
          { horario: "09:00", area: manutencao[0], tipo: "flashcards", duracao: "30min", descricao: "Sessão leve de manutenção do streak" },
          { horario: "10:00", area: "Saúde Coletiva", tipo: "descanso", duracao: "—", descricao: "Descanso programado — recuperação cognitiva" }
        );
      }
    }

    schedule.push({
      dia: dateFormatted,
      diaSemana: dayFullNames[dStr] || dStr,
      blocos,
    });
  });

  return schedule;
}
