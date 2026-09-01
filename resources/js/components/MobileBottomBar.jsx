import React from 'react'
import { Link as InertiaLink, usePage } from '@inertiajs/react'
import { useI18n } from '@/hooks/useI18n'
import { useAuth } from '@/context/AuthContext'
import { cn } from '@/lib/utils'
import { shouldUseInertiaLink, normalizeLegacyAppPath } from '@/lib/inertiaNavigation'
import { Home, Ticket, LayoutDashboard, Menu, Layers, AlertTriangle } from 'lucide-react'

const ICON_SIZE = 22

const baseItems = [
  { to: '/home', labelKey: 'nav.home', icon: Home, end: true },
  { to: '/resolbeb/mis-tickets', labelKey: 'nav.myTickets', icon: Ticket, end: false },
  { to: '/resolbeb', labelKey: 'nav.resolbeb', icon: LayoutDashboard, end: true },
]

function routeMatches(pathname, to, end) {
  if (end) return pathname === to
  return pathname === to || pathname.startsWith(`${to}/`)
}

function NavItem({ to, end, pathname, getLinkClassName, children, onClick }) {
  const isActive = routeMatches(pathname, to, end)
  const className = getLinkClassName(isActive)

  if (shouldUseInertiaLink(to)) {
    return (
      <InertiaLink
        href={normalizeLegacyAppPath(to)}
        preserveScroll
        onClick={onClick}
        className={className}
        aria-current={isActive ? 'page' : undefined}
      >
        {children}
      </InertiaLink>
    )
  }

  return (
    <a
      href={to}
      onClick={onClick}
      className={className}
      aria-current={isActive ? 'page' : undefined}
    >
      {children}
    </a>
  )
}

export function MobileBottomBar({
  onOpenMenu,
  forceVisible = false,
  unreadCount = 0,
  pathname: pathnameProp,
}) {
  const { t } = useI18n()
  const { url } = usePage()
  const pathname = pathnameProp ?? url.split('?')[0]
  const { user } = useAuth()
  const can = (p) => Boolean(user?.permissions?.includes(p))
  const canSeeTickets = can('tickets.manage_all') || can('tickets.view_area') || (can('tickets.create') || can('tickets.view_own'))
  const canSeeIncidents = can('incidents.view_own') || can('incidents.view_area') || can('incidents.manage_all')

  const quickItems = []
  if (canSeeTickets) quickItems.push({ to: '/resolbeb/tickets/new', labelKey: 'nav.createTicket', icon: Layers, end: false })
  if (canSeeIncidents) quickItems.push({ to: '/incidents', labelKey: 'nav.createIncident', icon: AlertTriangle, end: false })
  const items = [...baseItems, ...quickItems]

  const linkClass = (isActive) =>
    cn(
      'flex flex-col items-center justify-center gap-0.5 rounded-xl py-2 px-2 min-w-[56px] min-h-[44px] transition-colors shrink-0',
      isActive
        ? 'bg-primary text-primary-foreground'
        : 'text-foreground/85 hover:bg-muted/60 hover:text-foreground'
    )

  return (
    <nav
      className={cn(
        'fixed bottom-0 left-0 right-0 z-50 pointer-events-none',
        forceVisible ? 'flex flex-col' : 'md:hidden'
      )}
      aria-label={t('nav.general')}
    >
      <div
        className={cn(
          'pointer-events-auto flex max-w-lg w-[calc(100%-2rem)] items-center justify-around gap-0.5 overflow-x-auto scrollbar-hide',
          'rounded-2xl py-2 px-1',
          'fixed left-1/2 -translate-x-1/2 z-50',
          'bg-background/90 supports-[backdrop-filter]:bg-background/60 backdrop-blur-xl',
          'border border-border/60 shadow-2xl'
        )}
        style={{
          bottom: 'max(1rem, env(safe-area-inset-bottom))',
        }}
      >
        {items.map(({ to, labelKey, label, icon: Icon, end }) => {
          const text = label ?? t(labelKey)
          return (
            <NavItem
              key={to}
              to={to}
              end={end}
              pathname={pathname}
              getLinkClassName={linkClass}
            >
              <Icon size={ICON_SIZE} strokeWidth={2} className="shrink-0" />
              <span className="text-[10px] font-medium leading-tight truncate max-w-[72px] text-center">
                {text}
              </span>
            </NavItem>
          )
        })}
        <button
          type="button"
          onClick={() => onOpenMenu?.(true)}
          className={cn(
            'relative flex flex-col items-center justify-center gap-0.5 rounded-xl py-2 px-2 min-w-[56px] min-h-[44px] transition-colors shrink-0',
            'text-foreground/85 hover:bg-white/10 hover:text-foreground'
          )}
          aria-label={unreadCount > 0 ? t('nav.openMenuUnread', { count: unreadCount }) : t('nav.openMenu')}
        >
          <Menu size={ICON_SIZE} strokeWidth={2} className="shrink-0" />
          {unreadCount > 0 && (
            <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-destructive ring-2 ring-background" aria-hidden />
          )}
          <span className="text-[10px] font-medium leading-tight">{t('nav.more')}</span>
        </button>
      </div>
    </nav>
  )
}
