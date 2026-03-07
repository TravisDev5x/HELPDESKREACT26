import React from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { useI18n } from '@/hooks/useI18n'
import { useAuth } from '@/context/AuthContext'
import { cn } from '@/lib/utils'
import { Home, Ticket, LayoutDashboard, Menu, Layers, AlertTriangle } from 'lucide-react'

const ICON_SIZE = 22

const baseItems = [
  { to: '/', labelKey: 'nav.home', icon: Home, end: true },
  { to: '/resolbeb/mis-tickets', labelKey: 'nav.myTickets', icon: Ticket, end: false },
  { to: '/resolbeb', labelKey: 'nav.resolbeb', icon: LayoutDashboard, end: true },
]

export function MobileBottomBar({ onOpenMenu, forceVisible = false }) {
  const { t } = useI18n()
  const location = useLocation()
  const { user } = useAuth()
  const can = (p) => Boolean(user?.permissions?.includes(p))
  const canSeeTickets = can('tickets.manage_all') || can('tickets.view_area') || (can('tickets.create') || can('tickets.view_own'))
  const canSeeIncidents = can('incidents.view_own') || can('incidents.view_area') || can('incidents.manage_all')

  const quickItems = []
  if (canSeeTickets) quickItems.push({ to: '/resolbeb/tickets/new', labelKey: 'nav.createTicket', icon: Layers, end: false })
  if (canSeeIncidents) quickItems.push({ to: '/incidents', label: 'Crear incidencia', icon: AlertTriangle, end: false })
  const items = [...baseItems, ...quickItems]

  return (
    <nav
      className={cn(
        'fixed bottom-0 left-0 right-0 z-50 pointer-events-none',
        forceVisible ? 'flex flex-col' : 'md:hidden'
      )}
      aria-label="Navegación principal"
    >
      {/* Barra con efecto Liquid Glass; centrada horizontalmente y sobre safe area iOS */}
      <div
        className={cn(
          'pointer-events-auto flex max-w-lg w-[calc(100%-2rem)] items-center justify-around gap-0.5 overflow-x-auto scrollbar-hide',
          'rounded-2xl py-2 px-1',
          'fixed left-1/2 -translate-x-1/2 z-50',
          'bg-background/90 supports-[backdrop-filter]:bg-background/60 backdrop-blur-xl',
          'border border-white/10 shadow-2xl'
        )}
        style={{
          bottom: 'max(1rem, env(safe-area-inset-bottom))',
        }}
      >
        {items.map(({ to, labelKey, label, icon: Icon, end }) => {
          const isActive = end
            ? location.pathname === to
            : location.pathname === to || location.pathname.startsWith(to + '/')
          const text = label ?? t(labelKey)
          return (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={cn(
                'flex flex-col items-center justify-center gap-0.5 rounded-xl py-2 px-2 min-w-[56px] min-h-[44px] transition-colors shrink-0',
                isActive
                  ? 'bg-primary text-primary-foreground'
                  : 'text-foreground/85 hover:bg-white/10 hover:text-foreground'
              )}
              aria-current={isActive ? 'page' : undefined}
            >
              <Icon size={ICON_SIZE} strokeWidth={2} className="shrink-0" />
              <span className="text-[10px] font-medium leading-tight truncate max-w-[72px] text-center">
                {text}
              </span>
            </NavLink>
          )
        })}
        <button
          type="button"
          onClick={() => onOpenMenu?.(true)}
          className={cn(
            'flex flex-col items-center justify-center gap-0.5 rounded-xl py-2 px-2 min-w-[56px] min-h-[44px] transition-colors shrink-0',
            'text-foreground/85 hover:bg-white/10 hover:text-foreground'
          )}
          aria-label="Abrir menú"
        >
          <Menu size={ICON_SIZE} strokeWidth={2} className="shrink-0" />
          <span className="text-[10px] font-medium leading-tight">Más</span>
        </button>
      </div>
    </nav>
  )
}
