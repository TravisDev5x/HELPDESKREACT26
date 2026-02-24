# Usuarios demo (FullDemoSeeder)

Contraseña para **todos** los usuarios: **`Password123!`**

## 5 tipos de usuario (credenciales fijas)

| # | Email | Nombre | Tipo | Descripción |
|---|--------|--------|------|-------------|
| 1 | **admin@demo.com** | Admin Global | Admin | Todos los permisos. Área: Sistemas / TI. |
| 2 | **soporte@demo.com** | Carlos Soporte | Agente Soporte | Ver área, comentar, cambiar estado, asignar. Área: Soporte. |
| 3 | **supervisor@demo.com** | Sofía Supervisor | Supervisor | Asignar, escalar, ver área, comentar, cambiar estado. Área: Soporte. |
| 4 | **usuario@demo.com** | Ana Usuario | Solicitante | Solo crear tickets y ver los propios. Área: Sistemas / TI. |
| 5 | **consultor@demo.com** | Luis Consultor | Consultor | Ver por área y ver propios; **sin área asignada** (para probar el aviso "Asigna tu área"). |

## Cómo ejecutar el seeder

Con migraciones ya ejecutadas:

```bash
php artisan db:seed --class=FullDemoSeeder
```

Para vaciar y volver a migrar + sembrar todo:

```bash
php artisan migrate:fresh --seed
```

(Solo si en `DatabaseSeeder` se llama a `FullDemoSeeder`.)

## Qué genera el seeder

- **Catálogos**: campañas, áreas, puestos, sedes, ubicaciones, prioridades, estados de ticket, tipos de ticket.
- **Roles y permisos**: admin, agente_soporte, supervisor_soporte, usuario, consultor.
- **5 usuarios fijos** (tabla anterior).
- **95 usuarios Faker** con roles mezclados (solicitantes y agentes).
- **210 tickets** con asuntos, descripciones, fechas, asignaciones e historial coherentes.

Total: **100 usuarios** (5 fijos + 95 Faker) y **210 tickets**.
