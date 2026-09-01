import { router, usePage } from "@inertiajs/react";
import AuthenticatedLayout from "@/Inertia/Layouts/AuthenticatedLayout";
import CatalogPage from "@/Inertia/components/CatalogPage";
import CatalogDialog from "@/Inertia/components/CatalogDialog";
import useCatalog from "@/Inertia/hooks/useCatalog";
import { formatDate } from "@/i18n/formatters";
import { useI18n } from "@/i18n/I18nProvider";

export default function Categories() {
    const { categories, categoryTypes = [] } = usePage().props;
    const { locale } = useI18n();

    const catalog = useCatalog("/api/inv-categories", () => router.reload({ only: ["categories"] }));

    const columns = [
        { key: "id", label: "ID", width: "w-[80px]" },
        { key: "name", label: "Nombre" },
        {
            key: "type",
            label: "Tipo",
            width: "w-[140px]",
            render: (row) => categoryTypes.find((o) => o.value === row.type)?.label ?? "—",
        },
        {
            key: "is_active",
            label: "Estado",
            width: "w-[160px]",
            activeLabel: "Activa",
            inactiveLabel: "Inactiva",
        },
        {
            key: "created_at",
            label: "Creado",
            width: "w-[180px]",
            render: (row) =>
                row.created_at
                    ? formatDate(row.created_at, locale)
                    : "—",
        },
    ];

    const fields = [
        {
            key: "name",
            label: "Nombre",
            type: "text",
            required: true,
            placeholder: "Ej. Laptops, Impresoras, Consumibles de red",
            help: "Mínimo 2 caracteres.",
        },
        {
            key: "type",
            label: "Tipo",
            type: "select",
            options: categoryTypes,
            placeholder: "Seleccionar tipo…",
        },
        {
            key: "require_specs",
            label: "Requiere al menos una especificación",
            type: "switch",
            switchDescription: "Exige una especificación técnica compatible al crear o actualizar el activo.",
            defaultValue: false,
        },
        {
            key: "is_active",
            label: "Activa",
            type: "switch",
            switchDescription: "Controla si aparece en los formularios de activos.",
            defaultValue: true,
        },
    ];

    return (
        <>
            <CatalogPage
                title="Categorías de inventario"
                description="Clasificación de activos (hardware, software, consumibles)."
                columns={columns}
                data={categories ?? []}
                onAdd={catalog.openCreate}
                onEdit={catalog.openEdit}
                onDelete={catalog.handleDelete}
                onToggle={catalog.handleToggle}
                loading={catalog.loading}
                addLabel="Crear categoría"
                emptyMessage="No hay categorías registradas."
            />

            <CatalogDialog
                key={catalog.editTarget?.id ?? "create"}
                open={catalog.dialogOpen}
                onClose={catalog.closeDialog}
                title={catalog.editTarget ? "Editar categoría" : "Nueva categoría"}
                fields={fields}
                initialValues={catalog.editTarget ?? { is_active: true, require_specs: false }}
                onSubmit={catalog.handleSubmit}
                loading={catalog.loading}
                errors={catalog.dialogErrors}
                submitLabel={catalog.editTarget ? "Actualizar" : "Crear"}
            />
        </>
    );
}

Categories.layout = (page) => <AuthenticatedLayout title="Categorías de inventario">{page}</AuthenticatedLayout>;
