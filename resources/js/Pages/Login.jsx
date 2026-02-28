import { useState, useEffect } from "react";
import axios from "@/lib/axios";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/hooks/useTheme";
import { useI18n } from "@/hooks/useI18n";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Link } from "react-router-dom";
import { notify } from "@/lib/notify";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export default function Login() {
    const { login } = useAuth();
    const { isDark, toggleTheme } = useTheme();
    const { t } = useI18n();
    useEffect(() => {
        axios.get("/sanctum/csrf-cookie", { withCredentials: true }).catch(() => {});
    }, []);
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

        if (!identifier) return t("login.validation.identifierRequired");
        if (!password) return t("login.validation.passwordRequired");

        return "";
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError("");
        const validationError = validate();
        if (validationError) {
            setError(validationError);
            notify.error({ title: t("login.error.title"), description: validationError });
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

            let message = t("login.error.badCredentials");
            if (status === 429) {
                message = retryAfter
                    ? t("login.error.tooManyRetry", { seconds: String(retryAfter) })
                    : t("login.error.tooManyRetryFallback");
            } else if ((status === 422 || status === 403) && typeof serverMessage === "string") {
                message = serverMessage;
            } else if (status >= 500) {
                message = t("login.error.server");
            }
            setError(message);
            notify.error({ title: t("login.error.title"), description: message });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex h-screen flex-col items-center justify-center text-foreground relative px-4 py-6 bg-background">
            <div
                className={cn(
                    "absolute inset-0 z-0 pointer-events-none overflow-hidden",
                    "bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,hsl(var(--muted)_/_0.15),transparent),radial-gradient(ellipse_60%_40%_at_100%_100%,hsl(var(--muted)_/_0.08),transparent)]",
                    "before:content-[''] before:absolute before:inset-0 before:opacity-70 before:bg-[length:24px_24px] before:bg-[radial-gradient(circle_at_1px_1px,hsl(var(--foreground)_/_0.07)_1px,transparent_0)]"
                )}
                aria-hidden
            />
            <Button
                type="button"
                variant="ghost"
                onClick={toggleTheme}
                className="absolute top-4 right-4 z-10 h-auto text-xs font-semibold text-muted-foreground hover:text-foreground border border-border px-3 py-1 rounded-full bg-background/80 backdrop-blur hover:bg-transparent"
                aria-label={t("login.toggleTheme")}
            >
                {isDark ? t("login.themeLight") : t("login.themeDark")}
            </Button>
            <Card className="relative z-10 w-full max-w-[400px] shadow-xl border-border/80 bg-card/95 backdrop-blur-sm">
                <CardHeader className="text-center space-y-1">
                    <CardTitle className="text-xl">{t("brand.title")}</CardTitle>
                    <p className="text-sm text-muted-foreground font-medium">{t("brand.subtitle")}</p>
                    <p className="text-xs text-muted-foreground pt-1">{t("login.lead")}</p>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="login-identifier">{t("login.identifier")}</Label>
                            <Input
                                id="login-identifier"
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
                            <Label htmlFor="login-password">{t("login.password")}</Label>
                            <div className="relative">
                                <Input
                                    id="login-password"
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
                                    aria-label={showPassword ? t("login.hidePassword") : t("login.showPassword")}
                                >
                                    {showPassword ? t("login.hidePassword") : t("login.showPassword")}
                                </Button>
                            </div>
                            <p className="text-right">
                                <Link
                                    to="/forgot-password"
                                    className="text-xs text-primary hover:underline font-medium"
                                >
                                    {t("login.forgotPassword")}
                                </Link>
                            </p>
                        </div>

                        <div className="flex items-center gap-2">
                            <Checkbox
                                id="remember"
                                checked={remember}
                                onCheckedChange={(v) => setRemember(Boolean(v))}
                                disabled={loading}
                            />
                            <Label htmlFor="remember" className="text-sm text-muted-foreground">
                                {t("login.remember")}
                            </Label>
                        </div>

                        {error && (
                            <p className="text-red-500 text-sm" role="alert" aria-live="polite">
                                {error}
                            </p>
                        )}

                        <Button type="submit" className="w-full gap-2" disabled={loading}>
                            {loading && (
                                <Loader2 className="h-4 w-4 shrink-0 animate-spin" aria-hidden />
                            )}
                            <span>{loading ? t("login.submitting") : t("login.submit")}</span>
                        </Button>

                        <p className="text-center text-xs text-muted-foreground">
                            {t("login.noAccount")}{" "}
                            <Link to="/register" className="text-primary hover:underline">
                                {t("login.register")}
                            </Link>
                        </p>
                    </form>
                </CardContent>
            </Card>
            <div className="relative z-10 mt-6 text-center text-xs text-muted-foreground space-y-1">
                <p>{t("login.help")}</p>
                <Button
                    type="button"
                    variant="link"
                    className="h-auto p-0 text-primary hover:underline font-semibold"
                    asChild
                >
                    <Link to="/manual" target="_blank" rel="noopener noreferrer">
                        {t("login.manual")}
                    </Link>
                </Button>
            </div>
        </div>
    );
}


