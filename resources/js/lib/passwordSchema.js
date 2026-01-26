import * as z from "zod";

// Reusable strong-password policy used across forms
export const strongPasswordSchema = z
    .string()
    .min(12, "Mínimo 12 caracteres")
    .regex(/[a-z]/, "Falta minúscula")
    .regex(/[A-Z]/, "Falta mayúscula")
    .regex(/[0-9]/, "Falta número")
    .regex(/[^A-Za-z0-9]/, "Falta carácter especial");

export const passwordWithConfirmationSchema = z
    .object({
        password: strongPasswordSchema,
        password_confirmation: strongPasswordSchema,
    })
    .refine((data) => data.password === data.password_confirmation, {
        message: "Las contraseñas no coinciden",
        path: ["password_confirmation"],
    });
