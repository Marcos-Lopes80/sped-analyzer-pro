import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { useQueryClient } from "@tanstack/react-query";
import { RequireAuth } from "@/components/require-auth";
import { AppShell } from "@/components/app-shell";
import { useAuth } from "@/lib/auth-context";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { parseSpedFile, formatBytes, layoutLabel, type SpedSummary } from "@/lib/sped/parser";
import { persistSpedFile, SPED_FILES_QK } from "@/lib/sped/store";
import { Upload, FileText, CheckCircle2, AlertTriangle, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/upload")({
  head: () => ({ meta: [{ title: "Importar SPED — SPED Analyzer Pro" }] }),
  component: () => (
    <RequireAuth>
      <AppShell>
        <UploadPage />
      </AppShell>
    </RequireAuth>
  ),
});

interface ParseJob {
  file: File;
  progress: number;
  status: "queued" | "parsing" | "uploading" | "done" | "error";
  summary?: SpedSummary;
  error?: string;
}

function UploadPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const qc = useQueryClient();
  const [jobs, setJobs] = useState<ParseJob[]>([]);

  const updateJob = (idx: number, patch: Partial<ParseJob>) =>
    setJobs((prev) => prev.map((j, i) => (i === idx ? { ...j, ...patch } : j)));

  const processFile = useCallback(
    async (file: File, idx: number) => {
      if (!user) return;
      updateJob(idx, { status: "parsing", progress: 0 });
      try {
        const summary = await parseSpedFile(file, {
          // Reserve last 10% of progress bar for upload phase
          onProgress: (p) => updateJob(idx, { progress: p * 0.9 }),
        });

        updateJob(idx, { status: "uploading", progress: 0.92, summary });
        await persistSpedFile({ file, summary, userId: user.id });
        updateJob(idx, { status: "done", progress: 1 });

        qc.invalidateQueries({ queryKey: SPED_FILES_QK });
        toast.success(`${file.name} salvo`, {
          description: `${summary.totalLines.toLocaleString("pt-BR")} linhas em ${(summary.durationMs / 1000).toFixed(1)}s`,
        });
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Erro desconhecido";
        updateJob(idx, { status: "error", error: msg });
        toast.error(`Falha em ${file.name}`, { description: msg });
      }
    },
    [user, qc]
  );

  const onDrop = useCallback(
    (accepted: File[]) => {
      const start = jobs.length;
      const newJobs: ParseJob[] = accepted.map((f) => ({ file: f, progress: 0, status: "queued" }));
      setJobs((prev) => [...prev, ...newJobs]);
      (async () => {
        for (let i = 0; i < accepted.length; i++) {
          await processFile(accepted[i], start + i);
        }
      })();
    },
    [jobs.length, processFile]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "text/plain": [".txt"], "application/octet-stream": [".txt"] },
    multiple: true,
  });

  const allDone = jobs.length > 0 && jobs.every((j) => j.status === "done" || j.status === "error");

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Importar SPED</h1>
        <p className="text-sm text-muted-foreground">
          Os arquivos são processados em streaming e armazenados com segurança no seu workspace.
        </p>
      </header>

      <Card className="border-border/60 bg-card">
        <CardContent className="p-0">
          <div
            {...getRootProps()}
            className={cn(
              "flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-border/60 px-6 py-16 text-center transition-colors",
              isDragActive ? "border-primary bg-primary/5" : "hover:border-primary/50 hover:bg-accent/30"
            )}
          >
            <input {...getInputProps()} />
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 ring-1 ring-primary/30">
              <Upload className="h-6 w-6 text-primary" />
            </div>
            <p className="mt-4 text-base font-medium">
              {isDragActive ? "Solte os arquivos aqui" : "Arraste arquivos SPED ou clique para selecionar"}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Aceita .txt — EFD ICMS/IPI, EFD Contribuições, ECD, ECF · múltiplos arquivos
            </p>
          </div>
        </CardContent>
      </Card>

      {jobs.length > 0 && (
        <Card className="border-border/60 bg-card">
          <CardHeader>
            <CardTitle className="text-base">Processamento ({jobs.filter((j) => j.status === "done").length}/{jobs.length})</CardTitle>
            <CardDescription>Acompanhe em tempo real.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {jobs.map((job, i) => (
              <JobRow key={i} job={job} onRemove={() => setJobs((p) => p.filter((_, x) => x !== i))} />
            ))}
            {allDone && (
              <div className="flex justify-end pt-2">
                <Button onClick={() => navigate({ to: "/" })}>Ver Dashboard</Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function JobRow({ job, onRemove }: { job: ParseJob; onRemove: () => void }) {
  const statusLabel = job.status === "parsing" ? "Analisando" : job.status === "uploading" ? "Salvando" : null;
  return (
    <div className="rounded-md border border-border/60 bg-background/40 p-3">
      <div className="flex items-center gap-3">
        <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <span className="truncate text-sm font-medium">{job.file.name}</span>
            <span className="shrink-0 text-xs tabular-nums text-muted-foreground">{formatBytes(job.file.size)}</span>
          </div>
          {(job.status === "parsing" || job.status === "uploading") && (
            <div className="mt-2 flex items-center gap-2">
              <Progress value={job.progress * 100} className="h-1.5 flex-1" />
              <span className="w-16 text-right text-xs tabular-nums text-muted-foreground">
                {statusLabel} {Math.round(job.progress * 100)}%
              </span>
            </div>
          )}
          {job.status === "done" && job.summary && (
            <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1 text-success">
                <CheckCircle2 className="h-3 w-3" /> {layoutLabel(job.summary.layout)}
              </span>
              <span>{job.summary.totalLines.toLocaleString("pt-BR")} linhas</span>
              {job.summary.companyName && <span className="truncate">· {job.summary.companyName}</span>}
              {job.summary.period.start && <span>· {job.summary.period.start}–{job.summary.period.end}</span>}
              {job.summary.warnings.length > 0 && (
                <span className="inline-flex items-center gap-1 text-warning">
                  <AlertTriangle className="h-3 w-3" /> {job.summary.warnings.length} aviso(s)
                </span>
              )}
            </div>
          )}
          {job.status === "error" && (
            <Alert variant="destructive" className="mt-2">
              <AlertTitle className="text-xs">Falha</AlertTitle>
              <AlertDescription className="text-xs">{job.error}</AlertDescription>
            </Alert>
          )}
          {job.status === "queued" && (
            <div className="mt-1 inline-flex items-center gap-1 text-xs text-muted-foreground">
              <Loader2 className="h-3 w-3 animate-spin" /> Aguardando…
            </div>
          )}
        </div>
        {(job.status === "done" || job.status === "error") && (
          <Button size="icon" variant="ghost" onClick={onRemove} className="h-7 w-7 shrink-0">
            <X className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>
    </div>
  );
}
