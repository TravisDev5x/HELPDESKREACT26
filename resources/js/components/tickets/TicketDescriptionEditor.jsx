import { useEffect, useRef, useState } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import CharacterCount from "@tiptap/extension-character-count";
import {
    Bold,
    Code,
    Italic,
    Link2,
    List,
    ListOrdered,
    Redo2,
    Underline,
    Undo2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

const CHARACTER_LIMIT = 10000;

function escapeHtml(value) {
    return value
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

function editorContent(value) {
    if (!value) return "";
    if (/<\/?[a-z][^>]*>/i.test(value)) return value;

    return value
        .split(/\n{2,}/)
        .map((paragraph) => `<p>${escapeHtml(paragraph).replaceAll("\n", "<br>")}</p>`)
        .join("");
}

function ToolbarButton({ active = false, label, onClick, disabled, children }) {
    return (
        <Button
            type="button"
            variant={active ? "secondary" : "ghost"}
            size="icon"
            className="h-8 w-8"
            title={label}
            aria-label={label}
            aria-pressed={active}
            disabled={disabled}
            onClick={onClick}
        >
            {children}
        </Button>
    );
}

export function TicketDescriptionEditor({
    value = "",
    onChange,
    disabled = false,
    placeholder = "Describe qué ocurrió, cuándo y si hay mensajes de error…",
    className,
    minHeight = "120px",
    id,
    "aria-invalid": ariaInvalid,
}) {
    const lastEmittedValue = useRef(null);
    const [, refreshToolbar] = useState(0);
    const [linkOpen, setLinkOpen] = useState(false);
    const [linkUrl, setLinkUrl] = useState("");

    const editor = useEditor({
        immediatelyRender: false,
        editable: !disabled,
        content: editorContent(value),
        extensions: [
            StarterKit.configure({
                heading: false,
                horizontalRule: false,
                blockquote: false,
                strike: false,
                link: {
                    openOnClick: false,
                    autolink: true,
                    defaultProtocol: "https",
                    HTMLAttributes: {
                        rel: "noopener noreferrer nofollow",
                        target: "_blank",
                    },
                },
            }),
            Placeholder.configure({ placeholder }),
            CharacterCount.configure({ limit: CHARACTER_LIMIT }),
        ],
        editorProps: {
            attributes: {
                id: id || "",
                lang: "es-MX",
                spellcheck: "true",
                autocapitalize: "sentences",
                class: "min-h-[inherit] px-3 py-2 text-sm leading-relaxed outline-none",
                "aria-invalid": ariaInvalid ? "true" : "false",
            },
        },
        onUpdate: ({ editor: currentEditor }) => {
            const nextValue = currentEditor.isEmpty ? "" : currentEditor.getHTML();
            lastEmittedValue.current = nextValue;
            onChange(nextValue);
            refreshToolbar((revision) => revision + 1);
        },
        onSelectionUpdate: () => refreshToolbar((revision) => revision + 1),
    });

    useEffect(() => {
        editor?.setEditable(!disabled);
    }, [disabled, editor]);

    useEffect(() => {
        if (!editor || value === lastEmittedValue.current) return;
        const nextContent = editorContent(value);
        if (editor.getHTML() !== nextContent) {
            editor.commands.setContent(nextContent, { emitUpdate: false });
        }
        lastEmittedValue.current = value;
    }, [editor, value]);

    if (!editor) {
        return <div className={cn("rounded-md border border-input bg-background", className)} style={{ minHeight }} />;
    }

    const chain = () => editor.chain().focus();
    const applyLink = () => {
        const href = linkUrl.trim();
        if (!href) {
            chain().unsetLink().run();
        } else {
            chain().extendMarkRange("link").setLink({ href }).run();
        }
        setLinkOpen(false);
        setLinkUrl("");
    };

    const characters = editor.storage.characterCount.characters();

    return (
        <div className={cn("overflow-hidden rounded-md border border-input bg-background shadow-sm focus-within:ring-1 focus-within:ring-ring", ariaInvalid && "border-destructive", className)}>
            <div className="flex flex-wrap items-center gap-0.5 border-b border-border/70 bg-muted/30 p-1">
                <ToolbarButton label="Negrita (Ctrl+B)" active={editor.isActive("bold")} disabled={disabled} onClick={() => chain().toggleBold().run()}><Bold /></ToolbarButton>
                <ToolbarButton label="Cursiva (Ctrl+I)" active={editor.isActive("italic")} disabled={disabled} onClick={() => chain().toggleItalic().run()}><Italic /></ToolbarButton>
                <ToolbarButton label="Subrayado (Ctrl+U)" active={editor.isActive("underline")} disabled={disabled} onClick={() => chain().toggleUnderline().run()}><Underline /></ToolbarButton>
                <Separator orientation="vertical" className="mx-1 h-5" />
                <ToolbarButton label="Lista con viñetas" active={editor.isActive("bulletList")} disabled={disabled} onClick={() => chain().toggleBulletList().run()}><List /></ToolbarButton>
                <ToolbarButton label="Lista numerada" active={editor.isActive("orderedList")} disabled={disabled} onClick={() => chain().toggleOrderedList().run()}><ListOrdered /></ToolbarButton>
                <ToolbarButton label="Código" active={editor.isActive("code")} disabled={disabled} onClick={() => chain().toggleCode().run()}><Code /></ToolbarButton>
                <Popover open={linkOpen} onOpenChange={setLinkOpen}>
                    <PopoverTrigger asChild>
                        <span>
                            <ToolbarButton
                                label="Agregar enlace"
                                active={editor.isActive("link")}
                                disabled={disabled}
                                onClick={() => setLinkUrl(editor.getAttributes("link").href || "")}
                            ><Link2 /></ToolbarButton>
                        </span>
                    </PopoverTrigger>
                    <PopoverContent className="w-80 space-y-3" align="start">
                        <div className="space-y-1">
                            <p className="text-sm font-medium">Enlace</p>
                            <p className="text-xs text-muted-foreground">Selecciona el texto e introduce una URL segura.</p>
                        </div>
                        <Input
                            value={linkUrl}
                            onChange={(event) => setLinkUrl(event.target.value)}
                            onKeyDown={(event) => {
                                if (event.key === "Enter") {
                                    event.preventDefault();
                                    applyLink();
                                }
                            }}
                            placeholder="https://ejemplo.com"
                            inputMode="url"
                            autoFocus
                        />
                        <div className="flex justify-end gap-2">
                            {editor.isActive("link") && (
                                <Button type="button" variant="ghost" size="sm" onClick={() => { chain().unsetLink().run(); setLinkOpen(false); }}>Quitar</Button>
                            )}
                            <Button type="button" size="sm" onClick={applyLink}>Aplicar</Button>
                        </div>
                    </PopoverContent>
                </Popover>
                <div className="ml-auto flex items-center gap-0.5">
                    <ToolbarButton label="Deshacer" disabled={disabled || !editor.can().chain().focus().undo().run()} onClick={() => chain().undo().run()}><Undo2 /></ToolbarButton>
                    <ToolbarButton label="Rehacer" disabled={disabled || !editor.can().chain().focus().redo().run()} onClick={() => chain().redo().run()}><Redo2 /></ToolbarButton>
                </div>
            </div>
            <EditorContent
                editor={editor}
                className="ticket-description-editor [&_.tiptap]:min-h-[inherit] [&_.tiptap_p.is-editor-empty:first-child::before]:pointer-events-none [&_.tiptap_p.is-editor-empty:first-child::before]:float-left [&_.tiptap_p.is-editor-empty:first-child::before]:h-0 [&_.tiptap_p.is-editor-empty:first-child::before]:text-muted-foreground [&_.tiptap_p.is-editor-empty:first-child::before]:content-[attr(data-placeholder)] [&_.tiptap_p]:my-1 [&_.tiptap_ul]:my-2 [&_.tiptap_ul]:list-disc [&_.tiptap_ul]:pl-6 [&_.tiptap_ol]:my-2 [&_.tiptap_ol]:list-decimal [&_.tiptap_ol]:pl-6 [&_.tiptap_code]:rounded [&_.tiptap_code]:bg-muted [&_.tiptap_code]:px-1 [&_.tiptap_code]:font-mono [&_.tiptap_a]:text-primary [&_.tiptap_a]:underline"
                style={{ minHeight }}
            />
            <div className="flex justify-between border-t border-border/60 px-3 py-1.5 text-[11px] text-muted-foreground">
                <span>Corrector ortográfico del navegador · Español (México)</span>
                <span className={cn(characters > CHARACTER_LIMIT * 0.9 && "text-amber-600", characters >= CHARACTER_LIMIT && "text-destructive")}>{characters.toLocaleString()}/{CHARACTER_LIMIT.toLocaleString()}</span>
            </div>
        </div>
    );
}
