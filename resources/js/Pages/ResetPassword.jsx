import { useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import axios from "@/lib/axios";
import { strongPasswordSchema } from "@/lib/passwordSchema";

export default function ResetPassword() {
    const [params] = useSearchParams();
    const navigate = useNavigate();
    const token = params.get("token") || "";
    const email = params.get("email") || "";
    const [password, setPassword] = useState("");
    const [confirm, setConfirm] = useState("");
    const [message, setMessage] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError("");
        setMessage("");

        if (!password || !confirm) return setError("La contraseña y confirmación son obligatorias.");
        const pwdCheck = strongPasswordSchema.safeParse(password);
        if (!pwdCheck.success) return setError(pwdCheck.error.errors[0].message);
        if (password !== confirm) return setError("Las contraseñas no coinciden.");

        setLoading(true);
        try {
            await axios.post("/api/password/reset", {
                token,
                email,
                password,
                password_confirmation: confirm,
            });
            setMessage("Contraseña actualizada, puedes iniciar sesión.");
            setTimeout(() => navigate("/login"), 1200);
        } catch (err) {
            setError(err?.response?.data?.message || "No se pudo restablecer la contraseña.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex h-screen items-center justify-center bg-background text-foreground">
            <Card className="w-[420px]">
                <CardHeader>
                    <CardTitle className="text-center">Nueva contraseña</CardTitle>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-2">
                            <Label>Correo</Label>
                            <Input type="email" value={email} disabled />
                        </div>
                        <div className="space-y-2">
                            <Label>Contraseña nueva</Label>
                            <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} disabled={loading} />
                        </div>
                        <div className="space-y-2">
                            <Label>Confirmar contraseña</Label>
                            <Input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} disabled={loading} />
                        </div>
                        {message && <p className="text-green-600 text-sm">{message}</p>}
                        {error && <p className="text-red-500 text-sm">{error}</p>}
                        <Button type="submit" className="w-full" disabled={loading || !token || !email}>
                            {loading ? "Guardando..." : "Restablecer"}
                        </Button>
                        <Button type="button" variant="ghost" className="w-full" onClick={() => navigate("/login")} disabled={loading}>
                            Volver al inicio de sesión
                        </Button>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}
