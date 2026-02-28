import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import axios from "@/lib/axios";
import { notify } from "@/lib/notify";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useI18n } from "@/hooks/useI18n";
import { cn } from "@/lib/utils";
import {
    Clock,
    CalendarCheck,
    Users,
    LayoutDashboard,
    Plus,
    Link2,
    RefreshCw,
} from "lucide-react";

const SummaryCard = ({ label, value, icon: Icon, className }) => (
    <Card className={cn("border-border/50 bg-card hover:bg-accent/5 transition-colors", className)}>
        <CardContent className="p-5 flex items-start justify-between">
            <div className="space-y-1">
                <p className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground">
                    {label}
                </p>
                <div className="text-2xl font-bold tracking-tight text-foreground">{value}</div>
            </div>
            {Icon && (
                <div className="h-9 w-9 rounded-lg flex items-center justify-center text-primary bg-primary/10">
                    <Icon className="h-4.5 w-4.5" />
                </div>
            )}
        </CardContent>
    </Card>
);

export default function TimeDeskDashboard() {
    const { t } = useI18n();
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);

    const fetchDashboard = useCallback(async () => {
        setLoading(true);
        try {
            const { data } = await axios.get("/api/timedesk/dashboard");
            setStats(data);
        } catch (err) {
            notify.error(err?.response?.data?.message || t("timedesk.errorLoad"));
            setStats({
                schedules_active: 0,
                assignments_active_today: 0,
                employees_with_assigned_schedule: 0,
                attendances_today: 0,
            });
        } finally {
            setLoading(false);
        }
    }, [t]);

    useEffect(() => {
        fetchDashboard();
    }, [fetchDashboard]);

    return (
        <div className="space-y-6 pb-20 animate-in fade-in duration-300">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-black tracking-tighter uppercase text-foreground flex items-center gap-3">
                        <Clock className="h-8 w-8 text-primary" />
                        {t("timedesk.title")}
                    </h1>
                    <p className="text-muted-foreground font-medium text-sm mt-1">
                        {t("timedesk.subtitle")}
                    </p>
                </div>
                <Button variant="outline" size="sm" onClick={fetchDashboard} disabled={loading}>
                    <RefreshCw className={cn("h-4 w-4 mr-2", loading && "animate-spin")} />
                    {t("timedesk.refresh")}
                </Button>
            </div>

            {loading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {[1, 2, 3, 4].map((i) => (
                        <Skeleton key={i} className="h-24 rounded-lg" />
                    ))}
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <SummaryCard
                        label={t("timedesk.cards.schedules")}
                        value={stats?.schedules_active ?? 0}
                        icon={Clock}
                    />
                    <SummaryCard
                        label={t("timedesk.cards.personalActivo")}
                        value={stats?.employees_with_assigned_schedule ?? 0}
                        icon={Users}
                    />
                    <SummaryCard
                        label={t("timedesk.cards.assignmentsToday")}
                        value={stats?.assignments_active_today ?? 0}
                        icon={Link2}
                    />
                    <SummaryCard
                        label={t("timedesk.cards.attendancesToday")}
                        value={stats?.attendances_today ?? 0}
                        icon={CalendarCheck}
                    />
                </div>
            )}

            <Card className="border-border">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <LayoutDashboard className="h-5 w-5 text-muted-foreground" />
                        {t("timedesk.quickActions")}
                    </CardTitle>
                    <CardDescription>{t("timedesk.quickActionsDesc")}</CardDescription>
                </CardHeader>
                <CardContent className="flex flex-wrap gap-3">
                    <Button asChild variant="default" className="gap-2">
                        <Link to="/timedesk/schedules">
                            <Plus className="h-4 w-4" />
                            {t("timedesk.createSchedule")}
                        </Link>
                    </Button>
                    <Button asChild variant="secondary" className="gap-2">
                        <Link to="/timedesk/schedule-assignments">
                            <Link2 className="h-4 w-4" />
                            {t("timedesk.assignSchedule")}
                        </Link>
                    </Button>
                </CardContent>
            </Card>
        </div>
    );
}
