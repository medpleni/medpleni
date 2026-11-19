import { describe, it, expect } from "vitest";
import {
  hasB2BRole,
  canAccessClassGroup,
  canAccessCourse,
  canViewStudentProfile,
} from "../auth";
import type { B2BRole } from "../types";

describe("lib/b2b/auth — Funções Puras de Permissão e Escopo", () => {
  describe("hasB2BRole", () => {
    it("deve permitir qualquer papel quando nenhuma lista restritiva for fornecida", () => {
      expect(hasB2BRole("aluno")).toBe(true);
      expect(hasB2BRole("docente")).toBe(true);
      expect(hasB2BRole("coordenador")).toBe(true);
      expect(hasB2BRole("dirigente")).toBe(true);
    });

    it("deve validar corretamente se o papel está contido na lista permitida", () => {
      const allowed: B2BRole[] = ["dirigente", "coordenador"];
      expect(hasB2BRole("dirigente", allowed)).toBe(true);
      expect(hasB2BRole("coordenador", allowed)).toBe(true);
      expect(hasB2BRole("docente", allowed)).toBe(false);
      expect(hasB2BRole("aluno", allowed)).toBe(false);
    });
  });

  describe("canAccessClassGroup", () => {
    const turmaA = "turma-8p-a";
    const turmaB = "turma-8p-b";

    it("dirigente sempre acessa qualquer turma da instituição", () => {
      expect(canAccessClassGroup("dirigente", turmaA, [])).toBe(true);
      expect(canAccessClassGroup("dirigente", turmaB, [turmaA])).toBe(true);
    });

    it("coordenador acessa qualquer turma se não tiver restrição explícita", () => {
      expect(canAccessClassGroup("coordenador", turmaA, [])).toBe(true);
    });

    it("coordenador com escopo restrito acessa apenas as turmas permitidas", () => {
      expect(canAccessClassGroup("coordenador", turmaA, [turmaA])).toBe(true);
      expect(canAccessClassGroup("coordenador", turmaB, [turmaA])).toBe(false);
    });

    it("docente só pode acessar turmas do seu escopo direto", () => {
      expect(canAccessClassGroup("docente", turmaA, [turmaA])).toBe(true);
      expect(canAccessClassGroup("docente", turmaB, [turmaA])).toBe(false);
      expect(canAccessClassGroup("docente", turmaA, [])).toBe(false);
    });

    it("aluno só acessa a turma onde está matriculado", () => {
      expect(canAccessClassGroup("aluno", turmaA, [turmaA])).toBe(true);
      expect(canAccessClassGroup("aluno", turmaB, [turmaA])).toBe(false);
    });
  });

  describe("canAccessCourse", () => {
    const cursoMed = "curso-medicina";
    const cursoEnf = "curso-enfermagem";

    it("dirigente tem acesso a todos os cursos", () => {
      expect(canAccessCourse("dirigente", cursoMed, [])).toBe(true);
    });

    it("coordenador acessa todos os cursos quando seu escopo for global", () => {
      expect(canAccessCourse("coordenador", cursoMed, [])).toBe(true);
    });

    it("coordenador restrito acessa somente seu curso designado", () => {
      expect(canAccessCourse("coordenador", cursoMed, [cursoMed])).toBe(true);
      expect(canAccessCourse("coordenador", cursoEnf, [cursoMed])).toBe(false);
    });

    it("docentes e alunos não possuem acesso administrativo a cursos", () => {
      expect(canAccessCourse("docente", cursoMed, [cursoMed])).toBe(false);
      expect(canAccessCourse("aluno", cursoMed, [cursoMed])).toBe(false);
    });
  });

  describe("canViewStudentProfile (Conformidade LGPD)", () => {
    const alunoId = "user-aluno-1";
    const outroAlunoId = "user-aluno-2";
    const turmaAluno = "turma-8p";
    const outraTurma = "turma-12p";

    it("o próprio aluno sempre pode ver seus dados", () => {
      expect(
        canViewStudentProfile({
          actorRole: "aluno",
          actorId: alunoId,
          studentUserId: alunoId,
          actorScopedClassIds: [turmaAluno],
          studentClassGroupIds: [turmaAluno],
        })
      ).toBe(true);
    });

    it("um aluno NÃO pode ver os dados individuais de outro aluno", () => {
      expect(
        canViewStudentProfile({
          actorRole: "aluno",
          actorId: outroAlunoId,
          studentUserId: alunoId,
          actorScopedClassIds: [turmaAluno],
          studentClassGroupIds: [turmaAluno],
        })
      ).toBe(false);
    });

    it("dirigente e coordenador têm autorização para acompanhar o perfil individual", () => {
      expect(
        canViewStudentProfile({
          actorRole: "dirigente",
          actorId: "user-dir",
          studentUserId: alunoId,
          actorScopedClassIds: [],
          studentClassGroupIds: [turmaAluno],
        })
      ).toBe(true);

      expect(
        canViewStudentProfile({
          actorRole: "coordenador",
          actorId: "user-coord",
          studentUserId: alunoId,
          actorScopedClassIds: [],
          studentClassGroupIds: [turmaAluno],
        })
      ).toBe(true);
    });

    it("docente pode ver aluno se lecionar para a turma do aluno", () => {
      expect(
        canViewStudentProfile({
          actorRole: "docente",
          actorId: "user-doc",
          studentUserId: alunoId,
          actorScopedClassIds: [turmaAluno],
          studentClassGroupIds: [turmaAluno],
        })
      ).toBe(true);
    });

    it("docente NÃO pode ver aluno de turma fora de seu escopo docente", () => {
      expect(
        canViewStudentProfile({
          actorRole: "docente",
          actorId: "user-doc",
          studentUserId: alunoId,
          actorScopedClassIds: [outraTurma],
          studentClassGroupIds: [turmaAluno],
        })
      ).toBe(false);
    });
  });
});
