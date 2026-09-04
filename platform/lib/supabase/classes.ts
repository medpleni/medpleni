import { createClient } from "./client";
import { ALL_CLASSES_CATALOG, type ClassItem, type MedClassTopic } from "@/lib/data/classes_catalog";

export interface StudentClassProgress {
  classId: string;
  completed: boolean;
  videoWatchPercent: number;
  audioListenedPercent: number;
  quizScore: number | null;
  notes?: string;
  lastAccessedAt?: string;
}

export interface ClassroomMetrics {
  totalClasses: number;
  completedCount: number;
  inProgressCount: number;
  totalMinutesWatched: number;
  totalMinutesAudioListened: number;
  averageQuizScore: number;
  quizzesCompletedCount: number;
}

/**
 * Calcula as métricas consolidadas a partir do mapa de progresso do aluno
 */
export function calculateClassroomMetrics(
  progressMap: Record<string, StudentClassProgress>,
  totalClasses: number = ALL_CLASSES_CATALOG.length
): ClassroomMetrics {
  let completedCount = 0;
  let inProgressCount = 0;
  let totalMinutesWatched = 0;
  let totalMinutesAudioListened = 0;
  let totalQuizScore = 0;
  let quizzesCompletedCount = 0;

  ALL_CLASSES_CATALOG.forEach((item) => {
    const p = progressMap[item.id] || progressMap[String(item.index)];
    if (!p) return;

    if (p.completed) {
      completedCount++;
      totalMinutesWatched += item.estimatedMinutes;
      totalMinutesAudioListened += Math.round(item.estimatedMinutes * 0.5);
    } else if (p.videoWatchPercent > 0 || p.audioListenedPercent > 0) {
      inProgressCount++;
      totalMinutesWatched += Math.round((item.estimatedMinutes * p.videoWatchPercent) / 100);
      totalMinutesAudioListened += Math.round(((item.estimatedMinutes * 0.5) * p.audioListenedPercent) / 100);
    }

    if (p.quizScore !== null && p.quizScore !== undefined) {
      totalQuizScore += p.quizScore;
      quizzesCompletedCount++;
    }
  });

  const averageQuizScore =
    quizzesCompletedCount > 0 ? Math.round(totalQuizScore / quizzesCompletedCount) : 0;

  return {
    totalClasses,
    completedCount,
    inProgressCount,
    totalMinutesWatched,
    totalMinutesAudioListened,
    averageQuizScore,
    quizzesCompletedCount,
  };
}

/**
 * Carrega o progresso de todas as aulas do aluno
 */
export async function fetchUserClassesProgress(userId?: string): Promise<Record<string, StudentClassProgress>> {
  let progressMap: Record<string, StudentClassProgress> = {};

  // Se houver userId, tenta carregar do Supabase
  if (userId) {
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("med_class_progress")
        .select("*")
        .eq("user_id", userId);

      if (!error && data) {
        data.forEach((row: any) => {
          progressMap[row.class_id] = {
            classId: row.class_id,
            completed: !!row.completed,
            videoWatchPercent: row.video_progress_pct || 0,
            audioListenedPercent: row.audio_listened ? 100 : 0,
            quizScore: row.quiz_score_pct ?? null,
            notes: row.notes || "",
            lastAccessedAt: row.last_studied_at || row.updated_at,
          };
        });
      }
    } catch {
      // Falha silenciosa
    }
  }

  // Fallback para localStorage
  if (Object.keys(progressMap).length === 0 && typeof window !== "undefined") {
    try {
      const localStored = localStorage.getItem("medpleni_classes_progress");
      if (localStored) {
        progressMap = JSON.parse(localStored);
      }
    } catch {}
  }

  return progressMap;
}

/**
 * Carrega o progresso de uma aula específica
 */
export async function fetchClassProgress(
  classId: string,
  userId?: string
): Promise<StudentClassProgress | null> {
  if (userId) {
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("med_class_progress")
        .select("*")
        .eq("user_id", userId)
        .eq("class_id", classId)
        .maybeSingle();

      if (!error && data) {
        return {
          classId: data.class_id,
          completed: !!data.completed,
          videoWatchPercent: data.video_progress_pct || 0,
          audioListenedPercent: data.audio_listened ? 100 : 0,
          quizScore: data.quiz_score_pct ?? null,
          notes: data.notes || "",
          lastAccessedAt: data.last_studied_at || data.updated_at,
        };
      }
    } catch {}
  }

  if (typeof window !== "undefined") {
    try {
      const localStored = localStorage.getItem("medpleni_classes_progress");
      if (localStored) {
        const parsed = JSON.parse(localStored);
        if (parsed[classId]) {
          return parsed[classId];
        }
      }
    } catch {}
  }

  return null;
}

/**
 * Salva o progresso individual de uma aula
 */
export async function saveClassProgress(
  progress: Partial<StudentClassProgress> & { classId: string },
  userId?: string
): Promise<boolean> {
  const { classId } = progress;

  // Persiste no localStorage primeiro para feedback imediato e offline-first
  if (typeof window !== "undefined") {
    try {
      const localStored = localStorage.getItem("medpleni_classes_progress");
      const current = localStored ? JSON.parse(localStored) : {};
      current[classId] = {
        ...(current[classId] || {
          classId,
          completed: false,
          videoWatchPercent: 0,
          audioListenedPercent: 0,
          quizScore: null,
          notes: "",
        }),
        ...progress,
        lastAccessedAt: new Date().toISOString(),
      };
      localStorage.setItem("medpleni_classes_progress", JSON.stringify(current));
    } catch {}
  }

  // Persiste no Supabase se usuário autenticado
  if (userId) {
    try {
      const supabase = createClient();
      await supabase.from("med_class_progress").upsert(
        {
          user_id: userId,
          class_id: classId,
          ...(progress.completed !== undefined ? { completed: progress.completed } : {}),
          ...(progress.videoWatchPercent !== undefined ? { video_progress_pct: progress.videoWatchPercent } : {}),
          ...(progress.audioListenedPercent !== undefined ? { audio_listened: progress.audioListenedPercent > 0 } : {}),
          ...(progress.quizScore !== undefined && progress.quizScore !== null ? { quiz_score_pct: progress.quizScore } : {}),
          ...(progress.notes !== undefined ? { notes: progress.notes } : {}),
          last_studied_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id,class_id" }
      );
    } catch {}
  }

  return true;
}

/**
 * Busca todas as aulas combinadas com métricas e progresso
 */
export async function fetchAllClasses(userId?: string): Promise<{
  classes: ClassItem[];
  progressMap: Record<string, StudentClassProgress>;
  metrics: ClassroomMetrics;
}> {
  const progressMap = await fetchUserClassesProgress(userId);
  const metrics = calculateClassroomMetrics(progressMap, ALL_CLASSES_CATALOG.length);

  return {
    classes: ALL_CLASSES_CATALOG,
    progressMap,
    metrics,
  };
}

/**
 * Busca uma aula pelo ID/slug com dados associados
 */
export async function fetchClassById(
  classId: string,
  userId?: string
): Promise<{
  medClass: ClassItem | null;
  progress: StudentClassProgress | null;
  relatedClasses: ClassItem[];
}> {
  const found = ALL_CLASSES_CATALOG.find((c) => c.id === classId || String(c.index) === classId) || null;
  if (!found) {
    return { medClass: null, progress: null, relatedClasses: [] };
  }

  const progress = await fetchClassProgress(found.id, userId);
  const relatedClasses = ALL_CLASSES_CATALOG.filter(
    (c) => c.subspecialty === found.subspecialty && c.id !== found.id
  ).slice(0, 6);

  return {
    medClass: found,
    progress,
    relatedClasses,
  };
}
