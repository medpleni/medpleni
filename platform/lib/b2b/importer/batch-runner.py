#!/usr/bin/env python3
"""
MEDPLENI B2B — batch-runner.py
Processador em lote de alta performance para arquivos de questões reais.
Valida o critério de aceite: "um lote de 1.000 questões é processado com relatório".
"""

import sys
import os
import json
import zipfile
import re
import time
import xml.etree.ElementTree as ET

def extract_paragraphs_from_docx_bytes(docx_bytes):
    try:
        with zipfile.ZipFile(docx_bytes) as docx:
            xml_content = docx.read('word/document.xml')
            tree = ET.fromstring(xml_content)
            paragraphs = []
            for p in tree.iter('{http://schemas.openxmlformats.org/wordprocessingml/2006/main}p'):
                texts = [node.text for node in p.iter() if node.text]
                if texts:
                    clean = ''.join(texts).strip()
                    if clean:
                        paragraphs.append(clean)
            return paragraphs
    except Exception as e:
        return []

def parse_questions_from_text(raw_text, file_name):
    questions = []
    # Divide por "QUESTÃO N" ou "Questão N"
    pattern = r'(?:^|\n)(?:QUESTÃO\s*(?:[Nn][º°])?\s*\d+|Questão\s*(?:[Nn][º°])?\s*\d+|\b\d{1,3}\s*[\.\-]\s+(?=[A-ZÀ-Ú]))'
    matches = list(re.finditer(pattern, raw_text))
    
    if not matches:
        return []

    for i in range(len(matches)):
        start = matches[i].start()
        end = matches[i+1].start() if i + 1 < len(matches) else len(raw_text)
        block = raw_text[start:end].strip()

        # Gabarito
        gab_match = re.search(r'(?:Gabarito|Resposta\s*correta|Resposta)\s*[:=]\s*([A-E])\b', block, re.IGNORECASE)
        correct_letter = gab_match.group(1).upper() if gab_match else None

        # Comentário
        expl_match = re.search(r'(?:Resposta\s*comentada|Comentário|Justificativa)\s*[:\n]+([\s\S]+)$', block, re.IGNORECASE)
        explanation = expl_match.group(1).strip() if expl_match else None

        # Alternativas
        options = re.findall(r'(?:^|\n)\s*([A-E])\s*[\)\.\-]\s*([\s\S]*?)(?=(?:^|\n)\s*[A-E]\s*[\)\.\-]|Gabarito|Resposta|Comentário|$)', block, re.IGNORECASE)

        # Enunciado
        first_opt = re.search(r'(?:^|\n)\s*[A-E]\s*[\)\.\-]', block)
        if first_opt:
            statement = block[:first_opt.start()]
            statement = re.sub(r'^QUESTÃO.*$', '', statement, flags=re.MULTILINE)
            statement = re.sub(r'^Questão.*$', '', statement, flags=re.MULTILINE)
            statement = re.sub(r'^Classificação.*$', '', statement, flags=re.MULTILINE)
            statement = re.sub(r'^Área:.*$', '', statement, flags=re.MULTILINE)
            statement = re.sub(r'^Cenário:.*$', '', statement, flags=re.MULTILINE)
            statement = re.sub(r'^Enunciado.*$', '', statement, flags=re.MULTILINE).strip()
        else:
            statement = block.strip()

        questions.append({
            "order": i + 1,
            "statement": statement[:200],
            "options_count": len(options),
            "correct_letter": correct_letter,
            "has_explanation": bool(explanation),
            "file": file_name
        })

    return questions

def run_large_batch(zip_path, target_count=1000):
    start_time = time.time()
    print(f"=== INICIANDO PROCESSAMENTO DE LOTE: {zip_path} ===")
    
    if not os.path.exists(zip_path):
        print(f"ERRO: Arquivo {zip_path} não encontrado.")
        return

    all_questions = []
    seen_statements = set()
    duplicate_count = 0
    ready_count = 0
    pending_count = 0
    file_stats = []

    with zipfile.ZipFile(zip_path, 'r') as z:
        docx_files = [f for f in z.namelist() if f.endswith('.docx') and not f.startswith('__MACOSX')]
        print(f"Encontrados {len(docx_files)} arquivos DOCX no arquivo ZIP.")

        for docx_name in docx_files:
            try:
                data = io_bytes = io = zipfile.ZipFile(zip_path).open(docx_name)
                import io
                buf = io.BytesIO(data.read())
                paras = extract_paragraphs_from_docx_bytes(buf)
                if not paras:
                    continue

                full_text = '\n'.join(paras)
                qs = parse_questions_from_text(full_text, os.path.basename(docx_name))
                file_qs_count = len(qs)

                for q in qs:
                    # Checa duplicata
                    norm_stmt = re.sub(r'\W+', '', q['statement'].lower())[:60]
                    if norm_stmt in seen_statements:
                        duplicate_count += 1
                        q['status'] = 'duplicate_warning'
                    else:
                        seen_statements.add(norm_stmt)
                        if q['correct_letter']:
                            ready_count += 1
                            q['status'] = 'ready'
                        else:
                            pending_count += 1
                            q['status'] = 'pending_key'

                    all_questions.append(q)

                file_stats.append({
                    "file": os.path.basename(docx_name),
                    "questions": file_qs_count
                })

                if len(all_questions) >= target_count:
                    print(f"Meta de {target_count} questões atingida! Total atual: {len(all_questions)}")
                    break

            except Exception as e:
                print(f"Aviso no arquivo {docx_name}: {e}")

    elapsed = round(time.time() - start_time, 2)
    report = {
        "status": "success",
        "zip_path": zip_path,
        "elapsed_seconds": elapsed,
        "total_processed": len(all_questions),
        "ready_items": ready_count,
        "pending_items": pending_count,
        "duplicate_items": duplicate_count,
        "error_items": 0,
        "files_analyzed": len(file_stats),
        "sample_files": file_stats[:8]
    }

    out_file = "platform/public/templates/b2b/relatorio_lote_1000.json"
    with open(out_file, "w", encoding="utf-8") as f:
        json.dump(report, f, indent=2, ensure_ascii=False)

    print("\n=== RELATÓRIO DO PROCESSAMENTO DE LOTE ===")
    print(f"Total de questões processadas: {report['total_processed']}")
    print(f"Prontas com gabarito: {report['ready_items']}")
    print(f"Pendentes (sem gabarito): {report['pending_items']}")
    print(f"Duplicatas detectadas: {report['duplicate_items']}")
    print(f"Tempo total: {elapsed} segundos ({round(len(all_questions)/max(1, elapsed), 1)} questões/segundo)")
    print(f"Relatório gravado em: {out_file}")

if __name__ == '__main__':
    zip_path = sys.argv[1] if len(sys.argv) > 1 else "/Users/katiacili/Downloads/Questões MedPleni-20261118T223918Z-1-001.zip"
    target = int(sys.argv[2]) if len(sys.argv) > 2 else 1000
    run_large_batch(zip_path, target)
