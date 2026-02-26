import { useMemo } from "react";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer } from "recharts";
import { primaryBarColor } from "@/lib/chartColors";

/**
 * Gráfica de barras mínima: solo barras, sin ejes, grid, labels ni leyenda.
 * Refuerzo visual para Cards del dashboard.
 * Props: data (array), dataKey (string, clave numérica en cada ítem).
 */
export function TinyBarChart({ data = [], dataKey = "value" }) {
    const safeData = Array.isArray(data) ? data : [];
    const { chartData, domainMax } = useMemo(() => {
        const withIndex = safeData.map((d, i) => ({ ...d, _x: i }));
        const values = safeData.map((d) => Number(d?.[dataKey] ?? 0)).filter(Number.isFinite);
        const max = values.length ? Math.max(...values) : 1;
        return { chartData: withIndex, domainMax: max };
    }, [safeData, dataKey]);

    if (chartData.length === 0) return null;

    const barCount = chartData.length;

    return (
        <div
            className="w-full shrink-0"
            style={{ height: 40 }}
            role="img"
            aria-hidden
        >
            <ResponsiveContainer width="100%" height="100%">
                <BarChart
                    data={chartData}
                    margin={{ top: 4, right: 4, left: 4, bottom: 4 }}
                    barCategoryGap={barCount > 1 ? "12%" : 0}
                >
                    <XAxis dataKey="_x" type="category" hide />
                    <YAxis type="number" domain={[0, domainMax]} hide />
                    <Bar
                        dataKey={dataKey}
                        fill={primaryBarColor}
                        opacity={0.9}
                        radius={[3, 3, 0, 0]}
                        maxBarSize={14}
                        minPointSize={1}
                        isAnimationActive={true}
                        animationDuration={400}
                    />
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
}
