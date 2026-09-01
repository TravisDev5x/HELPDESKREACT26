import React, { useState, useMemo, useEffect } from 'react'
import { Link as InertiaLink, usePage } from '@inertiajs/react'
import { useAuth } from '@/context/AuthContext'
import axios from '@/lib/axios'
import { useSidebarPosition } from '@/context/SidebarPositionContext'
import { useI18n } from '@/hooks/useI18n'
import { cn } from '@/lib/utils'
import { menuItemDestructive } from '@/lib/badgeStyles'
import { isExternalUrl, shouldUseInertiaLink, normalizeLegacyAppPath } from '@/lib/inertiaNavigation'

import { Button } from '@/components/ui/button'
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '@/components/ui/tooltip'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { UserAvatar } from '@/components/user-avatar'
import { TenantBrandHeader, TenantBrandMark } from '@/components/TenantBrand'
import { isClientPortalTenant } from '@/lib/tenantBranding'
import { storageUrl } from '@/lib/storage'

import {
    Home,
    CalendarDays,
    AlertTriangle,
    Ticket,
    Users,
    Monitor,
    ShieldCheck,
    Settings,
    Menu,
    ChevronDown,
    Check,
    CircleDot,
    ChevronsUpDown,
    LogOut,
    LayoutDashboard,
    UserCircle,
    Workflow,
    Tags,
    Megaphone,
    Building2,
    Briefcase,
    Network,
    MapPin,
    SignalHigh,
    KeyRound,
    Grid3X3,
    FileText,
    Inbox,
    Package,
    Tag,
    Wrench,
    Factory,
    Plug,
    Plus,
} from 'lucide-react'

const ICON_SIZE = 20
const ICON_STROKE = 2

function routeMatchesPath(pathname, to) {
    if (!to) return false
    if (to === '/') return pathname === '/'
    return pathname === to || pathname.startsWith(`${to}/`)
}

/** Ítem de menú con href servido por Inertia (routes/web.php). */
function inertiaNav(href, props = {}) {
    return { href, external: true, ...props }
}

function navItemPath(item) {
    return item?.href ?? item?.to
}

function renderNavAnchor({ href, onNavigate, className, children }) {
    const handleClick = () => onNavigate?.()

    if (isExternalUrl(href)) {
        return (
            <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                onClick={handleClick}
                className={className}
            >
                {children}
            </a>
        )
    }

    if (shouldUseInertiaLink(href)) {
        return (
            <InertiaLink
                href={normalizeLegacyAppPath(href)}
                preserveScroll
                onClick={handleClick}
                className={className}
            >
                {children}
            </InertiaLink>
        )
    }

    return (
        <a href={href} onClick={handleClick} className={className}>
            {children}
        </a>
    )
}

// ----------------------------------------------------------------------
// SUB-COMPONENTE: SidebarItem (link con tooltip en modo colapsado)
// ----------------------------------------------------------------------
const SidebarItem = ({
    icon: Icon,
    label,
    to,
    isCollapsed,
    isChild = false,
    tooltipSide = 'right',
    onNavigate,
    currentPath = '',
    primary = false,
    exact = false,
}) => {
    const href = to
    const active = exact ? currentPath === href : routeMatchesPath(currentPath, href)

    const linkClass = (isActive) =>
        cn(
            'flex items-center rounded-md transition-colors min-w-0',
            isCollapsed ? 'justify-center h-10 w-10 p-0 shrink-0' : 'gap-3 px-3 py-2 justify-start w-full',
            primary
                ? 'bg-primary text-primary-foreground shadow-sm hover:bg-primary/90 hover:text-primary-foreground'
                : isActive
                ? 'bg-accent text-accent-foreground'
                : 'text-muted-foreground hover:bg-accent/50 hover:text-accent-foreground',
            isActive && !primary && 'relative font-semibold before:absolute before:inset-y-2 before:left-0 before:w-0.5 before:rounded-full before:bg-primary',
            isChild && !isCollapsed && 'ml-4 pl-3 border-l border-border/40'
        )

    const linkEl = renderNavAnchor({
        href,
        onNavigate,
        className: linkClass(active),
        children: (
            <>
                <Icon size={ICON_SIZE} strokeWidth={ICON_STROKE} className="shrink-0 flex-shrink-0" />
                {!isCollapsed && (
                    <span className="truncate whitespace-nowrap text-sm font-medium">{label}</span>
                )}
            </>
        ),
    })

    if (isCollapsed) {
        return (
            <Tooltip delayDuration={0}>
                <TooltipTrigger asChild>
                    <div className="flex justify-center py-1">{linkEl}</div>
                </TooltipTrigger>
                <TooltipContent side={tooltipSide} sideOffset={10}>
                    {label}
                </TooltipContent>
            </Tooltip>
        )
    }

    return <div className="py-0.5">{linkEl}</div>
}

/** Enlace interno (Inertia) o externo según href. */
const SidebarExternalItem = ({
    icon: Icon,
    label,
    href,
    isCollapsed,
    tooltipSide = 'right',
    onNavigate,
    currentPath = '',
}) => {
    const isActive = currentPath ? routeMatchesPath(currentPath, href) : false
    const linkEl = renderNavAnchor({
        href,
        onNavigate,
        className: cn(
            'flex items-center rounded-md transition-colors min-w-0',
            isCollapsed ? 'justify-center h-10 w-10 p-0 shrink-0' : 'gap-3 px-3 py-2 justify-start w-full',
            isActive
                ? 'bg-accent text-accent-foreground'
                : 'text-muted-foreground hover:bg-accent/50 hover:text-accent-foreground'
        ),
        children: (
            <>
                <Icon size={ICON_SIZE} strokeWidth={ICON_STROKE} className="shrink-0 flex-shrink-0" />
                {!isCollapsed && (
                    <span className="truncate whitespace-nowrap text-sm font-medium">{label}</span>
                )}
            </>
        ),
    })

    if (isCollapsed) {
        return (
            <Tooltip delayDuration={0}>
                <TooltipTrigger asChild>
                    <div className="flex justify-center py-1">{linkEl}</div>
                </TooltipTrigger>
                <TooltipContent side={tooltipSide} sideOffset={10}>
                    {label}
                </TooltipContent>
            </Tooltip>
        )
    }

    return <div className="py-0.5">{linkEl}</div>
}

// ----------------------------------------------------------------------
// SUB-COMPONENTE: GroupItem (Grupo con hijos, tooltip en colapsado)
// ----------------------------------------------------------------------
function GroupItem({ label, icon: Icon, children, collapsed, dropdownSide = 'right', tooltipSide = 'right', onNavigate, defaultOpen = false, active = false }) {
    const [open, setOpen] = useState(defaultOpen)

    useEffect(() => {
        if (defaultOpen) setOpen(true)
    }, [defaultOpen])

    if (collapsed) {
        return (
            <Tooltip delayDuration={0}>
                <TooltipTrigger asChild>
                    <div className="flex justify-center py-1">
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className={cn(
                                        'h-10 w-10 shrink-0 rounded-md transition-colors',
                                        active
                                            ? 'bg-accent text-accent-foreground ring-1 ring-border/60'
                                            : 'text-muted-foreground hover:bg-accent/50 hover:text-accent-foreground',
                                        'data-[state=open]:bg-accent data-[state=open]:text-accent-foreground'
                                    )}
                                >
                                    <Icon size={ICON_SIZE} strokeWidth={ICON_STROKE} className="shrink-0" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent side={dropdownSide} align="start" className="w-56 ml-2 p-1">
                                <DropdownMenuLabel className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-2 py-1.5">
                                    {label}
                                </DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                {children}
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </TooltipTrigger>
                <TooltipContent side={tooltipSide} sideOffset={10}>
                    {label}
                </TooltipContent>
            </Tooltip>
        )
    }

    return (
        <Collapsible open={open} onOpenChange={setOpen} className="flex flex-col gap-1">
            <CollapsibleTrigger asChild>
                <Button
                variant="ghost"
                className={cn(
                    'w-full justify-between h-10 px-3 font-normal rounded-md transition-colors',
                    active
                        ? 'bg-accent text-accent-foreground font-semibold'
                        : 'text-muted-foreground hover:bg-accent/50 hover:text-accent-foreground'
                )}
                >
                <span className="flex items-center gap-3 text-sm font-medium min-w-0">
                    <Icon size={ICON_SIZE} strokeWidth={ICON_STROKE} className="shrink-0 flex-shrink-0" />
                    <span className="truncate whitespace-nowrap">{label}</span>
                </span>
                <ChevronDown
                    className={cn(
                        'h-4 w-4 shrink-0 transition-transform duration-200 opacity-50',
                        open ? 'rotate-0' : '-rotate-90'
                    )}
                />
                </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="flex flex-col gap-1 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=open]:fade-in data-[state=closed]:fade-out">
                {children}
            </CollapsibleContent>
        </Collapsible>
    )
}

// ----------------------------------------------------------------------
// Título de sección (GENERAL, MÓDULOS, SISTEMA) — oculto si colapsado; separador opcional
// ----------------------------------------------------------------------
const SectionTitle = ({ children, collapsed, showSeparatorWhenCollapsed }) => {
    if (collapsed) {
        if (showSeparatorWhenCollapsed) {
            return (
                <div className="flex justify-center py-2">
                    <hr className="w-8 border-border/60 rounded-full transition-opacity duration-200" />
                </div>
            )
        }
        return null
    }
    return (
        <h4 className="px-3 pt-2 pb-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/70 transition-opacity duration-200">
            {children}
        </h4>
    )
}

// ----------------------------------------------------------------------
// COMPONENTE: Sidebar
// ----------------------------------------------------------------------
export function Sidebar({ collapsed, onToggle, onNavigate, currentPath: currentPathProp = '' }) {
    const { user, logout, updateUserPrefs, hasRole, can } = useAuth()
    const { t } = useI18n()
    const { url, props: pageProps } = usePage()
    const tenant = pageProps.tenant ?? {}
    const isPortalBrand = isClientPortalTenant(tenant)
    const brandTitle = isPortalBrand ? tenant.name : t('brand.title')
    const brandSubtitle = isPortalBrand ? t('brand.portalSubtitle') : t('brand.subtitle')
    // Fuera del portal de cliente (app de staff): "Tikara" siempre arriba,
    // y debajo el logo/nombre del cliente al que pertenece ESTE usuario
    // (no el tenant resuelto por subdominio -- ese es el caso portal, ya
    // cubierto arriba). Nada si el usuario no pertenece a ningún cliente
    // (ej. operador de plataforma).
    const userClientName = !isPortalBrand ? user?.client_name : null
    const userClientLogoUrl = !isPortalBrand ? storageUrl(user?.client_logo_path) : null
    const pathname = currentPathProp || url.split('?')[0]
    const { position: sidebarPosition } = useSidebarPosition()
    const tooltipSide = sidebarPosition === 'right' ? 'left' : 'right'
    const dropdownSide = sidebarPosition === 'right' ? 'left' : 'right'

    const [toggleBtnTooltipOpen, setToggleBtnTooltipOpen] = useState(false)

    const canSeeClientsModule =
        Boolean(user?.is_operator) ||
        hasRole('admin') ||
        hasRole('super_admin') ||
        can('clients.view')

    // super_admin no tiene OperatorProfile propio -- /company siempre lo
    // redirige a /clients (ver CompanyController::show()), que ya tiene su
    // propio link en el sidebar. Ocultar "Mi empresa" evita un duplicado
    // que aparenta ser un flujo roto.
    const canSeeCompany =
        (Boolean(user?.is_operator) || can('company.view')) && !hasRole('super_admin')

    const canSeeCatalogs = can('catalogs.manage') || can('tickets.view_area') || can('tickets.manage_all')
    const canSeeIncidents = can('incidents.view_own') || can('incidents.view_area') || can('incidents.manage_all')
    const canSeeTicketsModule = can('tickets.manage_all') || can('tickets.view_area')
    const canSeeReviewPending = can('tickets.review_pending') || can('tickets.manage_all')
    const canSeeMyTickets =
        (can('tickets.create') || can('tickets.view_own')) &&
        (can('tickets.manage_all') || can('tickets.view_area'))
    const isAdmin = can('users.manage')
    const NAV = useMemo(() => {
        const sections = []

        // 1. TRABAJO: lo que una persona necesita para comenzar su jornada.
        const generalItems = [
            ...(can('tickets.create')
                ? [inertiaNav('/resolbeb/tickets/new', { label: t('nav.newRequest'), icon: Plus, primary: true })]
                : []),
            inertiaNav('/home', { label: t('nav.home'), icon: Home, emphasis: true }),
            ...(can('tickets.create') || can('tickets.view_own')
                ? [inertiaNav('/resolbeb/mis-tickets', { label: t('nav.myTickets'), icon: Ticket, emphasis: true })]
                : []),
            inertiaNav('/calendar', { label: t('nav.calendar'), icon: CalendarDays, emphasis: true }),
        ]
        sections.push({ sectionId: 'work', label: t('nav.work'), items: generalItems })

        // 2. OPERACIÓN: colas y módulos para resolver trabajo.
        const moduleItems = []

        const canSeeResolbeb = canSeeTicketsModule || canSeeMyTickets
        const ticketsChildren = []
        if (canSeeResolbeb) {
            ticketsChildren.push(inertiaNav('/resolbeb', { label: t('nav.dashboard'), icon: LayoutDashboard, exact: true }))
            if (canSeeTicketsModule) ticketsChildren.push(inertiaNav('/resolbeb/tickets', { label: t('nav.helpDesk'), icon: Ticket }))
            if (canSeeReviewPending) ticketsChildren.push(inertiaNav('/resolbeb/pending-requests', { label: t('nav.pendingRequests'), icon: Inbox }))
        }
        if (canSeeResolbeb && ticketsChildren.length > 0) {
            moduleItems.push({
                label: t('nav.tickets'),
                icon: Ticket,
                emphasis: false,
                children: ticketsChildren,
            })
        }

        const incidentsChildren = []
        if (canSeeIncidents) {
            incidentsChildren.push(inertiaNav('/incidents', { label: t('nav.allIncidents'), icon: AlertTriangle }))
        }
        if (canSeeIncidents && incidentsChildren.length > 0) {
            moduleItems.push({
                label: t('nav.incidents'),
                icon: AlertTriangle,
                emphasis: false,
                children: incidentsChildren,
            })
        }

        // Inventario operativo. Su configuración se presenta más abajo.
        {
            const inventoryChildren = []
            if (can('inventory.manage_assets')) {
                inventoryChildren.push(inertiaNav('/inventory/assets', { label: t('nav.inventoryAssets'), icon: Package }))
                inventoryChildren.push(inertiaNav('/inventory/monitor', { label: t('nav.inventoryMonitor'), icon: AlertTriangle }))
                inventoryChildren.push(inertiaNav('/inventory/assignments', { label: t('nav.inventoryAssignments'), icon: Users }))
            }
            if (inventoryChildren.length > 0) {
                moduleItems.push({
                    label: t('nav.inventory'),
                    icon: Package,
                    children: inventoryChildren,
                })
            }
        }

        if (moduleItems.length > 0) {
            sections.push({ sectionId: 'operations', label: t('nav.operations'), items: moduleItems })
        }

        // 3. ORGANIZACIÓN: estructura de la empresa, lejos de las colas diarias.
        const organizationItems = []
        if (canSeeClientsModule) organizationItems.push({ href: '/clients', label: t('nav.clientes'), icon: Building2, external: true })
        if (canSeeCompany) organizationItems.push({ href: '/company', label: t('nav.myCompany'), icon: Building2, external: true })
        if (can('catalogs.manage')) {
            organizationItems.push({
                label: t('nav.structure'),
                icon: Network,
                children: [
                    inertiaNav('/campaigns', { label: t('nav.campaigns'), icon: Megaphone }),
                    inertiaNav('/areas', { label: t('nav.areas'), icon: Network }),
                    inertiaNav('/positions', { label: t('nav.positions'), icon: Briefcase }),
                    inertiaNav('/locations', { label: t('nav.locations'), icon: MapPin }),
                ],
            })
        }
        if (organizationItems.length > 0) {
            sections.push({ sectionId: 'organization', label: t('nav.organization'), items: organizationItems })
        }

        // 4. CONFIGURACIÓN: catálogos técnicos cerrados hasta necesitarlos.
        const configurationItems = []
        if (canSeeCatalogs) {
            configurationItems.push({
                label: t('nav.tickets'),
                icon: Ticket,
                children: [
                    inertiaNav('/resolbeb/tipos', { label: t('nav.ticketTypes'), icon: Tags }),
                    inertiaNav('/resolbeb/estados', { label: t('nav.ticketStates'), icon: Workflow }),
                    inertiaNav('/priorities', { label: t('nav.priorities'), icon: SignalHigh }),
                    inertiaNav('/impact-levels', { label: t('nav.impactLevels'), icon: SignalHigh }),
                    inertiaNav('/urgency-levels', { label: t('nav.urgencyLevels'), icon: SignalHigh }),
                    inertiaNav('/priority-matrix', { label: t('nav.priorityMatrix'), icon: Grid3X3 }),
                    inertiaNav('/ticket-macros', { label: t('nav.ticketMacros'), icon: FileText }),
                ],
            })
        }
        if (canSeeIncidents) {
            configurationItems.push({
                label: t('nav.incidents'),
                icon: AlertTriangle,
                children: [
                    inertiaNav('/incident-types', { label: t('nav.incidentTypes'), icon: Tags }),
                    inertiaNav('/incident-severities', { label: t('nav.severities'), icon: SignalHigh }),
                    inertiaNav('/incident-statuses', { label: t('nav.incidentStates'), icon: Workflow }),
                ],
            })
        }
        if (can('inventory.manage_config')) {
            configurationItems.push({
                label: t('nav.inventory'),
                icon: Package,
                children: [
                    inertiaNav('/inventory/categories', { label: t('nav.inventoryCategories'), icon: Tags }),
                    inertiaNav('/inventory/statuses', { label: t('nav.inventoryStatuses'), icon: CircleDot }),
                    inertiaNav('/inventory/labels', { label: t('nav.inventoryLabels'), icon: Tag }),
                    inertiaNav('/inventory/manufacturers', { label: t('nav.inventoryManufacturers'), icon: Factory }),
                    inertiaNav('/inventory/maintenance-origins', { label: t('nav.inventoryMaintenanceOrigins'), icon: Wrench }),
                    inertiaNav('/inventory/maintenance-modalities', { label: t('nav.inventoryMaintenanceModalities'), icon: Wrench }),
                    inertiaNav('/inventory/integrations', { label: t('nav.inventoryIntegrations'), icon: Plug }),
                ],
            })
        }
        if (configurationItems.length > 0) {
            sections.push({ sectionId: 'configuration', label: t('nav.configuration'), items: configurationItems })
        }

        // 5. ADMINISTRACIÓN: seguridad y gobierno, siempre al final.
        if (isAdmin) {
            const systemChildren = [
                inertiaNav('/users', { label: t('nav.users'), icon: Users }),
                inertiaNav('/sessions', { label: t('nav.sessions'), icon: Monitor }),
                inertiaNav('/audit-command', { label: t('nav.auditCommand'), icon: ShieldCheck }),
                inertiaNav('/settings', { label: t('nav.settings'), icon: Settings }),
                inertiaNav('/roles', { label: t('nav.roles'), icon: ShieldCheck }),
                inertiaNav('/permissions', { label: t('nav.permissions'), icon: KeyRound }),
            ]
            const systemGroup = {
                label: t('section.system'),
                icon: Settings,
                children: systemChildren,
            }
            sections.push({ sectionId: 'system', label: t('nav.administration'), items: [systemGroup] })
        }

        return sections
    }, [
        t,
        canSeeClientsModule,
        canSeeCompany,
        canSeeCatalogs,
        canSeeIncidents,
        canSeeTicketsModule,
        canSeeMyTickets,
        isAdmin,
        user?.permissions,
        can,
    ])

    return (
        <TooltipProvider delayDuration={0}>
            <div
                className={cn(
                    'flex h-full flex-col bg-card/95 backdrop-blur-sm border-border/50',
                    'transition-[background-color,border-color,border-width,padding] duration-350 ease-[cubic-bezier(0.32,0.72,0,1)]',
                    sidebarPosition === 'right' ? 'border-l' : 'border-r'
                )}
                data-sidebar="main"
            >
                {/* Header */}
                <div
                className={cn(
                    'flex h-16 shrink-0 items-center border-b border-border/50 relative',
                    'transition-[padding] duration-350 ease-[cubic-bezier(0.32,0.72,0,1)]',
                    collapsed ? 'justify-center px-2' : 'justify-between px-3 gap-2'
                )}
            >
                {!collapsed && (
                <div
                    className={cn(
                        'flex items-center gap-2 overflow-hidden min-w-0 flex-1 transition-opacity duration-200',
                        'opacity-100 delay-75'
                    )}
                >
                    {isPortalBrand ? (
                        <TenantBrandHeader
                            tenant={tenant}
                            title={brandTitle}
                            subtitle={brandSubtitle}
                            markClassName="h-8 w-8"
                        />
                    ) : (
                        <div className="flex items-center gap-2 overflow-hidden min-w-0">
                            <TenantBrandMark tenant={tenant} className="h-8 w-8" fallbackName={t('brand.title')} />
                            <div className="flex flex-col min-w-0">
                                <span className="text-base font-bold leading-none tracking-tight truncate">
                                    {t('brand.title')}
                                </span>
                                {userClientLogoUrl ? (
                                    <img
                                        src={userClientLogoUrl}
                                        alt={userClientName ?? ''}
                                        className="mt-1 h-4 max-w-[110px] object-contain object-left"
                                    />
                                ) : userClientName ? (
                                    <span className="mt-0.5 text-[10px] text-muted-foreground font-medium truncate">
                                        {userClientName}
                                    </span>
                                ) : null}
                            </div>
                        </div>
                    )}
                </div>
                )}
                <Tooltip delayDuration={0} open={toggleBtnTooltipOpen} onOpenChange={setToggleBtnTooltipOpen}>
                    <TooltipTrigger asChild>
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                                onToggle()
                                setToggleBtnTooltipOpen(false)
                            }}
                            className="h-9 w-9 shrink-0 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors duration-200"
                            aria-label={collapsed ? t('sidebar.expand') : t('sidebar.collapse')}
                        >
                            <Menu
                                className={cn(
                                    'h-5 w-5 transition-transform duration-350 ease-[cubic-bezier(0.32,0.72,0,1)]',
                                    collapsed ? 'rotate-0' : 'rotate-90'
                                )}
                            />
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent side={collapsed ? 'bottom' : tooltipSide} sideOffset={8} className="font-medium">
                        {collapsed ? t('sidebar.expand') : t('sidebar.collapse')}
                    </TooltipContent>
                </Tooltip>
            </div>

            <ScrollArea className="flex-1 w-full min-h-0">
                <nav
                        className={cn(
                            'flex flex-col gap-4 py-4',
                            'transition-[padding] duration-350 ease-[cubic-bezier(0.32,0.72,0,1)]',
                            collapsed ? 'px-2' : 'px-3'
                        )}
                    >
                        {NAV.map((section, index) => (
                            <div key={index} className="flex flex-col gap-1">
                                <SectionTitle
                                    collapsed={collapsed}
                                    showSeparatorWhenCollapsed={index > 0}
                                >
                                    {section.label}
                                </SectionTitle>
                                <div className="flex flex-col gap-1">
                                    {section.items.map((item) => {
                                        if (item.children) {
                                            const groupActive = item.children.some((c) => {
                                                const path = navItemPath(c)
                                                return path && routeMatchesPath(pathname, path)
                                            })
                                            if (collapsed) {
                                                return (
                                                    <GroupItem
                                                        key={item.label}
                                                        label={item.label}
                                                        icon={item.icon}
                                                        collapsed
                                                        dropdownSide={dropdownSide}
                                                        tooltipSide={tooltipSide}
                                                        onNavigate={onNavigate}
                                                        defaultOpen={groupActive}
                                                        active={groupActive}
                                                    >
                                                        {item.children.map((child, childIdx) => {
                                                            if (child.type === 'separator') {
                                                                return (
                                                                    <DropdownMenuLabel key={`sep-${childIdx}-${child.label}`} className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mt-2 first:mt-0 px-2 py-1.5">
                                                                        {child.label}
                                                                    </DropdownMenuLabel>
                                                                )
                                                            }
                                                            const ChildIcon = child.icon
                                                            const childPath = navItemPath(child)
                                                            const childLinkClass =
                                                                'flex w-full items-center gap-3 px-2 py-2'
                                                            return (
                                                                <DropdownMenuItem
                                                                    key={childPath}
                                                                    asChild
                                                                    className="cursor-pointer focus:bg-accent/50"
                                                                >
                                                                    {renderNavAnchor({
                                                                        href: child.href ?? childPath,
                                                                        onNavigate,
                                                                        className: childLinkClass,
                                                                        children: (
                                                                            <>
                                                                                <ChildIcon size={ICON_SIZE} strokeWidth={ICON_STROKE} className="shrink-0 opacity-70" />
                                                                                <span className="truncate whitespace-nowrap text-sm">{child.label}</span>
                                                                            </>
                                                                        ),
                                                                    })}
                                                                </DropdownMenuItem>
                                                            )
                                                        })}
                                                    </GroupItem>
                                                )
                                            }
                                            return (
                                                <GroupItem
                                                    key={item.label}
                                                    label={item.label}
                                                    icon={item.icon}
                                                    collapsed={false}
                                                    dropdownSide={dropdownSide}
                                                    tooltipSide={tooltipSide}
                                                    onNavigate={onNavigate}
                                                    defaultOpen={groupActive}
                                                    active={groupActive}
                                                >
                                                    {item.children.map((child, childIdx) => {
                                                        if (child.type === 'separator') {
                                                            return (
                                                                <div key={`sep-${childIdx}-${child.label}`} className="px-3 pt-2 pb-0.5">
                                                                    <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/80">
                                                                        {child.label}
                                                                    </span>
                                                                </div>
                                                            )
                                                        }
                                                        if (child.external && child.href) {
                                                            return (
                                                                <SidebarExternalItem
                                                                    key={child.href}
                                                                    icon={child.icon}
                                                                    label={child.label}
                                                                    href={child.href}
                                                                    isCollapsed={false}
                                                                    tooltipSide={tooltipSide}
                                                                    onNavigate={onNavigate}
                                                                    currentPath={pathname}
                                                                />
                                                            )
                                                        }
                                                        return (
                                                            <SidebarItem
                                                                key={child.to ?? child.href}
                                                                icon={child.icon}
                                                                label={child.label}
                                                                to={child.to ?? child.href}
                                                                isCollapsed={false}
                                                                isChild
                                                                tooltipSide={tooltipSide}
                                                                onNavigate={onNavigate}
                                                                currentPath={pathname}
                                                                exact={child.exact}
                                                            />
                                                        )
                                                    })}
                                                </GroupItem>
                                            )
                                        }
                                        if (item.external && item.href) {
                                            return (
                                                <SidebarExternalItem
                                                    key={item.href}
                                                    icon={item.icon}
                                                    label={item.label}
                                                    href={item.href}
                                                    isCollapsed={collapsed}
                                                    tooltipSide={tooltipSide}
                                                    onNavigate={onNavigate}
                                                    currentPath={pathname}
                                                />
                                            )
                                        }
                                        return (
                                            <SidebarItem
                                                key={item.to ?? item.href}
                                                icon={item.icon}
                                                label={item.label}
                                                to={item.to ?? item.href}
                                                isCollapsed={collapsed}
                                                tooltipSide={tooltipSide}
                                                onNavigate={onNavigate}
                                                currentPath={pathname}
                                                primary={item.primary}
                                                exact={item.exact}
                                            />
                                        )
                                    })}
                                </div>
                            </div>
                        ))}
                    </nav>
            </ScrollArea>

                {/* Footer: usuario actual (avatar, nombre, email, menú) — añadido para bloque inferior tipo shadcn */}
                <div
                    className={cn(
                        'flex shrink-0 border-t border-border/50 p-2',
                        'transition-[padding] duration-350 ease-[cubic-bezier(0.32,0.72,0,1)]',
                        collapsed ? 'justify-center px-2' : 'px-3'
                    )}
                >
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button
                                variant="ghost"
                                className={cn(
                                    'w-full h-auto rounded-lg py-2 transition-colors',
                                    'text-muted-foreground hover:bg-accent/50 hover:text-accent-foreground',
                                    'data-[state=open]:bg-accent data-[state=open]:text-accent-foreground',
                                    collapsed ? 'justify-center p-2' : 'justify-start gap-3 px-3'
                                )}
                            >
                                <UserAvatar
                                    name={user?.name}
                                    avatarUrl={user?.avatar_url}
                                    avatarPath={user?.avatar_path}
                                    size={collapsed ? 32 : 36}
                                    className="shrink-0 shadow-sm"
                                    status={user?.availability === 'available' ? 'online' : user?.availability === 'busy' ? 'busy' : 'offline'}
                                />
                                {!collapsed && (
                                    <div className="flex min-w-0 flex-1 flex-col items-start text-left">
                                        <span className="truncate w-full text-sm font-medium leading-tight text-foreground">
                                            {user?.name || t('user.unknown')}
                                        </span>
                                        <span className="truncate w-full text-xs leading-tight text-muted-foreground">
                                            {user?.email || ''}
                                        </span>
                                    </div>
                                )}
                                {!collapsed && <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />}
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent
                            side={sidebarPosition === 'right' ? 'left' : 'right'}
                            align="end"
                            className="w-56 bg-background/80 backdrop-blur-md border-border/60 shadow-lg"
                        >
                            <div className="flex items-center gap-2 p-2">
                                <UserAvatar
                                    name={user?.name}
                                    avatarUrl={user?.avatar_url}
                                    avatarPath={user?.avatar_path}
                                    size={32}
                                    status={user?.availability === 'available' ? 'online' : user?.availability === 'busy' ? 'busy' : 'offline'}
                                />
                                <div className="flex flex-col space-y-0.5 min-w-0">
                                    <p className="text-sm font-medium leading-none truncate">{user?.name}</p>
                                    <p className="text-xs text-muted-foreground leading-none truncate w-40">{user?.email}</p>
                                </div>
                            </div>
                            <DropdownMenuSeparator className="bg-border/50" />
                            <DropdownMenuLabel className="text-[10px] font-bold uppercase text-muted-foreground flex items-center gap-1.5 py-1.5">
                                <CircleDot className="h-3 w-3" />
                                {t('status.label')}
                            </DropdownMenuLabel>
                            {[
                                { value: 'available', label: t('status.available') },
                                { value: 'busy', label: t('status.busy') },
                                { value: 'disconnected', label: t('status.disconnected') },
                            ].map((opt) => {
                                const isActive = (user?.availability || 'disconnected') === opt.value
                                return (
                                    <DropdownMenuItem
                                        key={opt.value}
                                        onClick={() => {
                                            axios.put('/api/profile/preferences', { availability: opt.value })
                                                .then(() => updateUserPrefs({ availability: opt.value }))
                                                .catch(() => {})
                                        }}
                                        className="cursor-pointer gap-2"
                                    >
                                        {isActive ? <Check className="h-4 w-4 shrink-0 text-primary" /> : <span className="w-4 shrink-0" />}
                                        <span>{opt.label}</span>
                                    </DropdownMenuItem>
                                )
                            })}
                            <DropdownMenuSeparator className="bg-border/50" />
                            <DropdownMenuItem asChild className="cursor-pointer gap-2">
                                <InertiaLink href="/profile" preserveScroll className="flex items-center gap-2">
                                    <UserCircle className="h-4 w-4 shrink-0" />
                                    <span>{t('layout.profile')}</span>
                                </InertiaLink>
                            </DropdownMenuItem>
                            <DropdownMenuItem asChild className="cursor-pointer gap-2">
                                <InertiaLink href="/settings" preserveScroll className="flex items-center gap-2">
                                    <Settings className="h-4 w-4 shrink-0" />
                                    <span>{t('nav.settings')}</span>
                                </InertiaLink>
                            </DropdownMenuItem>
                            <DropdownMenuSeparator className="bg-border/50" />
                            <DropdownMenuItem
                                onClick={logout}
                                className={menuItemDestructive}
                            >
                                <LogOut className="h-4 w-4 shrink-0" />
                                <span>{t('layout.logout')}</span>
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </div>
        </TooltipProvider>
    )
}
