/**
 * SPED files persistence layer.
 *
 * Backed by:
 *  - Supabase Storage bucket 'sped-files' (path: {userId}/{uuid}-{filename})
 *  - Postgres table 'sped_files' (parsed summary + storage_path reference)
 *
 * Exposes TanStack Query hooks consumed by the dashboard, upload, and files pages.
 */
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { SpedSummary, SpedLayout } from "./parser";

export interface SpedFileRow {
  id: string;
  user_id: string;
  storage_path: string;
  file_name: string;
  file_size: number;
  layout: SpedLayout;
  cnpj: string | null;
  company_name: string | null;
  uf: string | null;
  period_start: string | null;
  period_end: string | null;
  total_lines: number;
  block_counts: Record<string, number>;
  record_counts: Record<string, number>;
  warnings: string[];
  duration_ms: number;
  created_at: string;
  updated_at: string;
}

export const SPED_FILES_QK = ["sped_files"] as const;

export function useSpedFiles() {
  return useQuery({
    queryKey: SPED_FILES_QK,
    queryFn: async (): Promise<SpedFileRow[]> => {
      const { data, error } = await supabase
        .from("sped_files")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as SpedFileRow[];
    },
  });
}

/**
 * Persist a parsed SPED file: upload original to Storage, then insert row.
 * If insert fails after upload, the storage object is removed to avoid orphans.
 */
export async function persistSpedFile(args: {
  file: File;
  summary: SpedSummary;
  userId: string;
}): Promise<SpedFileRow> {
  const { file, summary, userId } = args;
  const safeName = file.name.replace(/[^\w.\-]+/g, "_");
  const storagePath = `${userId}/${crypto.randomUUID()}-${safeName}`;

  const { error: upErr } = await supabase.storage
    .from("sped-files")
    .upload(storagePath, file, {
      cacheControl: "3600",
      upsert: false,
      contentType: "text/plain",
    });
  if (upErr) throw new Error(`Falha ao enviar arquivo: ${upErr.message}`);

  const insertPayload = {
    user_id: userId,
    storage_path: storagePath,
    file_name: summary.fileName,
    file_size: summary.fileSize,
    layout: summary.layout,
    cnpj: summary.cnpj,
    company_name: summary.companyName,
    uf: summary.uf,
    period_start: summary.period.start,
    period_end: summary.period.end,
    total_lines: summary.totalLines,
    block_counts: summary.blockCounts,
    record_counts: summary.recordCounts,
    warnings: summary.warnings,
    duration_ms: Math.round(summary.durationMs),
  };

  const { data, error } = await supabase
    .from("sped_files")
    .insert(insertPayload)
    .select("*")
    .single();

  if (error) {
    // best-effort cleanup
    await supabase.storage.from("sped-files").remove([storagePath]);
    throw new Error(`Falha ao salvar metadados: ${error.message}`);
  }

  return data as unknown as SpedFileRow;
}

export function useDeleteSpedFile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (row: SpedFileRow) => {
      // Delete storage object first (RLS scoped); ignore "not found"
      await supabase.storage.from("sped-files").remove([row.storage_path]);
      const { error } = await supabase.from("sped_files").delete().eq("id", row.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: SPED_FILES_QK });
    },
  });
}

/** Get a short-lived signed URL to download/inspect the original SPED file. */
export async function getSpedDownloadUrl(storagePath: string, expiresIn = 60): Promise<string> {
  const { data, error } = await supabase.storage
    .from("sped-files")
    .createSignedUrl(storagePath, expiresIn);
  if (error) throw error;
  return data.signedUrl;
}
