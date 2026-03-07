import React, { useEffect, useRef, useState } from 'react'
import { NavLink, Link, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { useSidebarPosition } from '@/context/SidebarPositionContext'
import { useTheme } from '@/hooks/useTheme'
import { useI18n } from '@/hooks/useI18n'
import { useSwipeToClose } from '@/hooks/useSwipeToClose'
import axios from '@/lib/axios'
import { cn } from '@/lib/utils'

// --- SHADCN COMPONENTS (Asegurados) ---
import { Button, buttonVariants } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
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
import { Sheet, SheetContent, SheetTrigger, SheetClose } from '@/components/ui/sheet'
import { Sidebar } from '@/components/Sidebar'
import { MobileBottomBar } from '@/components/MobileBottomBar'

// --- ICONS ---
import {
    LayoutDashboard, Users, ShieldCheck, Megaphone, Network, BadgeCheck,
    Building2, MapPinHouse, MapPinned, SignalHigh, Workflow, Tags,
    KeyRound, Ticket, AlertTriangle, Settings, Menu,
    LogOut, Sun, Moon, ChevronsLeft, ChevronsRight, ChevronDown,
    ChevronRight, ChevronLeft, Bell, BellOff, Layers, Shield, Maximize2,
    Minimize2, Square, SquareDashed, MoreHorizontal, Monitor,
    CalendarDays, BookOpen, UserCheck, Upload, GitMerge, FileSpreadsheet, FileCheck, FileText, Clock, Link2, Grid3X3,
    Activity, LogIn, Smartphone, X
} from 'lucide-react'

// ----------------------------------------------------------------------
// COMPONENTE PRINCIPAL: AppLayout
// ----------------------------------------------------------------------
export default function AppLayout() {
    const { pathname } = useLocation()
    const navigate = useNavigate()
    const themeContext = useTheme()
    const { t } = useI18n()
    const { user, logout, refreshUser } = useAuth()
    const [notifications, setNotifications] = useState([])
    const [unreadCount, setUnreadCount] = useState(0)
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
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
    const mobileSheetRef = useRef(null)
    useSwipeToClose(mobileSheetRef, () => setMobileMenuOpen(false), mobileMenuOpen, { side: 'left', threshold: 72, velocityThreshold: 0.35 })
    const [forceDeviceView, setForceDeviceView] = useState(() => {
        if (typeof window === 'undefined') return false
        return localStorage.getItem('layout-force-device-view') === '1'
    })

    const [hoverPreviewEnabled, setHoverPreviewEnabled] = useState(() => user?.sidebar_hover_preview ?? true)
    const hoverTempExpandRef = useRef(false)
    const { position: sidebarPosition } = useSidebarPosition()

    // Scroll del área de contenido: opacidad del fade superior (0 = sin efecto, 1 = fade visible)
    const mainScrollRef = useRef(null)
    const [scrollFadeOpacity, setScrollFadeOpacity] = useState(0)
    useEffect(() => {
        const el = mainScrollRef.current
        if (!el) return
        const onScroll = () => {
            const top = el.scrollTop
            const opacity = top <= 0 ? 0 : Math.min(1, top / 32)
            setScrollFadeOpacity(opacity)
        }
        onScroll()
        el.addEventListener('scroll', onScroll, { passive: true })
        return () => el.removeEventListener('scroll', onScroll)
    }, [pathname])

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
            localStorage.setItem('layout-force-device-view', forceDeviceView ? '1' : '0')
        }
        if (user) {
            axios.put('/api/profile/sidebar', {
                sidebar_state: collapsed ? 'collapsed' : 'expanded',
                sidebar_hover_preview: hoverPreviewEnabled,
            }).catch(() => { })
        }
    }, [collapsed, hoverPreviewEnabled, user, focused, forceDeviceView])

    // Fetch Notifications (inicial + cada 60s + al abrir el dropdown)
    const loadNotifs = React.useCallback(async () => {
        try {
            const { data } = await axios.get('/api/notifications')
            const list = data?.notifications ?? (Array.isArray(data) ? data : [])
            setNotifications(list)
            if (typeof data?.unread_count === 'number') setUnreadCount(data.unread_count)
            else setUnreadCount(list.filter((n) => !n.read_at).length)
        } catch (_) {}
    }, [])

    useEffect(() => {
        loadNotifs()
        const id = setInterval(loadNotifs, 60000)
        return () => clearInterval(id)
    }, [loadNotifs])

    useEffect(() => {
        if (notifOpen) loadNotifs()
    }, [notifOpen, loadNotifs])

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

    const markAllRead = async () => {
        try {
            await axios.post('/api/notifications/read-all')
            setNotifications((prev) => prev.map((n) => ({ ...n, read_at: new Date().toISOString() })))
            setUnreadCount(0)
        } catch (_) {}
    }

    const markOneRead = async (id) => {
        try {
            await axios.post(`/api/notifications/${id}/read`)
            setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read_at: new Date().toISOString() } : n)))
            setUnreadCount((c) => Math.max(0, c - 1))
        } catch (_) {}
    }

    const notificationTitle = (n) => {
        const d = n.data || {}
        if (d.message) return d.message
        if (d.subject && d.action) return `${d.action === 'created' ? 'Creado' : 'Actualizado'}: ${d.subject}`
        if (d.ticket_id) return `Ticket #${d.ticket_id}`
        return 'Notificación'
    }

    const notificationTime = (n) => {
        if (!n.created_at) return ''
        const date = new Date(n.created_at)
        const now = new Date()
        const diffMs = now - date
        if (diffMs < 60000) return 'Ahora'
        if (diffMs < 3600000) return `${Math.floor(diffMs / 60000)} min`
        if (diffMs < 86400000) return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        return date.toLocaleDateString()
    }

    const titleMap = {
        '/': t('nav.home'),
        '/calendario': t('nav.calendar'),
        '/users': t('nav.users'),
        '/campaigns': t('nav.campaigns'),
        '/areas': t('nav.areas'),
        '/positions': t('nav.positions'),
        '/roles': t('nav.roles'),
        '/permissions': t('nav.permissions'),
        '/settings': t('nav.settings'),
        '/sessions': t('nav.sessions'),
        '/audit-command': 'Centro de auditoría',
        '/sedes': t('nav.sedes'),
        '/ubicaciones': t('nav.ubicaciones'),
        '/mis-tickets': t('section.myTickets'),
        '/tickets': t('section.tickets'),
        '/tickets/new': t('section.tickets'),
        '/resolbeb': 'Resolbeb',
        '/resolbeb/mis-tickets': t('section.myTickets'),
        '/resolbeb/tickets': t('section.tickets'),
        '/resolbeb/tickets/new': t('section.tickets'),
        '/resolbeb/estados': 'Resolbeb · Estados',
        '/resolbeb/tipos': 'Resolbeb · Tipos',
        '/ticket-macros': 'Plantillas de respuesta',
        '/incidents': t('section.incidents'),
        '/profile': t('layout.profile'),
        '/sigua': 'SIGUA',
        '/sigua/cuentas': 'SIGUA · Cuentas',
        '/sigua/ca01': 'SIGUA · CA-01',
        '/sigua/bitacora': 'SIGUA · Bitácora',
        '/sigua/bitacora-sede': 'SIGUA · Bitácora Sede',
        '/sigua/bitacora/sede': 'SIGUA · Bitácora Sede',
        '/sigua/ca01/nuevo': 'SIGUA · CA-01 Nuevo',
        '/sigua/incidentes': 'SIGUA · Incidentes',
        '/sigua/importar': 'SIGUA · Importar',
        '/sigua/cruces': 'SIGUA · Cruces',
        '/sigua/reportes': 'SIGUA · Reportes',
        '/sigua/empleados-rh': 'SIGUA · Empleados RH',
        '/sigua/sistemas': 'SIGUA · Sistemas',
        '/sigua/alertas': 'SIGUA · Alertas',
        '/sigua/configuracion': 'SIGUA · Configuración',
    }
    const title = titleMap[pathname] ?? (
        pathname?.match(/^\/sigua\/ca01\/\d+$/) ? 'SIGUA · CA-01 Detalle' :
        pathname?.match(/^\/sigua\/incidentes\/\d+$/) ? 'SIGUA · Incidente' :
        pathname?.match(/^\/sigua\/empleados-rh\/\d+$/) ? 'SIGUA · Empleado RH' :
        pathname?.match(/^\/resolbeb\/tickets\/\d+$/) ? 'Resolbeb · Ticket' :
        t('layout.section.default')
    )

    // Overlay solo si está pendiente de rol y NO es visitante (visitante puede entrar y ver dash en solo lectura)
    const pendingAdmin = user?.status === 'pending_admin' && !(user?.roles?.length === 1 && user?.roles?.[0] === 'visitante')

    // Cuando está pendiente de rol, refrescar usuario cada 25s para quitar overlay al asignar rol
    useEffect(() => {
        if (!pendingAdmin) return
        const id = setInterval(refreshUser, 25000)
        return () => clearInterval(id)
    }, [pendingAdmin, refreshUser])

    // Cerrar menú móvil al navegar (ej. al tocar un enlace del Sheet)
    useEffect(() => {
        setMobileMenuOpen(false)
    }, [pathname])

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
                        "flex-col z-40 overflow-hidden flex-shrink-0",
                        forceDeviceView ? "hidden" : "hidden md:flex",
                        "will-change-[width]",
                        (collapsed || focused) ? "w-[72px]" : "w-64"
                    )}
                    style={{
                        transition: "width 350ms cubic-bezier(0.32, 0.72, 0, 1)",
                    }}
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
                    <Sidebar collapsed={collapsed || focused} onToggle={() => setCollapsed((v) => !v)} />
                </aside>

{/* --- MAIN CONTENT WRAPPER --- */}
                    <div className="flex flex-1 flex-col min-w-0 relative transition-[margin] duration-350 ease-[cubic-bezier(0.32,0.72,0,1)]">

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
                        className="sticky top-0 z-30 flex h-16 shrink-0 items-center gap-x-4 bg-background/80 px-4 safe-area-header backdrop-blur-xl transition-all md:px-6"
                        data-sidebar-position={sidebarPosition}
                    >
                        {/* Menú móvil: visible en viewport móvil o cuando está activa la vista dispositivo */}
                        <div className={cn("order-0", forceDeviceView ? "flex" : "md:hidden")}>
                            <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
                                <SheetTrigger asChild>
                                    <Button variant="ghost" size="icon" className="-ml-2 h-11 w-11 text-muted-foreground md:h-9 md:w-9" aria-label="Abrir menú">
                                        <Menu className="h-5 w-5" />
                                    </Button>
                                </SheetTrigger>
                                <SheetContent
                                    ref={mobileSheetRef}
                                    side="left"
                                    className="flex flex-col p-0 w-72 max-w-[85vw]"
                                    showCloseButton={false}
                                    overlayClassName="sheet-overlay-mobile"
                                    dataDrawer="mobile"
                                >
                                    {/* Header fijo con safe area: evita notch y ofrece cierre 44px */}
                                    <div
                                        className="flex shrink-0 items-center justify-between border-b border-border/50 bg-background px-4 py-3"
                                        style={{ paddingTop: 'max(env(safe-area-inset-top), 0.75rem)' }}
                                    >
                                        <span className="text-base font-semibold text-foreground">Menú</span>
                                        <SheetClose asChild>
                                            <Button variant="ghost" size="icon" className="h-11 w-11 rounded-full text-muted-foreground hover:text-foreground" aria-label="Cerrar menú">
                                                <X className="h-5 w-5" />
                                            </Button>
                                        </SheetClose>
                                    </div>
                                    {/* Contenido: Sidebar con su propio ScrollArea; padding inferior para home indicator */}
                                    <div
                                        className="flex-1 min-h-0 flex flex-col pb-[env(safe-area-inset-bottom)]"
                                    >
                                        <Sidebar collapsed={false} onToggle={() => setMobileMenuOpen(false)} />
                                    </div>
                                </SheetContent>
                            </Sheet>
                        </div>

                        {/* Móvil: botón Volver compacto (oculto en md) */}
                        <div className="order-1 flex shrink-0 md:hidden">
                            <Button variant="ghost" size="icon" className="h-9 w-9 -ml-1 text-muted-foreground" onClick={() => navigate(-1)} title="Volver" aria-label="Volver">
                                <ChevronLeft className="h-5 w-5" />
                            </Button>
                        </div>
                        {/* Breadcrumbs/Title: pasos intermedios ocultos en móvil; a la derecha cuando sidebar derecha */}
                        <div
                            className={cn(
                                "flex flex-col gap-0.5 min-w-0",
                                sidebarPosition === "right" ? "order-3 ms-auto flex-1 justify-end text-right md:order-3" : "order-1 flex-1 md:order-1"
                            )}
                        >
                            <div className={cn("hidden md:flex items-center gap-2 text-xs text-muted-foreground", sidebarPosition === "right" && "justify-end")}>
                                <span className="uppercase tracking-wider font-semibold opacity-70">{t('layout.panel')}</span>
                                <ChevronRight className={cn("h-3 w-3", sidebarPosition === "right" && "rotate-180")} />
                            </div>
                            <h1 className={cn("text-lg font-bold tracking-tight text-foreground truncate", sidebarPosition === "right" && "text-right")}>{title}</h1>
                        </div>

                        {/* Top Actions: a la izquierda cuando sidebar derecha, a la derecha cuando sidebar izquierda */}
                        <div
                            className={cn(
                                "flex items-center gap-2 shrink-0",
                                sidebarPosition === "right" ? "order-1" : "order-2 ms-auto"
                            )}
                        >
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
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Button
                                            variant={forceDeviceView ? "secondary" : "ghost"}
                                            size="icon"
                                            className="h-7 w-7 rounded-full"
                                            onClick={() => setForceDeviceView((v) => !v)}
                                        >
                                            <Smartphone className="h-3.5 w-3.5" />
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                        {forceDeviceView ? 'Salir vista tablet/móvil' : 'Vista tablet/móvil'}
                                    </TooltipContent>
                                </Tooltip>
                            </div>

                            <Separator orientation="vertical" className="hidden md:block h-6 mx-1" />

                            {/* Theme Toggle: área táctil 44px en móvil */}
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-11 w-11 rounded-full flex items-center justify-center md:h-9 md:w-9">
                                        <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0 text-orange-500" />
                                        <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100 text-blue-500" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                    <DropdownMenuItem onClick={cycleLight} className="gap-2"><Sun className="h-4 w-4"/> Claro</DropdownMenuItem>
                                    <DropdownMenuItem onClick={cycleDark} className="gap-2"><Moon className="h-4 w-4"/> Oscuro</DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>

                            {/* Notifications: área táctil 44px en móvil */}
                            <DropdownMenu open={notifOpen} onOpenChange={setNotifOpen}>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-11 w-11 relative rounded-full flex items-center justify-center hover:bg-muted/50 md:h-9 md:w-9">
                                        <Bell className={cn("h-5 w-5", unreadCount > 0 ? "text-foreground" : "text-muted-foreground")} />
                                        {unreadCount > 0 && (
                                            <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] flex items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground ring-2 ring-background px-1">
                                                {unreadCount > 99 ? "99+" : unreadCount}
                                            </span>
                                        )}
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
                                                {notifications.map((n) => {
                                                    const ticketId = n.data?.ticket_id
                                                    const content = (
                                                        <div className={cn(
                                                            "flex flex-col gap-1 p-3 border-b border-border/40 hover:bg-muted/30 transition-colors text-left w-full",
                                                            !n.read_at && "bg-muted/10 border-l-2 border-l-primary"
                                                        )}>
                                                            <div className="flex items-center justify-between gap-2">
                                                                <span className="text-[10px] text-muted-foreground shrink-0">{notificationTime(n)}</span>
                                                                {ticketId && (
                                                                    <span className="text-[10px] font-mono text-muted-foreground">#{ticketId}</span>
                                                                )}
                                                            </div>
                                                            <p className="text-xs text-foreground/90 line-clamp-2">
                                                                {notificationTitle(n)}
                                                            </p>
                                                        </div>
                                                    )
                                                    return ticketId ? (
                                                        <Link
                                                            key={n.id}
                                                            to={`/resolbeb/tickets/${ticketId}`}
                                                            onClick={() => {
                                                                markOneRead(n.id)
                                                                setNotifOpen(false)
                                                            }}
                                                            className="block"
                                                        >
                                                            {content}
                                                        </Link>
                                                    ) : (
                                                        <div key={n.id} className="cursor-default">{content}</div>
                                                    )
                                                })}
                                            </div>
                                        )}
                                    </ScrollArea>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                    </header>

                    {/* --- OUTLET AREA --- */}
                    <main
                        ref={mainScrollRef}
                        className={cn("flex-1 overflow-y-auto bg-muted/10 relative", forceDeviceView ? "pb-32" : "pb-32 md:pb-0")}
                        tabIndex={-1}
                    >
                        {/* Fade + blur superior al hacer scroll (no afecta z-index del sidebar/navbar) */}
                        <div
                            aria-hidden="true"
                            className="layout-scroll-fade pointer-events-none sticky top-0 left-0 right-0 z-20 h-14 transition-opacity duration-200 ease-out"
                            style={{ opacity: scrollFadeOpacity }}
                        />
                        {/* Fondo Decorativo */}
                        <div className="absolute inset-0 -z-10 h-full w-full bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-[size:32px_32px]" />

                        <div className={cn(
                            "mx-auto p-4 md:p-8 transition-all duration-300 ease-out",
                            focused ? "max-w-[1920px]" : "max-w-7xl"
                        )}>
                            <div key={pathname} className="page-transition">
                                <Outlet />
                            </div>
                        </div>
                    </main>
                </div>
                <MobileBottomBar onOpenMenu={setMobileMenuOpen} forceVisible={forceDeviceView} />
            </div>
        </TooltipProvider>
    )
}
