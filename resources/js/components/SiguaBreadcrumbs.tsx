import { Link } from "react-router-dom";
import { ChevronRight } from "lucide-react";

export interface SiguaBreadcrumbItem {
  label: string;
  to?: string;
}

interface SiguaBreadcrumbsProps {
  items: SiguaBreadcrumbItem[];
  className?: string;
}

/**
 * Breadcrumbs para páginas del módulo SIGUA.
 * Siempre incluye "Inicio" y "SIGUA" como primeros niveles; items son los segmentos siguientes.
 * Ejemplo: items=[{ label: 'Cuentas', to: '/sigua/cuentas' }, { label: 'Detalle' }]
 * → Inicio > SIGUA > Cuentas > Detalle
 */
export function SiguaBreadcrumbs({ items, className = "" }: SiguaBreadcrumbsProps) {
  const segments = [
    { label: "Inicio", to: "/" },
    { label: "SIGUA", to: "/sigua" },
    ...items,
  ];
  return (
    <nav className={`flex items-center gap-2 text-sm text-muted-foreground ${className}`}>
      {segments.map((seg, i) => (
        <span key={i} className="flex items-center gap-2">
          {i > 0 && <ChevronRight className="h-4 w-4 shrink-0" />}
          {seg.to && i < segments.length - 1 ? (
            <Link to={seg.to} className="hover:text-foreground transition-colors">
              {seg.label}
            </Link>
          ) : (
            <span className={i === segments.length - 1 ? "text-foreground font-medium" : ""}>
              {seg.label}
            </span>
          )}
        </span>
      ))}
    </nav>
  );
}
