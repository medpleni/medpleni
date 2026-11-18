"use client";

import React, { useEffect, useRef } from "react";

interface IndividualDataNoticeProps {
  institutionId?: string;
  actorId?: string;
  actorRole?: string;
  studentUserId?: string;
  studentName?: string;
  screenViewed?: string;
  compact?: boolean;
}

/**
 * Banner de conformidade LGPD para telas com dados individuais de alunos.
 * Registra o acesso automaticamente em individual_access_log (Regra 46 da ESPEC).
 */
export default function IndividualDataNotice({
  institutionId,
  actorId,
  actorRole,
  studentUserId,
  studentName,
  screenViewed = "perfil_estudante_individual",
  compact = false,
}: IndividualDataNoticeProps) {
  const hasLogged = useRef(false);

  useEffect(() => {
    // Registra o acesso apenas uma vez por montagem de componente
    if (
      !hasLogged.current &&
      institutionId &&
      actorId &&
      studentUserId &&
      actorRole
    ) {
      hasLogged.current = true;
      fetch("/api/b2b/audit-access", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          institutionId,
          actorId,
          actorRole,
          studentUserId,
          screenViewed,
          details: { studentName },
        }),
      }).catch((err) => {
        console.warn("Aviso: falha ao enviar log LGPD:", err);
      });
    }
  }, [institutionId, actorId, actorRole, studentUserId, studentName, screenViewed]);

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "10px",
        padding: compact ? "6px 10px" : "10px 14px",
        borderRadius: "var(--r-md, 8px)",
        background: "rgba(0, 119, 182, 0.08)",
        border: "1px solid rgba(0, 119, 182, 0.25)",
        color: "#64B5E8",
        fontSize: compact ? "11px" : "12px",
        lineHeight: 1.4,
        marginBottom: compact ? "10px" : "16px",
      }}
    >
      <div style={{ flexShrink: 0, display: "flex", alignItems: "center" }}>
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
          <path d="M7 11V7a5 5 0 0 1 10 0v4" />
        </svg>
      </div>

      <div style={{ flex: 1 }}>
        <strong style={{ fontWeight: 600 }}>Ambiente Auditado (LGPD):</strong>{" "}
        {studentName
          ? `Você está acessando dados individuais do aluno ${studentName}. `
          : "Esta visualização contém dados individuais e nominais de estudantes. "}
        Este acesso é registrado para governança acadêmica e proteção de dados.
      </div>
    </div>
  );
}
