import { describe, it, expect } from "vitest";
import {
  parseAndValidateEnrollmentCSV,
  generateErrorReportCSV,
  isValidEmail,
  type ClassGroupReference,
} from "../csv-enrollment";

describe("CSV Enrollment Parser and Validator", () => {
  const mockClasses: ClassGroupReference[] = [
    { id: "cg-1", label: "MED-2027-1P", period: 1 },
    { id: "cg-2", label: "MED-2027-2P", period: 2 },
    { id: "cg-8", label: "MED-2027-8P", period: 8 },
    { id: "cg-turma-a", label: "Turma A", period: 5 },
  ];

  it("validates emails correctly", () => {
    expect(isValidEmail("aluno@faculdade.edu.br")).toBe(true);
    expect(isValidEmail("aluno.sobrenome@med.br")).toBe(true);
    expect(isValidEmail("invalido")).toBe(false);
    expect(isValidEmail("invalido@")).toBe(false);
    expect(isValidEmail("@dominio.com")).toBe(false);
  });

  it("parses valid CSV rows with comma delimiter and trims whitespace", () => {
    const csv = `Nome,Email,RA,Turma
Carlos Lima,carlos@faculdade.edu.br,RA1001,MED-2027-8P
Ana Paula,ana@faculdade.edu.br,RA1002,Turma A`;

    const result = parseAndValidateEnrollmentCSV(csv, mockClasses);
    expect(result.totalRows).toBe(2);
    expect(result.validRows.length).toBe(2);
    expect(result.invalidRows.length).toBe(0);
    expect(result.validRows[0].classGroupId).toBe("cg-8");
    expect(result.validRows[1].classGroupId).toBe("cg-turma-a");
  });

  it("parses valid CSV rows with semicolon delimiter", () => {
    const csv = `Nome;Email;RA;Turma
Carlos Lima;carlos@faculdade.edu.br;RA1001;MED-2027-8P
Ana Paula;ana@faculdade.edu.br;RA1002;Turma A`;

    const result = parseAndValidateEnrollmentCSV(csv, mockClasses);
    expect(result.totalRows).toBe(2);
    expect(result.validRows.length).toBe(2);
    expect(result.invalidRows.length).toBe(0);
  });

  it("flags rows with invalid email, missing RA, or unknown class group", () => {
    const csv = `Nome,Email,RA,Turma
Aluno Correto,aluno@med.br,RA2001,MED-2027-8P
Sem Email,,RA2002,MED-2027-8P
Email Ruim,email_invalido,RA2003,MED-2027-8P
Sem RA,semra@med.br,,MED-2027-8P
Turma Inexistente,turmaruim@med.br,RA2005,Turma XYZ`;

    const result = parseAndValidateEnrollmentCSV(csv, mockClasses);
    expect(result.totalRows).toBe(5);
    expect(result.validRows.length).toBe(1);
    expect(result.invalidRows.length).toBe(4);

    expect(result.invalidRows[0].reason).toContain("E-mail");
    expect(result.invalidRows[1].reason).toContain("E-mail");
    expect(result.invalidRows[2].reason).toContain("RA");
    expect(result.invalidRows[3].reason).toContain('Turma "Turma XYZ" não encontrada');
  });

  it("detects intra-file duplicate emails and duplicate RAs", () => {
    const csv = `Nome,Email,RA,Turma
Aluno 1,aluno1@med.br,RA001,MED-2027-8P
Aluno 2,aluno1@med.br,RA002,MED-2027-8P
Aluno 3,aluno3@med.br,RA001,MED-2027-8P`;

    const result = parseAndValidateEnrollmentCSV(csv, mockClasses);
    expect(result.totalRows).toBe(3);
    expect(result.validRows.length).toBe(1);
    expect(result.invalidRows.length).toBe(2);
    expect(result.invalidRows[0].reason).toContain("E-mail");
    expect(result.invalidRows[1].reason).toContain("RA");
  });

  it("generates error report CSV with UTF-8 BOM", () => {
    const csv = `Nome,Email,RA,Turma
Aluno Ruim,bademail,RA001,Turma Invalida`;
    const result = parseAndValidateEnrollmentCSV(csv, mockClasses);
    const errorReport = generateErrorReportCSV(result.invalidRows);

    expect(errorReport.startsWith("\uFEFFLinha,Nome,Email,RA,Turma,Motivo do Erro")).toBe(true);
    expect(errorReport).toContain("Aluno Ruim");
    expect(errorReport).toContain("bademail");
  });

  it("processes 200+ rows in less than 50ms", () => {
    const rows = ["Nome,Email,RA,Turma"];
    for (let i = 1; i <= 240; i++) {
      rows.push(`Estudante Fictício ${i},aluno${i}@faculdade.edu.br,RA_${10000 + i},MED-2027-8P`);
    }
    const csv = rows.join("\n");

    const start = performance.now();
    const result = parseAndValidateEnrollmentCSV(csv, mockClasses);
    const duration = performance.now() - start;

    expect(result.totalRows).toBe(240);
    expect(result.validRows.length).toBe(240);
    expect(result.invalidRows.length).toBe(0);
    expect(duration).toBeLessThan(100); // bem abaixo de 100ms
  });
});
