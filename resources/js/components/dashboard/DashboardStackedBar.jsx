import { useMemo } from "react";
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    Tooltip,
    ResponsiveContainer,
    Cell,
} from "recharts";
import { stateDistributionColors } from "@/lib/chartColors";

/**
 * Barra apilada para distribución de estados (StateDistribution).
 * Props: states [{ label, value }], total, colors?, height?
 */
export function DashboardStackedBar({
    states = [],
    total = 0,
    colors = stateDistributionColors,
    height = 24,
}) {
    const safeTotal = Number(total) || 0;
    const safeStates = Array.isArray(states) ? states : [];

    const { segments, data } = useMemo(() => {
        const segs = safeStates.map((s) => ({
            label: String(s?.label ?? "").trim() || "—",
            value: Number(s?.value ?? 0) || 0,
        }));
        const withPct = segs.filter((s) => safeTotal > 0 && (s.value / safeTotal) * 100 >= 1);
        const dataKey = (i) => `s${i}`;
        const oneRow = { name: " " };
        withPct.forEach((s, i) => {
            oneRow[dataKey(i)] = s.value;
        });
        return {
            segments: withPct,
            data: withPct.length ? [oneRow] : [],
        };
    }, [safeStates, safeTotal]);

    if (segments.length === 0 || safeTotal === 0) {
        return (
            <div
                className="w-full rounded-md flex items-center justify-center text-[10px] text-muted-foreground bg-muted"
                style={{ height }}
                role="status"
                aria-live="polite"
                aria-label="Sin datos para la distribución de estados"
            >
                Sin datos
            </div>
        );
    }

    const dataKeys = segments.map((_, i) => `s${i}`);

    return (
        <div
            className="w-full rounded-md overflow-hidden ring-1 ring-border/50 mb-6"
            style={{ height }}
            role="img"
            aria-label="Distribución de estados en barra apilada"
        >
            <ResponsiveContainer width="100%" height="100%">
                <BarChart
                    data={data}
                    layout="vertical"
                    margin={{ top: 0, right: 0, left: 0, bottom: 0 }}
                >
                    <XAxis type="number" domain={[0, safeTotal]} hide />
                    <YAxis type="category" dataKey="name" hide />
                    <Tooltip
                        content={({ active, payload }) => {
                            if (!active || !payload?.length) return null;
                            const items = payload
                                .filter((p) => p.value != null && p.value > 0)
                                .map((p) => {
                                    const idx = parseInt(String(p.dataKey).replace("s", ""), 10);
                                    const seg = segments[idx];
                                    const pct = safeTotal ? ((seg?.value ?? 0) / safeTotal) * 100 : 0;
                                    return {
                                        label: seg?.label ?? "",
                                        value: seg?.value ?? 0,
                                        pct,
                                    };
                                });
                            return (
                                <div
                                    className="rounded-md border border-border bg-card px-3 py-2 shadow-md text-xs space-y-1 ring-1 ring-border/50"
                                    role="tooltip"
                                    aria-hidden
                                >
                                    {items.map((item, i) => (
                                        <div key={i} className="flex justify-between gap-4">
                                            <span className="font-medium text-foreground truncate max-w-[160px]" title={item.label}>
                                                {item.label}
                                            </span>
                                            <span className="text-muted-foreground font-mono shrink-0">
                                                {item.value} ({item.pct.toFixed(1)}%)
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            );
                        }}
                        cursor={{ fill: "transparent" }}
                    />
                    {dataKeys.map((key, idx) => (
                        <Bar
                            key={key}
                            dataKey={key}
                            stackId="stack"
                            radius={0}
                            isAnimationActive={true}
                            animationDuration={300}
                        >
                            {data.map((_, i) => (
                                <Cell
                                    key={i}
                                    fill={colors[idx % colors.length]}
                                    stroke="rgba(255,255,255,0.2)"
                                    strokeWidth={1}
                                />
                            ))}
                        </Bar>
                    ))}
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
}
