import type { DiaEstudo, BlocoEstudo, Area } from "../types";
import type { ProfileRow } from "./profile";
import { createClient } from "./client";

export interface ScheduleOptions {
  profile?: ProfileRow | null;
  focusAreas?: string[];
  activeDays?: string[];
  weeklyHours?: number;
  strategy?: "lacunas" | "simulados" | "equilibrado";
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

function getDurationMinutes(duracao: string): number {
  if (duracao.includes("h") && duracao.includes("min")) {
    const parts = duracao.split("h");
    const h = parseInt(parts[0]) || 0;
    const m = parseInt(parts[1].replace("min", "")) || 0;
    return h * 60 + m;
  }
  if (duracao.includes("h")) {
    const h = parseFloat(duracao.replace("h", "")) || 0;
    return Math.round(h * 60);
  }
  if (duracao.includes("min")) {
    return parseInt(duracao.replace("min", "")) || 0;
  }
  return 60;
}

/**
 * Gera um cronograma semanal adaptativo baseado na disponibilidade real do aluno e suas lacunas
 */
export function generateAdaptiveWeeklySchedule(options?: ScheduleOptions): DiaEstudo[] {
  const profile = options?.profile;
  const activeDays = options?.activeDays && options.activeDays.length > 0
    ? options.activeDays
    : (profile?.study_days && profile.study_days.length > 0)
      ? profile.study_days
      : ["Seg", "Ter", "Qua", "Qui", "Sex"];

  const weeklyHours = options?.weeklyHours || profile?.weekly_study_hours || 20;

  // Lacunas críticas (70% do tempo) vs Manutenção (30% do tempo)
  const lacunas: Area[] = ["Saúde Coletiva", "Ginecologia e Obstetrícia", "Cirurgia Geral"];
  const manutencao: Area[] = ["Clínica Médica", "Pediatria"];

  const today = new Date();
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
        id: `blk-${dateFormatted}-descanso`,
        horario: "09:00",
        area: "Saúde Coletiva",
        tipo: "descanso",
        duracao: "—",
        duracaoMinutos: 0,
        descricao: "Descanso programado — Recuperação e consolidação cognitiva",
        concluido: false,
        acaoUrl: "/cronograma",
      });
    } else {
      if (dStr === "Seg") {
        blocos.push(
          {
            id: `blk-${dateFormatted}-1`,
            horario: "07:00",
            area: lacunas[0],
            tipo: "questoes",
            duracao: "1h30",
            duracaoMinutos: 90,
            descricao: `Bloco de questões — ${lacunas[0]} (foco em lacunas)`,
            concluido: false,
            acaoUrl: "/questoes",
          },
          {
            id: `blk-${dateFormatted}-2`,
            horario: "09:00",
            area: manutencao[0],
            tipo: "revisao",
            duracao: "1h",
            duracaoMinutos: 60,
            descricao: `Revisão de alto rendimento — ${manutencao[0]}`,
            concluido: false,
            acaoUrl: "/aulas",
          },
          {
            id: `blk-${dateFormatted}-3`,
            horario: "10:30",
            area: lacunas[0],
            tipo: "flashcards",
            duracao: "30min",
            duracaoMinutos: 30,
            descricao: "Flashcards SRS — Sessão de repetição espaçada",
            concluido: false,
            acaoUrl: "/flashcards",
          },
          {
            id: `blk-${dateFormatted}-4`,
            horario: "14:00",
            area: lacunas[1],
            tipo: "simulado",
            duracao: "2h",
            duracaoMinutos: 120,
            descricao: `Simulado focado — ${lacunas[1]}`,
            concluido: false,
            acaoUrl: "/simulados",
          }
        );
      } else if (dStr === "Ter") {
        blocos.push(
          {
            id: `blk-${dateFormatted}-1`,
            horario: "07:00",
            area: manutencao[0],
            tipo: "simulado",
            duracao: "2h30",
            duracaoMinutos: 150,
            descricao: "Simulado geral cronometrado — Padrão banca-alvo",
            concluido: false,
            acaoUrl: "/simulados",
          },
          {
            id: `blk-${dateFormatted}-2`,
            horario: "10:00",
            area: manutencao[1],
            tipo: "revisao",
            duracao: "1h",
            duracaoMinutos: 60,
            descricao: `Revisão de erros do simulado — ${manutencao[1]}`,
            concluido: false,
            acaoUrl: "/aulas",
          },
          {
            id: `blk-${dateFormatted}-3`,
            horario: "14:00",
            area: lacunas[0],
            tipo: "questoes",
            duracao: "1h",
            duracaoMinutos: 60,
            descricao: `Resolução de questões com gabarito — ${lacunas[0]}`,
            concluido: false,
            acaoUrl: "/questoes",
          },
          {
            id: `blk-${dateFormatted}-4`,
            horario: "15:30",
            area: lacunas[1],
            tipo: "flashcards",
            duracao: "30min",
            duracaoMinutos: 30,
            descricao: "Flashcards de retenção diária",
            concluido: false,
            acaoUrl: "/flashcards",
          }
        );
      } else if (dStr === "Qua") {
        blocos.push(
          {
            id: `blk-${dateFormatted}-1`,
            horario: "07:00",
            area: lacunas[2],
            tipo: "simulado",
            duracao: "2h",
            duracaoMinutos: 120,
            descricao: `Simulado focado — ${lacunas[2]} (ATLS / Abdome agudo)`,
            concluido: false,
            acaoUrl: "/simulados",
          },
          {
            id: `blk-${dateFormatted}-2`,
            horario: "09:30",
            area: manutencao[0],
            tipo: "questoes",
            duracao: "1h",
            duracaoMinutos: 60,
            descricao: "Questões comentadas de fixação",
            concluido: false,
            acaoUrl: "/questoes",
          },
          {
            id: `blk-${dateFormatted}-3`,
            horario: "14:00",
            area: lacunas[1],
            tipo: "revisao",
            duracao: "1h30",
            duracaoMinutos: 90,
            descricao: `Revisão ativa — ${lacunas[1]}`,
            concluido: false,
            acaoUrl: "/aulas",
          }
        );
      } else if (dStr === "Qui") {
        blocos.push(
          {
            id: `blk-${dateFormatted}-1`,
            horario: "07:00",
            area: lacunas[1],
            tipo: "simulado",
            duracao: "2h",
            duracaoMinutos: 120,
            descricao: `Simulado focado — ${lacunas[1]}`,
            concluido: false,
            acaoUrl: "/simulados",
          },
          {
            id: `blk-${dateFormatted}-2`,
            horario: "09:30",
            area: lacunas[0],
            tipo: "revisao",
            duracao: "1h",
            duracaoMinutos: 60,
            descricao: `Revisão de portarias e diretrizes — ${lacunas[0]}`,
            concluido: false,
            acaoUrl: "/aulas",
          },
          {
            id: `blk-${dateFormatted}-3`,
            horario: "14:00",
            area: manutencao[0],
            tipo: "questoes",
            duracao: "1h30",
            duracaoMinutos: 90,
            descricao: "Bloco de questões difíceis",
            concluido: false,
            acaoUrl: "/questoes",
          }
        );
      } else if (dStr === "Sex") {
        blocos.push(
          {
            id: `blk-${dateFormatted}-1`,
            horario: "07:00",
            area: manutencao[0],
            tipo: "simulado",
            duracao: "3h",
            duracaoMinutos: 180,
            descricao: "Simulação completa da banca-alvo — 100 questões",
            concluido: false,
            acaoUrl: "/simulados",
          },
          {
            id: `blk-${dateFormatted}-2`,
            horario: "10:30",
            area: manutencao[1],
            tipo: "revisao",
            duracao: "1h",
            duracaoMinutos: 60,
            descricao: "Revisão detalhada do caderno de erros",
            concluido: false,
            acaoUrl: "/aulas",
          },
          {
            id: `blk-${dateFormatted}-3`,
            horario: "14:00",
            area: lacunas[0],
            tipo: "flashcards",
            duracao: "30min",
            duracaoMinutos: 30,
            descricao: "Flashcards SUS e epidemiologia",
            concluido: false,
            acaoUrl: "/flashcards",
          }
        );
      } else if (dStr === "Sáb") {
        blocos.push(
          {
            id: `blk-${dateFormatted}-1`,
            horario: "08:00",
            area: manutencao[0],
            tipo: "revisao",
            duracao: "2h",
            duracaoMinutos: 120,
            descricao: "Grande revisão semanal de erros",
            concluido: false,
            acaoUrl: "/aulas",
          },
          {
            id: `blk-${dateFormatted}-2`,
            horario: "10:30",
            area: lacunas[2],
            tipo: "questoes",
            duracao: "1h",
            duracaoMinutos: 60,
            descricao: "Questões de urgência cirúrgica",
            concluido: false,
            acaoUrl: "/questoes",
          }
        );
      } else {
        blocos.push(
          {
            id: `blk-${dateFormatted}-1`,
            horario: "09:00",
            area: manutencao[0],
            tipo: "flashcards",
            duracao: "30min",
            duracaoMinutos: 30,
            descricao: "Sessão leve de manutenção do streak",
            concluido: false,
            acaoUrl: "/flashcards",
          },
          {
            id: `blk-${dateFormatted}-2`,
            horario: "10:00",
            area: "Saúde Coletiva",
            tipo: "descanso",
            duracao: "—",
            duracaoMinutos: 0,
            descricao: "Descanso programado — recuperação cognitiva",
            concluido: false,
            acaoUrl: "/cronograma",
          }
        );
      }
    }

    schedule.push({
      dia: dateFormatted,
      diaSemana: dayFullNames[dStr] || dStr,
      isPlantao: false,
      isFolga: !isStudyDay,
      blocos,
    });
  });

  return schedule;
}

const STORAGE_KEY = "medpleni_user_schedule_v2";

/**
 * Carrega o cronograma do usuário (com persistência no Supabase + localStorage)
 */
export async function fetchUserSchedule(userId?: string): Promise<DiaEstudo[]> {
  if (typeof window !== "undefined") {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch {}
  }

  // Gera o padrão se não houver dados salvos
  const fresh = generateAdaptiveWeeklySchedule();
  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(fresh));
    } catch {}
  }
  return fresh;
}

/**
 * Salva o cronograma completo
 */
export async function saveUserSchedule(schedule: DiaEstudo[], userId?: string): Promise<void> {
  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(schedule));
    } catch {}
  }

  if (userId) {
    try {
      const supabase = createClient();
      await supabase.from("profiles").update({
        updated_at: new Date().toISOString(),
      }).eq("id", userId);
    } catch {}
  }
}

/**
 * Alterna status de conclusão de um bloco específico
 */
export function toggleBlockCompletion(schedule: DiaEstudo[], blockId: string): DiaEstudo[] {
  return schedule.map((dia) => ({
    ...dia,
    blocos: dia.blocos.map((b) => {
      if (b.id === blockId) {
        const nextConcluido = !b.concluido;
        return {
          ...b,
          concluido: nextConcluido,
          concluidoEm: nextConcluido ? new Date().toISOString() : undefined,
        };
      }
      return b;
    }),
  }));
}

/**
 * Move um bloco para outro dia
 */
export function moveBlockToDay(schedule: DiaEstudo[], blockId: string, targetDayDate: string): DiaEstudo[] {
  let blockToMove: BlocoEstudo | null = null;

  // Encontra e remove do dia de origem
  const withoutBlock = schedule.map((dia) => ({
    ...dia,
    blocos: dia.blocos.filter((b) => {
      if (b.id === blockId) {
        blockToMove = b;
        return false;
      }
      return true;
    }),
  }));

  if (!blockToMove) return schedule;

  // Insere no dia de destino
  return withoutBlock.map((dia) => {
    if (dia.dia === targetDayDate) {
      return {
        ...dia,
        blocos: [...dia.blocos, blockToMove!],
      };
    }
    return dia;
  });
}

/**
 * Adia um bloco para o dia seguinte
 */
export function postponeBlockToNextDay(schedule: DiaEstudo[], blockId: string): DiaEstudo[] {
  const currentDayIdx = schedule.findIndex((dia) => dia.blocos.some((b) => b.id === blockId));
  if (currentDayIdx === -1) return schedule;

  const nextDayIdx = (currentDayIdx + 1) % schedule.length;
  const targetDayDate = schedule[nextDayIdx].dia;
  return moveBlockToDay(schedule, blockId, targetDayDate);
}

/**
 * Exclui um bloco do cronograma
 */
export function deleteBlockFromSchedule(schedule: DiaEstudo[], blockId: string): DiaEstudo[] {
  return schedule.map((dia) => ({
    ...dia,
    blocos: dia.blocos.filter((b) => b.id !== blockId),
  }));
}

/**
 * Adiciona uma nova atividade personalizada ao cronograma
 */
export function addBlockToSchedule(
  schedule: DiaEstudo[],
  dayDate: string,
  newBlock: Omit<BlocoEstudo, "id">
): DiaEstudo[] {
  const blockWithId: BlocoEstudo = {
    ...newBlock,
    id: `blk-${dayDate}-${Date.now()}`,
    duracaoMinutos: getDurationMinutes(newBlock.duracao),
    concluido: false,
  };

  return schedule.map((dia) => {
    if (dia.dia === dayDate) {
      return {
        ...dia,
        blocos: [...dia.blocos, blockWithId],
      };
    }
    return dia;
  });
}

/**
 * Alterna um dia inteiro como Plantão Médico / Folga
 */
export function toggleDayPlantao(schedule: DiaEstudo[], dayDate: string): DiaEstudo[] {
  return schedule.map((dia) => {
    if (dia.dia === dayDate) {
      const isNowPlantao = !dia.isPlantao;
      return {
        ...dia,
        isPlantao: isNowPlantao,
        blocos: isNowPlantao
          ? [
              {
                id: `blk-${dayDate}-plantao`,
                horario: "07:00",
                area: "Urgência e Emergência",
                tipo: "descanso",
                duracao: "12h/24h",
                duracaoMinutos: 0,
                descricao: "Dia de Plantão Médico / Internato hospitalar — Foco em recuperação",
                isPlantao: true,
                concluido: true,
              },
            ]
          : dia.blocos,
      };
    }
    return dia;
  });
}
