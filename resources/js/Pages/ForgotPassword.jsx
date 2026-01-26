import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import axios from "@/lib/axios";

export default function ForgotPassword() {
    const sitekey = import.meta.env.VITE_HCAPTCHA_SITEKEY;
    const widgetId = useRef(null);
    const [captchaToken, setCaptchaToken] = useState("");
    const [email, setEmail] = useState("");
    const [message, setMessage] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    // Carga hCaptcha si hay sitekey
    useEffect(() => {
        if (!sitekey) return;
        const scriptId = "hcaptcha-script";
        if (document.getElementById(scriptId)) return;
        const s = document.createElement("script");
        s.id = scriptId;
        s.src = "https://js.hcaptcha.com/1/api.js?render=explicit";
        s.async = true;
        document.body.appendChild(s);
    }, [sitekey]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError("");
        setMessage("");
        if (!email) {
            setError("El correo es obligatorio.");
            return;
        }
        if (sitekey && !captchaToken) {
            setError("Completa el captcha.");
            return;
        }
        setLoading(true);
        try {
            await axios.post("/api/password/forgot", { email, hcaptcha_token: captchaToken });
            setMessage("Si el correo existe, enviamos instrucciones para restablecer tu contraseña.");
        } catch (err) {
            const retry = err?.response?.headers?.["retry-after"];
            if (err?.response?.status === 429 && retry) {
                setError(`Demasiados intentos. Espera ${retry} segundos.`);
            } else {
                setError(err?.response?.data?.message || "No se pudo enviar la solicitud. Intenta más tarde.");
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex h-screen items-center justify-center bg-background text-foreground">
            <Card className="w-[420px]">
                <CardHeader>
                    <CardTitle className="text-center">Restablecer contraseña</CardTitle>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-2">
                            <Label>Correo</Label>
                            <Input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                autoComplete="email"
                                disabled={loading}
                            />
                        </div>
                        {sitekey && (
                            <div className="border border-border/60 rounded-md p-3">
                                <div
                                    className="h-captcha"
                                    ref={(el) => {
                                        if (!el || !window.hcaptcha || widgetId.current) return;
                                        widgetId.current = window.hcaptcha.render(el, {
                                            sitekey,
                                            callback: (token) => setCaptchaToken(token),
                                            "error-callback": () => setCaptchaToken(""),
                                            "expired-callback": () => setCaptchaToken(""),
                                        });
                                    }}
                                />
                            </div>
                        )}
                        {message && <p className="text-green-600 text-sm">{message}</p>}
                        {error && <p className="text-red-500 text-sm">{error}</p>}
                        <Button type="submit" className="w-full" disabled={loading}>
                            {loading ? "Enviando..." : "Enviar enlace"}
                        </Button>
                        <Button type="button" variant="ghost" className="w-full" onClick={() => navigate(-1)} disabled={loading}>
                            Volver
                        </Button>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}
