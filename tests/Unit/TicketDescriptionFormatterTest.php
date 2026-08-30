<?php

namespace Tests\Unit;

use App\Support\Tickets\TicketDescriptionFormatter;
use PHPUnit\Framework\TestCase;

class TicketDescriptionFormatterTest extends TestCase
{
    public function test_plain_text_remains_unchanged_and_renders_with_line_breaks(): void
    {
        $plain = "Equipo apagado\nSegundo intento";

        $this->assertSame($plain, TicketDescriptionFormatter::sanitize($plain));
        $this->assertSame('Equipo apagado<br />'."\n".'Segundo intento', TicketDescriptionFormatter::toSafeHtml($plain));
    }

    public function test_allowed_formatting_is_preserved(): void
    {
        $html = '<p><strong>Error</strong></p><ul><li>Reiniciar</li></ul>';

        $this->assertSame($html, TicketDescriptionFormatter::sanitize($html));
    }

    public function test_dangerous_markup_and_attributes_are_removed(): void
    {
        $html = '<p onclick="alert(1)">Texto<script>alert(1)</script></p>'
            .'<a href="javascript:alert(1)" style="color:red">enlace</a>';

        $clean = TicketDescriptionFormatter::sanitize($html);

        $this->assertSame('<p>Texto</p><a>enlace</a>', $clean);
        $this->assertStringNotContainsString('javascript:', $clean);
    }

    public function test_safe_links_open_with_defensive_attributes(): void
    {
        $clean = TicketDescriptionFormatter::sanitize('<a href="https://example.com">Ayuda</a>');

        $this->assertStringContainsString('href="https://example.com"', $clean);
        $this->assertStringContainsString('target="_blank"', $clean);
        $this->assertStringContainsString('rel="noopener noreferrer nofollow"', $clean);
    }

    public function test_visible_length_ignores_formatting_tags(): void
    {
        $this->assertSame(10, TicketDescriptionFormatter::visibleLength('<p><strong>Hola</strong><br>Mundo</p>'));
    }
}
