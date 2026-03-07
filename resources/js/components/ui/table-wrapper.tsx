import * as React from "react"
import { cn } from "@/lib/utils"

/**
 * Contenedor para tablas con scroll horizontal en móvil.
 * - Un solo div con: relative overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0 scrollbar-hide.
 * - Oculta la barra de scroll (cross-browser).
 * - Gradiente indicador de scroll a la derecha solo en móvil.
 * Envuelve <Table> de shadcn para catálogos/listados desde la API.
 */
const TableWrapper = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, children, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("relative overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0 scrollbar-hide", className)}
    {...props}
  >
    {children}
    {/* Indicación visual de scroll en móvil */}
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-background to-transparent md:hidden"
    />
  </div>
))
TableWrapper.displayName = "TableWrapper"

export { TableWrapper }
