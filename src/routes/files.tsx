import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { RequireAuth } from "@/components/require-auth";
import { AppShell } from "@/components/app-shell";
import { useSpedFiles, useDeleteSpedFile, getSpedDownloadUrl, type SpedFileRow } from "@/lib/sped/store";
import { layoutLabel, formatBytes } from "@/lib/sped/parser";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { FileText, Trash2, Eye, Upload, AlertTriangle, CheckCircle2, Search, Download, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

export const Route = createFileRoute("/files")({
  head: () => ({ meta: [{ title: "Arquivos — SPED Analyzer Pro" }] }),
  component: () => (
    <RequireAuth>
      <AppShell>
        <FilesPage />
      </AppShell>
    </RequireAuth>
  ),
});

function FilesPage() {
  const { data: entries = [], isLoading } = useSpedFiles();
  const deleteMutation = useDeleteSpedFile();
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<SpedFileRow | null>(null);
  const [toDelete, setToDelete] = useState<SpedFileRow | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const filtered = entries.filter((e) => {
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return (
      e.file_name.toLowerCase().includes(q) ||
      e.company_name?.toLowerCase().includes(q) ||
      e.cnpj?.includes(q)
    );
  });

  const handleDownload = async (row: SpedFileRow) => {
    setDownloadingId(row.id);
    try {
      const url = await getSpedDownloadUrl(row.storage_path, 60);
      window.open(url, "_blank");
    } catch (err) {
      toast.error("Falha ao gerar link", {
        description: err instanceof Error ? err.message : "Erro desconhecido",
      });
    } finally {
      setDownloadingId(null);
    }
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Arquivos importados</h1>
          <p className="text-sm text-muted-foreground">{entries.length} arquivo(s) no workspace.</p>
        </div>
        <Button asChild size="sm"><Link to="/upload"><Upload className="mr-2 h-4 w-4" /> Novo upload</Link></Button>
      </header>

      <Card className="border-border/60 bg-card">
        <CardHeader className="space-y-3">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle className="text-base">Lista de arquivos</CardTitle>
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar por nome, empresa, CNPJ..." className="pl-8" />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center px-6 py-16 text-sm text-muted-foreground">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Carregando...
            </div>
          ) : filtered.length === 0 ? (
            <div className="px-6 py-16 text-center text-sm text-muted-foreground">
              {entries.length === 0 ? "Nenhum arquivo importado ainda." : "Nenhum resultado para a busca."}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-border/60 hover:bg-transparent">
                  <TableHead>Arquivo</TableHead>
                  <TableHead>Empresa</TableHead>
                  <TableHead>Layout</TableHead>
                  <TableHead>Período</TableHead>
                  <TableHead className="text-right">Linhas</TableHead>
                  <TableHead className="text-right">Tamanho</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((e) => (
                  <TableRow key={e.id} className="border-border/60">
                    <TableCell className="max-w-[220px]">
                      <div className="flex items-center gap-2">
                        <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="truncate text-sm font-medium">{e.file_name}</span>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {format(new Date(e.created_at), "dd/MM/yyyy HH:mm")}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">{e.company_name ?? "—"}</div>
                      <div className="text-xs text-muted-foreground">{e.cnpj ?? ""}</div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="border-primary/30 text-primary">{layoutLabel(e.layout)}</Badge>
                    </TableCell>
                    <TableCell className="text-sm">
                      {e.period_start ?? "—"}<br />
                      <span className="text-xs text-muted-foreground">{e.period_end ?? ""}</span>
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-sm">{e.total_lines.toLocaleString("pt-BR")}</TableCell>
                    <TableCell className="text-right tabular-nums text-sm text-muted-foreground">{formatBytes(e.file_size)}</TableCell>
                    <TableCell>
                      {(e.warnings?.length ?? 0) > 0 ? (
                        <Badge variant="outline" className="border-warning/40 text-warning">
                          <AlertTriangle className="mr-1 h-3 w-3" /> {e.warnings.length}
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="border-success/40 text-success">
                          <CheckCircle2 className="mr-1 h-3 w-3" /> OK
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setSelected(e)} title="Detalhes">
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => handleDownload(e)} disabled={downloadingId === e.id} title="Baixar arquivo original">
                          {downloadingId === e.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                        </Button>
                        <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => setToDelete(e)} title="Remover">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="max-w-2xl">
          {selected && (
            <>
              <DialogHeader>
                <DialogTitle className="truncate">{selected.file_name}</DialogTitle>
                <DialogDescription>{layoutLabel(selected.layout)} · {selected.company_name ?? "—"}</DialogDescription>
              </DialogHeader>
              <div className="grid gap-4">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <Info label="CNPJ" value={selected.cnpj ?? "—"} />
                  <Info label="UF" value={selected.uf ?? "—"} />
                  <Info label="Período" value={`${selected.period_start ?? "—"} a ${selected.period_end ?? "—"}`} />
                  <Info label="Tamanho" value={formatBytes(selected.file_size)} />
                  <Info label="Linhas" value={selected.total_lines.toLocaleString("pt-BR")} />
                  <Info label="Tempo de parsing" value={`${(selected.duration_ms / 1000).toFixed(2)}s`} />
                </div>

                <div>
                  <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Blocos</h4>
                  <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
                    {Object.entries(selected.block_counts ?? {}).sort().map(([b, c]) => (
                      <div key={b} className="rounded-md border border-border/60 bg-background/50 p-2 text-center">
                        <div className="font-mono text-sm font-semibold text-primary">{b}</div>
                        <div className="text-xs tabular-nums text-muted-foreground">{(c as number).toLocaleString("pt-BR")}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {(selected.warnings?.length ?? 0) > 0 && (
                  <div>
                    <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-warning">Avisos</h4>
                    <ul className="space-y-1 text-sm">
                      {selected.warnings.map((w: string, i: number) => (
                        <li key={i} className="flex gap-2 text-muted-foreground">
                          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-warning" />
                          {w}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!toDelete} onOpenChange={(o) => !o && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover arquivo?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação remove permanentemente <b>{toDelete?.file_name}</b> e seus metadados. Esta operação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                if (!toDelete) return;
                try {
                  await deleteMutation.mutateAsync(toDelete);
                  toast.success("Arquivo removido");
                } catch (err) {
                  toast.error("Falha ao remover", {
                    description: err instanceof Error ? err.message : "Erro desconhecido",
                  });
                }
                setToDelete(null);
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="text-sm">{value}</div>
    </div>
  );
}
