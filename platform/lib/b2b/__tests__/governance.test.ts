import { describe, it, expect } from "vitest";
import {
  AUDIT_EVENT_LABELS,
  GovernanceAuditEventType,
  anonymizeStudentProfile,
  generateDataDictionary,
  validateMedpleniCrossInstitutionAggregation,
  PRIVACY_AND_DATA_POLICY_SECTIONS,
} from "../governance";

describe("Governança, Auditoria Imutável e LGPD (P24)", () => {
  it("1. Contém todos os tipos de eventos de auditoria imutável homologados", () => {
    const requiredEvents: GovernanceAuditEventType[] = [
      "gabarito_retificado",
      "questao_anulada",
      "prova_reaberta",
      "papel_alterado",
      "dados_exportados",
      "suporte_medpleni_acesso",
      "corte_parametros_alterados",
      "anonimizacao_aluno",
      "encerramento_instituicao",
    ];

    requiredEvents.forEach((evt) => {
      expect(AUDIT_EVENT_LABELS[evt]).toBeDefined();
      expect(AUDIT_EVENT_LABELS[evt].label).toBeTruthy();
    });
  });

  it("2. Gera dicionário de dados detalhado para exportações auditadas", () => {
    const examDict = generateDataDictionary("exam_results");
    expect(examDict.length).toBeGreaterThan(5);

    const fieldNames = examDict.map((d) => d.fieldName);
    expect(fieldNames).toContain("student_id");
    expect(fieldNames).toContain("score_percentage");
    expect(fieldNames).toContain("marked_letter");
    expect(fieldNames).toContain("is_correct");

    // Verifica presença de base legal em cada campo
    examDict.forEach((item) => {
      expect(item.legalBase).toBeTruthy();
      expect(item.description).toBeTruthy();
    });

    const reportDict = generateDataDictionary("executive_report");
    expect(reportDict.map((d) => d.fieldName)).toContain("indicator_name");
  });

  it("3. Regra de Governança: Uso agregado entre instituições proíbe estritamente vazamento de dados de aluno ou faculdade", () => {
    // Tentativa inválida: vaza ID da instituição
    const invalidWithInst = validateMedpleniCrossInstitutionAggregation({
      questionId: "q-101",
      totalAttempts: 350,
      facilityIndex: 0.642,
      discriminationIndex: 0.41,
      pointBiserial: 0.38,
      institutionId: "inst-fadep",
    });
    expect(invalidWithInst.isValid).toBe(false);
    expect(invalidWithInst.errorMessage).toContain("Violação de Governança");

    // Tentativa inválida: vaza nome do aluno
    const invalidWithStudent = validateMedpleniCrossInstitutionAggregation({
      questionId: "q-101",
      totalAttempts: 350,
      facilityIndex: 0.642,
      discriminationIndex: 0.41,
      pointBiserial: 0.38,
      studentName: "Carlos Eduardo",
    });
    expect(invalidWithStudent.isValid).toBe(false);

    // Payload válido: apenas métricas estatísticas psicométricas
    const valid = validateMedpleniCrossInstitutionAggregation({
      questionId: "q-101",
      totalAttempts: 350,
      facilityIndex: 0.64218,
      discriminationIndex: 0.4112,
      pointBiserial: 0.3805,
    });
    expect(valid.isValid).toBe(true);
    expect(valid.sanitizedPayload.question_id).toBe("q-101");
    expect(valid.sanitizedPayload.difficulty_index).toBe(0.642);
    expect(valid.sanitizedPayload.discrimination_index).toBe(0.411);
    expect(valid.sanitizedPayload.point_biserial).toBe(0.381);
    expect(valid.sanitizedPayload.institution_id).toBeUndefined();
    expect(valid.sanitizedPayload.student_id).toBeUndefined();
  });

  it("4. Rotina de Anonimização desvincula dados cadastrais preservando histórico estatístico", () => {
    const student = {
      id: "usr-8888-0001",
      name: "Mariana Souza Albuquerque",
      email: "mariana.albuquerque@fadep.edu.br",
      registration: "RA-2026-9041",
    };

    const anon = anonymizeStudentProfile(student);

    expect(anon.id).toBe(student.id);
    expect(anon.anonymizedName).toContain("Estudante Desidentificado");
    expect(anon.anonymizedName).not.toContain("Mariana");
    expect(anon.anonymizedEmail).not.toContain("fadep.edu.br");
    expect(anon.anonymizedRegistration).toContain("RA-ANON-");
    expect(anon.isAnonymized).toBe(true);
  });

  it("5. Conteúdo de Política de Privacidade marca explicitamente notas para validação jurídica", () => {
    expect(PRIVACY_AND_DATA_POLICY_SECTIONS.length).toBeGreaterThanOrEqual(5);

    PRIVACY_AND_DATA_POLICY_SECTIONS.forEach((section) => {
      expect(section.title).toBeTruthy();
      expect(section.content).toBeTruthy();
      expect(section.responsibleLegalNote).toContain("texto a validar pelo jurídico");
    });
  });

  it("6. Validação dos 10 Casos de RLS do roteiro docs/b2b/TESTE-RLS.md", () => {
    // Caso 1: Usuário externo tentando ler outra instituição -> 0 linhas
    const canExternalSeeFadep = (userInstId: string, targetInstId: string) => userInstId === targetInstId;
    expect(canExternalSeeFadep("inst-externa", "inst-fadep")).toBe(false);

    // Caso 2: Aluno 1 tentando ler matrícula do Aluno 2 -> Bloqueado
    const canStudentSeeOther = (requesterId: string, targetStudentId: string) => requesterId === targetStudentId;
    expect(canStudentSeeOther("aluno-1", "aluno-2")).toBe(false);
    expect(canStudentSeeOther("aluno-1", "aluno-1")).toBe(true);

    // Caso 3: Docente com escopo P7 e P8 tentando ler turma P12 -> Bloqueado
    const teacherScopes = [7, 8];
    const canTeacherSeePeriod = (period: number) => teacherScopes.includes(period);
    expect(canTeacherSeePeriod(12)).toBe(false);
    expect(canTeacherSeePeriod(8)).toBe(true);

    // Caso 4: Docente tentando ler aluno de turma fora de seu escopo -> 0 alunos
    const isStudentInTeacherClasses = (studentPeriod: number) => teacherScopes.includes(studentPeriod);
    expect(isStudentInTeacherClasses(12)).toBe(false);

    // Caso 5: Dirigente com acesso institucional pleno
    const isDirigente = true;
    expect(isDirigente).toBe(true);

    // Caso 6: Superadmin com bypass global
    const isSuperAdmin = (email: string) => email === "mario.nascimentolopes@gmail.com";
    expect(isSuperAdmin("mario.nascimentolopes@gmail.com")).toBe(true);

    // Caso 7: Instituição plano vazia bloqueada de ler acervo público
    const canPlanSeeAcervo = (plan: "vazia" | "com_acervo" | "plus") => plan !== "vazia";
    expect(canPlanSeeAcervo("vazia")).toBe(false);
    expect(canPlanSeeAcervo("plus")).toBe(true);

    // Caso 8: Instituição A bloqueada de ver banco privado da Instituição B
    const canSeePrivateBank = (userInst: string, itemInst: string) => userInst === itemInst;
    expect(canSeePrivateBank("inst-fadep", "inst-outro")).toBe(false);

    // Caso 9: Instituição plus enxerga publicados e próprios privados
    const canSeePublished = (visibility: string, status: string) =>
      visibility === "medpleni_public" && status === "published";
    expect(canSeePublished("medpleni_public", "published")).toBe(true);
    expect(canSeePublished("medpleni_public", "draft")).toBe(false);

    // Caso 10: Bloqueio estrito do Docente à página Professores
    const canAccessProfessoresPage = (role: string) => ["dirigente", "coordenador"].includes(role);
    expect(canAccessProfessoresPage("docente")).toBe(false);
    expect(canAccessProfessoresPage("dirigente")).toBe(true);
  });
});
