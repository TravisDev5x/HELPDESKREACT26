import {
    useReactTable,
    getCoreRowModel,
    flexRender,
} from "@tanstack/react-table";
import { cn } from "@/lib/utils";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Search } from "lucide-react";

/**
 * DataTable base: motor TanStack Table + render con shadcn Table.
 * Props: columns, data, loading, getRowId?, selectedIds? (para clase fila), emptyMessage?, emptyColSpan?
 */
export function DataTable({
    columns,
    data,
    loading = false,
    getRowId = (row) => row.id,
    selectedIds,
    emptyMessage = "No se encontraron resultados",
    emptyColSpan = 5,
}) {
    const table = useReactTable({
        data,
        columns,
        getCoreRowModel: getCoreRowModel(),
        getRowId,
    });

    return (
        <Table>
            <TableHeader className="bg-muted/30">
                {table.getHeaderGroups().map((headerGroup) => (
                    <TableRow key={headerGroup.id}>
                        {headerGroup.headers.map((header) => (
                            <TableHead
                                key={header.id}
                                className={cn(
                                    header.column.columnDef.meta?.headerClassName ??
                                        header.column.columnDef.meta?.className
                                )}
                            >
                                {header.isPlaceholder
                                    ? null
                                    : flexRender(
                                          header.column.columnDef.header,
                                          header.getContext()
                                      )}
                            </TableHead>
                        ))}
                    </TableRow>
                ))}
            </TableHeader>
            <TableBody>
                {loading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                        <TableRow key={i}>
                            <TableCell>
                                <Skeleton className="h-4 w-4 rounded" />
                            </TableCell>
                            <TableCell>
                                <div className="space-y-2">
                                    <Skeleton className="h-4 w-32" />
                                    <Skeleton className="h-3 w-20" />
                                </div>
                            </TableCell>
                            <TableCell className="hidden md:table-cell">
                                <Skeleton className="h-4 w-24" />
                            </TableCell>
                            <TableCell>
                                <Skeleton className="h-5 w-20 rounded-full" />
                            </TableCell>
                            <TableCell>
                                <Skeleton className="h-8 w-8 ml-auto" />
                            </TableCell>
                        </TableRow>
                    ))
                ) : data.length === 0 ? (
                    <TableRow>
                        <TableCell colSpan={emptyColSpan} className="h-32 text-center">
                            <div className="flex flex-col items-center justify-center text-muted-foreground">
                                <div className="bg-muted p-3 rounded-full mb-2">
                                    <Search className="h-6 w-6 opacity-50" />
                                </div>
                                <p className="text-sm font-medium">{emptyMessage}</p>
                            </div>
                        </TableCell>
                    </TableRow>
                ) : (
                    table.getRowModel().rows.map((row) => (
                        <TableRow
                            key={row.id}
                            className={`group ${
                                selectedIds && selectedIds.includes(row.id)
                                    ? "bg-muted/40"
                                    : ""
                            }`}
                        >
                            {row.getVisibleCells().map((cell) => (
                                <TableCell
                                    key={cell.id}
                                    className={cell.column.columnDef.meta?.className}
                                >
                                    {flexRender(
                                        cell.column.columnDef.cell,
                                        cell.getContext()
                                    )}
                                </TableCell>
                            ))}
                        </TableRow>
                    ))
                )}
            </TableBody>
        </Table>
    );
}
