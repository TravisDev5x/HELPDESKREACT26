<!DOCTYPE html>
<html lang="es">
<head>
  <!-- build: <?php echo e(config('app.env')); ?>-<?php echo e(now()->format('YmdHis')); ?> -->
  <script>
    (function () {
      try {
        const storedTheme = localStorage.getItem('theme');
        const storedLocale = localStorage.getItem('locale');
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        const theme = storedTheme || (prefersDark ? 'dark' : 'light');
        const THEMES = ['light','light-dim','dark','dark-deep','aeroglass','aeroglass-dark'];
        const root = document.documentElement;
        root.dataset.themeInit = '1';
        THEMES.forEach(t => root.classList.remove(t));
        root.classList.add(theme);
        root.style.colorScheme = theme.includes('dark') ? 'dark' : 'light';
        if (storedLocale) root.lang = storedLocale;
      } catch (e) {}
    })();
  </script>

  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta http-equiv="Cache-Control" content="no-store, no-cache, must-revalidate">
  <meta http-equiv="Pragma" content="no-cache">
  <meta http-equiv="Expires" content="0">
  <title>HelpDesk Enterprise</title>

  <?php echo app('Illuminate\Foundation\Vite')->reactRefresh(); ?>
  <?php echo app('Illuminate\Foundation\Vite')('resources/js/app.jsx'); ?>
</head>

<body>
  <div id="app"></div>
</body>
</html>
<?php /**PATH C:\laragon\www\HELPDESKREACT26\resources\views/app.blade.php ENDPATH**/ ?>