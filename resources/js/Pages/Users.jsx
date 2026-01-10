import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";

export default function Users() {
    // -----------------------------
    // State
    // -----------------------------
    const [users, setUsers] = useState([]);
    const [roles, setRoles] = useState([]);
    const [loading, setLoading] = useState(true);

    const [createOpen, setCreateOpen] = useState(false);
    const [assignOpen, setAssignOpen] = useState(false);

    const [selectedUser, setSelectedUser] = useState(null);
    const [selectedRoles, setSelectedRoles] = useState([]);

    const [form, setForm] = useState({
        name: "",
        email: "",
        password: "",
    });

    // -----------------------------
    // Fetch users + roles
    // -----------------------------
    useEffect(() => {
        Promise.all([
            fetch("/api/users").then((r) => r.json()),
            fetch("/api/roles").then((r) => r.json()),
        ])
            .then(([usersData, rolesData]) => {
                setUsers(usersData);
                setRoles(rolesData);
            })
            .finally(() => setLoading(false));
    }, []);

    // -----------------------------
    // Create user
    // -----------------------------
    async function createUser() {
        try {
            const res = await fetch("/api/users", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(form),
            });

            const data = await res.json().catch(() => ({}));

            if (!res.ok) {
                // Laravel 422 normalmente trae errors.{campo:[...]}
                const msg =
                    data?.message ||
                    (data?.errors
                        ? Object.values(data.errors).flat().join("\n")
                        : "No se pudo crear el usuario");

                alert(msg);
                return;
            }

            setUsers((prev) => [{ ...data, roles: [] }, ...prev]);
            setForm({ name: "", email: "", password: "" });
            setCreateOpen(false);
        } catch (e) {
            console.error(e);
            alert("Error de red o servidor");
        }
    }

    // -----------------------------
    // Delete user (soft)
    // -----------------------------
    async function deleteUser(id) {
        const ok = confirm("¿Eliminar usuario?");
        if (!ok) return;

        await fetch(`/api/users/${id}`, { method: "DELETE" });
        setUsers((prev) => prev.filter((u) => u.id !== id));
    }

    // -----------------------------
    // Open assign roles dialog
    // -----------------------------
    function openAssignRoles(user) {
        setSelectedUser(user);
        setSelectedRoles(user.roles?.map((r) => r.id) || []);
        setAssignOpen(true);
    }

    // -----------------------------
    // Save roles
    // -----------------------------
    async function saveRoles() {
        await fetch(`/api/users/${selectedUser.id}/roles`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ roles: selectedRoles }),
        });

        setUsers((prev) =>
            prev.map((u) =>
                u.id === selectedUser.id
                    ? {
                          ...u,
                          roles: roles.filter((r) =>
                              selectedRoles.includes(r.id)
                          ),
                      }
                    : u
            )
        );

        setAssignOpen(false);
    }

    // -----------------------------
    // Render
    // -----------------------------
    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-start justify-between">
                <div>
                    <h1 className="text-2xl font-semibold">Usuarios</h1>
                    <p className="text-muted-foreground">
                        Gestión de usuarios y asignación de roles.
                    </p>
                </div>

                <Button onClick={() => setCreateOpen(true)}>
                    Crear usuario
                </Button>
            </div>

            {/* Table */}
            <div className="rounded-xl border overflow-hidden">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>ID</TableHead>
                            <TableHead>Nombre</TableHead>
                            <TableHead>Email</TableHead>
                            <TableHead>Roles</TableHead>
                            <TableHead className="text-right">
                                Acciones
                            </TableHead>
                        </TableRow>
                    </TableHeader>

                    <TableBody>
                        {loading ? (
                            <TableRow>
                                <TableCell
                                    colSpan={5}
                                    className="text-center py-10 text-muted-foreground"
                                >
                                    Cargando usuarios…
                                </TableCell>
                            </TableRow>
                        ) : users.length === 0 ? (
                            <TableRow>
                                <TableCell
                                    colSpan={5}
                                    className="text-center py-10 text-muted-foreground"
                                >
                                    No hay usuarios.
                                </TableCell>
                            </TableRow>
                        ) : (
                            users.map((user) => (
                                <TableRow key={user.id}>
                                    <TableCell>{user.id}</TableCell>
                                    <TableCell>{user.name}</TableCell>
                                    <TableCell className="text-muted-foreground">
                                        {user.email}
                                    </TableCell>
                                    <TableCell className="text-muted-foreground">
                                        {user.roles?.length
                                            ? user.roles
                                                  .map((r) => r.name)
                                                  .join(", ")
                                            : "—"}
                                    </TableCell>
                                    <TableCell className="text-right space-x-2">
                                        <Button
                                            size="sm"
                                            variant="secondary"
                                            onClick={() =>
                                                openAssignRoles(user)
                                            }
                                        >
                                            Roles
                                        </Button>
                                        <Button
                                            size="sm"
                                            variant="destructive"
                                            onClick={() => deleteUser(user.id)}
                                        >
                                            Eliminar
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>

            {/* Dialog Crear Usuario */}
            <Dialog open={createOpen} onOpenChange={setCreateOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Nuevo usuario</DialogTitle>
                    </DialogHeader>

                    <div className="space-y-3">
                        <input
                            className="w-full rounded-md border px-3 py-2"
                            placeholder="Nombre"
                            value={form.name}
                            onChange={(e) =>
                                setForm({ ...form, name: e.target.value })
                            }
                        />
                        <input
                            className="w-full rounded-md border px-3 py-2"
                            placeholder="Email"
                            type="email"
                            value={form.email}
                            onChange={(e) =>
                                setForm({ ...form, email: e.target.value })
                            }
                        />
                        <input
                            className="w-full rounded-md border px-3 py-2"
                            placeholder="Contraseña"
                            type="password"
                            value={form.password}
                            onChange={(e) =>
                                setForm({ ...form, password: e.target.value })
                            }
                        />
                    </div>

                    <div className="flex justify-end gap-2 mt-4">
                        <Button
                            variant="secondary"
                            onClick={() => setCreateOpen(false)}
                        >
                            Cancelar
                        </Button>
                        <Button onClick={createUser}>Crear</Button>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Dialog Asignar Roles */}
            <Dialog open={assignOpen} onOpenChange={setAssignOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>
                            Asignar roles a {selectedUser?.name}
                        </DialogTitle>
                    </DialogHeader>

                    <div className="space-y-3">
                        {roles.map((role) => (
                            <label
                                key={role.id}
                                className="flex items-center gap-3"
                            >
                                <input
                                    type="checkbox"
                                    checked={selectedRoles.includes(role.id)}
                                    onChange={(e) => {
                                        if (e.target.checked) {
                                            setSelectedRoles((prev) => [
                                                ...prev,
                                                role.id,
                                            ]);
                                        } else {
                                            setSelectedRoles((prev) =>
                                                prev.filter(
                                                    (id) => id !== role.id
                                                )
                                            );
                                        }
                                    }}
                                />
                                <span>{role.name}</span>
                            </label>
                        ))}
                    </div>

                    <div className="flex justify-end gap-2 mt-4">
                        <Button
                            variant="secondary"
                            onClick={() => setAssignOpen(false)}
                        >
                            Cancelar
                        </Button>
                        <Button onClick={saveRoles}>Guardar</Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
