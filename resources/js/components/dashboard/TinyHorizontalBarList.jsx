import { useMemo } from "react";
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    ResponsiveContainer,
    Cell,
    LabelList,
} from "recharts";
import { primaryBarColor } from "@/lib/chartColors";

const ROW_HEIGHT = 36;
const LABEL_COLUMN_WIDTH = 180;
const VALUE_MARGIN_RIGHT = 40;

/**
 * Lista con barra horizontal por fila.
 * Columna izquierda: etiquetas en HTML (sin superponer). Columna derecha: BarChart (barras + valor).
 */
export function TinyHorizontalBarList({ data = [], dataKey = "value" }) {
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

    if (chartData.length === 0) return null;

    const chartHeight = chartData.length * ROW_HEIGHT;

    const renderValueLabel = (props) => {
        const { x, y, width, height, value } = props;
        return (
            <text
                x={(x ?? 0) + (width ?? 0) + 8}
                y={(y ?? 0) + (height ?? 0) / 2}
                dy={4}
                textAnchor="start"
                fill="hsl(var(--muted-foreground))"
                style={{ fontSize: 12, fontVariantNumeric: "tabular-nums" }}
            >
                {value}
            </text>
        );
    };

    return (
        <div
            className="flex w-full gap-3 items-stretch"
            style={{ height: chartHeight }}
            role="list"
            aria-label="Listado con barras por valor"
        >
            {/* Columna de etiquetas: HTML, truncate con title para texto completo. Misma altura por fila que el chart. */}
            <div
                className="shrink-0 flex flex-col"
                style={{ width: LABEL_COLUMN_WIDTH }}
            >
                {chartData.map((row, idx) => (
                    <div
                        key={idx}
                        className="flex items-center truncate text-foreground font-medium text-sm px-0 pr-1"
                        style={{ height: ROW_HEIGHT }}
                        title={row.label}
                    >
                        {row.label}
                    </div>
                ))}
            </div>

            {/* Solo barras + valor: Recharts sin eje Y visible */}
            <div className="flex-1 min-w-0" style={{ height: chartHeight }}>
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                        layout="vertical"
                        data={chartData}
                        margin={{ top: 4, right: VALUE_MARGIN_RIGHT, left: 0, bottom: 4 }}
                    >
                        <XAxis type="number" domain={[0, maxVal]} hide />
                        <YAxis
                            type="category"
                            dataKey="label"
                            width={0}
                            tick={() => null}
                            axisLine={false}
                            tickLine={false}
                            interval={0}
                        />
                        <Bar
                            dataKey={dataKey}
                            fill={primaryBarColor}
                            opacity={0.9}
                            radius={[0, 4, 4, 0]}
                            maxBarSize={ROW_HEIGHT - 12}
                            isAnimationActive={true}
                            animationDuration={300}
                        >
                            <LabelList content={renderValueLabel} position="right" dataKey={dataKey} />
                            {chartData.map((_, idx) => (
                                <Cell key={idx} fill={primaryBarColor} />
                            ))}
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}
