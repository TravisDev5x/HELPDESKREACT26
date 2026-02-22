<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title><?php echo e($appName ?? 'HelpDesk Enterprise'); ?> - Verificacion de correo</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;600;700&display=swap" rel="stylesheet">
    <style>
        :root {
            --bg-deep: #0b141f;
            --bg-emerald: #0f2b2a;
            --card: rgba(255, 255, 255, 0.08);
            --card-border: rgba(255, 255, 255, 0.12);
            --text: #eaf2f6;
            --muted: #b8c6d1;
            --accent: #f5b84b;
            --accent-2: #27c7a6;
            --danger: #ff7a7a;
            --shadow: rgba(5, 9, 13, 0.55);
        }

        * { box-sizing: border-box; }

        body {
            margin: 0;
            font-family: "Space Grotesk", "Segoe UI", sans-serif;
            color: var(--text);
            background:
                radial-gradient(1200px 600px at 15% 10%, rgba(39, 199, 166, 0.22), transparent 60%),
                radial-gradient(900px 500px at 85% 20%, rgba(245, 184, 75, 0.18), transparent 60%),
                linear-gradient(145deg, var(--bg-deep), var(--bg-emerald));
            min-height: 100vh;
            display: grid;
            place-items: center;
            padding: 32px 20px;
        }

        .shell {
            width: min(760px, 94vw);
            position: relative;
        }

        .card {
            background: var(--card);
            border: 1px solid var(--card-border);
            border-radius: 24px;
            padding: 36px 36px 32px;
            box-shadow: 0 30px 60px var(--shadow);
            backdrop-filter: blur(14px);
            animation: rise 420ms ease-out both;
        }

        .brand {
            font-size: 14px;
            letter-spacing: 0.2em;
            text-transform: uppercase;
            color: var(--muted);
            margin-bottom: 18px;
        }

        .title {
            font-size: clamp(26px, 4vw, 34px);
            font-weight: 700;
            margin: 0 0 10px;
        }

        .message {
            font-size: 16px;
            line-height: 1.6;
            color: var(--muted);
            margin: 0 0 26px;
        }

        .status {
            display: inline-flex;
            align-items: center;
            gap: 10px;
            padding: 10px 14px;
            border-radius: 999px;
            background: rgba(255, 255, 255, 0.06);
            border: 1px solid rgba(255, 255, 255, 0.12);
            font-size: 13px;
            text-transform: uppercase;
            letter-spacing: 0.14em;
            color: var(--muted);
            margin-bottom: 18px;
        }

        .dot {
            width: 10px;
            height: 10px;
            border-radius: 50%;
            background: var(--accent-2);
            box-shadow: 0 0 0 6px rgba(39, 199, 166, 0.16);
        }

        .status.error .dot {
            background: var(--danger);
            box-shadow: 0 0 0 6px rgba(255, 122, 122, 0.16);
        }

        .actions {
            display: flex;
            flex-wrap: wrap;
            gap: 12px;
        }

        .btn {
            display: inline-flex;
            align-items: center;
            gap: 10px;
            padding: 12px 20px;
            border-radius: 14px;
            text-decoration: none;
            font-weight: 600;
            transition: transform 160ms ease, box-shadow 160ms ease;
        }

        .btn-primary {
            color: #0b141f;
            background: linear-gradient(120deg, var(--accent), #ffd38f);
            box-shadow: 0 12px 30px rgba(245, 184, 75, 0.28);
        }

        .btn-secondary {
            color: var(--text);
            background: rgba(255, 255, 255, 0.08);
            border: 1px solid rgba(255, 255, 255, 0.16);
        }

        .btn:hover {
            transform: translateY(-1px);
            box-shadow: 0 16px 34px rgba(7, 10, 15, 0.3);
        }

        .footnote {
            margin-top: 20px;
            color: var(--muted);
            font-size: 13px;
        }

        @keyframes rise {
            from { opacity: 0; transform: translateY(10px) scale(0.98); }
            to { opacity: 1; transform: translateY(0) scale(1); }
        }
    </style>
</head>
<body>
    <?php
        $isSuccess = ($status ?? 'error') === 'success';
        $title = $isSuccess ? 'Correo verificado' : 'No se pudo verificar';
        $ctaText = $isSuccess ? 'Ir a iniciar sesion' : 'Volver al inicio de sesion';
        $ctaAlt = $isSuccess ? 'Abrir app' : 'Ir al inicio';
    ?>
    <div class="shell">
        <div class="card">
            <div class="brand"><?php echo e($appName ?? 'HelpDesk Enterprise'); ?></div>
            <div class="status <?php echo e($isSuccess ? '' : 'error'); ?>">
                <span class="dot"></span>
                <?php echo e($isSuccess ? 'Verificacion completa' : 'Verificacion fallida'); ?>

            </div>
            <h1 class="title"><?php echo e($title); ?></h1>
            <p class="message"><?php echo e($message ?? 'Ocurrio un problema al verificar tu correo.'); ?></p>
            <div class="actions">
                <a class="btn btn-primary" href="<?php echo e($loginUrl ?? url('/login')); ?>"><?php echo e($ctaText); ?></a>
                <a class="btn btn-secondary" href="<?php echo e($loginUrl ?? url('/login')); ?>"><?php echo e($ctaAlt); ?></a>
            </div>
            <div class="footnote">
                Puedes cerrar esta ventana cuando termines.
            </div>
        </div>
    </div>
</body>
</html>
<?php /**PATH C:\laragon\www\HelpdeskReact\resources\views/auth/verify-email.blade.php ENDPATH**/ ?>