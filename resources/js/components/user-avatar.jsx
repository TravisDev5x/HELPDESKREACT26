import { useState, useCallback } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

/** Colores del indicador de disponibilidad (compatible con futuro chat). */
const STATUS_DOT = {
    online: "bg-emerald-500 ring-2 ring-background",
    busy: "bg-amber-500 ring-2 ring-background",
    offline: "bg-muted-foreground/50 ring-2 ring-background",
};

/**
 * Avatar de usuario usando shadcn Avatar.
 * Si la imagen falla (corrupta, 404, CORS, etc.) se muestra el fallback con iniciales
 * y se deja de intentar cargar la imagen para evitar errores repetidos.
 *
 * @param {string} [name] - Nombre del usuario (para iniciales)
 * @param {string|null} [avatarPath] - Ruta relativa del avatar (ej: "avatars/xyz.jpg")
 * @param {string} [className] - Clases para el Avatar
 * @param {string} [fallbackClassName] - Clases para el fallback
 * @param {number} [size] - Tamaño en píxeles (por defecto 36)
 * @param {'online'|'busy'|'offline'} [status] - Estado para indicador (en línea / ocupado / desconectado)
 */
export function UserAvatar({
    name,
    avatarPath,
    className,
    fallbackClassName,
    size = 36,
    status,
}) {
    const [imgError, setImgError] = useState(false);
    const path = avatarPath && String(avatarPath).trim();
    const src = path ? `/storage/${path}` : null;
    const showImage = Boolean(src && !imgError);

    const handleError = useCallback(() => {
        setImgError(true);
    }, []);

    const initials = name && String(name).trim()
        ? String(name).trim().substring(0, 2).toUpperCase()
        : "?";

    const sizeClass = size === 24 ? "h-6 w-6" : size === 32 ? "h-8 w-8" : size === 36 ? "h-9 w-9" : size === 40 ? "h-10 w-10" : "h-9 w-9";
    const dotSize = size <= 24 ? "h-1.5 w-1.5" : size <= 32 ? "h-2 w-2" : "h-2.5 w-2.5";

    return (
        <div className="relative shrink-0 inline-flex">
            <Avatar className={cn(sizeClass, "border border-border/50", className)}>
                {showImage && (
                    <AvatarImage
                        src={src}
                        alt={name || "Usuario"}
                        className="object-cover"
                        onError={handleError}
                    />
                )}
                <AvatarFallback className={cn("bg-primary/10 text-primary font-semibold", size <= 24 ? "text-[10px]" : "text-xs", fallbackClassName)}>
                    {initials}
                </AvatarFallback>
            </Avatar>
            {status && STATUS_DOT[status] && (
                <span
                    className={cn(
                        "absolute bottom-0 right-0 rounded-full",
                        dotSize,
                        STATUS_DOT[status]
                    )}
                    title={status === "online" ? "En línea" : status === "busy" ? "Ocupado" : "Desconectado"}
                />
            )}
        </div>
    );
}
