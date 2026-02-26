import { Component } from "react";
import { BarChart3 } from "lucide-react";

/**
 * Error boundary para gráficas del dashboard.
 * Si Recharts o el componente hijo lanza, se muestra un fallback discreto sin romper la página.
 */
export class ChartErrorBoundary extends Component {
    state = { hasError: false };

    static getDerivedStateFromError() {
        return { hasError: true };
    }

    componentDidCatch(error, errorInfo) {
        if (typeof console !== "undefined" && console.error) {
            console.error("[ChartErrorBoundary]", error, errorInfo);
        }
    }

    render() {
        if (this.state.hasError) {
            return (
                <div
                    className="flex flex-col items-center justify-center py-8 text-muted-foreground opacity-70 space-y-2 min-h-[120px]"
                    role="status"
                    aria-label="Error al mostrar la gráfica"
                >
                    <BarChart3 className="w-8 h-8" aria-hidden />
                    <p className="text-xs">No se pudo mostrar la gráfica</p>
                </div>
            );
        }
        return this.props.children;
    }
}
