<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Nuevo empleado pendiente de aprobación</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; font-size: 16px; line-height: 1.6; color: #0f172a;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #f1f5f9;">
        <tr>
            <td align="center" style="padding: 32px 16px;">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width: 520px;">
                    <tr>
                        <td style="background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.06); overflow: hidden;">
                            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                                <tr>
                                    <td style="padding: 24px 24px 16px 24px; border-bottom: 1px solid #e2e8f0;">
                                        <h1 style="margin: 0; font-size: 1.25rem; font-weight: 600; color: #0f172a; letter-spacing: -0.025em;">
                                            HelpDesk – Recursos Humanos
                                        </h1>
                                        <p style="margin: 4px 0 0 0; font-size: 0.875rem; color: #64748b;">
                                            Nuevo empleado registrado
                                        </p>
                                    </td>
                                </tr>
                                <tr>
                                    <td style="padding: 24px;">
                                        <p style="margin: 0 0 16px 0; font-size: 1rem; color: #0f172a;">
                                            Recursos Humanos ha registrado un nuevo empleado: <strong>{{ $employeeName }}</strong>
                                            @if($employeeNumber ?? null)
                                                <span style="color: #64748b;"> (Nº {{ $employeeNumber }})</span>
                                            @endif
                                        </p>
                                        <p style="margin: 0 0 24px 0; font-size: 1rem; color: #334155;">
                                            Por favor, ingresa al sistema para aprobar su cuenta y asignarle los roles técnicos correspondientes.
                                        </p>
                                        <table role="presentation" cellspacing="0" cellpadding="0" border="0" align="left">
                                            <tr>
                                                <td align="center" style="border-radius: 8px; background-color: #0f172a;">
                                                    <a href="{{ url('/users') }}" target="_blank" rel="noopener noreferrer" style="display: inline-block; padding: 10px 20px; font-size: 0.875rem; font-weight: 500; color: #f8fafc; text-decoration: none;">
                                                        Ir a Usuarios
                                                    </a>
                                                </td>
                                            </tr>
                                        </table>
                                        <div style="clear: both; height: 24px;"></div>
                                        <p style="margin: 0; font-size: 0.8125rem; color: #64748b;">
                                            Este correo se ha enviado a los administradores con permiso de gestión de usuarios.
                                        </p>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
