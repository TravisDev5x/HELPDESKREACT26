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
import { primaryBarColor } from "@/lib/chartColors";

/**
 * Barras horizontales para rankings (MetricList).
 * Props: items [{ label, value }], className?, maxHeight?, barColor?
 */
export function DashboardHorizontalBar({
    items = [],
    className = "",
    maxHeight = 300,
    barColor = primaryBarColor,
}) {
    const safeItems = Array.isArray(items) ? items : [];

    const data = useMemo(
        () =>
            safeItems.map((item) => ({
                name: String(item?.label ?? "").trim() || "—",
                value: Number(item?.value ?? 0) || 0,
            })),
        [safeItems]
    );

    const maxValue = useMemo(() => {
        if (!data.length) return 0;
        const values = data.map((d) => d.value).filter((n) => Number.isFinite(n));
        return values.length ? Math.max(...values) : 0;
    }, [data]);

    if (data.length === 0) return null;

    const renderYAxisTick = (props) => {
        const { x, y, payload } = props;
        const raw = payload?.value ?? payload?.name ?? (typeof payload === "string" ? payload : "");
        const text = String(raw).length > 22 ? String(raw).slice(0, 20) + "…" : String(raw);
        return (
            <g transform={`translate(${x},${y})`}>
                <text
                    x={0}
                    y={0}
                    dy={4}
                    textAnchor="start"
                    fill="hsl(var(--muted-foreground))"
                    style={{ fontSize: 10 }}
                >
                    {text}
                </text>
            </g>
        );
    };

    const chartHeight = Math.min(maxHeight, Math.max(120, data.length * 36));
    const domainMax = Number.isFinite(maxValue) && maxValue > 0 ? maxValue : 1;

    return (
        <div
            className={className}
            style={{ width: "100%", height: chartHeight }}
            role="img"
            aria-label="Gráfico de barras horizontales con valores por categoría"
        >
            <ResponsiveContainer width="100%" height="100%">
                <BarChart
                    layout="vertical"
                    data={data}
                    margin={{ top: 4, right: 8, left: 4, bottom: 4 }}
                >
                    <XAxis
                        type="number"
                        domain={[0, domainMax]}
                        hide
                    />
                    <YAxis
                        type="category"
                        dataKey="name"
                        width={100}
                        tick={renderYAxisTick}
                        axisLine={false}
                        tickLine={false}
                    />
                    <Tooltip
                        content={({ active, payload }) => {
                            if (!active || !payload?.[0]) return null;
                            const item = payload[0].payload;
                            return (
                                <div
                                    className="rounded-md border border-border bg-card px-3 py-2 shadow-md text-xs ring-1 ring-border/50"
                                    role="tooltip"
                                    aria-hidden
                                >
                                    <p className="font-medium text-foreground truncate max-w-[200px]" title={item.name}>
                                        {item.name}
                                    </p>
                                    <p className="text-muted-foreground font-mono mt-0.5">
                                        {item.value}
                                    </p>
                                </div>
                            );
                        }}
                        cursor={{ fill: "hsl(var(--muted))", opacity: 0.3 }}
                    />
                    <Bar
                        dataKey="value"
                        radius={[0, 4, 4, 0]}
                        maxBarSize={12}
                        isAnimationActive={true}
                        animationDuration={300}
                    >
                        {data.map((_, idx) => (
                            <Cell key={idx} fill={barColor} opacity={0.85} />
                        ))}
                    </Bar>
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
}
