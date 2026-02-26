import { useMemo, useState } from "react";
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Cell,
} from "recharts";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { primaryBarColor } from "@/lib/chartColors";

const DEFAULT_CHART_HEIGHT = 260;

/**
 * Gráfico de barras verticales para cards del dashboard.
 * Estilo tipo imagen de referencia: cuadrícula punteada, ejes, tooltip y clic con información.
 * Mismo contrato: data = [{ label, value }], dataKey por defecto "value".
 * Si onBarClick está definido, al clic se llama y no se muestra el diálogo interno.
 * Si no, al clic se abre el diálogo con la información de la barra.
 */
const CHART_ANIMATION_MS = 150;

export function TinyVerticalBarChart({ data = [], dataKey = "value", cardTitle = "", onBarClick, height, animationDuration }) {
    const safeData = Array.isArray(data) ? data : [];
    const chartData = useMemo(
        () =>
            safeData.map((item) => ({
                label: String(item?.label ?? "").trim() || "—",
                [dataKey]: Number(item?.[dataKey] ?? 0) || 0,
            })),
        [safeData, dataKey]
    );
    const maxVal = useMemo(() => {
        const vals = chartData.map((d) => d[dataKey]).filter(Number.isFinite);
        return vals.length ? Math.max(...vals) : 1;
    }, [chartData, dataKey]);

    const [selected, setSelected] = useState(null);
    const chartHeight = height ?? DEFAULT_CHART_HEIGHT;

    const handleBarClick = (payload) => {
        if (onBarClick) onBarClick(payload);
        else setSelected(payload);
    };

    if (chartData.length === 0) return null;

    const gridStroke = "hsl(var(--border))";
    const tickStyle = { fill: "hsl(var(--muted-foreground))", fontSize: 10 };

    const tooltipContent = ({ active, payload }) => {
        if (!active || !payload?.[0]) return null;
        const p = payload[0].payload;
        const value = p[dataKey];
        return (
            <div className="rounded-md border border-border bg-card px-3 py-2 shadow-md text-xs ring-1 ring-border/50">
                <p className="font-medium text-foreground truncate max-w-[200px]" title={p.label}>
                    {p.label}
                </p>
                <p className="text-muted-foreground font-mono mt-0.5">{dataKey}: {value}</p>
            </div>
        );
    };

    return (
        <>
            <div
                className="w-full"
                style={{ height: chartHeight }}
                role="img"
                aria-label={cardTitle ? `Gráfico: ${cardTitle}` : "Gráfico de barras por categoría"}
            >
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                        data={chartData}
                        margin={{ top: 8, right: 16, left: 8, bottom: 24 }}
                    >
                        <CartesianGrid
                            strokeDasharray="3 3"
                            stroke={gridStroke}
                            horizontal={true}
                            vertical={true}
                        />
                        <XAxis
                            type="category"
                            dataKey="label"
                            tick={tickStyle}
                            axisLine={{ stroke: gridStroke }}
                            tickLine={{ stroke: gridStroke }}
                            interval={0}
                            tickFormatter={(v) =>
                                String(v).length > 12 ? String(v).slice(0, 10) + "…" : v
                            }
                        />
                        <YAxis
                            type="number"
                            domain={[0, maxVal]}
                            tick={tickStyle}
                            axisLine={{ stroke: gridStroke }}
                            tickLine={{ stroke: gridStroke }}
                            width={32}
                        />
                        <Tooltip content={tooltipContent} cursor={{ fill: "hsl(var(--muted))", opacity: 0.3 }} />
                        <Bar
                            dataKey={dataKey}
                            fill={primaryBarColor}
                            radius={[4, 4, 0, 0]}
                            maxBarSize={40}
                            isAnimationActive={animationDuration !== 0}
                            animationDuration={typeof animationDuration === "number" ? animationDuration : CHART_ANIMATION_MS}
                            onClick={(ev) => ev?.payload && handleBarClick(ev.payload)}
                            cursor="pointer"
                        >
                            {chartData.map((_, idx) => (
                                <Cell key={idx} fill={primaryBarColor} opacity={0.9} />
                            ))}
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            </div>

            {!onBarClick && (
            <Dialog open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
                <DialogContent className="sm:max-w-sm">
                    <DialogHeader>
                        <DialogTitle className="text-sm">
                            {cardTitle ? `Información — ${cardTitle}` : "Detalle"}
                        </DialogTitle>
                    </DialogHeader>
                    {selected && (
                        <div className="space-y-2 text-sm">
                            <p className="font-medium text-foreground break-words" title={selected.label}>
                                {selected.label}
                            </p>
                            <p className="text-muted-foreground font-mono">
                                Valor: <span className="text-foreground font-medium">{selected[dataKey]}</span>
                            </p>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
            )}
        </>
    );
}
