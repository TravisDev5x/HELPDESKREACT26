<?php

namespace App\Support\Tickets;

use DOMDocument;
use DOMElement;
use DOMNode;

final class TicketDescriptionFormatter
{
    private const ALLOWED_TAGS = [
        'p', 'br', 'strong', 'b', 'em', 'i', 'u', 's', 'strike',
        'ul', 'ol', 'li', 'blockquote', 'code', 'pre', 'a',
    ];

    private const DROP_WITH_CONTENT = [
        'script', 'style', 'iframe', 'object', 'embed', 'svg', 'math',
        'form', 'input', 'button', 'textarea', 'select', 'option',
    ];

    public static function sanitize(?string $value): ?string
    {
        if ($value === null) {
            return null;
        }

        $value = trim(str_replace("\0", '', $value));
        if ($value === '') {
            return null;
        }

        if (! self::containsHtml($value)) {
            return $value;
        }

        return self::sanitizeHtml($value);
    }

    public static function toSafeHtml(?string $value): string
    {
        $value = self::sanitize($value);
        if ($value === null) {
            return '';
        }

        if (! self::containsHtml($value)) {
            return nl2br(htmlspecialchars($value, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8'));
        }

        return $value;
    }

    public static function visibleLength(?string $value): int
    {
        if ($value === null || $value === '') {
            return 0;
        }

        $withBreaks = preg_replace('/<(?:br\s*\/?|\/p|\/li)>/i', "\n", $value);
        $text = html_entity_decode(strip_tags($withBreaks ?? $value), ENT_QUOTES | ENT_HTML5, 'UTF-8');

        return mb_strlen(trim($text));
    }

    private static function containsHtml(string $value): bool
    {
        return preg_match('/<\/?[a-z][^>]*>/i', $value) === 1;
    }

    private static function sanitizeHtml(string $html): string
    {
        $previous = libxml_use_internal_errors(true);
        $document = new DOMDocument('1.0', 'UTF-8');
        $document->loadHTML(
            '<?xml encoding="utf-8" ?><div id="ticket-description-root">'.$html.'</div>',
            LIBXML_HTML_NOIMPLIED | LIBXML_HTML_NODEFDTD
        );

        $root = $document->getElementById('ticket-description-root');
        if (! $root) {
            libxml_clear_errors();
            libxml_use_internal_errors($previous);

            return htmlspecialchars(strip_tags($html), ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
        }

        self::cleanChildren($root);

        $clean = '';
        foreach ($root->childNodes as $child) {
            $clean .= $document->saveHTML($child);
        }

        libxml_clear_errors();
        libxml_use_internal_errors($previous);

        return trim($clean);
    }

    private static function cleanChildren(DOMNode $parent): void
    {
        foreach (iterator_to_array($parent->childNodes) as $node) {
            if (! $node instanceof DOMElement) {
                continue;
            }

            $tag = strtolower($node->tagName);
            if (in_array($tag, self::DROP_WITH_CONTENT, true)) {
                $parent->removeChild($node);

                continue;
            }

            self::cleanChildren($node);

            if (! in_array($tag, self::ALLOWED_TAGS, true)) {
                while ($node->firstChild) {
                    $parent->insertBefore($node->firstChild, $node);
                }
                $parent->removeChild($node);

                continue;
            }

            self::cleanAttributes($node, $tag);
        }
    }

    private static function cleanAttributes(DOMElement $element, string $tag): void
    {
        foreach (iterator_to_array($element->attributes) as $attribute) {
            if ($tag !== 'a' || ! in_array(strtolower($attribute->name), ['href', 'title'], true)) {
                $element->removeAttribute($attribute->name);
            }
        }

        if ($tag !== 'a') {
            return;
        }

        $href = trim($element->getAttribute('href'));
        if ($href === '' || ! preg_match('/^(https?:\/\/|mailto:)/i', $href)) {
            $element->removeAttribute('href');

            return;
        }

        $element->setAttribute('target', '_blank');
        $element->setAttribute('rel', 'noopener noreferrer nofollow');
    }
}
