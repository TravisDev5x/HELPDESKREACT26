import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import axios from "@/lib/axios";
import { useAuth } from "@/context/AuthContext";
import { strongPasswordSchema } from "@/lib/passwordSchema";

export default function ForceChangePassword() {
    const { updateUserPrefs, user } = useAuth();
    const navigate = useNavigate();
    const [current, setCurrent] = useState("");
    const [password, setPassword] = useState("");
    const [confirm, setConfirm] = useState("");
    const [error, setError] = useState("");
    const [message, setMessage] = useState("");
    const [loading, setLoading] = useState(false);

    const submit = async (e) => {
        e.preventDefault();
        setError("");
        setMessage("");
        if (!current || !password || !confirm) return setError("Todos los campos son obligatorios.");

        const pwdCheck = strongPasswordSchema.safeParse(password);
        if (!pwdCheck.success) {
            const first = pwdCheck.error?.issues?.[0] ?? pwdCheck.error?.errors?.[0];
            return setError(first?.message ?? "Revisa la contraseña.");
        }
        if (password !== confirm) return setError("Las contraseñas no coinciden.");
        setLoading(true);
        try {
            await axios.put("/api/profile/password", {
                current_password: current,
                password,
                password_confirmation: confirm,
            });
            updateUserPrefs({ force_password_change: false });
            setMessage("Contraseña actualizada. Redirigiendo...");
            setTimeout(() => navigate("/"), 1000);
        } catch (err) {
            setError(err?.response?.data?.message || "No se pudo actualizar la contraseña.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex h-screen items-center justify-center bg-background text-foreground">
            <Card className="w-[420px]">
                <CardHeader>
                    <CardTitle className="text-center">Actualiza tu contraseña</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-sm text-muted-foreground mb-4">
                        {user?.name ? `${user.name}, ` : ""}por seguridad debes cambiar la contraseña antes de continuar.
                    </p>
                    <form onSubmit={submit} className="space-y-4">
                        <div className="space-y-2">
                            <Label>Contraseña actual</Label>
                            <Input type="password" value={current} onChange={(e) => setCurrent(e.target.value)} disabled={loading} />
                        </div>
                        <div className="space-y-2">
                            <Label>Nueva contraseña</Label>
                            <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} disabled={loading} />
                        </div>
                        <div className="space-y-2">
                            <Label>Confirmar contraseña</Label>
                            <Input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} disabled={loading} />
                        </div>
                        {error && <p className="text-red-500 text-sm">{error}</p>}
                        {message && <p className="text-green-600 text-sm">{message}</p>}
                        <Button type="submit" className="w-full" disabled={loading}>
                            {loading ? "Guardando..." : "Guardar y continuar"}
                        </Button>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}
