import { useState, useEffect, useMemo } from "react";
import axios from "@/lib/axios";
import { passwordWithConfirmationSchema } from "@/lib/passwordSchema";
import { useTheme } from "@/hooks/useTheme";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Link } from "react-router-dom";
import { Eye, EyeOff, Check, X } from "lucide-react";

export default function Register() {
    const { isDark, toggleTheme } = useTheme();
    // Asegurar cookie CSRF al cargar la página (evita "CSRF token mismatch" al enviar el formulario)
    useEffect(() => {
        axios.get("/sanctum/csrf-cookie", { withCredentials: true }).catch(() => {});
    }, []);
    const [form, setForm] = useState({
        employee_number: "",
        first_name: "",
        paternal_last_name: "",
        maternal_last_name: "",
        email: "",
        phone: "",
        password: "",
        password_confirmation: "",
    });
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [showPasswordConfirmation, setShowPasswordConfirmation] = useState(false);

    const passwordChecks = useMemo(() => {
        const p = form.password;
        return {
            length: p.length >= 12,
            lowercase: /[a-z]/.test(p),
            uppercase: /[A-Z]/.test(p),
            number: /[0-9]/.test(p),
            special: /[^A-Za-z0-9]/.test(p),
        };
    }, [form.password]);

    const passwordsMatch =
        form.password.length > 0 &&
        form.password_confirmation.length > 0 &&
        form.password === form.password_confirmation;

    const validate = () => {
        if (!form.employee_number.trim()) return "El número de empleado es obligatorio.";
        if (!form.first_name.trim()) return "El nombre(s) es obligatorio.";
        if (!form.paternal_last_name.trim()) return "El apellido paterno es obligatorio.";
        const passwordValidation = passwordWithConfirmationSchema.safeParse({
            password: form.password,
            password_confirmation: form.password_confirmation,
        });
        if (!passwordValidation.success) {
            const err = passwordValidation.error;
            const first = err?.issues?.[0] ?? err?.errors?.[0];
            const msg = typeof first?.message === 'string' ? first.message : null;
            return msg ?? "Revisa contraseña y confirmación.";
        }
        if (form.phone && form.phone.length !== 10) return "El teléfono debe tener 10 dígitos.";
        return "";
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError("");
        setSuccess("");

        const validationError = validate();
        if (validationError) {
            setError(validationError);
            return;
        }

        setLoading(true);

        try {
            const { data } = await axios.post("/api/register", {
                employee_number: form.employee_number.trim(),
                first_name: form.first_name.trim(),
                paternal_last_name: form.paternal_last_name.trim(),
                maternal_last_name: form.maternal_last_name.trim() || null,
                email: form.email.trim() || null,
                phone: form.phone.trim() || null,
                password: form.password,
                password_confirmation: form.password_confirmation,
            });
            setSuccess(data?.message || "Registro creado correctamente.");
            setForm({
                employee_number: "", first_name: "", paternal_last_name: "", maternal_last_name: "",
                email: "", phone: "", password: "", password_confirmation: "",
            });
        } catch (err) {
            const status = err?.response?.status;
            const data = err?.response?.data;
            let serverMessage = null;
            if (data && typeof data === 'object') {
                if (data.errors?.root != null) serverMessage = data.errors.root;
                else if (data.message && typeof data.message === 'string') serverMessage = data.message;
                else if (data.errors && typeof data.errors === 'object') {
                    const first = Object.values(data.errors).flat()[0];
                    if (typeof first === 'string') serverMessage = first;
                }
            }

            if (status === 429) {
                setError("Demasiados intentos. Intenta más tarde.");
            } else if (serverMessage) {
                setError(serverMessage);
            } else {
                setError("No se pudo registrar. Intenta más tarde.");
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex min-h-[100dvh] items-center justify-center text-foreground p-6 pb-[max(2rem,calc(2rem+env(safe-area-inset-bottom)))] overflow-y-auto relative md:min-h-screen md:overflow-hidden md:pb-6">
            {/* Fondo: imagen a pantalla completa */}
            <div
                className="absolute inset-0 z-0 bg-cover bg-center bg-no-repeat"
                style={{ backgroundImage: "url(/images/auth-hero.png)" }}
                aria-hidden
            />
            {/* Capa mica: blur suave + tinte */}
            <div
                className="absolute inset-0 z-[1] pointer-events-none backdrop-blur-[6px] sm:backdrop-blur-[8px] bg-background/40 dark:bg-background/50"
                aria-hidden
            />
            <Button
                type="button"
                variant="ghost"
                onClick={toggleTheme}
                className="absolute top-4 right-4 z-10 h-auto min-h-[44px] min-w-[44px] flex items-center justify-center text-xs font-semibold text-muted-foreground hover:text-foreground border border-border px-3 py-2 rounded-full bg-background/70 dark:bg-background/60 backdrop-blur-md hover:bg-background/80 md:py-1"
                aria-label="Cambiar tema"
            >
                {isDark ? "Modo claro" : "Modo oscuro"}
            </Button>
            <Card className="relative z-10 w-full max-w-[460px] max-h-[90dvh] flex flex-col shadow-2xl border-border/80 bg-card/80 dark:bg-card/70 backdrop-blur-md overflow-hidden">
                <CardHeader className="shrink-0">
                    <CardTitle className="text-center">Registro de Usuario</CardTitle>
                </CardHeader>
                <CardContent className="min-h-0 overflow-y-auto pb-[max(1rem,env(safe-area-inset-bottom))]">
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-2">
                            <Label>Número de empleado</Label>
                            <Input
                                value={form.employee_number}
                                onChange={(e) =>
                                    setForm({ ...form, employee_number: e.target.value })
                                }
                                autoComplete="username"
                                disabled={loading}
                                className="focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:border-transparent"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label>Nombre(s)</Label>
                            <Input
                                value={form.first_name}
                                onChange={(e) => setForm({ ...form, first_name: e.target.value })}
                                placeholder="Ej. Juan Carlos"
                                disabled={loading}
                                className="focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:border-transparent"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Apellido paterno</Label>
                            <Input
                                value={form.paternal_last_name}
                                onChange={(e) => setForm({ ...form, paternal_last_name: e.target.value })}
                                placeholder="Ej. Pérez"
                                disabled={loading}
                                className="focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:border-transparent"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Apellido materno (opcional)</Label>
                            <Input
                                value={form.maternal_last_name}
                                onChange={(e) => setForm({ ...form, maternal_last_name: e.target.value })}
                                placeholder="Ej. García"
                                disabled={loading}
                                className="focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:border-transparent"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label>Correo electrónico (opcional)</Label>
                            <Input
                                type="email"
                                value={form.email}
                                onChange={(e) => setForm({ ...form, email: e.target.value })}
                                autoComplete="email"
                                disabled={loading}
                                className="focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:border-transparent"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label>Teléfono (opcional)</Label>
                            <Input
                                value={form.phone}
                                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                                maxLength={10}
                                disabled={loading}
                                className="focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:border-transparent"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="reg-password">Contraseña</Label>
                            <div className="relative">
                                <Input
                                    id="reg-password"
                                    type={showPassword ? "text" : "password"}
                                    value={form.password}
                                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                                    autoComplete="new-password"
                                    disabled={loading}
                                    className="pr-12 focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:border-transparent"
                                />
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => setShowPassword((v) => !v)}
                                    className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 shrink-0 text-muted-foreground hover:text-foreground hover:bg-transparent"
                                    disabled={loading}
                                    aria-label={showPassword ? "Ocultar contraseña" : "Ver contraseña"}
                                >
                                    {showPassword ? (
                                        <EyeOff className="h-4 w-4" aria-hidden />
                                    ) : (
                                        <Eye className="h-4 w-4" aria-hidden />
                                    )}
                                </Button>
                            </div>
                            <div className="rounded-md border border-border/60 bg-muted/30 px-3 py-2 text-xs space-y-1.5">
                                <p className="font-medium text-muted-foreground">Requisitos de la contraseña:</p>
                                <ul className="space-y-1">
                                    <li className={passwordChecks.length ? "text-emerald-600 dark:text-emerald-400 flex items-center gap-2" : "text-muted-foreground flex items-center gap-2"}>
                                        {passwordChecks.length ? <Check className="h-3.5 w-3.5 shrink-0" /> : <X className="h-3.5 w-3.5 shrink-0 opacity-50" />}
                                        Mínimo 12 caracteres
                                    </li>
                                    <li className={passwordChecks.lowercase ? "text-emerald-600 dark:text-emerald-400 flex items-center gap-2" : "text-muted-foreground flex items-center gap-2"}>
                                        {passwordChecks.lowercase ? <Check className="h-3.5 w-3.5 shrink-0" /> : <X className="h-3.5 w-3.5 shrink-0 opacity-50" />}
                                        Al menos una minúscula
                                    </li>
                                    <li className={passwordChecks.uppercase ? "text-emerald-600 dark:text-emerald-400 flex items-center gap-2" : "text-muted-foreground flex items-center gap-2"}>
                                        {passwordChecks.uppercase ? <Check className="h-3.5 w-3.5 shrink-0" /> : <X className="h-3.5 w-3.5 shrink-0 opacity-50" />}
                                        Al menos una mayúscula
                                    </li>
                                    <li className={passwordChecks.number ? "text-emerald-600 dark:text-emerald-400 flex items-center gap-2" : "text-muted-foreground flex items-center gap-2"}>
                                        {passwordChecks.number ? <Check className="h-3.5 w-3.5 shrink-0" /> : <X className="h-3.5 w-3.5 shrink-0 opacity-50" />}
                                        Al menos un número
                                    </li>
                                    <li className={passwordChecks.special ? "text-emerald-600 dark:text-emerald-400 flex items-center gap-2" : "text-muted-foreground flex items-center gap-2"}>
                                        {passwordChecks.special ? <Check className="h-3.5 w-3.5 shrink-0" /> : <X className="h-3.5 w-3.5 shrink-0 opacity-50" />}
                                        Al menos un carácter especial (!@#$%^&*…)
                                    </li>
                                </ul>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="reg-password-confirmation">Confirmar contraseña</Label>
                            <div className="relative">
                                <Input
                                    id="reg-password-confirmation"
                                    type={showPasswordConfirmation ? "text" : "password"}
                                    value={form.password_confirmation}
                                    onChange={(e) => setForm({ ...form, password_confirmation: e.target.value })}
                                    autoComplete="new-password"
                                    disabled={loading}
                                    className="pr-12 focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:border-transparent"
                                />
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => setShowPasswordConfirmation((v) => !v)}
                                    className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 shrink-0 text-muted-foreground hover:text-foreground hover:bg-transparent"
                                    disabled={loading}
                                    aria-label={showPasswordConfirmation ? "Ocultar contraseña" : "Ver contraseña"}
                                >
                                    {showPasswordConfirmation ? (
                                        <EyeOff className="h-4 w-4" aria-hidden />
                                    ) : (
                                        <Eye className="h-4 w-4" aria-hidden />
                                    )}
                                </Button>
                            </div>
                            {form.password_confirmation.length > 0 && (
                                <p className={passwordsMatch ? "text-emerald-600 dark:text-emerald-400 text-xs flex items-center gap-1.5" : "text-amber-600 dark:text-amber-400 text-xs flex items-center gap-1.5"}>
                                    {passwordsMatch ? <Check className="h-3.5 w-3.5" /> : <X className="h-3.5 w-3.5" />}
                                    {passwordsMatch ? "Las contraseñas coinciden" : "Las contraseñas no coinciden"}
                                </p>
                            )}
                        </div>

                        <p className="text-xs text-muted-foreground">
                            Si tienes correo empresarial, recibirás un enlace de verificación.
                            Si no tienes correo, tu cuenta quedará pendiente de aprobación.
                        </p>

                        {error && <p className="text-red-500 text-sm" role="alert">{error}</p>}
                        {success && <p className="text-emerald-500 text-sm">{success}</p>}

                        <Button type="submit" className="w-full" disabled={loading}>
                            {loading ? "Registrando..." : "Crear cuenta"}
                        </Button>
                        <p className="text-center text-xs text-muted-foreground flex flex-wrap items-center justify-center gap-x-1 gap-y-1">
                            <span>¿Ya tienes cuenta?</span>
                            <Link to="/login" className="inline-flex items-center min-h-[44px] py-3 text-primary hover:underline md:min-h-0 md:py-0">
                                Inicia sesión
                            </Link>
                        </p>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}
