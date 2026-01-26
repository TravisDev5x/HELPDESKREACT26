import { useState } from "react";
import axios from "@/lib/axios";
import { strongPasswordSchema } from "@/lib/passwordSchema";
import { useTheme } from "@/hooks/useTheme";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Link } from "react-router-dom";

export default function Register() {
    const { isDark, toggleTheme } = useTheme();
    const [form, setForm] = useState({
        employee_number: "",
        name: "",
        email: "",
        phone: "",
        password: "",
    });
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");
    const [loading, setLoading] = useState(false);

    const validate = () => {
        if (!form.employee_number.trim()) return "El número de empleado es obligatorio.";
        if (!form.name.trim()) return "El nombre es obligatorio.";
        const passwordValidation = strongPasswordSchema.safeParse(form.password);
        if (!passwordValidation.success) return passwordValidation.error.errors[0].message;
        if (form.email && !form.email.endsWith("@ecd.mx")) return "El correo debe ser @ecd.mx.";
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
                name: form.name.trim(),
                email: form.email.trim() || null,
                phone: form.phone.trim() || null,
                password: form.password,
            });
            setSuccess(data?.message || "Registro creado correctamente.");
            setForm({ employee_number: "", name: "", email: "", phone: "", password: "" });
        } catch (err) {
            const status = err?.response?.status;
            const serverMessage =
                err?.response?.data?.errors?.root ||
                err?.response?.data?.message;

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
        <div className="flex min-h-screen items-center justify-center bg-background text-foreground p-6 relative">
            <Button
                type="button"
                variant="ghost"
                onClick={toggleTheme}
                className="absolute top-4 right-4 h-auto text-xs font-semibold text-muted-foreground hover:text-foreground border border-border px-3 py-1 rounded-full bg-background/80 backdrop-blur hover:bg-transparent"
                aria-label="Cambiar tema"
            >
                {isDark ? "Modo claro" : "Modo oscuro"}
            </Button>
            <Card className="w-[460px]">
                <CardHeader>
                    <CardTitle className="text-center">Registro de Usuario</CardTitle>
                </CardHeader>
                <CardContent>
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
                            />
                        </div>

                        <div className="space-y-2">
                            <Label>Nombre completo</Label>
                            <Input
                                value={form.name}
                                onChange={(e) => setForm({ ...form, name: e.target.value })}
                                disabled={loading}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label>Correo empresarial (@ecd.mx) (opcional)</Label>
                            <Input
                                type="email"
                                value={form.email}
                                onChange={(e) => setForm({ ...form, email: e.target.value })}
                                autoComplete="email"
                                disabled={loading}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label>Teléfono (opcional)</Label>
                            <Input
                                value={form.phone}
                                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                                maxLength={10}
                                disabled={loading}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label>Contraseña</Label>
                            <Input
                                type="password"
                                value={form.password}
                                onChange={(e) => setForm({ ...form, password: e.target.value })}
                                autoComplete="new-password"
                                disabled={loading}
                            />
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
                        <p className="text-center text-xs text-muted-foreground">
                            ¿Ya tienes cuenta?{" "}
                            <Link to="/login" className="text-primary hover:underline">
                                Inicia sesión
                            </Link>
                        </p>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}
