<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Password;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class PasswordResetController extends Controller
{
    /**
     * Solicitar enlace de restablecimiento.
     */
    public function forgot(Request $request)
    {
        $request->validate([
            'email' => 'required|email',
            'hcaptcha_token' => 'nullable|string',
        ]);

        // Verificar hCaptcha si está configurado
        $secret = config('services.hcaptcha.secret');
        if ($secret) {
            $token = $request->input('hcaptcha_token');
            if (!$token) {
                return response()->json(['message' => 'Falta validación de captcha'], 422);
            }
            $resp = Http::asForm()->post('https://hcaptcha.com/siteverify', [
                'secret' => $secret,
                'response' => $token,
                'remoteip' => $request->ip(),
            ]);
            if (!$resp->ok() || !$resp->json('success')) {
                return response()->json(['message' => 'Captcha inválido'], 422);
            }
        }

        /** @var User|null $user */
        $user = User::where('email', $request->email)->first();

        // Si no hay usuario con correo, notificamos al admin y respondemos 202 genérico
        if (!$user || !$user->email) {
            DB::table('admin_notifications')->insert([
                'type' => 'password_reset_missing_email',
                'payload' => json_encode(['requested_email' => $request->email, 'at' => now()->toIso8601String()]),
                'created_at' => now(),
                'updated_at' => now(),
            ]);
            return response()->json(['message' => __('passwords.sent')], 202);
        }

        $status = Password::sendResetLink($request->only('email'));

        return $status === Password::RESET_LINK_SENT
            ? response()->json(['message' => __('passwords.sent')])
            : response()->json(['message' => __('passwords.throttled')], 429);
    }

    /**
     * Restablecer contraseña usando token.
     */
    public function reset(Request $request)
    {
        $request->validate([
            'token' => 'required',
            'email' => 'required|email',
            'password' => [
                'required', 'confirmed', 'min:12',
                'regex:/[a-z]/', 'regex:/[A-Z]/', 'regex:/[0-9]/', 'regex:/[^A-Za-z0-9]/',
            ],
        ]);

        $status = Password::reset(
            $request->only('email', 'password', 'password_confirmation', 'token'),
            function (User $user) use ($request) {
                $user->forceFill([
                    'password' => Hash::make($request->password),
                    'remember_token' => Str::random(60),
                    'force_password_change' => false,
                ])->save();
            }
        );

        return $status === Password::PASSWORD_RESET
            ? response()->json(['message' => __('passwords.reset')])
            : response()->json(['message' => __('passwords.token')], 422);
    }
}
