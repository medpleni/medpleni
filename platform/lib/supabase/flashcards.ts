import { createClient } from "./client";
import type { Flashcard, Area } from "../types";
import { mockFlashcards } from "../mock-data";

export interface FlashcardWithReview extends Flashcard {
  easeFactor: number;
  repetitions: number;
  nextReviewAt: string;
  isDue: boolean;
}

/**
 * Busca a fila de flashcards para revisão do usuário
 */
export async function fetchDueFlashcards(
  userId?: string,
  area?: string
): Promise<FlashcardWithReview[]> {
  try {
    const supabase = createClient();

    let query = supabase.from("flashcards").select("*");
    if (area && area !== "Todas") {
      query = query.eq("area", area);
    }
    const { data: dbCards, error } = await query;

    if (error || !dbCards || dbCards.length === 0) {
      return mockFlashcards.map((fc) => ({
        ...fc,
        easeFactor: fc.facilidade,
        repetitions: 1,
        nextReviewAt: fc.proximaRevisao,
        isDue: true,
      }));
    }

    let reviewMap: Record<string, any> = {};
    if (userId) {
      const { data: reviews } = await supabase
        .from("user_flashcard_reviews")
        .select("*")
        .eq("user_id", userId);

      if (reviews) {
        reviews.forEach((r: any) => {
          reviewMap[r.flashcard_id] = r;
        });
      }
    }

    const now = new Date();

    return dbCards.map((c: any) => {
      const rev = reviewMap[c.id];
      const easeFactor = rev ? Number(rev.ease_factor) : 2.5;
      const intervalDays = rev ? Number(rev.interval_days) : 1;
      const repetitions = rev ? Number(rev.repetitions) : 0;
      const nextReviewAt = rev?.next_review_at || now.toISOString();
      const isDue = new Date(nextReviewAt) <= now || repetitions === 0;

      return {
        id: c.id,
        frente: c.front,
        verso: c.back,
        area: c.area as Area,
        subarea: c.subarea,
        proximaRevisao: nextReviewAt.split("T")[0],
        intervaloDias: intervalDays,
        facilidade: easeFactor,
        easeFactor,
        repetitions,
        nextReviewAt,
        isDue,
      };
    });
  } catch (err) {
    console.warn("Aviso ao buscar flashcards no Supabase, usando dados locais:", err);
    return mockFlashcards.map((fc) => ({
      ...fc,
      easeFactor: fc.facilidade,
      repetitions: 1,
      nextReviewAt: fc.proximaRevisao,
      isDue: true,
    }));
  }
}

/**
 * Processa a classificação de um flashcard pelo algoritmo de repetição espaçada (SM-2 adaptado para medicina)
 */
export async function submitFlashcardReview(params: {
  userId?: string;
  flashcardId: string;
  rating: "dificil" | "ok" | "facil";
  currentEase: number;
  currentInterval: number;
  currentReps: number;
}): Promise<{
  newIntervalDays: number;
  newEaseFactor: number;
  newReps: number;
  nextReviewDate: string;
}> {
  const { rating, currentEase, currentInterval, currentReps, userId, flashcardId } = params;

  let newIntervalDays = 1;
  let newEaseFactor = currentEase;
  let newReps = currentReps;

  if (rating === "dificil") {
    newReps = 0;
    newIntervalDays = 1;
    newEaseFactor = Math.max(1.3, currentEase - 0.20);
  } else if (rating === "ok") {
    newReps = currentReps + 1;
    if (newReps === 1) {
      newIntervalDays = 1;
    } else if (newReps === 2) {
      newIntervalDays = 3;
    } else {
      newIntervalDays = Math.round(currentInterval * currentEase);
    }
  } else {
    // Fácil
    newReps = currentReps + 1;
    if (newReps === 1) {
      newIntervalDays = 3;
    } else if (newReps === 2) {
      newIntervalDays = 7;
    } else {
      newIntervalDays = Math.round(currentInterval * currentEase * 1.3);
    }
    newEaseFactor = Math.min(3.0, currentEase + 0.15);
  }

  const nextDate = new Date();
  nextDate.setDate(nextDate.getDate() + newIntervalDays);
  const nextReviewDate = nextDate.toISOString();

  if (userId && flashcardId) {
    try {
      const supabase = createClient();
      await supabase.from("user_flashcard_reviews").upsert({
        user_id: userId,
        flashcard_id: flashcardId,
        ease_factor: Number(newEaseFactor.toFixed(2)),
        interval_days: newIntervalDays,
        repetitions: newReps,
        next_review_at: nextReviewDate,
        last_reviewed_at: new Date().toISOString(),
      }, { onConflict: "user_id,flashcard_id" });
    } catch (err) {
      console.warn("Aviso ao salvar revisão de flashcard no Supabase:", err);
    }
  }

  return {
    newIntervalDays,
    newEaseFactor: Number(newEaseFactor.toFixed(2)),
    newReps,
    nextReviewDate: nextReviewDate.split("T")[0],
  };
}
