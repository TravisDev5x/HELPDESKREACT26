import { useState, useRef, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useAuth } from "@/context/AuthContext";
import axios from "@/lib/axios";
import { toast } from "@/hooks/use-toast";
import { passwordWithConfirmationSchema } from "@/lib/passwordSchema";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Loader2, Camera, Save, KeyRound } from "lucide-react";

//validaciones Zod
const profileSchema = z.object({
    name: z.string().min(2, "Mínimo 2 caracteres"),
    email: z.string().email("Correo electrónico inválido"),
    phone: z.string().optional(),
});

const passwordSchema = passwordWithConfirmationSchema.extend({
    current_password: z.string().min(1, "Requerido"),
});

export default function Profile() {
    const { user, updateUserPrefs } = useAuth();

    const [profileLoading, setProfileLoading] = useState(false);
    const [passwordLoading, setPasswordLoading] = useState(false);
    const [preview, setPreview] = useState(null);
    const fileInputRef = useRef(null);

    /* =========================
       FORMULARIOS
    ========================= */

    const formProfile = useForm({
        resolver: zodResolver(profileSchema),
        defaultValues: {
            name: user?.name || "",
            email: user?.email || "",
            phone: user?.phone || "",
        },
    });

    const formPass = useForm({
        resolver: zodResolver(passwordSchema),
        defaultValues: {
            current_password: "",
            password: "",
            password_confirmation: "",
        },
    });

    /* =========================
       AVATAR PREVIEW
    ========================= */

    const handleFileChange = (e) => {
        const file = e.target.files[0];

        if (!file) return;

        if (file.size > 5 * 1024 * 1024) {
            toast({ description: "La imagen es demasiado pesada. Máximo 5MB.", variant: "destructive" });
            if (fileInputRef.current) fileInputRef.current.value = "";
            return;
        }

        setPreview(URL.createObjectURL(file));
    };

    // Sincroniza datos del usuario cuando cambien
    useEffect(() => {
        if (!user) return;
        formProfile.reset({
            name: user.name || "",
            email: user.email || "",
            phone: user.phone || "",
        });
    }, [user, formProfile]);

    // Limpieza de memoria del preview
    useEffect(() => {
        return () => {
            if (preview) URL.revokeObjectURL(preview);
        };
    }, [preview]);

    /* =========================
       GUARDAR PERFIL + AVATAR
    ========================= */

    const onProfileSubmit = async (values) => {
        setProfileLoading(true);

        try {
            const formData = new FormData();
            formData.append("name", values.name);
            formData.append("email", values.email);
            formData.append("phone", values.phone || "");

            if (fileInputRef.current?.files[0]) {
                formData.append("avatar", fileInputRef.current.files[0]);
            }

                                    // ✅ Axios ya envía cookies (Sanctum)
                                    // ✅ Axios maneja multipart automáticamente
            const res = await axios.post("/api/profile", formData, {
                headers: { "Content-Type": "multipart/form-data" },
            });

            if (res?.data?.user) {
                updateUserPrefs(res.data.user);
            }
            setPreview(null);
            if (fileInputRef.current) fileInputRef.current.value = "";
            toast({ description: "Perfil actualizado correctamente" });

        } catch (error) {
            console.error(error);
            const msg = error.response?.data?.message || "Error al actualizar perfil";
            toast({ description: msg, variant: "destructive" });
        } finally {
            setProfileLoading(false);
        }
    };

    /* =========================
       CAMBIAR CONTRASEÑA
    ========================= */

    const onPassSubmit = async (values) => {
        setPasswordLoading(true);

        try {
            await axios.put("/api/profile/password", values);
            toast({ description: "Contraseña actualizada con éxito" });
            formPass.reset();
        } catch (error) {
            console.error(error);
            const msg = error.response?.data?.message || "Error al cambiar contraseña";
            toast({ description: msg, variant: "destructive" });
        } finally {
            setPasswordLoading(false);
        }
    };

    /* =========================
       RENDER
    ========================= */

    return (
        <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in pb-10">
            <h1 className="text-3xl font-black uppercase tracking-tighter">
                Mi Perfil
            </h1>

            <div className="grid gap-8 md:grid-cols-2">
                {/* =========================
                   INFORMACIÓN PERSONAL
                ========================= */}
                <Card className="border-border/60 bg-card/10 backdrop-blur-sm shadow-sm">
                    <CardHeader>
                        <CardTitle className="uppercase font-bold text-sm">
                            INFORMACIÓN PERSONAL
                        </CardTitle>
                        <CardDescription>
                            Actualiza tu foto y datos de contacto.
                        </CardDescription>
                    </CardHeader>

                    <CardContent>
                        <Form {...formProfile}>
                            <form
                                onSubmit={formProfile.handleSubmit(onProfileSubmit)}
                                className="space-y-6"
                            >
                                {/* AVATAR */}
                                <div className="flex flex-col items-center gap-4 py-4">
                                    <div
                                        className="relative group cursor-pointer"
                                        onClick={() => fileInputRef.current?.click()}
                                    >
                                        <Avatar className="h-24 w-24 border-2 border-primary/20 group-hover:border-primary transition-colors">
                                            <AvatarImage
                                                src={
                                                    preview ||
                                                    (user?.avatar_path
                                                        ? `/storage/${user.avatar_path}`
                                                        : null)
                                                }
                                                className="object-cover"
                                            />
                                            <AvatarFallback className="text-2xl font-black bg-muted">
                                                {user?.name?.substring(0, 2).toUpperCase()}
                                            </AvatarFallback>
                                        </Avatar>

                                        <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                            <Camera className="text-white h-6 w-6" />
                                        </div>
                                    </div>

                                    <Input
                                        type="file"
                                        ref={fileInputRef}
                                        className="hidden"
                                        accept="image/*"
                                        onChange={handleFileChange}
                                    />

                                    <p className="text-[10px] uppercase font-bold text-muted-foreground">
                                        Click para cambiar foto
                                    </p>
                                </div>

                                {/* CAMPOS */}
                                <div className="space-y-3">
                                    <FormField
                                        control={formProfile.control}
                                        name="name"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="text-[10px] font-black uppercase">
                                                    Nombre Completo
                                                </FormLabel>
                                                <FormControl>
                                                    <Input {...field} className="bg-muted/20" />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />

                                    <FormField
                                        control={formProfile.control}
                                        name="email"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="text-[10px] font-black uppercase">
                                                    Correo Electrónico
                                                </FormLabel>
                                                <FormControl>
                                                    <Input {...field} className="bg-muted/20" />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />

                                    <FormField
                                        control={formProfile.control}
                                        name="phone"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="text-[10px] font-black uppercase">
                                                    Teléfono (Opcional)
                                                </FormLabel>
                                                <FormControl>
                                                    <Input {...field} className="bg-muted/20" />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </div>

                                <Button
                                    type="submit"
                                    disabled={profileLoading}
                                    className="w-full font-black uppercase tracking-widest text-xs"
                                >
                                    {profileLoading && (
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    )}
                                    <Save className="mr-2 h-4 w-4" />
                                    Guardar Cambios
                                </Button>
                            </form>
                        </Form>
                    </CardContent>
                </Card>

                {/* =========================
                   SEGURIDAD
                ========================= */}
                <Card className="border-border/60 bg-card/10 backdrop-blur-sm shadow-sm h-fit">
                    <CardHeader>
                        <CardTitle className="uppercase font-bold text-sm text-destructive flex items-center gap-2">
                            <KeyRound className="h-4 w-4" /> Seguridad
                        </CardTitle>
                        <CardDescription>
                            CAMBIAR CONTRASEÑA
                        </CardDescription>
                    </CardHeader>

                    <CardContent>
                        <Form {...formPass}>
                            <form
                                onSubmit={formPass.handleSubmit(onPassSubmit)}
                                className="space-y-4"
                            >
                                <FormField
                                    control={formPass.control}
                                    name="current_password"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="text-[10px] font-black uppercase">
                                                Contraseña Actual
                                            </FormLabel>
                                            <FormControl>
                                                <Input
                                                    type="password"
                                                    {...field}
                                                    className="bg-muted/20"
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <Separator className="my-2 bg-border/40" />

                                <FormField
                                    control={formPass.control}
                                    name="password"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="text-[10px] font-black uppercase">
                                                Nueva Contraseña
                                            </FormLabel>
                                            <FormControl>
                                                <Input
                                                    type="password"
                                                    {...field}
                                                    className="bg-muted/20"
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={formPass.control}
                                    name="password_confirmation"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="text-[10px] font-black uppercase">
                                                Confirmar Nueva Contraseña
                                            </FormLabel>
                                            <FormControl>
                                                <Input
                                                    type="password"
                                                    {...field}
                                                    className="bg-muted/20"
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <Button
                                    type="submit"
                                    disabled={passwordLoading}
                                    variant="secondary"
                                    className="w-full font-black uppercase tracking-widest text-xs mt-4"
                                >
                                    {passwordLoading && (
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    )}
                                    Actualizar Contraseña
                                </Button>
                            </form>
                        </Form>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}




