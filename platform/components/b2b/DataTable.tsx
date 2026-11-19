"use client";

import React, { useState, useMemo } from "react";

export interface Column<T> {
  key: string;
  header: string;
  render?: (row: T) => React.ReactNode;
  sortable?: boolean;
  align?: "left" | "center" | "right";
  width?: string;
  csvValue?: (row: T) => string | number;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  keyExtractor: (row: T) => string;
  searchPlaceholder?: string;
  searchFilter?: (row: T, term: string) => boolean;
  exportFileName?: string;
  emptyMessage?: string;
  pageSize?: number;
}

/**
 * Tabela de dados institucional com ordenação por coluna, busca e exportação CSV.
 */
export default function DataTable<T extends Record<string, any>>({
  columns,
  data,
  keyExtractor,
  searchPlaceholder = "Buscar registros...",
  searchFilter,
  exportFileName = "medpleni-relatorio-institucional",
  emptyMessage = "Nenhum registro encontrado.",
  pageSize = 15,
}: DataTableProps<T>) {
  const [searchTerm, setSearchTerm] = useState("");
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [currentPage, setCurrentPage] = useState(1);

  // 1. Filtragem por busca
  const filteredData = useMemo(() => {
    if (!searchTerm.trim()) return data;
    const term = searchTerm.toLowerCase();

    if (searchFilter) {
      return data.filter((row) => searchFilter(row, term));
    }

    // Busca automática em campos de texto caso searchFilter não seja fornecido
    return data.filter((row) =>
      columns.some((col) => {
        const val = row[col.key];
        return val != null && String(val).toLowerCase().includes(term);
      })
    );
  }, [data, searchTerm, searchFilter, columns]);

  // 2. Ordenação
  const sortedData = useMemo(() => {
    if (!sortKey) return filteredData;

    return [...filteredData].sort((a, b) => {
      const valA = a[sortKey];
      const valB = b[sortKey];

      if (valA == null) return 1;
      if (valB == null) return -1;

      if (typeof valA === "number" && typeof valB === "number") {
        return sortDir === "asc" ? valA - valB : valB - valA;
      }

      const strA = String(valA).toLowerCase();
      const strB = String(valB).toLowerCase();
      return sortDir === "asc"
        ? strA.localeCompare(strB, "pt-BR")
        : strB.localeCompare(strA, "pt-BR");
    });
  }, [filteredData, sortKey, sortDir]);

  // 3. Paginação
  const totalPages = Math.max(1, Math.ceil(sortedData.length / pageSize));
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sortedData.slice(start, start + pageSize);
  }, [sortedData, currentPage, pageSize]);

  const handleSort = (key: string, sortable?: boolean) => {
    if (!sortable) return;
    if (sortKey === key) {
      if (sortDir === "asc") {
        setSortDir("desc");
      } else {
        setSortKey(null);
        setSortDir("asc");
      }
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  // 4. Exportação CSV
  const handleExportCSV = () => {
    if (sortedData.length === 0) return;

    const headers = columns.map((col) => `"${col.header.replace(/"/g, '""')}"`).join(";");
    const rows = sortedData.map((row) =>
      columns
        .map((col) => {
          let val = col.csvValue ? col.csvValue(row) : row[col.key];
          if (val == null) val = "";
          return `"${String(val).replace(/"/g, '""')}"`;
        })
        .join(";")
    );

    const csvContent = "\uFEFF" + [headers, ...rows].join("\r\n"); // UTF-8 BOM para Excel
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `${exportFileName}-${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div
      style={{
        background: "var(--card-bg)",
        border: "1px solid var(--card-border)",
        borderRadius: "var(--r-xl, 12px)",
        boxShadow: "var(--card-shadow)",
        overflow: "hidden",
      }}
    >
      {/* Barra Superior da Tabela (Busca + Exportar) */}
      <div
        style={{
          padding: "12px 16px",
          borderBottom: "1px solid var(--sinal)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "12px",
          flexWrap: "wrap",
        }}
      >
        <div style={{ position: "relative", flex: 1, minWidth: "220px", maxWidth: "360px" }}>
          <input
            type="text"
            placeholder={searchPlaceholder}
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            style={{
              width: "100%",
              background: "var(--input-bg)",
              border: "1px solid var(--sinal)",
              borderRadius: "var(--r-md, 8px)",
              padding: "7px 12px",
              paddingLeft: "32px",
              color: "var(--heading-color)",
              fontSize: "12px",
              outline: "none",
            }}
          />
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{
              position: "absolute",
              left: "10px",
              top: "50%",
              transform: "translateY(-50%)",
              color: "var(--chumbo)",
            }}
          >
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
        </div>

        <button
          onClick={handleExportCSV}
          disabled={sortedData.length === 0}
          title="Exportar dados para planilha Excel / CSV"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "6px",
            padding: "6px 12px",
            borderRadius: "var(--r-md, 8px)",
            background: "var(--input-bg)",
            border: "1px solid var(--sinal)",
            color: "var(--neblina)",
            fontSize: "11px",
            fontFamily: "'IBM Plex Mono', monospace",
            cursor: sortedData.length === 0 ? "not-allowed" : "pointer",
            opacity: sortedData.length === 0 ? 0.5 : 1,
            transition: "all 0.15s ease",
          }}
        >
          <svg
            width="13"
            height="13"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
          <span>Exportar CSV</span>
        </button>
      </div>

      {/* Área da Tabela */}
      <div style={{ width: "100%", overflowX: "auto" }}>
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            textAlign: "left",
            fontSize: "13px",
          }}
        >
          <thead>
            <tr
              style={{
                background: "var(--input-bg)",
                borderBottom: "1px solid var(--sinal)",
              }}
            >
              {columns.map((col) => {
                const isSorted = sortKey === col.key;
                const isSortable = col.sortable !== false;
                return (
                  <th
                    key={col.key}
                    onClick={() => handleSort(col.key, isSortable)}
                    style={{
                      padding: "10px 14px",
                      fontFamily: "'IBM Plex Mono', monospace",
                      fontSize: "10px",
                      letterSpacing: "0.08em",
                      textTransform: "uppercase",
                      color: isSorted ? "var(--pulso)" : "var(--chumbo)",
                      fontWeight: 600,
                      cursor: isSortable ? "pointer" : "default",
                      userSelect: "none",
                      width: col.width,
                      textAlign: col.align || "left",
                    }}
                  >
                    <div
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "4px",
                        justifyContent:
                          col.align === "center"
                            ? "center"
                            : col.align === "right"
                            ? "flex-end"
                            : "flex-start",
                      }}
                    >
                      <span>{col.header}</span>
                      {isSortable && (
                        <span style={{ fontSize: "10px", opacity: isSorted ? 1 : 0.4 }}>
                          {isSorted ? (sortDir === "asc" ? "▲" : "▼") : "⇅"}
                        </span>
                      )}
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {paginatedData.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length}
                  style={{
                    textAlign: "center",
                    padding: "36px 16px",
                    color: "var(--chumbo)",
                    fontSize: "13px",
                  }}
                >
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              paginatedData.map((row) => (
                <tr
                  key={keyExtractor(row)}
                  style={{
                    borderBottom: "1px solid var(--border-subtle, rgba(78, 110, 155, 0.12))",
                    transition: "background 0.12s ease",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "var(--input-bg)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "transparent";
                  }}
                >
                  {columns.map((col) => (
                    <td
                      key={col.key}
                      style={{
                        padding: "11px 14px",
                        color: "var(--neblina)",
                        textAlign: col.align || "left",
                      }}
                    >
                      {col.render ? col.render(row) : (row[col.key] ?? "—")}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Paginação */}
      {totalPages > 1 && (
        <div
          style={{
            padding: "10px 16px",
            borderTop: "1px solid var(--sinal)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            fontSize: "12px",
            color: "var(--chumbo)",
          }}
        >
          <div>
            Mostrando {(currentPage - 1) * pageSize + 1} a{" "}
            {Math.min(currentPage * pageSize, sortedData.length)} de {sortedData.length} registros
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              style={{
                background: "var(--input-bg)",
                border: "1px solid var(--sinal)",
                borderRadius: "4px",
                padding: "4px 8px",
                color: "var(--neblina)",
                fontSize: "11px",
                cursor: currentPage === 1 ? "not-allowed" : "pointer",
                opacity: currentPage === 1 ? 0.4 : 1,
              }}
            >
              Anterior
            </button>
            <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: "11px" }}>
              {currentPage} / {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              style={{
                background: "var(--input-bg)",
                border: "1px solid var(--sinal)",
                borderRadius: "4px",
                padding: "4px 8px",
                color: "var(--neblina)",
                fontSize: "11px",
                cursor: currentPage === totalPages ? "not-allowed" : "pointer",
                opacity: currentPage === totalPages ? 0.4 : 1,
              }}
            >
              Próxima
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
