import { cn } from "@/lib/utils";

export function TicketDescription({ html, text, className }) {
    if (html) {
        return (
            <div
                className={cn("break-words text-sm leading-relaxed [&_p]:my-1 [&_ul]:my-2 [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:my-2 [&_ol]:list-decimal [&_ol]:pl-6 [&_code]:rounded [&_code]:bg-muted [&_code]:px-1 [&_code]:font-mono [&_a]:text-primary [&_a]:underline", className)}
                dangerouslySetInnerHTML={{ __html: html }}
            />
        );
    }

    return <div className={cn("whitespace-pre-wrap break-words text-sm leading-relaxed", className)}>{text || "—"}</div>;
}
