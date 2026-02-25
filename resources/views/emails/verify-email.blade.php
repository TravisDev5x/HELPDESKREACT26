<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Verifica tu correo</title>
    <!--[if mso]>
    <noscript>
        <xml>
            <o:OfficeDocumentSettings>
                <o:PixelsPerInch>96</o:PixelsPerInch>
            </o:OfficeDocumentSettings>
        </xml>
    </noscript>
    <![endif]-->
</head>
<body style="margin: 0; padding: 0; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; font-size: 16px; line-height: 1.6; color: #0f172a;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #f1f5f9;">
        <tr>
            <td align="center" style="padding: 32px 16px;">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width: 480px;">
                    <!-- Card container (estilo shadcn: card con borde y radio) -->
                    <tr>
                        <td style="background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.06); overflow: hidden;">
                            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                                <!-- Header -->
                                <tr>
                                    <td style="padding: 24px 24px 16px 24px; border-bottom: 1px solid #e2e8f0;">
                                        <h1 style="margin: 0; font-size: 1.25rem; font-weight: 600; color: #0f172a; letter-spacing: -0.025em;">
                                            HelpDesk
                                        </h1>
                                        <p style="margin: 4px 0 0 0; font-size: 0.875rem; color: #64748b;">
                                            Verificación de correo
                                        </p>
                                    </td>
                                </tr>
                                <!-- Body -->
                                <tr>
                                    <td style="padding: 24px;">
                                        <p style="margin: 0 0 16px 0; font-size: 1rem; color: #0f172a;">
                                            Hola,
                                        </p>
                                        <p style="margin: 0 0 24px 0; font-size: 1rem; color: #334155;">
                                            Para activar tu cuenta, verifica tu correo haciendo clic en el botón siguiente. Podrás entrar como visitante y un administrador te asignará un rol para interactuar.
                                        </p>
                                        <!-- CTA (estilo botón primary shadcn) -->
                                        <table role="presentation" cellspacing="0" cellpadding="0" border="0" align="left">
                                            <tr>
                                                <td align="center" style="border-radius: 8px; background-color: #0f172a;">
                                                    <a href="{{ $url }}" target="_blank" rel="noopener noreferrer" style="display: inline-block; padding: 10px 20px; font-size: 0.875rem; font-weight: 500; color: #f8fafc; text-decoration: none;">
                                                        Verificar correo
                                                    </a>
                                                </td>
                                            </tr>
                                        </table>
                                        <div style="clear: both; height: 24px;"></div>
                                        <p style="margin: 0; font-size: 0.8125rem; color: #64748b;">
                                            Si el botón no funciona, copia y pega este enlace en tu navegador:
                                        </p>
                                        <p style="margin: 8px 0 0 0; font-size: 0.8125rem;">
                                            <a href="{{ $url }}" style="color: #3b82f6; text-decoration: underline; word-break: break-all;">{{ $url }}</a>
                                        </p>
                                    </td>
                                </tr>
                                <!-- Footer -->
                                <tr>
                                    <td style="padding: 16px 24px 24px 24px; border-top: 1px solid #e2e8f0; background-color: #f8fafc;">
                                        <p style="margin: 0; font-size: 0.75rem; color: #64748b;">
                                            Si no solicitaste este registro, ignora este correo.
                                        </p>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                    <!-- Optional footer outside card -->
                    <tr>
                        <td style="padding-top: 24px; text-align: center;">
                            <p style="margin: 0; font-size: 0.75rem; color: #94a3b8;">
                                HelpDesk Empresarial
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
