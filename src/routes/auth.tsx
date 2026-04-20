import { createFileRoute, Link, redirect, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Lock, Mail, ShieldCheck } from "lucide-react";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Entrar — SPED Analyzer Pro" },
      { name: "description", content: "Acesso restrito ao SPED Analyzer Pro." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const { signIn, user, loading } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "forgot">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  if (!loading && user) {
    throw redirect({ to: "/" });
  }

  const handleSignIn = async (e: FormEvent) => {
    e.preventDefault();
    setError(null); setInfo(null); setSubmitting(true);
    const { error } = await signIn(email.trim(), password);
    setSubmitting(false);
    if (error) {
      setError(error.message.includes("Invalid") ? "Email ou senha incorretos." : error.message);
      return;
    }
    navigate({ to: "/" });
  };

  const handleForgot = async (e: FormEvent) => {
    e.preventDefault();
    setError(null); setInfo(null); setSubmitting(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setSubmitting(false);
    if (error) { setError(error.message); return; }
    setInfo("Se este email estiver cadastrado, você receberá um link de redefinição.");
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-12">
      <div className="w-full max-w-md">
        <div className="mb-8 flex flex-col items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 ring-1 ring-primary/30">
            <ShieldCheck className="h-6 w-6 text-primary" />
          </div>
          <div className="text-center">
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">SPED Analyzer Pro</h1>
            <p className="mt-1 text-sm text-muted-foreground">Auditoria fiscal de precisão</p>
          </div>
        </div>

        <Card className="border-border/60 bg-card/80 backdrop-blur">
          <CardHeader className="space-y-1.5">
            <CardTitle className="text-lg">
              {mode === "signin" ? "Acesso ao painel" : "Recuperar senha"}
            </CardTitle>
            <CardDescription>
              {mode === "signin"
                ? "Entre com suas credenciais corporativas."
                : "Informe seu email para receber as instruções."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {error && (
              <Alert variant="destructive" className="mb-4">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            {info && (
              <Alert className="mb-4 border-success/40 bg-success/10">
                <AlertDescription className="text-foreground">{info}</AlertDescription>
              </Alert>
            )}

            <form onSubmit={mode === "signin" ? handleSignIn : handleForgot} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-9"
                    placeholder="seu@email.com"
                  />
                </div>
              </div>

              {mode === "signin" && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password">Senha</Label>
                    <button
                      type="button"
                      onClick={() => { setMode("forgot"); setError(null); setInfo(null); }}
                      className="text-xs text-muted-foreground hover:text-primary"
                    >
                      Esqueci minha senha
                    </button>
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="password"
                      type="password"
                      autoComplete="current-password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pl-9"
                      placeholder="••••••••"
                    />
                  </div>
                </div>
              )}

              <Button type="submit" className="w-full" disabled={submitting}>
                {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {mode === "signin" ? "Entrar" : "Enviar link"}
              </Button>

              {mode === "forgot" && (
                <button
                  type="button"
                  onClick={() => { setMode("signin"); setError(null); setInfo(null); }}
                  className="block w-full text-center text-xs text-muted-foreground hover:text-primary"
                >
                  ← Voltar para login
                </button>
              )}
            </form>
          </CardContent>
        </Card>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          Acesso restrito. Cadastros gerenciados pelo administrador.
        </p>
      </div>
    </div>
  );
}
