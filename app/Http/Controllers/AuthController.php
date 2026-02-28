<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\Log;
use App\Models\User;
use App\Models\Role;
use App\Mail\VerifyEmail;

class AuthController extends Controller
{
    public function login(Request $request)
    {
        $request->validate([
            'identifier' => ['required'],
            'password'   => ['required'],
        ]);

        $input = trim($request->input('identifier'));

        // Detectar si es email o numero de empleado
        $fieldType = filter_var($input, FILTER_VALIDATE_EMAIL)
            ? 'email'
            : 'employee_number';

        // Buscar usuario (mismo mensaje para no filtrar existencia)
        $user = User::where($fieldType, $input)->first();
        if (! $user || ! Hash::check($request->password, $user->password)) {
            Log::channel('single')->warning('Login fallido', [
                'identifier_type' => $fieldType,
                'ip' => $request->ip(),
            ]);
            return response()->json([
                'errors' => ['root' => 'Credenciales inválidas']
            ], 422);
        }

        if ($user->is_blacklisted) {
            return response()->json([
                'errors' => ['root' => 'Tu cuenta está vetada. Contacta al administrador']
            ], 403);
        }

        // Solo pending_email y blocked no pueden entrar. pending_admin puede entrar y ver app con mensaje de espera.
        if (in_array($user->status, ['pending_email', 'blocked'], true)) {
            $message = match ($user->status) {
                'pending_email' => 'Verifica tu correo para activar la cuenta',
                'blocked' => 'Tu cuenta está bloqueada',
                default => 'Tu cuenta no está activa',
            };
            return response()->json([
                'errors' => ['root' => $message]
            ], 403);
        }

        if ($user->status === 'active' && $user->email && is_null($user->email_verified_at)) {
            return response()->json([
                'errors' => ['root' => 'Verifica tu correo para activar la cuenta']
            ], 403);
        }

        Auth::login($user);
        if ($request->hasSession()) {
            $request->session()->regenerate();
        }

        // Actualizar información de última conexión (compatible con monitor de sesiones)
        $user->forceFill([
            'last_login_at' => now(),
            'last_login_ip' => $request->ip(),
        ])->save();

        $authUser = Auth::user()->load('roles:id,name,guard_name');
        $permissions = $authUser->getAllPermissions()->pluck('name')->values();

        return response()->json([
            'user' => $authUser,
            'roles' => $authUser->roles->pluck('name'),
            'permissions' => $permissions,
        ]);
    }

    public function register(Request $request)
    {
        $validated = $request->validate([
            'employee_number' => ['required', 'string', 'max:255', 'unique:users,employee_number'],
            'first_name' => ['required', 'string', 'max:255'],
            'paternal_last_name' => ['required', 'string', 'max:255'],
            'maternal_last_name' => ['nullable', 'string', 'max:255'],
            'email' => ['nullable', 'email', 'unique:users,email'],
            'phone' => ['nullable', 'digits:10'],
            'sede_id' => ['nullable', 'exists:sites,id'],
            'password' => [
                'required',
                'string',
                'min:12',
                'regex:/[a-z]/',
                'regex:/[A-Z]/',
                'regex:/[0-9]/',
                'regex:/[^A-Za-z0-9]/',
                'confirmed',
            ],
        ]);

        $sedeId = $validated['sede_id'] ?? \App\Models\Sede::where('code', 'REMOTO')->value('id');

        $status = !empty($validated['email']) ? 'pending_email' : 'pending_admin';
        $user = User::create([
            'employee_number' => $validated['employee_number'],
            'first_name' => $validated['first_name'],
            'paternal_last_name' => $validated['paternal_last_name'],
            'maternal_last_name' => $validated['maternal_last_name'] ?? null,
            'email' => $validated['email'] ?? null,
            'phone' => $validated['phone'] ?? null,
            'password' => Hash::make($validated['password']),
            'status' => $status,
            'sede_id' => $sedeId,
        ]);

        $mailSent = false;
        if (!empty($validated['email'])) {
            $token = Str::uuid()->toString();
            DB::table('email_verification_tokens')->insert([
                'user_id' => $user->id,
                'token' => $token,
                'expires_at' => now()->addHours(24),
                'created_at' => now(),
                'updated_at' => now(),
            ]);

            $url = url("/verify-email?token={$token}");
            try {
                Mail::to($user->email)->send(new VerifyEmail($url));
                $mailSent = true;
            } catch (\Throwable $e) {
                Log::channel('single')->warning('Envío de correo de verificación fallido', [
                    'user_id' => $user->id,
                    'email' => $user->email,
                    'error' => $e->getMessage(),
                ]);
                $mailSent = false;
            }
        }

        return response()->json([
            'message' => !empty($validated['email'])
                ? ($mailSent
                    ? 'Registro creado. Revisa tu correo para activar tu cuenta.'
                    : 'Registro creado. No se pudo enviar el correo de verificacion. Contacta al administrador.')
                : 'Registro creado. Tu cuenta esta pendiente de aprobacion.',
        ], 201);
    }

    public function verifyEmail(Request $request)
    {
        $token = $request->query('token');
        if (!$token) {
            return response()->json(['message' => 'Token invalido'], 400);
        }

        $record = DB::table('email_verification_tokens')
            ->where('token', $token)
            ->first();

        if (!$record) {
            return response()->json(['message' => 'Token invalido'], 400);
        }

        if (now()->gt($record->expires_at)) {
            DB::table('email_verification_tokens')->where('token', $token)->delete();
            return response()->json(['message' => 'Token expirado'], 400);
        }

        $user = User::find($record->user_id);
        if (!$user) {
            DB::table('email_verification_tokens')->where('token', $token)->delete();
            return response()->json(['message' => 'Usuario no encontrado'], 404);
        }

        DB::transaction(function () use ($user, $token) {
            $user->email_verified_at = now();
            // Tras verificar: pendiente de que admin asigne rol; entra como visitante (solo leer, dash solicitante)
            $user->status = 'pending_admin';
            $user->save();

            $visitanteRole = Role::firstOrCreate(
                ['name' => 'visitante', 'guard_name' => 'web'],
                ['name' => 'visitante', 'slug' => 'visitante', 'guard_name' => 'web']
            );
            if (!$visitanteRole->hasPermissionTo('tickets.view_own')) {
                $visitanteRole->syncPermissions(['tickets.view_own']);
            }
            $user->syncRoles([$visitanteRole]);

            DB::table('email_verification_tokens')->where('token', $token)->delete();
        });

        return response()->json([
            'message' => 'Correo verificado. Ya puedes iniciar sesión y ver el panel como visitante. Un administrador te asignará un rol para interactuar.',
        ]);
    }

    public function logout(Request $request)
    {
        // Cierre de sesión explícito con el guard de sesión (web)
        Auth::guard('web')->logout();
        if ($request->hasSession()) {
            $request->session()->invalidate();
            $request->session()->regenerateToken();
        }

        return response()->json([
            'message' => 'Sesion cerrada'
        ]);
    }

    /**
     * Ping ligero para heartbeat: actualiza last_activity de la sesión sin devolver datos.
     * Mejora la precisión del monitor de sesiones cuando el usuario tiene la app abierta.
     */
    public function ping()
    {
        return response()->noContent();
    }
}
