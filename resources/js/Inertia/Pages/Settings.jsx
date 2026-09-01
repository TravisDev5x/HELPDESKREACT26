import { useEffect, useMemo, useRef, useState } from "react";
import { Head, Link, router } from "@inertiajs/react";
import axios from "@/lib/axios";
import { useTheme, DEFAULT_PREFS } from "@/hooks/useTheme";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useAuth } from "@/context/AuthContext";
import { useSidebarPosition } from "@/context/SidebarPositionContext";
import { notify } from "@/lib/notify";
import { useI18n } from "@/hooks/useI18n";
import AuthenticatedLayout from "@/Inertia/Layouts/AuthenticatedLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { BellRing, Check, Languages, LayoutDashboard, Palette, RefreshCw, Save, Settings2, ShieldCheck } from "lucide-react";
import { LOCALE_OPTIONS, normalizeLocale } from "@/i18n/locales";

function SidebarPreview({ state, position, hoverPreview, t }) {
    const compact = state === "collapsed";
    const right = position === "right";
    return (
        <div className="rounded-xl border bg-muted/30 p-3" aria-label={t("settings.preview")}>
            <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground"><span>{t("settings.preview")}</span><span>{right ? t("settings.right") : t("settings.left")} · {compact ? t("settings.collapsed") : t("settings.expanded")}</span></div>
            <div className={(right ? "flex-row-reverse " : "") + "flex h-28 overflow-hidden rounded-lg border bg-background"}>
                <div className={(compact ? "w-10 " : "w-24 ") + (right ? "border-l " : "border-r ") + "shrink-0 bg-muted/70 p-2 transition-all"}>
                    <div className="mb-3 h-3 rounded bg-primary/70" />
                    {[1, 2, 3].map((item) => <div key={item} className="mb-2 flex items-center gap-1.5"><span className="h-2 w-2 rounded-sm bg-muted-foreground/50" />{!compact && <span className="h-2 flex-1 rounded bg-muted-foreground/25" />}</div>)}
                </div>
            <div className="flex-1 p-3"><div className="mb-2 h-2 w-1/2 rounded bg-muted-foreground/20" /><div className="h-10 rounded bg-muted" />{compact && hoverPreview && <p className="mt-2 text-[10px] text-primary">{t("settings.hoverPreview")}</p>}</div>
            </div>
        </div>
    );
}

function WorkspacePreview({ theme, color, density, t }) {
    const isDark = theme === "dark";
    const compact = density === "compact";
    return (
        <div className="sticky top-5 rounded-xl border bg-muted/30 p-3" aria-label={t("settings.preview")}>
            <div className="mb-3 flex items-center justify-between text-xs text-muted-foreground">
                <span>{t("settings.preview")}</span>
                <span>{t(`density.${compact ? "compact" : "normal"}`)}</span>
            </div>
            <div className={(isDark ? "bg-slate-950 text-slate-100" : "bg-background") + " overflow-hidden rounded-lg border shadow-sm"}>
                <div className="flex items-center gap-2 border-b px-3 py-2">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: `hsl(var(--theme-color-swatch-${color}))` }} />
                    <span className="h-2 w-20 rounded bg-muted" />
                </div>
                <div className={compact ? "space-y-2 p-3" : "space-y-3 p-4"}>
                    <div className="h-2 w-2/5 rounded bg-foreground/20" />
                    <div className="grid grid-cols-2 gap-2">
                        {[1, 2].map((item) => <div key={item} className={compact ? "h-10 rounded bg-muted" : "h-14 rounded bg-muted"} />)}
                    </div>
                    <div className="h-2 w-3/4 rounded bg-muted-foreground/25" />
                </div>
            </div>
            <p className="mt-3 text-xs leading-relaxed text-muted-foreground">{t("settings.appearanceDescription")}</p>
        </div>
    );
}

function SaveBar({ dirty, saving, onSave, onReset, t }) {
    if (!dirty) return null;
    return <div className="mt-5 flex flex-col gap-3 rounded-xl border bg-muted/20 p-3 sm:flex-row sm:items-center sm:justify-between"><p className="text-sm text-muted-foreground">{t("settings.unsaved")}</p><div className="flex gap-2"><Button variant="ghost" size="sm" onClick={onReset} disabled={saving}>{t("settings.discard")}</Button><Button size="sm" onClick={onSave} disabled={saving}>{saving ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}{t("settings.save")}</Button></div></div>;
}

export default function Settings() {
    const { theme, setTheme, density, setDensity, locale, setLocale, themeColor, setThemeColor, themeColors } = useTheme();
    const { user, updateUserPrefs, can } = useAuth();
    const { position: sidebarPosition, setPosition: setSidebarPosition } = useSidebarPosition();
    const { t } = useI18n();
    const canManagePasswordResets = can("notifications.manage");

    const preferencesFromUser = () => ({
        theme: user?.theme ?? theme ?? DEFAULT_PREFS.theme,
        theme_color: user?.theme_color ?? themeColor ?? "zinc",
        ui_density: user?.ui_density ?? density ?? DEFAULT_PREFS.ui_density,
        locale: normalizeLocale(user?.locale ?? locale ?? DEFAULT_PREFS.locale),
        sidebar_state: user?.sidebar_state ?? DEFAULT_PREFS.sidebar_state,
        sidebar_hover_preview: user?.sidebar_hover_preview ?? DEFAULT_PREFS.sidebar_hover_preview,
        sidebar_position: user?.sidebar_position ?? "left",
    });

    const [saved, setSaved] = useState(preferencesFromUser);
    const [draft, setDraft] = useState(preferencesFromUser);
    const [savingSection, setSavingSection] = useState(null);
    const [activeTab, setActiveTab] = useState("appearance");
    const [pendingChange, setPendingChange] = useState(null);
    const navigationBypassRef = useRef(false);

    useEffect(() => {
        const next = preferencesFromUser();
        setSaved(next);
        setDraft(next);
    // Rehidrata únicamente al recibir preferencias persistidas.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user?.id, user?.theme, user?.theme_color, user?.ui_density, user?.locale, user?.sidebar_state, user?.sidebar_hover_preview, user?.sidebar_position]);

    const dirty = useMemo(() => ({
        appearance: draft.theme !== saved.theme || draft.theme_color !== saved.theme_color || draft.ui_density !== saved.ui_density,
        navigation: draft.sidebar_state !== saved.sidebar_state || draft.sidebar_hover_preview !== saved.sidebar_hover_preview || draft.sidebar_position !== saved.sidebar_position,
        language: draft.locale !== saved.locale,
    }), [draft, saved]);

    const previewAppearance = (changes) => {
        setDraft((current) => ({ ...current, ...changes }));
        if (changes.theme) setTheme(changes.theme, { persist: false });
        if (changes.theme_color) setThemeColor(changes.theme_color, { persist: false });
        if (changes.ui_density) setDensity(changes.ui_density, { persist: false });
    };
    const previewNavigation = (changes) => {
        setDraft((current) => ({ ...current, ...changes }));
        if (changes.sidebar_position) setSidebarPosition(changes.sidebar_position);
    };
    const resetSection = (section) => {
        if (section === "appearance") {
            setDraft((current) => ({ ...current, theme: saved.theme, theme_color: saved.theme_color, ui_density: saved.ui_density }));
            setTheme(saved.theme, { persist: false }); setThemeColor(saved.theme_color, { persist: false }); setDensity(saved.ui_density, { persist: false });
        }
        if (section === "navigation") {
            setDraft((current) => ({ ...current, sidebar_state: saved.sidebar_state, sidebar_hover_preview: saved.sidebar_hover_preview, sidebar_position: saved.sidebar_position }));
            setSidebarPosition(saved.sidebar_position);
        }
        if (section === "language") setDraft((current) => ({ ...current, locale: saved.locale }));
    };
    const hasUnsavedChanges = Object.values(dirty).some(Boolean);
    const requestTabChange = (nextTab) => {
        if (nextTab === activeTab) return;
        if (dirty[activeTab]) {
            setPendingChange({ type: "tab", target: nextTab });
            return;
        }
        setActiveTab(nextTab);
    };
    const requestPageChange = (event, href) => {
        if (!dirty[activeTab]) return;
        event.preventDefault();
        setPendingChange({ type: "page", target: href });
    };
    const discardAndContinue = () => {
        if (!pendingChange) return;
        const next = pendingChange;
        resetSection(activeTab);
        setPendingChange(null);
        if (next.type === "tab") setActiveTab(next.target);
        if (next.type === "page") {
            navigationBypassRef.current = true;
            router.visit(next.target, { onFinish: () => { navigationBypassRef.current = false; } });
        }
    };
    useEffect(() => {
        const warnBeforeUnload = (event) => {
            if (!hasUnsavedChanges) return;
            event.preventDefault();
            event.returnValue = "";
        };
        window.addEventListener("beforeunload", warnBeforeUnload);
        return () => window.removeEventListener("beforeunload", warnBeforeUnload);
    }, [hasUnsavedChanges]);
    useEffect(() => router.on("before", (event) => {
        if (!hasUnsavedChanges || navigationBypassRef.current) return;
        const target = String(event.detail.visit.url);
        const current = `${window.location.pathname}${window.location.search}`;
        if (target === current) return;
        event.preventDefault();
        setPendingChange({ type: "page", target });
    }), [hasUnsavedChanges]);
    const saveSection = async (section) => {
        const keys = { appearance: ["theme", "theme_color", "ui_density"], navigation: ["sidebar_state", "sidebar_hover_preview", "sidebar_position"], language: ["locale"] }[section];
        if (!keys?.length || !dirty[section]) return;
        const payload = Object.fromEntries(keys.map((key) => [key, draft[key]]));
        if (section === "navigation" && payload.sidebar_state !== "collapsed") payload.sidebar_hover_preview = false;
        setSavingSection(section);
        try {
            await axios.put("/api/profile/preferences", payload);
            const persisted = { ...draft, ...payload };
            setSaved(persisted); setDraft(persisted); updateUserPrefs(payload);
            if (section === "appearance") { setTheme(payload.theme, { persist: false }); setThemeColor(payload.theme_color, { persist: false }); setDensity(payload.ui_density, { persist: false }); }
            if (section === "language") setLocale(payload.locale, { persist: false });
            if (section === "navigation") localStorage.setItem("sidebar-collapsed", payload.sidebar_state === "collapsed" ? "1" : "0");
            notify.success("Preferencias guardadas");
        } catch { notify.error(t("settings.toast.failed")); } finally { setSavingSection(null); }
    };

    if (!user) return null;

    return (
        <AuthenticatedLayout title={t("settings.title")}>
            <Head title={t("settings.title")} />
            <div className="mx-auto w-full max-w-6xl space-y-6 pb-content-mobile">
                <header className="flex flex-col gap-3 border-b border-border/50 pb-6 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                        <div className="flex items-center gap-2 text-primary"><Settings2 className="h-5 w-5" /><span className="text-base font-semibold">{t("settings.personal")}</span></div>
                        <p className="mt-1 text-sm text-muted-foreground">{t("settings.description")}</p>
                    </div>
                </header>

                <Tabs value={activeTab} onValueChange={requestTabChange} className="gap-7 md:grid md:grid-cols-[210px_minmax(0,1fr)]">
                    <div className="md:sticky md:top-5 md:self-start">
                        <TabsList className="h-auto w-full justify-start overflow-x-auto rounded-xl bg-muted/60 p-1 md:flex md:flex-col md:items-stretch md:justify-start md:gap-1 md:bg-transparent md:p-0">
                            <TabsTrigger value="appearance" className="justify-start gap-2 px-3 py-2.5 text-left md:data-[state=active]:bg-muted"><Palette className="h-4 w-4" />{t("settings.appearance")}</TabsTrigger>
                            <TabsTrigger value="navigation" className="justify-start gap-2 px-3 py-2.5 text-left md:data-[state=active]:bg-muted"><LayoutDashboard className="h-4 w-4" />{t("settings.navigation")}</TabsTrigger>
                            <TabsTrigger value="language" className="justify-start gap-2 px-3 py-2.5 text-left md:data-[state=active]:bg-muted"><Languages className="h-4 w-4" />{t("settings.locale.title")}</TabsTrigger>
                        </TabsList>
                        <div className="mt-3 grid gap-1 border-t pt-3">
                            <Button asChild variant="ghost" className="justify-start gap-2"><Link href="/notifications" onClick={(event) => requestPageChange(event, "/notifications")}><BellRing className="h-4 w-4" />{t("settings.notificationsCenter")}</Link></Button>
                            {canManagePasswordResets && <Button asChild variant="ghost" className="justify-start gap-2"><Link href="/settings/administration" onClick={(event) => requestPageChange(event, "/settings/administration")}><ShieldCheck className="h-4 w-4" />{t("settings.administration")}</Link></Button>}
                        </div>
                    </div>

                    <TabsContent value="appearance" className="mt-0">
                        <Card>
                            <CardHeader><CardTitle>{t("settings.appearanceTitle")}</CardTitle><CardDescription>{t("settings.appearanceDescription")}</CardDescription></CardHeader>
                            <CardContent className="space-y-5">
                                <div className="grid gap-7 lg:grid-cols-[minmax(0,1fr)_250px]">
                                    <div className="grid content-start gap-6 sm:grid-cols-2">
                                        <div className="space-y-3 sm:col-span-2"><p className="text-sm font-medium">{t("settings.theme")}</p><ThemeToggle variant="select" value={draft.theme} onValueChange={(value) => previewAppearance({ theme: value })} /></div>
                                        <div className="space-y-3"><p className="text-sm font-medium">{t("settings.colorPalette")}</p><div className="flex flex-wrap gap-2">{themeColors.map((color) => <Button key={color} type="button" variant="outline" size="icon" onClick={() => previewAppearance({ theme_color: color })} aria-label={t(`settings.themeColor.${color}`)} aria-pressed={draft.theme_color === color} className={(draft.theme_color === color ? "scale-110 border-foreground shadow-sm" : "border-transparent hover:scale-105") + " h-9 w-9 rounded-full border-2 transition-all"} style={{ backgroundColor: `hsl(var(--theme-color-swatch-${color}))` }}>{draft.theme_color === color && <Check className="h-4 w-4 text-white drop-shadow" />}</Button>)}</div><p className="text-xs text-muted-foreground">{t("settings.colorSelected", { color: t(`settings.themeColor.${draft.theme_color}`) })}</p></div>
                                        <div className="space-y-3"><p className="text-sm font-medium">{t("settings.density")}</p><div className="grid grid-cols-2 gap-2 rounded-lg bg-muted/60 p-1">{["normal", "compact"].map((value) => <Button key={value} type="button" variant="ghost" size="sm" onClick={() => previewAppearance({ ui_density: value })} className={draft.ui_density === value ? "bg-background shadow-sm text-primary" : "text-muted-foreground"}>{t(`density.${value}`)}</Button>)}</div></div>
                                    </div>
                                    <WorkspacePreview theme={draft.theme} color={draft.theme_color} density={draft.ui_density} t={t} />
                                </div>
                                <SaveBar dirty={dirty.appearance} saving={savingSection === "appearance"} onSave={() => saveSection("appearance")} onReset={() => resetSection("appearance")} t={t} />
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="navigation" className="mt-0">
                        <Card>
                            <CardHeader><CardTitle>{t("settings.navigationTitle")}</CardTitle><CardDescription>{t("settings.navigationDescription")}</CardDescription></CardHeader>
                            <CardContent className="space-y-5">
                                <div className="grid gap-7 lg:grid-cols-[minmax(0,1fr)_260px]">
                                    <div className="grid content-start gap-5 sm:grid-cols-2">
                                        <div className="space-y-2"><p className="text-sm font-medium">{t("settings.initialState")}</p><div className="grid grid-cols-2 gap-2">{[["expanded", t("settings.expanded")], ["collapsed", t("settings.collapsed")]].map(([value, label]) => <Button key={value} type="button" variant={draft.sidebar_state === value ? "default" : "outline"} onClick={() => previewNavigation({ sidebar_state: value })}>{label}</Button>)}</div></div>
                                        <div className="space-y-2"><p className="text-sm font-medium">{t("settings.position")}</p><div className="grid grid-cols-2 gap-2">{[["left", t("settings.left")], ["right", t("settings.right")]].map(([value, label]) => <Button key={value} type="button" variant={draft.sidebar_position === value ? "default" : "outline"} onClick={() => previewNavigation({ sidebar_position: value })}>{label}</Button>)}</div></div>
                                        <div className="flex items-center justify-between gap-4 rounded-xl border bg-muted/20 p-4 sm:col-span-2"><div><p className="text-sm font-medium">{t("settings.hoverPreview")}</p><p className="mt-1 text-xs text-muted-foreground">{t("settings.hoverDescription")}</p></div><Switch checked={draft.sidebar_hover_preview} onCheckedChange={(value) => previewNavigation({ sidebar_hover_preview: value })} disabled={draft.sidebar_state !== "collapsed"} /></div>
                                    </div>
                                    <div className="lg:sticky lg:top-5 lg:self-start"><SidebarPreview state={draft.sidebar_state} position={draft.sidebar_position} hoverPreview={draft.sidebar_hover_preview} t={t} /></div>
                                </div>
                                <SaveBar dirty={dirty.navigation} saving={savingSection === "navigation"} onSave={() => saveSection("navigation")} onReset={() => resetSection("navigation")} t={t} />
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="language" className="mt-0">
                        <Card>
                            <CardHeader><CardTitle>{t("settings.languageTitle")}</CardTitle><CardDescription>{t("settings.languageDescription")}</CardDescription></CardHeader>
                            <CardContent className="space-y-5">
                                <div className="grid gap-5 md:grid-cols-2 md:items-start">
                                    <div className="space-y-3"><p className="text-sm font-medium">{t("settings.preferredLanguage")}</p><Select value={draft.locale} onValueChange={(value) => setDraft((current) => ({ ...current, locale: value }))}><SelectTrigger className="h-12"><SelectValue /></SelectTrigger><SelectContent>{LOCALE_OPTIONS.map((option) => <SelectItem key={option.value} value={option.value}><span className="mr-2 text-lg">{option.flag}</span>{option.label}</SelectItem>)}</SelectContent></Select></div>
                                    <div className="rounded-xl border bg-muted/20 p-4"><p className="text-sm font-medium">{t("settings.languageApplication")}</p><p className="mt-1 text-sm leading-relaxed text-muted-foreground">{t("settings.languageApplicationDescription")}</p></div>
                                </div>
                                <SaveBar dirty={dirty.language} saving={savingSection === "language"} onSave={() => saveSection("language")} onReset={() => resetSection("language")} t={t} />
                            </CardContent>
                        </Card>
                    </TabsContent>

                </Tabs>
                <AlertDialog open={Boolean(pendingChange)} onOpenChange={(open) => !open && setPendingChange(null)}>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>{t("settings.unsavedTitle")}</AlertDialogTitle>
                            <AlertDialogDescription>{t("settings.unsavedDescription")}</AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>{t("settings.continueEditing")}</AlertDialogCancel>
                            <AlertDialogAction onClick={discardAndContinue}>{t("settings.discardContinue")}</AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </div>
        </AuthenticatedLayout>
    );
}
