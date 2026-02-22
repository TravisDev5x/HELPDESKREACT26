import React, { useEffect, useRef, useState } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { useSidebarPosition } from '@/context/SidebarPositionContext'
import { useTheme } from '@/hooks/useTheme'
import { useI18n } from '@/hooks/useI18n'
import axios from '@/lib/axios'
import { cn } from '@/lib/utils'

// --- SHADCN COMPONENTS (Asegurados) ---
import { Button, buttonVariants } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { UserAvatar } from '@/components/user-avatar'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'

// --- ICONS ---
import {
    LayoutDashboard, Users, ShieldCheck, Megaphone, Network, BadgeCheck,
    Building2, MapPinHouse, MapPinned, SignalHigh, Workflow, Tags,
    KeyRound, Ticket, AlertTriangle, Settings, Menu, UserCircle,
    LogOut, Sun, Moon, ChevronsLeft, ChevronsRight, ChevronDown,
    ChevronRight, Bell, BellOff, Layers, Shield, Maximize2,
    Minimize2, Square, SquareDashed, MoreHorizontal, Monitor, Check, CircleDot
} from 'lucide-react'

// ----------------------------------------------------------------------
// SUB-COMPONENTE: SidebarItem (Link Simple)
// ----------------------------------------------------------------------
// ----------------------------------------------------------------------
// SUB-COMPONENTE: SidebarItem (Link Simple - SHADCN STRICT)
// ----------------------------------------------------------------------
const SidebarItem = ({ item, collapsed, isChild = false, tooltipSide = 'right' }) => {
    const Icon = item.icon
    const emphasis = Boolean(item.emphasis)
    const iconButtonBase = "h-9 w-9 rounded-md grid place-items-center shrink-0 p-0 gap-0 leading-none"
    const iconSize = emphasis ? "!h-5 !w-5" : isChild ? "!h-3.5 !w-3.5" : "!h-4 !w-4"
    const mutedColor = isChild ? "text-muted-foreground/50" : "text-muted-foreground/70"

    // MODO COLAPSADO
    if (collapsed) {
        return (
            <Tooltip delayDuration={0}>
                <TooltipTrigger asChild>
                    <NavLink
                        to={item.to}
                        end={item.to === '/'}
                        className={({ isActive }) => cn(
                            buttonVariants({ variant: isActive ? "secondary" : "ghost", size: "icon" }),
                            iconButtonBase,
                            isActive ? "text-foreground" : "text-muted-foreground"
                        )}
                    >
                        {({ isActive }) => (
                            <>
                                <Icon className={cn("shrink-0", iconSize, isActive ? "text-foreground" : (emphasis ? "text-foreground" : mutedColor))} />
                                <span className="sr-only">{item.label}</span>
                            </>
                        )}
                    </NavLink>
                </TooltipTrigger>
                <TooltipContent side={tooltipSide} sideOffset={10} className="font-medium bg-popover text-popover-foreground">
                    {item.label}
                </TooltipContent>
            </Tooltip>
        )
    }

    // MODO EXPANDIDO
    return (
        <NavLink
            to={item.to}
            end={item.to === '/'}
            className={({ isActive }) => cn(
                buttonVariants({ variant: isActive ? "secondary" : "ghost", size: "sm" }),
                "w-full justify-start gap-2",
                isActive ? "text-foreground" : "text-muted-foreground",
                isChild && "ml-4 pl-4 border-l border-border/40"
            )}
        >
            {({ isActive }) => (
                <>
                    <Icon className={cn("shrink-0", iconSize, isActive ? "text-foreground" : (emphasis ? "text-foreground" : mutedColor))} />
                    <span className="truncate">{item.label}</span>
                </>
            )}
        </NavLink>
    )
}

// ----------------------------------------------------------------------
// SUB-COMPONENTE: GroupItem (Grupo con Hijos)
// ----------------------------------------------------------------------
// ----------------------------------------------------------------------
// SUB-COMPONENTE: GroupItem (Grupo - SHADCN STRICT)
// ----------------------------------------------------------------------
function GroupItem({ label, icon: Icon, children, collapsed, emphasis = false, dropdownSide = 'right', tooltipSide = 'right' }) {
    const [open, setOpen] = useState(false)
    const iconButtonBase = "h-9 w-9 rounded-md grid place-items-center shrink-0 p-0 gap-0 leading-none"
    const iconSize = emphasis ? "!h-5 !w-5" : "!h-4 !w-4"
    const iconColor = emphasis ? "text-foreground" : "text-muted-foreground/70"

    // MODO COLAPSADO: Dropdown Menu
    if (collapsed) {
        return (
            <DropdownMenu>
                <Tooltip delayDuration={0}>
                    <TooltipTrigger asChild>
                        <DropdownMenuTrigger asChild>
                            <Button
                                variant="ghost"
                                size="icon"
                                className={cn(
                                    iconButtonBase,
                                    // CORRECCIÓN CLAVE: Asegurar texto visible y fondo transparente
                                    "text-muted-foreground bg-transparent",
                                    "hover:bg-accent hover:text-accent-foreground",
                                    // Estado abierto del dropdown (data-state=open)
                                    "data-[state=open]:bg-accent data-[state=open]:text-accent-foreground"
                                )}
                            >
                                <Icon className={cn("shrink-0", iconSize, iconColor)} />
                            </Button>
                        </DropdownMenuTrigger>
                    </TooltipTrigger>
                    <TooltipContent side={tooltipSide} sideOffset={10}>
                        {label}
                    </TooltipContent>
                </Tooltip>

                <DropdownMenuContent side={dropdownSide} align="start" className="w-56 ml-2 p-1">
                    <DropdownMenuLabel className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-2 py-1.5">
                        {label}
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    {children}
                </DropdownMenuContent>
            </DropdownMenu>
        )
    }

    // MODO EXPANDIDO: Acordeón
    return (
        <div className="space-y-1">
            <Button
                variant="ghost"
                className={cn(
                    "w-full justify-between px-3 h-9 font-normal hover:bg-accent hover:text-accent-foreground",
                    "text-muted-foreground" // Por defecto color apagado
                )}
                onClick={() => setOpen(!open)}
            >
                <span className="flex items-center text-sm font-medium">
                    <Icon className={cn("mr-2 shrink-0", iconSize, iconColor)} />
                    {label}
                </span>
                <ChevronDown
                    className={cn(
                        "h-3.5 w-3.5 transition-transform duration-200 opacity-50",
                        open ? "rotate-0" : "-rotate-90"
                    )}
                />
            </Button>
            <div
                className={cn(
                    "grid transition-all duration-300 ease-in-out",
                    open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
                )}
            >
                <div className="overflow-hidden space-y-1">
                    {children}
                </div>
            </div>
        </div>
    )
}

// ----------------------------------------------------------------------
// COMPONENTE: Sidebar Container
// ----------------------------------------------------------------------
function Sidebar({ collapsed, onToggle, nav, sidebarPosition = 'left' }) {
    const { user } = useAuth()
    const { t } = useI18n()
    const tooltipSide = sidebarPosition === 'right' ? 'left' : 'right'
    const dropdownSide = sidebarPosition === 'right' ? 'left' : 'right'

    // Catálogos colapsados por defecto; estado persistido en localStorage
    const [catalogsOpen, setCatalogsOpen] = useState(() => {
        if (typeof window === 'undefined') return false
        try {
            const v = localStorage.getItem('sidebar-catalogs-open')
            return v === '1'
        } catch {
            return false
        }
    })

    const toggleCatalogsOpen = () => {
        setCatalogsOpen(prev => {
            const next = !prev
            try {
                localStorage.setItem('sidebar-catalogs-open', next ? '1' : '0')
            } catch { /* ignore */ }
            return next
        })
    }

    const [toggleBtnTooltipOpen, setToggleBtnTooltipOpen] = useState(false)

    return (
        <div className={cn(
            "flex h-full flex-col bg-card/95 backdrop-blur-sm border-border/50",
            "transition-[background-color,border-color,border-width,padding] duration-300 ease-out",
            sidebarPosition === 'right' ? "border-l" : "border-r"
        )} data-sidebar="main">
            {/* --- HEADER: colapsada = solo hamburguesa; expandida = logo + título + hamburguesa --- */}
            <div className={cn(
                "flex h-16 shrink-0 items-center border-b border-border/50 transition-[padding] duration-300 ease-out",
                collapsed ? "justify-center px-2" : "justify-between px-3 gap-2"
            )}>
                {!collapsed && (
                    <div className="flex items-center gap-2 overflow-hidden min-w-0 flex-1">
                        <div className="flex shrink-0 items-center justify-center h-8 w-8 rounded-lg bg-primary text-primary-foreground shadow-md">
                            <ShieldCheck className="h-4 w-4" />
                        </div>
                        <div className="flex flex-col min-w-0 animate-in fade-in slide-in-from-left-2 duration-300">
                            <span className="text-sm font-bold leading-none tracking-tight truncate">{t('brand.title')}</span>
                            <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-widest mt-0.5 opacity-80 truncate">{t('brand.subtitle')}</span>
                        </div>
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
                            aria-label={collapsed ? 'Expandir barra' : 'Colapsar barra'}
                        >
                            <Menu className={cn(
                                "h-5 w-5 transition-transform duration-300 ease-out",
                                collapsed ? "rotate-0" : "rotate-90"
                            )} />
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent side={collapsed ? "bottom" : tooltipSide} sideOffset={8} className="font-medium">
                        {collapsed ? 'Expandir barra' : 'Colapsar barra'}
                    </TooltipContent>
                </Tooltip>
            </div>

            {/* --- SCROLL AREA --- */}
            <ScrollArea className="flex-1 w-full min-h-0">
                <nav className={cn("grid gap-4 py-4 transition-[padding] duration-300 ease-out", collapsed ? "px-2" : "px-3")}>
                    {nav.map((section, index) => {
                        const isCatalogs = section.label === t('nav.catalogs')
                        const showSection = !isCatalogs || catalogsOpen

                        return (
                            <div key={index} className="space-y-1">
                                {/* Título de Sección */}
                                {!collapsed && (
                                    <div className="flex items-center px-2 mb-2 group">
                                        {isCatalogs ? (
                                            <button
                                                onClick={toggleCatalogsOpen}
                                                className="flex w-full items-center justify-between text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50 hover:text-foreground transition-colors"
                                            >
                                                {section.label}
                                                <ChevronDown className={cn("h-3 w-3 transition-transform opacity-0 group-hover:opacity-100", !catalogsOpen && "-rotate-90")} />
                                            </button>
                                        ) : (
                                            <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50">
                                                {section.label}
                                            </span>
                                        )}
                                    </div>
                                )}

                                {collapsed && isCatalogs && (
                                    <div className="flex justify-center py-2">
                                        <MoreHorizontal className="h-4 w-4 text-muted-foreground/30" />
                                    </div>
                                )}

                                {/* Items de la sección */}
                                {showSection && (
                                    <div className={cn("space-y-1", collapsed && "space-y-2 flex flex-col items-center")}>
                                        {section.items.map((item) => {
                                            if (item.children) {
                                                // GRUPO
                                                if (collapsed) {
                                                    return (
                                                        <GroupItem key={item.label} label={item.label} icon={item.icon} collapsed={true} emphasis={item.emphasis} dropdownSide={dropdownSide} tooltipSide={tooltipSide}>
                                                            {item.children.map(child => (
                                                                <DropdownMenuItem key={child.to} asChild className="cursor-pointer focus:bg-primary/10">
                                                                    <NavLink to={child.to} className="flex w-full items-center gap-2">
                                                                        <child.icon className="h-4 w-4 opacity-70" />
                                                                        <span>{child.label}</span>
                                                                    </NavLink>
                                                                </DropdownMenuItem>
                                                            ))}
                                                        </GroupItem>
                                                    )
                                                }
                                                return (
                                                    <GroupItem key={item.label} label={item.label} icon={item.icon} collapsed={false} emphasis={item.emphasis} dropdownSide={dropdownSide} tooltipSide={tooltipSide}>
                                                        {item.children.map(child => (
                                                            <SidebarItem key={child.to} item={child} collapsed={false} isChild={true} tooltipSide={tooltipSide} />
                                                        ))}
                                                    </GroupItem>
                                                )
                                            }
                                            // ITEM INDIVIDUAL
                                            return <SidebarItem key={item.to} item={item} collapsed={collapsed} tooltipSide={tooltipSide} />
                                        })}
                                    </div>
                                )}
                            </div>
                        )
                    })}
                </nav>
            </ScrollArea>
        </div>
    )
}

// ----------------------------------------------------------------------
// COMPONENTE PRINCIPAL: AppLayout
// ----------------------------------------------------------------------
export default function AppLayout() {
    const { pathname } = useLocation()
    const navigate = useNavigate()
    const themeContext = useTheme()
    const { t } = useI18n()
    const { user, logout, refreshUser, can, updateUserPrefs } = useAuth()
    const [notifications, setNotifications] = useState([])
    const [notifOpen, setNotifOpen] = useState(false)

    // Sidebar colapsada por defecto; expandida si el usuario lo guardó explícitamente
    const [collapsed, setCollapsed] = useState(() => {
        if (typeof window === 'undefined') return true
        const local = localStorage.getItem('sidebar-collapsed')
        if (local !== null) return local === '1'
        if (user?.sidebar_state !== undefined && user?.sidebar_state !== null) return user.sidebar_state === 'collapsed'
        return true
    })
    const [fullscreen, setFullscreen] = useState(() => {
        if (typeof document === 'undefined') return false
        return !!document.fullscreenElement
    })
    const [focused, setFocused] = useState(() => {
        if (typeof window === 'undefined') return false
        return localStorage.getItem('layout-focused') === '1'
    })

    const [hoverPreviewEnabled, setHoverPreviewEnabled] = useState(() => user?.sidebar_hover_preview ?? true)
    const hoverTempExpandRef = useRef(false)
    const { position: sidebarPosition } = useSidebarPosition()

    // Efectos de Sincronización
    useEffect(() => {
        if (typeof user?.sidebar_state !== 'undefined') setCollapsed(user.sidebar_state === 'collapsed')
        if (typeof user?.sidebar_hover_preview !== 'undefined') setHoverPreviewEnabled(user.sidebar_hover_preview)
    }, [user?.sidebar_state, user?.sidebar_hover_preview])

    const isDark = themeContext?.isDark ?? false
    const cycleLight = themeContext?.cycleLight ?? (() => { })
    const cycleDark = themeContext?.cycleDark ?? (() => { })
    const mustChangePassword = Boolean(user?.force_password_change)

    useEffect(() => {
        if (hoverTempExpandRef.current) return
        if (typeof window !== 'undefined') {
            localStorage.setItem('sidebar-collapsed', collapsed ? '1' : '0')
            localStorage.setItem('layout-focused', focused ? '1' : '0')
        }
        if (user) {
            axios.put('/api/profile/sidebar', {
                sidebar_state: collapsed ? 'collapsed' : 'expanded',
                sidebar_hover_preview: hoverPreviewEnabled,
            }).catch(() => { })
        }
    }, [collapsed, hoverPreviewEnabled, user, focused])

    // Fetch Notifications
    useEffect(() => {
        const loadNotifs = async () => {
            try {
                const { data } = await axios.get('/api/notifications')
                setNotifications(data || [])
            } catch (_) {}
        }
        loadNotifs()
        const id = setInterval(loadNotifs, 60000)
        return () => clearInterval(id)
    }, [])

    // Heartbeat: actualiza last_activity de la sesión cada 2 min para que el monitor de sesiones sea más preciso
    useEffect(() => {
        if (!user) return
        const HEARTBEAT_MS = 2 * 60 * 1000
        const t = setInterval(() => axios.get('/api/ping').catch(() => {}), HEARTBEAT_MS)
        return () => clearInterval(t)
    }, [user])

    const toggleFullscreen = async () => {
        try {
            if (!document.fullscreenElement) {
                await document.documentElement.requestFullscreen()
                setFullscreen(true)
            } else {
                await document.exitFullscreen()
                setFullscreen(false)
            }
        } catch (err) {
            console.warn('Fullscreen error', err)
        }
    }

    const unreadCount = notifications.filter(n => !n.read_at).length
    const markAllRead = async () => {
        try {
            await axios.post('/api/notifications/read-all')
            setNotifications((prev) => prev.map((n) => ({ ...n, read_at: new Date().toISOString() })))
        } catch (_) {}
    }

    // --- CONFIGURACIÓN DE NAVEGACIÓN ---
    const NAV = React.useMemo(() => ([
        {
            label: t('nav.general'),
            items: [
                { to: '/', label: t('nav.home'), icon: LayoutDashboard, emphasis: true },
                { to: '/tickets', label: 'Tickets', icon: Ticket, emphasis: true },
                { to: '/incidents', label: 'Incidencias', icon: AlertTriangle, emphasis: true },
                { to: '/users', label: t('nav.users'), icon: Users, emphasis: true },
            ],
        },
        {
            label: t('nav.catalogs'),
            items: [
                {
                    label: 'Catálogos de Tickets',
                    icon: Layers,
                    children: [
                        { to: '/priorities', label: 'Prioridades', icon: SignalHigh },
                        { to: '/ticket-states', label: 'Estados de Ticket', icon: Workflow },
                        { to: '/ticket-types', label: 'Tipos de Ticket', icon: Tags },
                    ],
                },
                {
                    label: 'Catálogos de Incidencias',
                    icon: AlertTriangle,
                    children: [
                        { to: '/incident-types', label: 'Tipos de Incidencia', icon: Tags },
                        { to: '/incident-severities', label: 'Severidades', icon: SignalHigh },
                        { to: '/incident-statuses', label: 'Estados de Incidencia', icon: Workflow },
                    ],
                },
                {
                    label: 'Organización',
                    icon: Building2,
                    children: [
                        { to: '/campaigns', label: t('nav.campaigns'), icon: Megaphone },
                        { to: '/areas', label: t('nav.areas'), icon: Network },
                        { to: '/positions', label: t('nav.positions'), icon: BadgeCheck },
                        { to: '/sedes', label: 'Sedes', icon: MapPinHouse },
                        { to: '/ubicaciones', label: 'Ubicaciones', icon: MapPinned },
                    ],
                },
                {
                    label: 'Seguridad',
                    icon: Shield,
                    children: [
                        { to: '/roles', label: t('nav.roles'), icon: ShieldCheck },
                        { to: '/permissions', label: t('nav.permissions'), icon: KeyRound },
                    ],
                },
            ],
        },
        {
            label: t('nav.system'),
            items: [
                ...(can('users.manage') ? [{ to: '/sessions', label: 'Sesiones activas', icon: Monitor }] : []),
                { to: '/settings', label: t('nav.settings'), icon: Settings },
            ],
        },
    ]), [t, can])

    const titleMap = {
        '/': t('nav.home'),
        '/users': t('nav.users'),
        '/campaigns': t('nav.campaigns'),
        '/areas': t('nav.areas'),
        '/positions': t('nav.positions'),
        '/roles': t('nav.roles'),
        '/permissions': t('nav.permissions'),
        '/settings': t('nav.settings'),
        '/sessions': 'Sesiones activas',
        '/sedes': 'Sedes',
        '/ubicaciones': 'Ubicaciones',
        '/tickets': 'Gestión de Tickets',
        '/incidents': 'Gestión de Incidencias',
        '/profile': t('layout.profile'),
    }
    const title = titleMap[pathname] ?? t('layout.section.default')

    const pendingAdmin = user?.status === 'pending_admin'

    // Cuando está pendiente de rol, refrescar usuario cada 25s para quitar overlay al asignar rol
    useEffect(() => {
        if (!pendingAdmin) return
        const id = setInterval(refreshUser, 25000)
        return () => clearInterval(id)
    }, [pendingAdmin, refreshUser])

    return (
        <TooltipProvider>
            <div
                className={cn(
                    "flex h-screen w-full overflow-hidden bg-background text-foreground font-sans selection:bg-primary/20",
                    sidebarPosition === 'right' && "flex-row-reverse"
                )}
                data-sidebar-position={sidebarPosition}
            >
                {/* Overlay para usuarios pendientes de rol: blur + mensaje */}
                {pendingAdmin && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background/70 backdrop-blur-md">
                        <div className="mx-4 max-w-md rounded-2xl border border-border/60 bg-card/95 p-8 shadow-xl backdrop-blur-sm text-center">
                            <div className="mb-4 flex justify-center">
                                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
                                    <ShieldCheck className="h-7 w-7 text-primary" />
                                </div>
                            </div>
                            <h2 className="text-xl font-bold tracking-tight text-foreground mb-2">
                                Bienvenido
                            </h2>
                            <p className="text-sm text-muted-foreground leading-relaxed">
                                Un administrador asignará un rol a tu cuenta y enseguida podrás acceder por completo.
                            </p>
                            <p className="mt-4 text-xs text-muted-foreground/80">
                                Puedes cerrar sesión cuando quieras con el botón de abajo.
                            </p>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={logout}
                                className="mt-6 gap-2"
                            >
                                <LogOut className="h-4 w-4" />
                                Cerrar sesión
                            </Button>
                        </div>
                    </div>
                )}

                {/* --- SIDEBAR --- */}
                <aside
                    className={cn(
                        "hidden md:flex flex-col z-40 overflow-hidden",
                        "transition-[width] duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] will-change-[width]",
                        (collapsed || focused) ? "w-[72px]" : "w-64"
                    )}
                    onMouseEnter={() => {
                        if (hoverPreviewEnabled && collapsed && !focused) {
                            hoverTempExpandRef.current = true
                            setCollapsed(false)
                        }
                    }}
                    onMouseLeave={() => {
                        if (hoverPreviewEnabled && hoverTempExpandRef.current) {
                            setCollapsed(true)
                            hoverTempExpandRef.current = false
                        }
                    }}
                >
                    <Sidebar collapsed={collapsed || focused} onToggle={() => setCollapsed((v) => !v)} nav={NAV} sidebarPosition={sidebarPosition} />
                </aside>

{/* --- MAIN CONTENT WRAPPER --- */}
                    <div className="flex flex-1 flex-col min-w-0 relative">

                    {/* Security Alert Banner */}
                    {mustChangePassword && (
                        <div className="w-full bg-amber-500/10 text-amber-600 dark:text-amber-500 text-sm px-6 py-2 flex items-center justify-center gap-3 border-b border-amber-500/20 z-50">
                            <AlertTriangle className="h-4 w-4" />
                            <span className="font-semibold">Seguridad: Cambio de contraseña requerido.</span>
                            <Button variant="outline" size="sm" onClick={() => navigate('/force-change-password')} className="h-7 text-xs border-amber-500/50 hover:bg-amber-500/10">
                                Cambiar
                            </Button>
                        </div>
                    )}

                    {/* --- HEADER --- */}
                    <header
                        className="sticky top-0 z-30 flex h-16 shrink-0 items-center gap-x-4 border-b border-border/40 bg-background/80 px-4 shadow-sm backdrop-blur-xl transition-all md:px-6"
                        data-sidebar-position={sidebarPosition}
                    >
                        <div className="md:hidden">
                            <Sheet>
                                <SheetTrigger asChild>
                                    <Button variant="ghost" size="icon" className="-ml-2 h-9 w-9 text-muted-foreground">
                                        <Menu className="h-5 w-5" />
                                    </Button>
                                </SheetTrigger>
                                <SheetContent side="left" className="p-0 w-72">
                                    <Sidebar collapsed={false} onToggle={() => { }} nav={NAV} sidebarPosition={sidebarPosition} />
                                </SheetContent>
                            </Sheet>
                        </div>

                        {/* Breadcrumbs/Title */}
                        <div className="flex flex-1 flex-col gap-0.5 min-w-0">
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <span className="uppercase tracking-wider font-semibold opacity-70">{t('layout.panel')}</span>
                                <ChevronRight className="h-3 w-3" />
                            </div>
                            <h1 className="text-lg font-bold tracking-tight text-foreground truncate">{title}</h1>
                        </div>

                        {/* Top Actions: siempre alineados al borde final del header (derecha en LTR) */}
                        <div className="flex items-center gap-2 ms-auto shrink-0">
                            {/* View Controls */}
                            <div className="hidden md:flex items-center gap-1 rounded-full border border-border/50 bg-muted/20 p-1">
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Button
                                            variant={focused ? "secondary" : "ghost"}
                                            size="icon"
                                            className="h-7 w-7 rounded-full"
                                            onClick={() => setFocused(!focused)}
                                        >
                                            {focused ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>Modo Enfoque</TooltipContent>
                                </Tooltip>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Button
                                            variant={fullscreen ? "secondary" : "ghost"}
                                            size="icon"
                                            className="h-7 w-7 rounded-full"
                                            onClick={toggleFullscreen}
                                        >
                                            {fullscreen ? <SquareDashed className="h-3.5 w-3.5" /> : <Square className="h-3.5 w-3.5" />}
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>Pantalla Completa</TooltipContent>
                                </Tooltip>
                            </div>

                            <Separator orientation="vertical" className="hidden md:block h-6 mx-1" />

                            {/* Theme Toggle */}
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full">
                                        <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0 text-orange-500" />
                                        <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100 text-blue-500" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                    <DropdownMenuItem onClick={cycleLight} className="gap-2"><Sun className="h-4 w-4"/> Claro</DropdownMenuItem>
                                    <DropdownMenuItem onClick={cycleDark} className="gap-2"><Moon className="h-4 w-4"/> Oscuro</DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>

                            {/* Notifications */}
                            <DropdownMenu open={notifOpen} onOpenChange={setNotifOpen}>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-9 w-9 relative rounded-full hover:bg-muted/50">
                                        <Bell className={cn("h-5 w-5", unreadCount > 0 ? "text-foreground" : "text-muted-foreground")} />
                                        {unreadCount > 0 && <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-red-600 ring-2 ring-background animate-pulse" />}
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-80 p-0 shadow-xl border-border/60">
                                    <div className="flex items-center justify-between p-4 border-b">
                                        <h4 className="text-sm font-semibold">Notificaciones</h4>
                                        {unreadCount > 0 && (
                                            <Button variant="ghost" size="sm" className="h-auto px-2 text-xs text-primary" onClick={markAllRead}>
                                                Marcar leídas
                                            </Button>
                                        )}
                                    </div>
                                    <ScrollArea className="h-[300px]">
                                        {notifications.length === 0 ? (
                                            <div className="flex flex-col items-center justify-center h-32 text-center p-4">
                                                <BellOff className="h-8 w-8 text-muted-foreground/30 mb-2" />
                                                <p className="text-xs text-muted-foreground">Sin notificaciones pendientes</p>
                                            </div>
                                        ) : (
                                            <div className="flex flex-col">
                                                {notifications.map((n) => (
                                                    <div key={n.id} className={cn(
                                                        "flex flex-col gap-1 p-3 border-b border-border/40 hover:bg-muted/30 transition-colors cursor-pointer text-left",
                                                        !n.read_at && "bg-muted/10 border-l-2 border-l-primary"
                                                    )}>
                                                        <div className="flex items-center justify-between">
                                                            <span className="text-xs font-semibold">{n.data?.subject || 'Sistema'}</span>
                                                            <span className="text-[10px] text-muted-foreground">Reciente</span>
                                                        </div>
                                                        <p className="text-xs text-muted-foreground line-clamp-2">
                                                            {n.data?.action} - Ticket #{n.data?.ticket_id}
                                                        </p>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </ScrollArea>
                                </DropdownMenuContent>
                            </DropdownMenu>

                            {/* User Menu Header (Mobile/Quick Access) */}
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon" className="rounded-full h-9 w-9 ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ml-1">
                                        <UserAvatar
                                            name={user?.name}
                                            avatarPath={user?.avatar_path}
                                            size={36}
                                            className="shadow-sm"
                                            status={user?.availability === 'available' ? 'online' : user?.availability === 'busy' ? 'busy' : 'offline'}
                                        />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-56 mt-1 bg-background/80 backdrop-blur-md border-border/60 shadow-lg">
                                    <div className="flex items-center gap-2 p-2">
                                        <UserAvatar
                                            name={user?.name}
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
                                    <DropdownMenuItem onClick={() => navigate('/profile')} className="cursor-pointer">
                                        <UserCircle className="mr-2 h-4 w-4" />
                                        <span>{t('layout.profile')}</span>
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator className="bg-border/50" />
                                    <DropdownMenuItem onClick={logout} className="text-red-600 focus:text-red-600 focus:bg-red-50 dark:focus:bg-red-950/20 cursor-pointer">
                                        <LogOut className="mr-2 h-4 w-4" />
                                        <span>{t('layout.logout')}</span>
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                    </header>

                    {/* --- OUTLET AREA --- */}
                    <main className="flex-1 overflow-y-auto bg-muted/10 relative" tabIndex={-1}>
                        {/* Fondo Decorativo */}
                        <div className="absolute inset-0 -z-10 h-full w-full bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-[size:32px_32px]" />

                        <div className={cn(
                            "mx-auto p-4 md:p-8 transition-all duration-300 ease-out",
                            focused ? "max-w-[1920px]" : "max-w-7xl"
                        )}>
                            <Outlet />
                        </div>
                    </main>
                </div>
            </div>
        </TooltipProvider>
    )
}
