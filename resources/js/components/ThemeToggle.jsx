import { Sun, Moon, Monitor } from 'lucide-react';
import { useTheme } from '@/hooks/useTheme';
import { Button } from '@/components/ui/button';

const OPTIONS = [
    { value: 'light', icon: Sun, label: 'Claro' },
    { value: 'dark', icon: Moon, label: 'Oscuro' },
    { value: 'system', icon: Monitor, label: 'Sistema' },
];

export function ThemeToggle({ variant = 'icon', value, onValueChange }) {
    const { theme: contextTheme, setTheme } = useTheme();
    const theme = value ?? contextTheme;

    const applyTheme = (next) => {
        if (onValueChange) {
            onValueChange(next);
            return;
        }
        setTheme(next);
    };

    if (variant === 'icon') {
        const current = OPTIONS.find((o) => o.value === theme) ?? OPTIONS[2];
        const next = OPTIONS[(OPTIONS.indexOf(current) + 1) % OPTIONS.length];
        const Icon = current.icon;

        return (
            <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => applyTheme(next.value)}
                className="h-8 w-8 rounded-lg text-muted-foreground"
                title={`Tema: ${current.label} → ${next.label}`}
                aria-label="Cambiar tema"
            >
                <Icon className="h-4 w-4" />
            </Button>
        );
    }

    if (variant === 'select') {
        return (
            <div className="flex items-center gap-1 rounded-lg bg-muted p-1">
                {OPTIONS.map(({ value: optValue, icon: Icon, label }) => (
                    <Button
                        key={optValue}
                        type="button"
                        variant={theme === optValue ? 'secondary' : 'ghost'}
                        size="sm"
                        onClick={() => applyTheme(optValue)}
                        className="gap-1.5 px-3 text-xs"
                        title={label}
                    >
                        <Icon className="h-3.5 w-3.5" />
                        <span className="hidden sm:inline">{label}</span>
                    </Button>
                ))}
            </div>
        );
    }

    return null;
}
