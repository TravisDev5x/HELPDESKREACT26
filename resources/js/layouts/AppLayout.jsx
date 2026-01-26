import React, { useEffect, useRef, useState } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import axios from '@/lib/axios'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'
import { useTheme } from '@/hooks/useTheme'
import { useI18n } from '@/hooks/useI18n'

import {
    LayoutDashboard,
    Users,
    ShieldCheck,
    Megaphone,
    Network,
    BadgeCheck,
    Building2,
    MapPinHouse,
    MapPinned,
    SignalHigh,
    Workflow,
    Tags,
    KeyRound,
    Ticket,
    Settings,
    Menu,
    UserCircle,
    LogOut,
    Sun,
    Moon,
    ChevronsLeft,
    ChevronsRight,
    ChevronDown,
    ChevronRight,
    Bell,
    BellOff,
    Layers,
    Shield,
    Maximize2,
    Minimize2,
    Square,
    SquareDashed,
} from 'lucide-react'

function GroupItem({ label, icon: Icon, collapsed, children }) {
    const [open, setOpen] = useState(true);
    const trigger = (
        <Button
            type="button"
            variant="ghost"
            size={collapsed ? "icon" : "sm"}
            onClick={() => setOpen((v) => !v)}
            className={`w-full ${collapsed ? 'h-10 w-10 p-0 justify-center' : 'h-auto flex items-center justify-between px-3 py-2'} text-sm font-semibold text-foreground/80 hover:text-foreground hover:bg-transparent`}
        >
            <span className="flex items-center gap-2">
                <Icon className={`h-5 w-5 ${collapsed ? '' : ''}`} />
                {!collapsed && <span>{label}</span>}
            </span>
            {!collapsed && (open ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />)}
        </Button>
    );
    return (
        <div className="space-y-1">
            {collapsed ? (
                <Tooltip delayDuration={0}>
                    <TooltipTrigger asChild>{trigger}</TooltipTrigger>
                    <TooltipContent side="right">{label}</TooltipContent>
                </Tooltip>
            ) : trigger}
            {open && <div className="pl-0">{children}</div>}
        </div>
    );
}

function Sidebar({ collapsed, onToggle, nav }) {
    const { user } = useAuth();
    const { t } = useI18n();
    const initials = user?.name ? user.name.substring(0, 2).toUpperCase() : 'US';
    const [catalogsOpen, setCatalogsOpen] = useState(() => {
        if (typeof window === 'undefined') return true;
        return localStorage.getItem('sidebar-catalogs-open') !== '0';
    });

    const renderNavLink = (item) => {
        const Icon = item.icon;
        const inactiveClasses = collapsed
            ? 'text-foreground/90 hover:text-foreground hover:bg-accent/60'
            : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground';
        const link = (
            <NavLink
                to={item.to}
                end={item.to === '/'}
                aria-label={item.label}
                className={({ isActive }) => `
                    group flex items-center ${collapsed ? 'justify-center h-10 w-10 p-0' : 'gap-3 px-3 py-2'} text-sm font-medium transition-all duration-200
                    rounded-[calc(var(--radius)-4px)]
                    ${isActive
                        ? 'bg-primary text-primary-foreground shadow-md shadow-primary/20'
                        : inactiveClasses}
                `}
            >
                {({ isActive }) => (
                    <>
                        <Icon
                            className={`h-5 w-5 shrink-0 transition-transform ${
                                isActive
                                    ? 'scale-110'
                                    : (collapsed ? 'text-foreground opacity-100' : 'opacity-70 group-hover:opacity-100')
                            }`}
                        />
                        {!collapsed && <span className="truncate">{item.label}</span>}
                    </>
                )}
            </NavLink>
        );

        if (!collapsed) return link;

        return (
            <Tooltip delayDuration={0}>
                <TooltipTrigger asChild>{link}</TooltipTrigger>
                <TooltipContent side="right">{item.label}</TooltipContent>
            </Tooltip>
        );
    };

    useEffect(() => {
        if (typeof window !== 'undefined') {
            localStorage.setItem('sidebar-catalogs-open', catalogsOpen ? '1' : '0');
        }
    }, [catalogsOpen]);

    return (
        <div className="flex h-full flex-col overflow-hidden bg-card/10 md:bg-transparent">
            <div className={`h-16 flex items-center ${collapsed ? 'px-3' : 'px-6'} gap-3 border-b border-border/60 shrink-0`}>
                <div className="h-8 w-8 rounded-[var(--radius)] bg-primary flex items-center justify-center text-primary-foreground shadow-sm">
                    <ShieldCheck className="h-5 w-5" />
                </div>
                {!collapsed && (
                    <div className="flex flex-col">
                        <span className="font-bold text-sm tracking-tight leading-none uppercase text-foreground">{t('brand.title')}</span>
                        <span className="text-[9px] text-muted-foreground font-medium uppercase tracking-widest mt-1">{t('brand.subtitle')}</span>
                    </div>
                )}
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={onToggle}
                    className="ml-auto h-8 w-8"
                    aria-label={collapsed ? t('settings.sidebar.expanded') : t('settings.sidebar.collapsed')}
                    aria-expanded={!collapsed}
                >
                    {collapsed ? <ChevronsRight className="h-4 w-4" /> : <ChevronsLeft className="h-4 w-4" />}
                </Button>
            </div>

            <nav className={`flex-1 overflow-y-auto py-6 ${collapsed ? 'px-2' : 'px-4'} space-y-8 custom-scrollbar min-w-0`}>
                <TooltipProvider delayDuration={0} skipDelayDuration={0}>
                    {nav.map((section) => {
                        const isCatalogs = section.label === t('nav.catalogs');
                        const isOpen = !isCatalogs || catalogsOpen;
                        return (
                            <div key={section.label} className="space-y-2">
                                {!collapsed ? (
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => { if (isCatalogs) setCatalogsOpen((v) => !v); }}
                                        className="w-full h-auto justify-start px-3 text-left text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/50 hover:text-foreground hover:bg-transparent transition-colors"
                                    >
                                        {section.label}
                                        {isCatalogs && (
                                            <span className="ml-auto text-muted-foreground">
                                                {catalogsOpen ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                                            </span>
                                        )}
                                    </Button>
                                ) : (
                                    isCatalogs && (
                                        <Tooltip delayDuration={0}>
                                            <TooltipTrigger asChild>
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => setCatalogsOpen((v) => !v)}
                                                    className="h-10 w-10 p-0 justify-center text-muted-foreground hover:text-foreground hover:bg-transparent"
                                                    aria-label={section.label}
                                                >
                                                    {catalogsOpen ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                                                </Button>
                                            </TooltipTrigger>
                                            <TooltipContent side="right">{section.label}</TooltipContent>
                                        </Tooltip>
                                    )
                                )}
                                {isOpen && (
                                    <div className="space-y-1">
                                        {section.items.map((item) => {
                                            if (item.children) {
                                                return (
                                                    <GroupItem key={item.label} label={item.label} icon={item.icon} collapsed={collapsed}>
                                                        <div className="space-y-1">
                                                            {item.children.map((child) => (
                                                                <React.Fragment key={child.to}>{renderNavLink(child)}</React.Fragment>
                                                            ))}
                                                        </div>
                                                    </GroupItem>
                                                )
                                            }
                                            return <React.Fragment key={item.to}>{renderNavLink(item)}</React.Fragment>
                                        })}
                                    </div>
                                )}
                            </div>
                        )
                    })}
                </TooltipProvider>
            </nav>

            <div className="p-4 border-t border-border/60 bg-muted/20">
                <div className={`flex items-center ${collapsed ? 'justify-center' : 'gap-3'} p-2 rounded-[var(--radius)] border border-border/40 bg-background/40 backdrop-blur-sm`}>
                    <div className="relative shrink-0">
                        <Avatar className="h-8 w-8 border border-border/50">
                            {user?.avatar_path && (
                                <AvatarImage src={`/storage/${user.avatar_path}`} className="object-cover" />
                            )}
                            <AvatarFallback className="text-[10px] font-bold bg-background">{initials}</AvatarFallback>
                        </Avatar>
                        <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-emerald-500 border-2 border-background" />
                    </div>
                    {!collapsed && (
                        <div className="min-w-0 flex-1">
                            <p className="text-[11px] font-bold truncate text-foreground">{user?.name || 'Usuario'}</p>
                            <p className="text-[9px] text-muted-foreground uppercase font-medium">{user?.email || 'En línea'}</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}

export default function AppLayout() {
    const { pathname } = useLocation()
    const navigate = useNavigate()
    const themeContext = useTheme()
    const { t } = useI18n()
    const { user, logout } = useAuth();
    const [notifications, setNotifications] = useState([]);
    const [notifOpen, setNotifOpen] = useState(false);

    const [collapsed, setCollapsed] = useState(() => {
        if (typeof window === 'undefined') return false
        const local = localStorage.getItem('sidebar-collapsed')
        if (local !== null) return local === '1'
        return user?.sidebar_state === 'collapsed'
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

    // Sincroniza cuando llega el usuario desde check-auth
    useEffect(() => {
        if (typeof user?.sidebar_state !== 'undefined') {
            setCollapsed(user.sidebar_state === 'collapsed')
        }
        if (typeof user?.sidebar_hover_preview !== 'undefined') {
            setHoverPreviewEnabled(user.sidebar_hover_preview)
        }
    }, [user?.sidebar_state, user?.sidebar_hover_preview])

    const initials = user?.name ? user.name.substring(0, 2).toUpperCase() : 'US';
    const isDark = themeContext?.isDark ?? false
    const isAero = ['aeroglass', 'aeroglass-dark'].includes(themeContext?.theme)
    const cycleLight = themeContext?.cycleLight ?? (() => { })
    const cycleDark = themeContext?.cycleDark ?? (() => { })
    const mustChangePassword = Boolean(user?.force_password_change)

    useEffect(() => {
        // Durante la vista previa por hover no persistimos ni tocamos localStorage
        if (hoverTempExpandRef.current) return
        if (typeof window !== 'undefined') {
            localStorage.setItem('sidebar-collapsed', collapsed ? '1' : '0')
            localStorage.setItem('layout-focused', focused ? '1' : '0')
            localStorage.setItem('layout-fullscreen', fullscreen ? '1' : '0')
        }
        if (user) {
            axios.put('/api/profile/sidebar', {
                sidebar_state: collapsed ? 'collapsed' : 'expanded',
                sidebar_hover_preview: hoverPreviewEnabled,
            }).catch(() => { })
        }
    }, [collapsed, hoverPreviewEnabled, user, focused, fullscreen])

    // Redirección SPA al login cuando el contexto emite logout
    useEffect(() => {
        const handler = () => navigate('/login');
        window.addEventListener('navigate-to-login', handler);
        return () => window.removeEventListener('navigate-to-login', handler);
    }, [navigate])

    useEffect(() => {
        const loadNotifs = async () => {
            try {
                const { data } = await axios.get('/api/notifications');
                setNotifications(data || []);
            } catch (_) {}
        };
        loadNotifs();
        const id = setInterval(loadNotifs, 60000);
        return () => clearInterval(id);
    }, []);

    // Sync fullscreen state with native events
    useEffect(() => {
        const handler = () => setFullscreen(!!document.fullscreenElement);
        document.addEventListener('fullscreenchange', handler);
        return () => document.removeEventListener('fullscreenchange', handler);
    }, []);

    const toggleFullscreen = async () => {
        try {
            if (!document.fullscreenElement) {
                await document.documentElement.requestFullscreen();
            } else {
                await document.exitFullscreen();
            }
        } catch (err) {
            console.warn('Fullscreen not available', err);
        }
    };

    const unreadCount = notifications.filter(n => !n.read_at).length;

    const markAllRead = async () => {
        try {
            await axios.post('/api/notifications/read-all');
            setNotifications((prev) => prev.map((n) => ({ ...n, read_at: new Date().toISOString() })));
        } catch (_) {}
    };

    const NAV = React.useMemo(() => ([
        {
            label: t('nav.general'),
            items: [
                { to: '/', label: t('nav.home'), icon: LayoutDashboard },
                { to: '/tickets', label: 'Tickets', icon: Ticket },
                { to: '/users', label: t('nav.users'), icon: Users },
                // futuros: mis tickets, dashboard personal
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
            items: [{ to: '/settings', label: t('nav.settings'), icon: Settings }],
        },
    ]), [t])

    const titleMap = {
        '/': t('nav.home'),
        '/users': t('nav.users'),
        '/campaigns': t('nav.campaigns'),
        '/areas': t('nav.areas'),
        '/positions': t('nav.positions'),
        '/roles': t('nav.roles'),
        '/permissions': t('nav.permissions'),
        '/settings': t('nav.settings'),
        '/inventary': 'Inventarios',
        '/profile': t('layout.profile'),
        '/sedes': 'Sedes',
        '/ubicaciones': 'Ubicaciones',
        '/priorities': 'Prioridades',
        '/ticket-states': 'Estados de Ticket',
        '/ticket-types': 'Tipos de Ticket',
        '/tickets': 'Tickets',
    }
    const title = titleMap[pathname] ?? t('layout.section.default')

    return (
        <div className="flex h-screen w-full overflow-hidden bg-background text-foreground transition-colors duration-300 ease-in-out">
            {/* Sidebar Desktop */}
            <aside
                className={`hidden md:flex ${(collapsed || focused) ? 'w-16' : 'w-64'} flex-col border-r border-border/60 shrink-0 ${
                    isAero ? 'glass-nav' : 'bg-background/60 backdrop-blur-md'
                } z-20 transition-all`}
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
                <Sidebar collapsed={collapsed || focused} onToggle={() => setCollapsed((v) => !v)} nav={NAV} />
            </aside>

            {/* Contenedor Principal */}
            <div className="flex flex-1 flex-col min-w-0 relative">
                {/* Navbar */}
                <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 bg-primary text-primary-foreground px-3 py-2 rounded">
                    {t('layout.skip')}
                </a>
                {mustChangePassword && (
                    <div className="w-full bg-amber-100 text-amber-900 text-sm px-6 py-2 flex items-center gap-3 border-b border-amber-200">
                        <span className="font-semibold">Debes cambiar tu contraseña.</span>
                        <Button variant="outline" size="sm" onClick={() => navigate('/force-change-password')}>
                            Cambiar ahora
                        </Button>
                    </div>
                )}
                <header className={`min-h-16 flex flex-col md:flex-row md:items-center md:justify-between gap-3 px-4 md:px-6 py-2 md:py-0 border-b border-border/60 ${
                    isAero ? 'glass-card' : 'bg-background/60 backdrop-blur-md'
                } z-30 relative shrink-0`}>
                    <div className="flex items-center gap-3 md:gap-4 min-w-0 w-full md:w-auto">
                        <div className="md:hidden">
                            <Sheet>
                                <SheetTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-9 w-9">
                                        <Menu className="h-5 w-5 text-foreground" />
                                    </Button>
                                </SheetTrigger>
                                <SheetContent side="left" className="p-0 w-64 bg-background/95 backdrop-blur-xl border-r border-border/60">
                                    <Sidebar collapsed={false} onToggle={() => { }} nav={NAV} />
                                </SheetContent>
                            </Sheet>
                        </div>

                    <div className="flex flex-col justify-center min-w-0">
                        <span className="text-[9px] uppercase tracking-[0.2em] text-muted-foreground/60 font-bold leading-none mb-1">
                            {t('layout.panel')}
                        </span>
                        <h1 className="text-sm font-bold tracking-tight uppercase leading-none text-foreground truncate">{title}</h1>
                    </div>
                    </div>

                    <div className="flex items-center gap-2 md:gap-4 flex-wrap w-full md:w-auto justify-between md:justify-end">
                        <div className="flex items-center gap-2">
                            <Button
                                variant={focused ? "outline" : "ghost"}
                                size="icon"
                                className="h-9 w-9"
                                title={focused ? "Restaurar vista" : "Modo ampliado"}
                                onClick={() => setFocused((v) => !v)}
                            >
                                {focused ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
                            </Button>
                            <Button
                                variant={fullscreen ? "outline" : "ghost"}
                                size="icon"
                                className="h-9 w-9"
                                title={fullscreen ? "Salir de pantalla completa" : "Pantalla completa"}
                                onClick={toggleFullscreen}
                            >
                                {fullscreen ? <SquareDashed className="h-4 w-4" /> : <Square className="h-4 w-4" />}
                            </Button>
                        </div>

                        {/* Switch Minimalista */}
                        <div className="flex items-center bg-muted/50 rounded-full border border-border/60 p-1 gap-1">
                            <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={cycleLight}
                                className={`h-6 w-6 p-1 rounded-full transition-all duration-300 ${!isDark ? 'bg-background shadow-sm text-orange-500 scale-110' : 'text-muted-foreground/40 hover:text-muted-foreground/70'} hover:bg-transparent`}
                                title="Modo Claro"
                            >
                                <Sun className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={cycleDark}
                                className={`h-6 w-6 p-1 rounded-full transition-all duration-300 ${isDark ? 'bg-background shadow-sm text-blue-400 scale-110' : 'text-muted-foreground/40 hover:text-muted-foreground/70'} hover:bg-transparent`}
                                title="Modo Oscuro"
                            >
                                <Moon className="h-3.5 w-3.5" />
                            </Button>
                        </div>

                        <Separator orientation="vertical" className="hidden md:block h-6 mx-1 bg-border/60" />

                        <DropdownMenu open={notifOpen} onOpenChange={setNotifOpen}>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-9 w-9 relative">
                                    {unreadCount > 0 && (
                                        <span className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground text-[10px] rounded-full px-1.5 py-0.5">
                                            {unreadCount}
                                        </span>
                                    )}
                                    {unreadCount > 0 ? <Bell className="h-5 w-5" /> : <BellOff className="h-5 w-5 text-muted-foreground" />}
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-80 max-w-[90vw] max-h-96 overflow-y-auto">
                                <DropdownMenuLabel className="flex items-center justify-between">
                                    Notificaciones
                                    {unreadCount > 0 && (
                                        <Button size="xs" variant="ghost" onClick={markAllRead}>Marcar leído</Button>
                                    )}
                                </DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                {notifications.length === 0 && (
                                    <DropdownMenuItem className="text-xs text-muted-foreground">Sin notificaciones</DropdownMenuItem>
                                )}
                                {notifications.map((n) => (
                                    <DropdownMenuItem key={n.id} className="flex flex-col items-start gap-1">
                                        <span className="text-xs font-semibold">{n.data?.subject || 'Ticket'}</span>
                                        <span className="text-[11px] text-muted-foreground">
                                            Ticket #{n.data?.ticket_id} — {n.data?.action}
                                        </span>
                                        {n.read_at ? null : <span className="text-[10px] text-primary">Nuevo</span>}
                                    </DropdownMenuItem>
                                ))}
                            </DropdownMenuContent>
                        </DropdownMenu>

                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="rounded-full h-8 w-8 p-0 outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 hover:bg-transparent"
                                >
                                    <Avatar className="h-8 w-8 border border-border/60 hover:border-primary/50 transition-colors shadow-sm">
                                        {user?.avatar_path && (
                                            <AvatarImage src={`/storage/${user.avatar_path}`} className="object-cover" />
                                        )}
                                        <AvatarFallback className="text-[10px] font-bold bg-primary/10 text-primary">{initials}</AvatarFallback>
                                    </Avatar>
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-52 mt-2 border-border/60 bg-background/80 backdrop-blur-lg shadow-xl">
                                <DropdownMenuLabel className="text-[10px] font-bold uppercase tracking-widest p-3 text-muted-foreground/80">{t('layout.account')}</DropdownMenuLabel>
                                <DropdownMenuSeparator className="bg-border/60" />

                                <DropdownMenuItem
                                    onClick={() => navigate('/profile')}
                                    className="text-xs cursor-pointer py-2.5 focus:bg-primary/10 focus:text-primary"
                                >
                                    <UserCircle className="h-4 w-4 mr-2 opacity-70" /> {t('layout.profile')}
                                </DropdownMenuItem>

                                <DropdownMenuItem
                                    onClick={logout}
                                    className="text-xs cursor-pointer py-2.5 text-destructive focus:bg-destructive/10 focus:text-destructive"
                                >
                                    <LogOut className="h-4 w-4 mr-2" /> {t('layout.logout')}
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </header>

                {/* Área de Contenido */}
                <main id="main-content" className="flex-1 overflow-y-auto bg-muted/5 dark:bg-muted/1 relative" tabIndex={-1}>
                    <div className="absolute inset-0 -z-10 bg-[radial-gradient(hsl(var(--border))_1px,transparent_1px)] [background-size:24px_24px] opacity-[0.2] dark:opacity-[0.1]"></div>

                    <div className={`${focused ? 'max-w-[1600px]' : 'max-w-7xl'} mx-auto p-4 md:p-8 lg:p-10 relative z-10`}>
                        <Outlet />
                    </div>
                </main>
            </div>
        </div>
    )
}


