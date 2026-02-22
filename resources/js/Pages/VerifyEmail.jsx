import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import axios from "@/lib/axios";
import { useTheme } from "@/hooks/useTheme";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";

const STATUS = {
    idle: "idle",
    loading: "loading",
    success: "success",
    error: "error",
};

export default function VerifyEmail() {
    const [searchParams] = useSearchParams();
    const token = (searchParams.get("token") || "").trim();
    const { isDark, toggleTheme } = useTheme();
    const [status, setStatus] = useState(STATUS.loading);
    const [message, setMessage] = useState("Validando tu correo...");

    useEffect(() => {
        let active = true;
        if (!token) {
            setStatus(STATUS.error);
            setMessage("El enlace de verificación no es válido.");
            return () => {};
        }

        setStatus(STATUS.loading);
        setMessage("Validando tu correo...");

        axios
            .get("/api/register/verify", { params: { token } })
            .then((res) => {
                if (!active) return;
                setStatus(STATUS.success);
                setMessage(
                    res?.data?.message || "Correo verificado. Ya puedes iniciar sesión."
                );
            })
            .catch((err) => {
                if (!active) return;
                const serverMessage = err?.response?.data?.message;
                setStatus(STATUS.error);
                setMessage(serverMessage || "No se pudo verificar el correo.");
            });

        return () => {
            active = false;
        };
    }, [token]);

    const isSuccess = status === STATUS.success;
    const isError = status === STATUS.error;
    const badgeVariant = isSuccess ? "secondary" : isError ? "destructive" : "outline";
    const title = isSuccess
        ? "Correo verificado"
        : isError
        ? "No se pudo verificar"
        : "Verificando correo";

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
            <Card className="w-[440px]">
                <CardHeader className="space-y-3">
                    <Badge variant={badgeVariant} className="w-fit">
                        {isSuccess
                            ? "Verificación completa"
                            : isError
                            ? "Verificación fallida"
                            : "Verificando"}
                    </Badge>
                    <CardTitle className="text-center">{title}</CardTitle>
                    <CardDescription className="text-center">{message}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3 text-sm text-muted-foreground">
                    <p>
                        Si ya verificaste tu correo, puedes iniciar sesión con tus
                        credenciales.
                    </p>
                    {isError && (
                        <p>
                            El enlace puede haber expirado. Puedes intentar registrarte
                            de nuevo o solicitar ayuda al administrador.
                        </p>
                    )}
                </CardContent>
                <CardFooter className="flex flex-col gap-2">
                    <Button asChild className="w-full">
                        <Link to="/login">Ir a iniciar sesión</Link>
                    </Button>
                    <Button asChild variant="outline" className="w-full">
                        <Link to="/register">Crear cuenta</Link>
                    </Button>
                </CardFooter>
            </Card>
        </div>
    );
}
