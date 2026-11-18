import { describe, it, expect } from "vitest";
import {
  formatQuestionOriginLabel,
  canInstitutionAccessQuestion,
  sanitizeQuestionForInstitution,
  formatFacilityIndex,
  formatPointBiserial,
} from "../bank-types";

describe("B2B Question Bank Rules & Access Control (P05)", () => {
  describe("formatQuestionOriginLabel", () => {
    it("formats 'Instituição-ano' when both institution name and year are provided", () => {
      expect(formatQuestionOriginLabel("USP", 2024)).toBe("USP-2024");
      expect(formatQuestionOriginLabel("UNICAMP", 2023)).toBe("UNICAMP-2023");
      expect(formatQuestionOriginLabel("  ENARE  ", 2022)).toBe("ENARE-2022");
    });

    it("formats only 'ano' when institution name is omitted or blank", () => {
      expect(formatQuestionOriginLabel(null, 2024)).toBe("2024");
      expect(formatQuestionOriginLabel(undefined, 2023)).toBe("2023");
      expect(formatQuestionOriginLabel("", 2021)).toBe("2021");
      expect(formatQuestionOriginLabel("   ", 2020)).toBe("2020");
    });

    it("formats institution name if year is omitted", () => {
      expect(formatQuestionOriginLabel("USP", null)).toBe("USP");
    });

    it("falls back to 'Autoral MedPleni' if both are missing", () => {
      expect(formatQuestionOriginLabel(null, null)).toBe("Autoral MedPleni");
      expect(formatQuestionOriginLabel("", undefined)).toBe("Autoral MedPleni");
    });
  });

  describe("canInstitutionAccessQuestion (Plan and Multi-tenant Isolation)", () => {
    const INST_A = "inst-001-faculdade-demo";
    const INST_B = "inst-002-outra-faculdade";

    it("allows institution to access its own private questions regardless of plan", () => {
      expect(
        canInstitutionAccessQuestion({
          plan: "vazia",
          userInstitutionId: INST_A,
          questionVisibility: "institution_private",
          questionStatus: "draft",
          questionInstitutionId: INST_A,
        })
      ).toBe(true);

      expect(
        canInstitutionAccessQuestion({
          plan: "acervo",
          userInstitutionId: INST_A,
          questionVisibility: "institution_private",
          questionStatus: "in_review",
          questionInstitutionId: INST_A,
        })
      ).toBe(true);

      expect(
        canInstitutionAccessQuestion({
          plan: "plus",
          userInstitutionId: INST_A,
          questionVisibility: "institution_private",
          questionStatus: "published",
          questionInstitutionId: INST_A,
        })
      ).toBe(true);
    });

    it("STRICTLY BLOCKS institution A from accessing private questions of institution B", () => {
      expect(
        canInstitutionAccessQuestion({
          plan: "plus", // Even with plus plan
          userInstitutionId: INST_A,
          questionVisibility: "institution_private",
          questionStatus: "published",
          questionInstitutionId: INST_B,
        })
      ).toBe(false);

      expect(
        canInstitutionAccessQuestion({
          plan: "acervo",
          userInstitutionId: INST_A,
          questionVisibility: "institution_private",
          questionStatus: "published",
          questionInstitutionId: INST_B,
        })
      ).toBe(false);
    });

    it("BLOCKS institution with plan 'vazia' from accessing MedPleni public pool", () => {
      expect(
        canInstitutionAccessQuestion({
          plan: "vazia",
          userInstitutionId: INST_A,
          questionVisibility: "medpleni_public",
          questionStatus: "published",
          questionInstitutionId: null,
        })
      ).toBe(false);
    });

    it("ALLOWS institution with plan 'acervo' or 'plus' to access published MedPleni public pool", () => {
      expect(
        canInstitutionAccessQuestion({
          plan: "acervo",
          userInstitutionId: INST_A,
          questionVisibility: "medpleni_public",
          questionStatus: "published",
          questionInstitutionId: null,
        })
      ).toBe(true);

      expect(
        canInstitutionAccessQuestion({
          plan: "plus",
          userInstitutionId: INST_A,
          questionVisibility: "medpleni_public",
          questionStatus: "published",
          questionInstitutionId: null,
        })
      ).toBe(true);
    });

    it("BLOCKS MedPleni public questions that are still in draft or in_review from being viewed by institutions", () => {
      expect(
        canInstitutionAccessQuestion({
          plan: "plus",
          userInstitutionId: INST_A,
          questionVisibility: "medpleni_public",
          questionStatus: "in_review",
          questionInstitutionId: null,
        })
      ).toBe(false);

      expect(
        canInstitutionAccessQuestion({
          plan: "acervo",
          userInstitutionId: INST_A,
          questionVisibility: "medpleni_public",
          questionStatus: "draft",
          questionInstitutionId: null,
        })
      ).toBe(false);
    });
  });

  describe("sanitizeQuestionForInstitution (Third-party protection)", () => {
    it("strips original_third_party_text from questions served to institutions", () => {
      const rawQuestion = {
        id: "q-123",
        statement: "Enunciado devidamente reescrito e pedagogicamente ajustado.",
        original_third_party_text: "Texto original protegido de banca terceira ou exame externo.",
        explanation: "Gabarito fundamentado.",
      };

      const sanitized = sanitizeQuestionForInstitution(rawQuestion);

      expect(sanitized.statement).toBe("Enunciado devidamente reescrito e pedagogicamente ajustado.");
      expect("original_third_party_text" in sanitized).toBe(false);
      // @ts-expect-error original_third_party_text is stripped by type
      expect(sanitized.original_third_party_text).toBeUndefined();
    });
  });

  describe("Psychometric Formatters", () => {
    it("formats facility index p correctly", () => {
      expect(formatFacilityIndex(0.65)).toBe("65%");
      expect(formatFacilityIndex(0.812)).toBe("81%");
      expect(formatFacilityIndex(0)).toBe("0%");
      expect(formatFacilityIndex(1)).toBe("100%");
      expect(formatFacilityIndex(null)).toBe("—");
      expect(formatFacilityIndex(undefined)).toBe("—");
    });

    it("formats point-biserial correlation r correctly", () => {
      expect(formatPointBiserial(0.42)).toBe("0.42");
      expect(formatPointBiserial(-0.15)).toBe("-0.15");
      expect(formatPointBiserial(0.3)).toBe("0.30");
      expect(formatPointBiserial(null)).toBe("—");
      expect(formatPointBiserial(undefined)).toBe("—");
    });
  });
});
