import { useCallback, useEffect, useState } from "react";
import { Head, Link } from "@inertiajs/react";
import axios from "@/lib/axios";
import { useAuth } from "@/context/AuthContext";
import { notify } from "@/lib/notify";
import { useI18n } from "@/hooks/useI18n";
import AuthenticatedLayout from "@/Inertia/Layouts/AuthenticatedLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, CheckCircle2, KeyRound, RefreshCw, ShieldCheck, UserCircle } from "lucide-react";

const COMMUNICATION_METHODS = [
    ["whatsapp_empresarial", "WhatsApp empresarial"],
    ["telefono_empresarial", "Teléfono empresarial"],
    ["personal", "Personal (si está permitido)"],
    ["personalmente", "Personalmente"],
];

export default function SettingsAdministration() {
    const { can } = useAuth();
    const { t } = useI18n();
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selected, setSelected] = useState(null);
    const [form, setForm] = useState({ user_id: "", password: "", password_confirmation: "", communication_method: "", comment: "" });
    const [saving, setSaving] = useState(false);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const { data } = await axios.get("/api/admin/notifications");
            setItems(data.notifications || []);
        } catch { notify.error("No se pudieron cargar las solicitudes administrativas."); } finally { setLoading(false); }
    }, []);

    useEffect(() => { if (can("notifications.manage")) load(); }, [can, load]);

    const selectRequest = (item) => {
        const payload = item.payload || {};
        setSelected(item);
        setForm({ user_id: String(payload.user_id || payload.userId || ""), password: "", password_confirmation: "", communication_method: "", comment: "" });
    };
    const resolve = async () => {
        if (!selected || !form.user_id || !form.password || !form.password_confirmation || !form.communication_method) {
            notify.error("Completa los datos requeridos antes de resolver la solicitud."); return;
        }
        if (form.password !== form.password_confirmation) { notify.error("La contraseña y su confirmación no coinciden."); return; }
        setSaving(true);
        try {
            await axios.post(`/api/admin/notifications/${selected.id}/resolve-password`, { ...form, user_id: Number(form.user_id) });
            setSelected(null); setForm({ user_id: "", password: "", password_confirmation: "", communication_method: "", comment: "" });
            notify.success("Contraseña restablecida y solicitud registrada."); load();
        } catch (error) { notify.error(error?.response?.data?.message || "No se pudo resolver la solicitud."); } finally { setSaving(false); }
    };
    const markRead = async (item) => {
        try { await axios.post(`/api/admin/notifications/${item.id}/read`); load(); } catch { notify.error("No se pudo actualizar la solicitud."); }
    };

    if (!can("notifications.manage")) return null;
    return <AuthenticatedLayout title={t("administration.title")}><Head title={t("administration.title")} />
        <div className="mx-auto w-full max-w-6xl space-y-6 pb-content-mobile">
            <header className="flex flex-col gap-3 border-b border-border/50 pb-6 sm:flex-row sm:items-end sm:justify-between"><div><div className="mb-2 flex items-center gap-2 text-primary"><ShieldCheck className="h-5 w-5" /><span className="text-sm font-medium">{t("administration.eyebrow")}</span></div><p className="text-lg font-semibold tracking-tight">{t("administration.heading")}</p><p className="mt-1 text-sm text-muted-foreground">{t("administration.description")}</p></div><Button asChild variant="outline" size="sm"><Link href="/settings"><ArrowLeft className="h-4 w-4" />{t("administration.back")}</Link></Button></header>
            <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
                <Card><CardHeader className="flex-row items-start justify-between gap-4"><div><CardTitle>{t("administration.queue")}</CardTitle><CardDescription>{t("administration.pending", { count: items.length })}</CardDescription></div><Button variant="outline" size="icon" onClick={load} disabled={loading} aria-label={t("administration.refresh")}><RefreshCw className={"h-4 w-4 " + (loading ? "animate-spin" : "")} /></Button></CardHeader><CardContent className="space-y-3">{loading ? <div className="space-y-3">{[1, 2, 3].map((item) => <div key={item} className="h-20 animate-pulse rounded-xl bg-muted" />)}</div> : items.length === 0 ? <div className="flex min-h-52 flex-col items-center justify-center text-center"><CheckCircle2 className="mb-3 h-10 w-10 text-emerald-600" /><p className="text-sm font-medium">{t("administration.allClear")}</p><p className="mt-1 text-xs text-muted-foreground">{t("administration.none")}</p></div> : items.map((item) => { const payload = item.payload || {}; const active = selected?.id === item.id; return <Button key={item.id} type="button" variant="outline" onClick={() => selectRequest(item)} className={(active ? "border-primary bg-primary/5" : "hover:border-primary/50 hover:bg-muted/40") + " h-auto w-full items-start gap-3 whitespace-normal rounded-xl p-4 text-left"}><span className="rounded-full bg-muted p-2 text-primary"><UserCircle className="h-5 w-5" /></span><span className="min-w-0 flex-1"><span className="flex flex-wrap items-center gap-2"><span className="text-sm font-medium">{payload.user_name || t("administration.unknownUser")}</span>{payload.user_employee_number && <Badge variant="secondary">{payload.user_employee_number}</Badge>}</span><span className="mt-1 block text-xs font-normal text-muted-foreground">{item.type === "password_reset_request" ? t("administration.passwordReset") : item.type === "account_deletion_request" ? t("administration.deletionRequest") : item.type}</span>{payload.user_email && <span className="mt-1 block truncate text-xs font-normal text-muted-foreground">{payload.user_email}</span>}</span>{!item.read_at && <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-primary" />}</Button>; })}</CardContent></Card>
                <Card className="h-fit lg:sticky lg:top-5"><CardHeader><CardTitle className="flex items-center gap-2"><KeyRound className="h-5 w-5 text-primary" />{t("administration.resolve")}</CardTitle><CardDescription>{selected ? t("administration.selectedRequest") : t("administration.selectRequest")}</CardDescription></CardHeader><CardContent className="space-y-4">{selected?.type === "account_deletion_request" ? <div className="space-y-3 rounded-xl border bg-muted/20 p-4"><p className="text-sm font-medium">Esta solicitud requiere revisión manual.</p><p className="text-xs text-muted-foreground">No se elimina información desde aquí para proteger tickets, auditoría y asignaciones.</p><Button variant="outline" onClick={() => markRead(selected)}>Marcar como revisada</Button></div> : <><div className="space-y-2"><Label htmlFor="reset-user-id">{t("administration.userId")}</Label><Input id="reset-user-id" value={form.user_id} onChange={(event) => setForm((current) => ({ ...current, user_id: event.target.value }))} placeholder="E.g. 450" /></div><div className="space-y-2"><Label htmlFor="reset-password">{t("administration.newPassword")}</Label><Input id="reset-password" type="password" value={form.password} onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))} /></div><div className="space-y-2"><Label htmlFor="reset-password-confirmation">{t("administration.confirmPassword")}</Label><Input id="reset-password-confirmation" type="password" value={form.password_confirmation} onChange={(event) => setForm((current) => ({ ...current, password_confirmation: event.target.value }))} /></div><div className="space-y-2"><Label>{t("administration.communicationMethod")}</Label><Select value={form.communication_method} onValueChange={(value) => setForm((current) => ({ ...current, communication_method: value }))}><SelectTrigger><SelectValue placeholder="Selecciona…" /></SelectTrigger><SelectContent>{COMMUNICATION_METHODS.map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}</SelectContent></Select></div><div className="space-y-2"><Label htmlFor="reset-comment">{t("administration.comment")}</Label><Textarea id="reset-comment" value={form.comment} onChange={(event) => setForm((current) => ({ ...current, comment: event.target.value }))} placeholder="Opcional: cómo se comunicó la contraseña." /></div><Button className="w-full" disabled={!selected || saving} onClick={resolve}>{saving && <RefreshCw className="h-4 w-4 animate-spin" />}{t("administration.resolveAction")}</Button></>}</CardContent></Card>
            </div>
        </div>
    </AuthenticatedLayout>;
}
