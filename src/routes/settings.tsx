import { createFileRoute } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { RequireAuth } from "@/components/require-auth";
import { AppShell } from "@/components/app-shell";
import { useAuth } from "@/lib/auth-context";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, KeyRound, User } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/settings")({
  head: () => ({ meta: [{ title: "Configurações — SPED Analyzer Pro" }] }),
  component: () => (
    <RequireAuth>
      <AppShell>
        <SettingsPage />
      </AppShell>
    </RequireAuth>
  ),
});

function SettingsPage() {
  const { user, updatePassword, isAdmin } = useAuth();
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleChangePassword = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (pw.length < 8) { setError("Senha deve ter pelo menos 8 caracteres."); return; }
    if (pw !== pw2) { setError("As senhas não coincidem."); return; }
    setSubmitting(true);
    const { error } = await updatePassword(pw);
    setSubmitting(false);
    if (error) { setError(error.message); return; }
    setPw(""); setPw2("");
    toast.success("Senha alterada com sucesso");
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Configurações</h1>
        <p className="text-sm text-muted-foreground">Gerencie sua conta e preferências.</p>
      </header>

      <Card className="border-border/60 bg-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <User className="h-4 w-4 text-primary" /> Conta
          </CardTitle>
          <CardDescription>Informações do usuário autenticado.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="Email" value={user?.email ?? "—"} />
            <Field label="Papel" value={isAdmin ? "Administrador" : "Auditor"} />
            <Field label="ID" value={user?.id ?? "—"} mono />
            <Field label="Criado em" value={user?.created_at ? new Date(user.created_at).toLocaleString("pt-BR") : "—"} />
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/60 bg-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <KeyRound className="h-4 w-4 text-primary" /> Alterar senha
          </CardTitle>
          <CardDescription>Mínimo 8 caracteres. Use uma senha forte e única.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleChangePassword} className="max-w-md space-y-4">
            {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}
            <div className="space-y-2">
              <Label htmlFor="np">Nova senha</Label>
              <Input id="np" type="password" minLength={8} required value={pw} onChange={(e) => setPw(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="np2">Confirmar nova senha</Label>
              <Input id="np2" type="password" minLength={8} required value={pw2} onChange={(e) => setPw2(e.target.value)} />
            </div>
            <Button type="submit" disabled={submitting}>
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Salvar nova senha
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

function Field({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="rounded-md border border-border/60 bg-background/40 p-3">
      <div className="text-xs uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className={`mt-1 text-sm ${mono ? "font-mono text-xs" : ""} truncate`}>{value}</div>
    </div>
  );
}
