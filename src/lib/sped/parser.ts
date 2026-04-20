/**
 * SPED Streaming Parser
 *
 * Parses SPED Fiscal/Contribuições/ECD/ECF files line-by-line via streams,
 * supporting files of any size without loading them entirely into memory.
 *
 * SPED file format:
 *   |REG|FIELD1|FIELD2|...|
 *   - First field after the leading | is the record type (4 chars: "0000", "C100", etc.)
 *   - Files always start with "|0000|..." (header)
 *   - Encoding: typically Latin-1 (ISO-8859-1) — we decode as such
 */

export interface SpedRecord {
  reg: string;          // Record type, e.g. "0000", "C100"
  fields: string[];     // All fields including reg as fields[0]
  line: number;         // 1-based line number in source file
}

export interface SpedSummary {
  fileName: string;
  fileSize: number;
  totalLines: number;
  layout: SpedLayout;
  period: { start: string | null; end: string | null }; // dd/mm/yyyy from 0000
  cnpj: string | null;
  companyName: string | null;
  uf: string | null;
  recordCounts: Record<string, number>;        // reg -> count
  blockCounts: Record<string, number>;         // block letter (0,A,B,C,...,9) -> count
  warnings: string[];
  durationMs: number;
}

export type SpedLayout =
  | "EFD_ICMS_IPI"   // SPED Fiscal
  | "EFD_Contrib"    // SPED Contribuições (PIS/COFINS)
  | "ECD"            // Escrituração Contábil Digital
  | "ECF"            // Escrituração Contábil Fiscal
  | "Unknown";

/**
 * Detect layout from the 0000 record signature.
 * 0000 fields differ per layout — using field count + COD_VER position.
 */
function detectLayout(record0000: SpedRecord): SpedLayout {
  // EFD ICMS/IPI 0000: |0000|COD_VER|COD_FIN|DT_INI|DT_FIN|NOME|CNPJ|CPF|UF|IE|COD_MUN|IM|SUFRAMA|IND_PERFIL|IND_ATIV|
  // EFD Contrib 0000: |0000|COD_VER|TIPO_ESCRIT|IND_SIT_ESP|NUM_REC_ANTERIOR|DT_INI|DT_FIN|NOME|CNPJ|UF|COD_MUN|SUFRAMA|IND_NAT_PJ|IND_ATIV|
  // ECD 0000:        |0000|LECD|DT_INI|DT_FIN|NOME|CNPJ|UF|IE|COD_MUN|IM|IND_SIT_ESP|...
  // ECF 0000:        |0000|LECF|...
  const f = record0000.fields;
  if (f[1] === "LECD") return "ECD";
  if (f[1] === "LECF") return "ECF";
  // EFD Contrib has TIPO_ESCRIT (0 or 1) at pos 2 and date at pos 5
  if (f.length >= 14 && (f[2] === "0" || f[2] === "1") && /^\d{8}$/.test(f[5] ?? "")) {
    return "EFD_Contrib";
  }
  // EFD ICMS/IPI: dates at positions 3 and 4
  if (f.length >= 14 && /^\d{8}$/.test(f[3] ?? "") && /^\d{8}$/.test(f[4] ?? "")) {
    return "EFD_ICMS_IPI";
  }
  return "Unknown";
}

function formatBrDate(yyyymmdd: string | undefined): string | null {
  if (!yyyymmdd || !/^\d{8}$/.test(yyyymmdd)) return null;
  return `${yyyymmdd.slice(0, 2)}/${yyyymmdd.slice(2, 4)}/${yyyymmdd.slice(4, 8)}`;
}

function extractHeader(record0000: SpedRecord, layout: SpedLayout) {
  const f = record0000.fields;
  switch (layout) {
    case "EFD_ICMS_IPI":
      return {
        period: { start: formatBrDate(f[3]), end: formatBrDate(f[4]) },
        companyName: f[5] || null,
        cnpj: f[6] || null,
        uf: f[8] || null,
      };
    case "EFD_Contrib":
      return {
        period: { start: formatBrDate(f[5]), end: formatBrDate(f[6]) },
        companyName: f[7] || null,
        cnpj: f[8] || null,
        uf: f[9] || null,
      };
    case "ECD":
    case "ECF":
      return {
        period: { start: formatBrDate(f[2]), end: formatBrDate(f[3]) },
        companyName: f[4] || null,
        cnpj: f[5] || null,
        uf: f[6] || null,
      };
    default:
      return { period: { start: null, end: null }, companyName: null, cnpj: null, uf: null };
  }
}

/**
 * Parse a line into a SpedRecord. Returns null for empty/invalid lines.
 */
export function parseLine(line: string, lineNo: number): SpedRecord | null {
  if (!line) return null;
  // SPED lines start AND end with |. Strip outer pipes then split.
  const trimmed = line.replace(/^\|/, "").replace(/\|$/, "");
  if (!trimmed) return null;
  const fields = trimmed.split("|");
  const reg = fields[0];
  if (!reg || !/^[0-9A-Z]{4}$/.test(reg)) return null;
  return { reg, fields, line: lineNo };
}

/**
 * Stream-parse a File (browser) producing a summary.
 * Calls onProgress(0..1) periodically.
 */
export async function parseSpedFile(
  file: File,
  options: {
    onProgress?: (progress: number) => void;
    onRecord?: (record: SpedRecord) => void;
    /** TextDecoder label. Most SPED files are latin-1 ('windows-1252'). */
    encoding?: string;
  } = {}
): Promise<SpedSummary> {
  const start = performance.now();
  const { onProgress, onRecord, encoding = "windows-1252" } = options;

  const decoder = new TextDecoder(encoding);
  const reader = file.stream().getReader();

  let leftover = "";
  let lineNo = 0;
  let bytesRead = 0;
  const recordCounts: Record<string, number> = {};
  const blockCounts: Record<string, number> = {};
  const warnings: string[] = [];

  let layout: SpedLayout = "Unknown";
  let header: ReturnType<typeof extractHeader> = {
    period: { start: null, end: null },
    companyName: null,
    cnpj: null,
    uf: null,
  };
  let foundHeader = false;
  let lastProgress = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    bytesRead += value.byteLength;
    const chunk = decoder.decode(value, { stream: true });
    const text = leftover + chunk;
    const lines = text.split(/\r?\n/);
    leftover = lines.pop() ?? "";

    for (const raw of lines) {
      lineNo++;
      const rec = parseLine(raw, lineNo);
      if (!rec) continue;

      recordCounts[rec.reg] = (recordCounts[rec.reg] ?? 0) + 1;
      const block = rec.reg[0];
      blockCounts[block] = (blockCounts[block] ?? 0) + 1;

      if (!foundHeader && rec.reg === "0000") {
        layout = detectLayout(rec);
        header = extractHeader(rec, layout);
        foundHeader = true;
      }

      onRecord?.(rec);
    }

    const progress = file.size > 0 ? bytesRead / file.size : 0;
    if (progress - lastProgress > 0.02) {
      lastProgress = progress;
      onProgress?.(Math.min(progress, 0.99));
    }
  }

  // Flush leftover
  if (leftover) {
    lineNo++;
    const rec = parseLine(leftover, lineNo);
    if (rec) {
      recordCounts[rec.reg] = (recordCounts[rec.reg] ?? 0) + 1;
      blockCounts[rec.reg[0]] = (blockCounts[rec.reg[0]] ?? 0) + 1;
      onRecord?.(rec);
    }
  }

  if (!foundHeader) warnings.push("Registro 0000 (cabeçalho) não encontrado.");
  if (layout === "Unknown" && foundHeader) warnings.push("Layout SPED não identificado automaticamente.");
  if (lineNo === 0) warnings.push("Arquivo vazio ou sem linhas válidas.");

  // Validate trailer 9999 expected count if present
  const trailer = recordCounts["9999"];
  if (trailer && trailer !== 1) {
    warnings.push(`Múltiplos registros 9999 encontrados (${trailer}).`);
  }

  onProgress?.(1);

  return {
    fileName: file.name,
    fileSize: file.size,
    totalLines: lineNo,
    layout,
    ...header,
    recordCounts,
    blockCounts,
    warnings,
    durationMs: performance.now() - start,
  };
}

export function layoutLabel(l: SpedLayout): string {
  switch (l) {
    case "EFD_ICMS_IPI": return "EFD ICMS/IPI";
    case "EFD_Contrib": return "EFD Contribuições";
    case "ECD": return "ECD";
    case "ECF": return "ECF";
    default: return "Desconhecido";
  }
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`;
}
