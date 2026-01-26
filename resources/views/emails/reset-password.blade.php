@php /** @var string $url */ @endphp
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <title>{{ __('passwords.subject') }}</title>
</head>
<body style="font-family: Arial, sans-serif; color:#0f172a;">
    <h2>{{ __('passwords.subject') }}</h2>
    <p>{{ __('passwords.line_1') }}</p>
    <p><a href="{{ $url }}" style="display:inline-block;padding:10px 16px;background:#2563eb;color:#fff;text-decoration:none;border-radius:6px;">{{ __('passwords.button') }}</a></p>
    <p>{{ __('passwords.line_2') }}</p>
    <p style="font-size:12px;color:#475569;">{{ __('passwords.line_3') }}</p>
</body>
</html>
