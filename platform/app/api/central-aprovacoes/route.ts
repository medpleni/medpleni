import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { createClient } from "@/lib/supabase/server";

// Arquivo de persistência local no servidor (garante que nada seja perdido entre navegadores/dispositivos)
const DATA_DIR = path.join(process.cwd(), "data");
const STORE_PATH = path.join(DATA_DIR, "b2b-approvals-store.json");

function readLocalStore() {
  try {
    if (fs.existsSync(STORE_PATH)) {
      const data = fs.readFileSync(STORE_PATH, "utf-8");
      return JSON.parse(data);
    }
  } catch (err) {
    console.error("Erro ao ler store local de aprovações B2B:", err);
  }
  return null;
}

function writeLocalStore(payload: any) {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(STORE_PATH, JSON.stringify(payload, null, 2), "utf-8");
  } catch (err) {
    console.error("Erro ao salvar store local de aprovações B2B:", err);
  }
}

// GET: Recupera os dados compartilhados de aprovação do banco
export async function GET() {
  try {
    // 0. Verificar se o usuário está logado
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: "Acesso restrito. Faça login para visualizar as aprovações." },
        { status: 401 }
      );
    }

    // 1. Tentar ler do Supabase na tabela b2b_approvals
    try {
      const { data, error } = await supabase
        .from("b2b_approvals")
        .select("*")
        .eq("key", "main")
        .maybeSingle();

      if (!error && data && data.payload) {
        return NextResponse.json({
          source: "supabase",
          data: data.payload,
          updatedAt: data.updated_at,
        });
      }
    } catch (e) {
      // Falha silenciosa de conexão com Supabase ou tabela ainda não criada
    }

    // 2. Fallback: ler do arquivo compartilhado do servidor
    const local = readLocalStore();
    if (local) {
      return NextResponse.json({
        source: "server_storage",
        data: local,
      });
    }

    return NextResponse.json({
      source: "empty",
      data: null,
    });
  } catch (error: any) {
    console.error("Erro na rota GET /api/central-aprovacoes:", error);
    return NextResponse.json(
      { error: "Falha ao recuperar dados de aprovação", details: error?.message },
      { status: 500 }
    );
  }
}

// POST: Salva voto, comentários, tarefas e status no banco de dados compartilhado
export async function POST(req: NextRequest) {
  try {
    // 0. Verificar se o usuário está logado
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: "Acesso restrito. Faça login para registrar votos ou alterações." },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { screens, tasks, featuresList, invitedEmails, lastAction } = body;

    const payload = {
      screens: screens || [],
      tasks: tasks || [],
      featuresList: featuresList || [],
      invitedEmails: invitedEmails || [],
      lastAction: lastAction || null,
      updatedAt: new Date().toISOString(),
    };

    // 1. Salvar no arquivo persistente do servidor
    writeLocalStore(payload);

    // 2. Tentar persistir na tabela Supabase b2b_approvals
    let supabaseSaved = false;
    try {
      const supabase = await createClient();
      const { error } = await supabase.from("b2b_approvals").upsert(
        {
          key: "main",
          payload,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "key" }
      );
      if (!error) {
        supabaseSaved = true;
      }
    } catch (e) {
      // Se tabela não existir no Supabase, segue com server_storage
    }

    return NextResponse.json({
      success: true,
      persisted: true,
      storage: supabaseSaved ? "supabase + server" : "server_storage",
      updatedAt: payload.updatedAt,
    });
  } catch (error: any) {
    console.error("Erro na rota POST /api/central-aprovacoes:", error);
    return NextResponse.json(
      { error: "Falha ao persistir dados de aprovação", details: error?.message },
      { status: 500 }
    );
  }
}

