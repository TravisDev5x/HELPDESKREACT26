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
import { Loader2, Eye, EyeOff } from "lucide-react";
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
        <div className="flex min-h-[100dvh] flex-col items-center justify-center text-foreground relative px-4 py-6 pb-[max(2rem,calc(2rem+env(safe-area-inset-bottom)))] overflow-y-auto md:min-h-screen md:h-screen md:overflow-hidden md:pb-6">
            {/* Fondo: imagen a pantalla completa */}
            <div
                className="absolute inset-0 z-0 bg-cover bg-center bg-no-repeat"
                style={{ backgroundImage: "url(/images/auth-hero.png)" }}
                aria-hidden
            />
            {/* Capa mica: blur suave + tinte */}
            <div
                className={cn(
                    "absolute inset-0 z-[1] pointer-events-none",
                    "backdrop-blur-[6px] sm:backdrop-blur-[8px]",
                    "bg-background/40 dark:bg-background/50"
                )}
                aria-hidden
            />
            <Button
                type="button"
                variant="ghost"
                onClick={toggleTheme}
                className="absolute top-4 right-4 z-10 h-auto min-h-[44px] min-w-[44px] flex items-center justify-center text-xs font-semibold text-muted-foreground hover:text-foreground border border-border px-3 py-2 rounded-full bg-background/70 dark:bg-background/60 backdrop-blur-md hover:bg-background/80 md:py-1"
                aria-label={t("login.toggleTheme")}
            >
                {isDark ? t("login.themeLight") : t("login.themeDark")}
            </Button>
            <Card className="relative z-10 w-full max-w-[400px] shadow-2xl border-border/80 bg-card/90 dark:bg-card/85 backdrop-blur-md flex-shrink-0 my-auto md:my-0">
                <CardHeader className="text-center space-y-1">
                    <CardTitle className="text-xl text-foreground">{t("brand.title")}</CardTitle>
                    <p className="text-sm text-foreground/80 font-medium">{t("brand.subtitle")}</p>
                    <p className="text-xs text-foreground/75 pt-1">{t("login.lead")}</p>
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
                                className="focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:border-transparent"
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
                                    className="pr-12 focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:border-transparent"
                                    aria-invalid={Boolean(error)}
                                />
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => setShowPassword((v) => !v)}
                                    className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 shrink-0 text-muted-foreground hover:text-foreground hover:bg-transparent"
                                    disabled={loading}
                                    aria-label={showPassword ? t("login.hidePassword") : t("login.showPassword")}
                                >
                                    {showPassword ? (
                                        <EyeOff className="h-4 w-4" aria-hidden />
                                    ) : (
                                        <Eye className="h-4 w-4" aria-hidden />
                                    )}
                                </Button>
                            </div>
                            <p className="text-right">
                                <Link
                                    to="/forgot-password"
                                    className="inline-flex items-center justify-end min-h-[44px] py-3 text-xs text-primary hover:underline font-medium md:min-h-0 md:py-0"
                                >
                                    {t("login.forgotPassword")}
                                </Link>
                            </p>
                        </div>

                        <label className="flex cursor-pointer items-center gap-2 w-fit" htmlFor="remember">
                            <Checkbox
                                id="remember"
                                checked={remember}
                                onCheckedChange={(v) => setRemember(Boolean(v))}
                                disabled={loading}
                            />
                            <span className="text-sm text-muted-foreground select-none">{t("login.remember")}</span>
                        </label>

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

                        <p className="text-center text-xs text-foreground/80 flex flex-wrap items-center justify-center gap-x-1 gap-y-1">
                            <span>{t("login.noAccount")}</span>
                            <Link to="/register" className="inline-flex items-center min-h-[44px] py-3 text-primary hover:underline font-medium md:min-h-0 md:py-0">
                                {t("login.register")}
                            </Link>
                        </p>
                    </form>
                </CardContent>
            </Card>
            <div className="relative z-10 mt-6 text-center text-xs space-y-1 px-4 py-3 pb-[max(1rem,env(safe-area-inset-bottom))] rounded-xl bg-background/85 dark:bg-background/90 backdrop-blur-sm border border-border/50 shadow-lg">
                <p className="text-foreground font-medium">{t("login.help")}</p>
                <Link
                    to="/manual"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center min-h-[44px] py-3 text-primary hover:underline font-semibold md:min-h-0 md:py-0"
                >
                    {t("login.manual")}
                </Link>
            </div>
        </div>
    );
}


