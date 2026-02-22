import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/hooks/useTheme";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Link } from "react-router-dom";
import { useNavigate } from "react-router-dom";
import { notify } from "@/lib/notify";
import { Checkbox } from "@/components/ui/checkbox";

export default function Login() {
    const { login } = useAuth();
    const { isDark, toggleTheme } = useTheme();
    const navigate = useNavigate();
    const [form, setForm] = useState({ identifier: "", password: "" });
    const [remember, setRemember] = useState(() => {
        if (typeof localStorage === "undefined") return false;
        const saved = localStorage.getItem("login.remember");
        const savedId = localStorage.getItem("login.identifier") || "";
        if (saved === "1" && savedId) {
            setTimeout(() => setForm((f) => ({ ...f, identifier: savedId })), 0);
            return true;
        }
        return false;
    });
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    const validate = () => {
        const identifier = form.identifier.trim();
        const password = form.password;

        if (!identifier) return "El correo o número de empleado es obligatorio.";
        if (!password) return "La contraseña es obligatoria.";

        return "";
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError("");
        const validationError = validate();
        if (validationError) {
            setError(validationError);
            notify.error({ title: "No se pudo iniciar sesión", description: validationError });
            return;
        }
        setLoading(true);
        try {
            await login({ identifier: form.identifier.trim(), password: form.password });
            if (remember) {
                localStorage.setItem("login.remember", "1");
                localStorage.setItem("login.identifier", form.identifier.trim());
            } else {
                localStorage.removeItem("login.remember");
                localStorage.removeItem("login.identifier");
            }
        } catch (err) {
            const status = err?.response?.status;
            const serverMessage = err?.response?.data?.errors?.root;
            const retryAfter = err?.response?.headers?.["retry-after"];

            let message = "Credenciales incorrectas.";
            if (status === 429) {
                message = retryAfter
                    ? `Demasiados intentos. Intenta de nuevo en ${retryAfter} segundos.`
                    : "Demasiados intentos. Intenta de nuevo en unos segundos.";
            } else if ((status === 422 || status === 403) && serverMessage) {
                message = serverMessage;
            } else if (status >= 500) {
                message = "Error del servidor. Intenta más tarde.";
            }
            setError(message);
            notify.error({ title: "No se pudo iniciar sesión", description: message });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex h-screen flex-col items-center justify-center bg-background text-foreground relative px-4 py-6">
            <Button
                type="button"
                variant="ghost"
                onClick={toggleTheme}
                className="absolute top-4 right-4 h-auto text-xs font-semibold text-muted-foreground hover:text-foreground border border-border px-3 py-1 rounded-full bg-background/80 backdrop-blur hover:bg-transparent"
                aria-label="Cambiar tema"
            >
                {isDark ? "Modo claro" : "Modo oscuro"}
            </Button>
            <Card className="w-[400px]">
                <CardHeader>
                    <CardTitle className="text-center">Helpdesk Enterprise</CardTitle>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-2">
                            <Label>Correo o No. de Empleado</Label>
                            <Input
                                value={form.identifier}
                                onChange={(e) =>
                                    setForm({ ...form, identifier: e.target.value })
                                }
                                autoFocus
                                autoComplete="username"
                                disabled={loading}
                                aria-invalid={Boolean(error)}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label>Contraseña</Label>
                            <div className="relative">
                                <Input
                                    type={showPassword ? "text" : "password"}
                                    value={form.password}
                                    onChange={(e) =>
                                        setForm({ ...form, password: e.target.value })
                                    }
                                    autoComplete="current-password"
                                    disabled={loading}
                                    className="pr-12"
                                    aria-invalid={Boolean(error)}
                                />
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setShowPassword((v) => !v)}
                                    className="absolute right-2 top-1/2 -translate-y-1/2 h-auto px-2 py-1 text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-transparent"
                                    disabled={loading}
                                >
                                    {showPassword ? "Ocultar" : "Ver"}
                                </Button>
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            <Checkbox
                                id="remember"
                                checked={remember}
                                onCheckedChange={(v) => setRemember(Boolean(v))}
                                disabled={loading}
                            />
                            <Label htmlFor="remember" className="text-sm text-muted-foreground">
                                Recordar usuario (no la contraseña)
                            </Label>
                        </div>

                        {error && (
                            <p className="text-red-500 text-sm" role="alert" aria-live="polite">
                                {error}
                            </p>
                        )}

                        <Button type="submit" className="w-full" disabled={loading}>
                            {loading ? "Ingresando..." : "Ingresar"}
                        </Button>

                        <p className="text-center text-xs text-muted-foreground">
                            ¿No tienes cuenta?{" "}
                            <Link to="/register" className="text-primary hover:underline">
                                Regístrate
                            </Link>
                        </p>
                        <p className="text-center text-xs text-muted-foreground">
                            <Button
                                type="button"
                                variant="link"
                                onClick={() => navigate('/forgot-password')}
                                className="h-auto p-0 text-primary hover:underline font-normal"
                                disabled={loading}
                            >
                                ¿Olvidaste tu contraseña?
                            </Button>
                        </p>
                    </form>
                </CardContent>
            </Card>
            <div className="mt-6 text-center text-xs text-muted-foreground space-y-1">
                <p>¿Necesitas ayuda o documentación?</p>
                <Button
                    type="button"
                    variant="link"
                    className="h-auto p-0 text-primary hover:underline font-semibold"
                    asChild
                >
                    <Link to="/manual" target="_blank" rel="noopener noreferrer">
                        Abrir manual y guía de la aplicación
                    </Link>
                </Button>
            </div>
        </div>
    );
}


