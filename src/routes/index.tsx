import { createFileRoute, Link } from "@tanstack/react-router";
import { RequireAuth } from "@/components/require-auth";
import { AppShell } from "@/components/app-shell";
import { useSpedFiles, type SpedFileRow } from "@/lib/sped/store";
import { layoutLabel, formatBytes } from "@/lib/sped/parser";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  FileText,
  Database,
  AlertTriangle,
  CheckCircle2,
  Upload,
  TrendingUp,
  Building2,
  CalendarRange,
  Loader2,
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Cell,
  PieChart,
  Pie,
  Legend,
} from "recharts";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [{ title: "Dashboard — SPED Analyzer Pro" }],
  }),
  component: () => (
    <RequireAuth>
      <AppShell>
        <Dashboard />
      </AppShell>
    </RequireAuth>
  ),
});

function Dashboard() {
  const { data: entries = [], isLoading, error } = useSpedFiles();

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto max-w-md py-20 text-center text-sm text-destructive">
        Falha ao carregar arquivos: {(error as Error).message}
      </div>
    );
  }

  if (entries.length === 0) return <EmptyState />;

  const totalLines = entries.reduce((s: number, e: SpedFileRow) => s + e.total_lines, 0);
  const totalBytes = entries.reduce((s: number, e: SpedFileRow) => s + e.file_size, 0);
  const totalWarnings = entries.reduce((s: number, e: SpedFileRow) => s + (e.warnings?.length ?? 0), 0);
  const layouts = new Set(entries.map((e) => e.layout));

  const blockAgg: Record<string, number> = {};
  entries.forEach((e) =>
    Object.entries(e.block_counts ?? {}).forEach(([b, c]) => {
      blockAgg[b] = (blockAgg[b] ?? 0) + (c as number);
    })
  );
  const blockData = Object.entries(blockAgg)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([block, count]) => ({ block: `Bloco ${block}`, count }));

  const recAgg: Record<string, number> = {};
  entries.forEach((e) =>
    Object.entries(e.record_counts ?? {}).forEach(([r, c]) => {
      recAgg[r] = (recAgg[r] ?? 0) + (c as number);
    })
  );
  const topRecords = Object.entries(recAgg)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([reg, count]) => ({ reg, count }));

  const layoutData = entries.reduce<Record<string, number>>((acc, e) => {
    const l = layoutLabel(e.layout);
    acc[l] = (acc[l] ?? 0) + 1;
    return acc;
  }, {});
  const layoutPie = Object.entries(layoutData).map(([name, value]) => ({ name, value }));

  const PIE_COLORS = ["oklch(0.68 0.17 240)", "oklch(0.7 0.16 155)", "oklch(0.78 0.16 75)", "oklch(0.65 0.21 22)"];

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
          <p className="text-sm text-muted-foreground">Visão consolidada dos arquivos SPED importados.</p>
        </div>
        <Button asChild size="sm">
          <Link to="/upload"><Upload className="mr-2 h-4 w-4" /> Importar arquivo</Link>
        </Button>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard icon={FileText} label="Arquivos" value={entries.length.toString()} hint={`${layouts.size} layouts distintos`} />
        <KpiCard icon={Database} label="Linhas processadas" value={totalLines.toLocaleString("pt-BR")} hint={formatBytes(totalBytes)} />
        <KpiCard icon={AlertTriangle} label="Avisos" value={totalWarnings.toString()} hint={totalWarnings === 0 ? "Tudo conforme" : "Verificar abaixo"} tone={totalWarnings > 0 ? "warning" : "success"} />
        <KpiCard icon={TrendingUp} label="Maior arquivo" value={formatBytes(Math.max(...entries.map((e) => e.file_size)))} hint="por tamanho" />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2 border-border/60 bg-card">
          <CardHeader>
            <CardTitle className="text-base">Registros por bloco</CardTitle>
            <CardDescription>Distribuição agregada de todos os arquivos.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={blockData} margin={{ top: 10, right: 12, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.3 0.02 250)" vertical={false} />
                  <XAxis dataKey="block" tick={{ fill: "oklch(0.68 0.015 250)", fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: "oklch(0.68 0.015 250)", fontSize: 11 }} axisLine={false} tickLine={false} />
                  <Tooltip
                    cursor={{ fill: "oklch(0.3 0.04 240 / 0.2)" }}
                    contentStyle={{
                      backgroundColor: "oklch(0.21 0.018 250)",
                      border: "1px solid oklch(0.3 0.02 250)",
                      borderRadius: 6,
                      fontSize: 12,
                    }}
                    labelStyle={{ color: "oklch(0.95 0.005 250)" }}
                  />
                  <Bar dataKey="count" fill="oklch(0.68 0.17 240)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/60 bg-card">
          <CardHeader>
            <CardTitle className="text-base">Layouts importados</CardTitle>
            <CardDescription>Por tipo de declaração.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={layoutPie} dataKey="value" nameKey="name" innerRadius={50} outerRadius={85} paddingAngle={2}>
                    {layoutPie.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "oklch(0.21 0.018 250)",
                      border: "1px solid oklch(0.3 0.02 250)",
                      borderRadius: 6,
                      fontSize: 12,
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: 11, color: "oklch(0.85 0.01 250)" }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-border/60 bg-card">
        <CardHeader>
          <CardTitle className="text-base">Registros mais frequentes</CardTitle>
          <CardDescription>Top 8 tipos de registros entre todos os arquivos.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {topRecords.map((r) => (
              <div key={r.reg} className="flex items-center justify-between rounded-md border border-border/60 bg-background/50 px-3 py-2">
                <span className="font-mono text-sm font-semibold text-primary">{r.reg}</span>
                <span className="tabular-nums text-sm text-muted-foreground">{r.count.toLocaleString("pt-BR")}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/60 bg-card">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base">Arquivos recentes</CardTitle>
            <CardDescription>Últimos uploads.</CardDescription>
          </div>
          <Button variant="outline" size="sm" asChild>
            <Link to="/files">Ver todos</Link>
          </Button>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {entries.slice(0, 5).map((e) => (
              <div key={e.id} className="flex flex-wrap items-center gap-3 rounded-md border border-border/60 bg-background/40 p-3 text-sm">
                <FileText className="h-4 w-4 text-muted-foreground" />
                <div className="min-w-0 flex-1">
                  <div className="truncate font-medium">{e.file_name}</div>
                  <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    <Building2 className="h-3 w-3" />
                    <span className="truncate">{e.company_name ?? "—"}</span>
                    <span>•</span>
                    <CalendarRange className="h-3 w-3" />
                    <span>{e.period_start ?? "—"} – {e.period_end ?? "—"}</span>
                  </div>
                </div>
                <Badge variant="outline" className="border-primary/30 text-primary">{layoutLabel(e.layout)}</Badge>
                <span className="tabular-nums text-xs text-muted-foreground">{e.total_lines.toLocaleString("pt-BR")} linhas</span>
                {(e.warnings?.length ?? 0) > 0 ? (
                  <Badge variant="outline" className="border-warning/40 text-warning">
                    <AlertTriangle className="mr-1 h-3 w-3" /> {e.warnings.length}
                  </Badge>
                ) : (
                  <Badge variant="outline" className="border-success/40 text-success">
                    <CheckCircle2 className="mr-1 h-3 w-3" /> OK
                  </Badge>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function KpiCard({
  icon: Icon, label, value, hint, tone = "default",
}: {
  icon: typeof FileText;
  label: string;
  value: string;
  hint?: string;
  tone?: "default" | "success" | "warning";
}) {
  const toneClass = tone === "success" ? "text-success" : tone === "warning" ? "text-warning" : "text-primary";
  return (
    <Card className="border-border/60 bg-card">
      <CardContent className="p-5">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</span>
          <Icon className={`h-4 w-4 ${toneClass}`} />
        </div>
        <div className="mt-2 text-2xl font-semibold tabular-nums">{value}</div>
        {hint && <div className="mt-1 text-xs text-muted-foreground">{hint}</div>}
      </CardContent>
    </Card>
  );
}

function EmptyState() {
  return (
    <div className="mx-auto flex max-w-2xl flex-col items-center justify-center py-20 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 ring-1 ring-primary/30">
        <Upload className="h-7 w-7 text-primary" />
      </div>
      <h2 className="mt-6 text-2xl font-semibold tracking-tight">Comece importando um arquivo SPED</h2>
      <p className="mt-2 text-sm text-muted-foreground">
        Aceitamos EFD ICMS/IPI, EFD Contribuições, ECD e ECF. Os arquivos são processados em streaming
        e armazenados com segurança no seu workspace.
      </p>
      <Button asChild size="lg" className="mt-6">
        <Link to="/upload"><Upload className="mr-2 h-4 w-4" /> Importar SPED</Link>
      </Button>
    </div>
  );
}
