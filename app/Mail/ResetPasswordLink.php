<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\URL;
use Illuminate\Support\Carbon;

class ResetPasswordLink extends Mailable
{
    use Queueable, SerializesModels;

    public string $url;

    public function __construct(string $token, string $email)
    {
        $this->url = URL::to('/') . "/reset-password?token={$token}&email=" . urlencode($email);
    }

    public function build()
    {
        return $this->subject(__('passwords.subject'))
            ->view('emails.reset-password')
            ->with(['url' => $this->url]);
    }
}
