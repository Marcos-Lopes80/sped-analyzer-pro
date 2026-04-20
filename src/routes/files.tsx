import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { RequireAuth } from "@/components/require-auth";
import { AppShell } from "@/components/app-shell";
import { useSpedEntries, spedStore } from "@/lib/sped/store";
import { layoutLabel, formatBytes } from "@/lib/sped/parser";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
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
import { FileText, Trash2, Eye, Upload, AlertTriangle, CheckCircle2, Search } from "lucide-react";
import { format } from "date-fns";
import type { SpedFileEntry } from "@/lib/sped/store";

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
  const entries = useSpedEntries();
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<SpedFileEntry | null>(null);
  const [toDelete, setToDelete] = useState<SpedFileEntry | null>(null);

  const filtered = entries.filter((e) => {
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return (
      e.summary.fileName.toLowerCase().includes(q) ||
      e.summary.companyName?.toLowerCase().includes(q) ||
      e.summary.cnpj?.includes(q)
    );
  });

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Arquivos importados</h1>
          <p className="text-sm text-muted-foreground">{entries.length} arquivo(s) na sessão atual.</p>
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
          {filtered.length === 0 ? (
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
                        <span className="truncate text-sm font-medium">{e.summary.fileName}</span>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {format(e.uploadedAt, "dd/MM/yyyy HH:mm")}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">{e.summary.companyName ?? "—"}</div>
                      <div className="text-xs text-muted-foreground">{e.summary.cnpj ?? ""}</div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="border-primary/30 text-primary">{layoutLabel(e.summary.layout)}</Badge>
                    </TableCell>
                    <TableCell className="text-sm">
                      {e.summary.period.start ?? "—"}<br />
                      <span className="text-xs text-muted-foreground">{e.summary.period.end ?? ""}</span>
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-sm">{e.summary.totalLines.toLocaleString("pt-BR")}</TableCell>
                    <TableCell className="text-right tabular-nums text-sm text-muted-foreground">{formatBytes(e.summary.fileSize)}</TableCell>
                    <TableCell>
                      {e.summary.warnings.length > 0 ? (
                        <Badge variant="outline" className="border-warning/40 text-warning">
                          <AlertTriangle className="mr-1 h-3 w-3" /> {e.summary.warnings.length}
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="border-success/40 text-success">
                          <CheckCircle2 className="mr-1 h-3 w-3" /> OK
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setSelected(e)}>
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => setToDelete(e)}>
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

      {/* Detail dialog */}
      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="max-w-2xl">
          {selected && (
            <>
              <DialogHeader>
                <DialogTitle className="truncate">{selected.summary.fileName}</DialogTitle>
                <DialogDescription>{layoutLabel(selected.summary.layout)} · {selected.summary.companyName ?? "—"}</DialogDescription>
              </DialogHeader>
              <div className="grid gap-4">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <Info label="CNPJ" value={selected.summary.cnpj ?? "—"} />
                  <Info label="UF" value={selected.summary.uf ?? "—"} />
                  <Info label="Período" value={`${selected.summary.period.start ?? "—"} a ${selected.summary.period.end ?? "—"}`} />
                  <Info label="Tamanho" value={formatBytes(selected.summary.fileSize)} />
                  <Info label="Linhas" value={selected.summary.totalLines.toLocaleString("pt-BR")} />
                  <Info label="Tempo" value={`${(selected.summary.durationMs / 1000).toFixed(2)}s`} />
                </div>

                <div>
                  <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Blocos</h4>
                  <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
                    {Object.entries(selected.summary.blockCounts).sort().map(([b, c]) => (
                      <div key={b} className="rounded-md border border-border/60 bg-background/50 p-2 text-center">
                        <div className="font-mono text-sm font-semibold text-primary">{b}</div>
                        <div className="text-xs tabular-nums text-muted-foreground">{c.toLocaleString("pt-BR")}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {selected.summary.warnings.length > 0 && (
                  <div>
                    <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-warning">Avisos</h4>
                    <ul className="space-y-1 text-sm">
                      {selected.summary.warnings.map((w, i) => (
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
              Esta ação remove <b>{toDelete?.summary.fileName}</b> da sessão atual. Você poderá reimportá-lo depois.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => { if (toDelete) spedStore.remove(toDelete.id); setToDelete(null); }}
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
