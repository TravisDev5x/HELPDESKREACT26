import { createContext, useContext, useState, useEffect } from 'react'
import { useAuth } from '@/context/AuthContext'

const SidebarPositionContext = createContext({ position: 'left', setPosition: () => {} })

export function SidebarPositionProvider({ children }) {
    const { user } = useAuth()
    const [position, setPosition] = useState(() => {
        if (typeof window === 'undefined') return 'left'
        const local = localStorage.getItem('sidebar-position')
        if (local === 'left' || local === 'right') return local
        if (user?.sidebar_position === 'left' || user?.sidebar_position === 'right') return user.sidebar_position
        return 'left'
    })

    useEffect(() => {
        if (user?.sidebar_position === 'left' || user?.sidebar_position === 'right') setPosition(user.sidebar_position)
    }, [user?.sidebar_position])

    useEffect(() => {
        if (typeof window !== 'undefined') localStorage.setItem('sidebar-position', position)
    }, [position])

    return (
        <SidebarPositionContext.Provider value={{ position, setPosition }}>
            {children}
        </SidebarPositionContext.Provider>
    )
}

export function useSidebarPosition() {
    const ctx = useContext(SidebarPositionContext)
    return ctx ?? { position: 'left', setPosition: () => {} }
}
