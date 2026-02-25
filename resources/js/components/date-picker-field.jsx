import { format, isValid, parse } from "date-fns";
import { es as dateFnsEs, enUS as dateFnsEn } from "date-fns/locale";
import { CalendarDays } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useTheme } from "@/hooks/useTheme";
import { cn } from "@/lib/utils";

function getDateFnsLocale(appLocale) {
    return appLocale === "en" ? dateFnsEn : dateFnsEs;
}

/**
 * Campo de fecha que usa el Calendar de shadcn (react-day-picker).
 * Valor en formato "yyyy-MM-dd"; al cambiar se devuelve el mismo formato.
 */
export function DatePickerField({ value, onChange, placeholder = "Seleccionar fecha", className, id }) {
    const { locale: appLocale } = useTheme();
    const dateFnsLocale = getDateFnsLocale(appLocale);
    const parsed = value ? parse(value, "yyyy-MM-dd", new Date()) : null;
    const selectedDate = parsed && isValid(parsed) ? parsed : undefined;

    return (
        <Popover>
            <PopoverTrigger asChild>
                <Button
                    id={id}
                    variant="outline"
                    className={cn(
                        "w-full h-9 justify-start text-left text-xs font-normal border-dashed",
                        !selectedDate && "text-muted-foreground",
                        className
                    )}
                >
                    <CalendarDays className="mr-2 h-3.5 w-3.5 opacity-70 shrink-0" />
                    <span className="truncate">
                        {selectedDate ? format(selectedDate, "PPP", { locale: dateFnsLocale }) : placeholder}
                    </span>
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start" sideOffset={4}>
                <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={(date) => onChange(date ? format(date, "yyyy-MM-dd") : "")}
                    initialFocus
                    locale={dateFnsLocale}
                    className="rounded-md border-0"
                />
                <div className="p-2 border-t border-border/50 bg-muted/20 rounded-b-md">
                    <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => onChange("")}
                        className="w-full h-7 text-[10px]"
                    >
                        Borrar fecha
                    </Button>
                </div>
            </PopoverContent>
        </Popover>
    );
}
