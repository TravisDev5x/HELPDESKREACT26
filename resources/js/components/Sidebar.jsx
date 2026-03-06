import React, { useState, useMemo } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import axios from '@/lib/axios'
import { useSidebarPosition } from '@/context/SidebarPositionContext'
import { useI18n } from '@/hooks/useI18n'
import { cn } from '@/lib/utils'

import { Button } from '@/components/ui/button'
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '@/components/ui/tooltip'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { UserAvatar } from '@/components/user-avatar'

import {
    Home,
    Clock,
    CalendarDays,
    AlertTriangle,
    Ticket,
    Shield,
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
    MoreHorizontal,
    LayoutDashboard,
    UserCircle,
    Layers,
    FileCheck,
    BookOpen,
    Upload,
    GitMerge,
    Bell,
    FileSpreadsheet,
    Workflow,
    Tags,
    Megaphone,
    Activity,
    LogIn,
    Link2,
    Briefcase,
    Network,
    MapPin,
    SignalHigh,
    KeyRound,
    Grid3X3,
    FileText,
} from 'lucide-react'

const ICON_SIZE = 20
const ICON_STROKE = 2

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
}) => {
    const linkEl = (
        <NavLink
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
                cn(
                    'flex items-center rounded-md transition-colors min-w-0',
                    isCollapsed ? 'justify-center h-10 w-10 p-0 shrink-0' : 'gap-3 px-3 py-2 justify-start w-full',
                    isActive
                        ? 'bg-accent text-accent-foreground'
                        : 'text-muted-foreground hover:bg-accent/50 hover:text-accent-foreground',
                    isChild && !isCollapsed && 'ml-4 pl-3 border-l border-border/40'
                )
            }
        >
            {({ isActive }) => (
                <>
                    <Icon size={ICON_SIZE} strokeWidth={ICON_STROKE} className="shrink-0 flex-shrink-0" />
                    {!isCollapsed && (
                        <span className="truncate whitespace-nowrap text-sm font-medium">{label}</span>
                    )}
                </>
            )}
        </NavLink>
    )

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
function GroupItem({ label, icon: Icon, children, collapsed, dropdownSide = 'right', tooltipSide = 'right' }) {
    const [open, setOpen] = useState(false)

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
                                        'text-muted-foreground hover:bg-accent/50 hover:text-accent-foreground',
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
        <div className="flex flex-col gap-1">
            <Button
                variant="ghost"
                className={cn(
                    'w-full justify-between h-10 px-3 font-normal rounded-md transition-colors',
                    'text-muted-foreground hover:bg-accent/50 hover:text-accent-foreground'
                )}
                onClick={() => setOpen(!open)}
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
            <div
                className={cn(
                    'grid transition-all duration-300 ease-in-out',
                    open ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
                )}
            >
                <div className="overflow-hidden flex flex-col gap-1">{children}</div>
            </div>
        </div>
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
export function Sidebar({ collapsed, onToggle }) {
    const { user, logout, updateUserPrefs } = useAuth()
    const { t } = useI18n()
    const navigate = useNavigate()
    const { position: sidebarPosition } = useSidebarPosition()
    const tooltipSide = sidebarPosition === 'right' ? 'left' : 'right'
    const dropdownSide = sidebarPosition === 'right' ? 'left' : 'right'

    const [toggleBtnTooltipOpen, setToggleBtnTooltipOpen] = useState(false)

    const can = (permission) => Boolean(user?.permissions?.includes(permission))

    const canSeeCatalogs = can('catalogs.manage') || can('tickets.view_area') || can('tickets.manage_all')
    const canSeeIncidents = can('incidents.view_own') || can('incidents.view_area') || can('incidents.manage_all')
    const canSeeTicketsModule = can('tickets.manage_all') || can('tickets.view_area')
    const canSeeMyTickets =
        (can('tickets.create') || can('tickets.view_own')) &&
        (can('tickets.manage_all') || can('tickets.view_area'))
    const isAdmin = can('users.manage')
    const canSeeSigua = can('sigua.dashboard')

    const NAV = useMemo(() => {
        const sections = []

        // BLOQUE 1: GENERAL (todos pueden crear ticket y ver sus tickets)
        const generalItems = [
            { to: '/', label: t('nav.home'), icon: Home, emphasis: true },
            { to: '/calendario', label: t('nav.calendar'), icon: CalendarDays, emphasis: true },
            { to: '/resolbeb/mis-tickets', label: t('nav.myTickets'), icon: Ticket, emphasis: true },
            { to: '/resolbeb/tickets/new', label: 'Crear ticket', icon: Layers, emphasis: true },
        ]
        sections.push({ label: 'GENERAL', items: generalItems })

        // BLOQUE 2: MÓDULOS — RESOLBEB, TIMEDESK, SIGUA (SIGUA solo si admin/permiso)
        const moduleItems = []

        const canSeeResolbeb = canSeeTicketsModule || canSeeMyTickets
        const resolbebChildren = []
        if (canSeeResolbeb) {
            // — Tickets
            resolbebChildren.push({ to: '/resolbeb', label: 'Dashboard', icon: LayoutDashboard })
            if (canSeeMyTickets) resolbebChildren.push({ to: '/resolbeb/mis-tickets', label: t('nav.myTickets'), icon: Ticket })
            if (canSeeTicketsModule) resolbebChildren.push({ to: '/resolbeb/tickets', label: t('nav.tickets'), icon: Ticket })
            if (can('tickets.create') || can('tickets.manage_all'))
                resolbebChildren.push({ to: '/resolbeb/tickets/new', label: 'Nuevo ticket', icon: Layers })
            // Catálogos de tickets (separador para no mezclar con incidencias)
            if (canSeeCatalogs) {
                resolbebChildren.push({ type: 'separator', label: t('nav.catalogsTickets') })
                resolbebChildren.push({ to: '/resolbeb/estados', label: t('nav.ticketStates'), icon: Workflow })
                resolbebChildren.push({ to: '/resolbeb/tipos', label: t('nav.ticketTypes'), icon: Tags })
                resolbebChildren.push({ to: '/priorities', label: t('nav.priorities'), icon: SignalHigh })
                resolbebChildren.push({ to: '/impact-levels', label: 'Niveles de impacto', icon: SignalHigh })
                resolbebChildren.push({ to: '/urgency-levels', label: 'Niveles de urgencia', icon: SignalHigh })
                resolbebChildren.push({ to: '/priority-matrix', label: 'Matriz de prioridades', icon: Grid3X3 })
                resolbebChildren.push({ to: '/ticket-macros', label: 'Plantillas de respuesta', icon: FileText })
            }
            // — Incidencias (dentro de Resolbeb) y sus catálogos
            if (canSeeIncidents) {
                resolbebChildren.push({ type: 'separator', label: t('nav.incidents') })
                resolbebChildren.push({ to: '/incidents', label: t('nav.incidents'), icon: AlertTriangle })
                resolbebChildren.push({ type: 'separator', label: t('nav.catalogsIncidents') })
                resolbebChildren.push({ to: '/incident-types', label: t('nav.incidentTypes'), icon: Tags })
                resolbebChildren.push({ to: '/incident-severities', label: t('nav.severities'), icon: SignalHigh })
                resolbebChildren.push({ to: '/incident-statuses', label: t('nav.incidentStates'), icon: Workflow })
            }
        }
        if (canSeeResolbeb && resolbebChildren.length > 0) {
            moduleItems.push({
                label: t('nav.resolbeb'),
                icon: Ticket,
                emphasis: false,
                children: resolbebChildren,
            })
        }

        if (canSeeSigua) {
            const siguaChildren = []
            if (can('sigua.dashboard')) siguaChildren.push({ to: '/sigua', label: 'Dashboard', icon: LayoutDashboard })
            if (can('sigua.cuentas.view')) siguaChildren.push({ to: '/sigua/cuentas', label: 'Cuentas Genéricas', icon: Users })
            if (can('sigua.dashboard') || can('sigua.cuentas.view'))
                siguaChildren.push({ to: '/sigua/empleados-rh', label: 'Empleados RH', icon: UserCircle })
            if (can('sigua.cuentas.manage') || can('sigua.importar'))
                siguaChildren.push({ to: '/sigua/sistemas', label: 'Sistemas', icon: Layers })
            if (can('sigua.ca01.view')) siguaChildren.push({ to: '/sigua/ca01', label: 'Formatos CA-01', icon: FileCheck })
            if (can('sigua.bitacora.view') || can('sigua.bitacora.registrar') || can('sigua.bitacora.sede'))
                siguaChildren.push({ to: '/sigua/bitacora', label: 'Bitácora CA-02', icon: BookOpen })
            if (can('sigua.incidentes.view')) siguaChildren.push({ to: '/sigua/incidentes', label: 'Incidentes', icon: AlertTriangle })
            if (can('sigua.importar')) siguaChildren.push({ to: '/sigua/importar', label: 'Importar Datos', icon: Upload })
            if (can('sigua.cruces')) siguaChildren.push({ to: '/sigua/cruces', label: 'Cruces RH/AD', icon: GitMerge })
            if (can('sigua.dashboard') || can('sigua.cuentas.view'))
                siguaChildren.push({ to: '/sigua/alertas', label: 'Alertas', icon: Bell })
            if (can('sigua.dashboard') || can('sigua.cuentas.manage') || can('sigua.importar'))
                siguaChildren.push({ to: '/sigua/configuracion', label: 'Configuración', icon: Settings })
            if (can('sigua.reportes')) siguaChildren.push({ to: '/sigua/reportes', label: 'Reportes', icon: FileSpreadsheet })
            if (siguaChildren.length > 0) {
                moduleItems.push({
                    label: 'SIGUA',
                    icon: Shield,
                    emphasis: false,
                    children: siguaChildren,
                })
            }
        }

        if (moduleItems.length > 0) {
            sections.push({ label: 'MÓDULOS', items: moduleItems })
        }

        // BLOQUE: CATÁLOGOS (colapsable como los demás módulos; sin Roles ni Permisos, van en Sistema)
        const catalogChildren = [
            { to: '/campaigns', label: t('nav.campaigns'), icon: Megaphone },
            { to: '/sedes', label: t('nav.sedes'), icon: MapPin },
            { to: '/areas', label: t('nav.areas'), icon: Network },
            { to: '/positions', label: t('nav.positions'), icon: Briefcase },
            { to: '/ubicaciones', label: t('nav.ubicaciones'), icon: MapPin },
        ]
        const catalogGroup = {
            label: t('nav.catalogs'),
            icon: Layers,
            children: catalogChildren,
        }
        sections.push({ label: 'CATÁLOGOS', items: [catalogGroup] })

        // BLOQUE 3: SISTEMA (solo administradores; colapsable; incluye Roles y Permisos)
        if (isAdmin) {
            const systemChildren = [
                { to: '/users', label: t('nav.users'), icon: Users },
                { to: '/sessions', label: t('nav.sessions'), icon: Monitor },
                { to: '/audit-command', label: 'Centro de auditoría', icon: ShieldCheck },
                { to: '/settings', label: t('nav.settings'), icon: Settings },
                { to: '/roles', label: t('nav.roles'), icon: ShieldCheck },
                { to: '/permissions', label: t('nav.permissions'), icon: KeyRound },
            ]
            const systemGroup = {
                label: 'Sistema',
                icon: Settings,
                children: systemChildren,
            }
            sections.push({ label: 'SISTEMA', items: [systemGroup] })
        }

        return sections
    }, [
        t,
        canSeeCatalogs,
        canSeeIncidents,
        canSeeTicketsModule,
        canSeeMyTickets,
        isAdmin,
        canSeeSigua,
        user?.permissions,
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
                <div
                    className={cn(
                        'flex items-center gap-2 overflow-hidden min-w-0 flex-1 transition-opacity duration-200',
                        collapsed
                            ? 'opacity-0 w-0 min-w-0 overflow-hidden absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none'
                            : 'opacity-100 delay-75'
                    )}
                >
                    <div className="flex shrink-0 items-center justify-center h-8 w-8 rounded-lg bg-primary text-primary-foreground shadow-md">
                        <ShieldCheck className="h-4 w-4" />
                    </div>
                    <div className="flex flex-col min-w-0">
                        <span className="text-sm font-bold leading-none tracking-tight truncate">
                            {t('brand.title')}
                        </span>
                        <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-widest mt-0.5 opacity-80 truncate">
                            {t('brand.subtitle')}
                        </span>
                    </div>
                </div>
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
                            aria-label={collapsed ? 'Expandir barra' : 'Colapsar barra'}
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
                        {collapsed ? 'Expandir barra' : 'Colapsar barra'}
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
                                {collapsed && section.label === 'MÓDULOS' && (
                                    <div className="flex justify-center py-1">
                                        <MoreHorizontal size={ICON_SIZE} strokeWidth={ICON_STROKE} className="shrink-0 text-muted-foreground/40" />
                                    </div>
                                )}
                                <div className={cn(
                                    'flex flex-col gap-1',
                                    collapsed && section.label === 'MÓDULOS' && 'items-center'
                                )}>
                                    {section.items.map((item) => {
                                        if (item.children) {
                                            if (collapsed) {
                                                return (
                                                    <GroupItem
                                                        key={item.label}
                                                        label={item.label}
                                                        icon={item.icon}
                                                        collapsed
                                                        dropdownSide={dropdownSide}
                                                        tooltipSide={tooltipSide}
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
                                                            return (
                                                                <DropdownMenuItem
                                                                    key={child.to}
                                                                    asChild
                                                                    className="cursor-pointer focus:bg-accent/50"
                                                                >
                                                                    <NavLink to={child.to} className="flex w-full items-center gap-3 px-2 py-2">
                                                                        <ChildIcon size={ICON_SIZE} strokeWidth={ICON_STROKE} className="shrink-0 opacity-70" />
                                                                        <span className="truncate whitespace-nowrap text-sm">{child.label}</span>
                                                                    </NavLink>
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
                                                        return (
                                                            <SidebarItem
                                                                key={child.to}
                                                                icon={child.icon}
                                                                label={child.label}
                                                                to={child.to}
                                                                isCollapsed={false}
                                                                isChild
                                                                tooltipSide={tooltipSide}
                                                            />
                                                        )
                                                    })}
                                                </GroupItem>
                                            )
                                        }
                                        return (
                                            <SidebarItem
                                                key={item.to}
                                                icon={item.icon}
                                                label={item.label}
                                                to={item.to}
                                                isCollapsed={collapsed}
                                                tooltipSide={tooltipSide}
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
                                            {user?.name || 'Usuario'}
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
                                Estado
                            </DropdownMenuLabel>
                            {[
                                { value: 'available', label: 'Disponible' },
                                { value: 'busy', label: 'Ocupado' },
                                { value: 'disconnected', label: 'Desconectado' },
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
                            <DropdownMenuItem onClick={() => navigate('/profile')} className="cursor-pointer gap-2">
                                <UserCircle className="h-4 w-4 shrink-0" />
                                <span>{t('layout.profile')}</span>
                            </DropdownMenuItem>
                            <DropdownMenuSeparator className="bg-border/50" />
                            <DropdownMenuItem
                                onClick={logout}
                                className="cursor-pointer text-red-600 focus:text-red-600 focus:bg-red-50 dark:focus:bg-red-950/20 gap-2"
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
