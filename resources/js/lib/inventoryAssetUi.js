export const OPERATIONAL_STATE_LABELS = {
    AVAILABLE: "Disponible",
    ASSIGNED: "Asignado",
    MAINTENANCE: "En mantenimiento",
    RETIRED: "Retirado",
    LOST: "Perdido",
    STOLEN: "Robado",
};

export function operationalStateLabel(state) {
    return OPERATIONAL_STATE_LABELS[state] ?? state ?? "Sin definir";
}

export function operationalStateVariant(state) {
    return state === "MAINTENANCE" ? "secondary" : "outline";
}

export const INVENTORY_BADGE_VARIANTS = [
    { value: "default", label: "Predeterminado" },
    { value: "secondary", label: "Secundario" },
    { value: "destructive", label: "Crítico" },
    { value: "outline", label: "Contorno" },
];

export function inventoryStatusVariant(status) {
    return INVENTORY_BADGE_VARIANTS.some((variant) => variant.value === status?.badge_class)
        ? status.badge_class
        : "outline";
}

export const MOVEMENT_LABELS = {
    CHECKOUT: "Asignación", CHECKIN: "Devolución", REASSIGN: "Reasignación", TRASLADO: "Traslado",
    RETIRE: "Baja", MARK_LOST: "Marcado como perdido", MARK_STOLEN: "Marcado como robado",
    MAINTENANCE_START: "Inicio de mantenimiento", MAINTENANCE_END: "Cierre de mantenimiento",
};
