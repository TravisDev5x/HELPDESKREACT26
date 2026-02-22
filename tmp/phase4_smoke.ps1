$ErrorActionPreference = "Continue"
$baseUrl = "http://127.0.0.1:8001"
$baseUri = [Uri]$baseUrl
$results = New-Object System.Collections.Generic.List[object]
$userPassword = 'NewPassword123!'

function Get-CsrfHeaders([Microsoft.PowerShell.Commands.WebRequestSession]$session) {
    $baseHeaders = @{ Accept = 'application/json'; 'X-Requested-With' = 'XMLHttpRequest'; Origin = $baseUrl; Referer = ($baseUrl + '/') }
    try {
        Invoke-WebRequest -Uri "$baseUrl/sanctum/csrf-cookie" -WebSession $session -UseBasicParsing -Headers $baseHeaders | Out-Null
    } catch {
        # ignore
    }
    $cookie = $session.Cookies.GetCookies($baseUri) | Where-Object { $_.Name -eq 'XSRF-TOKEN' } | Select-Object -First 1
    $token = if ($cookie) { [System.Net.WebUtility]::UrlDecode($cookie.Value) } else { $null }
    if ($token) { $baseHeaders['X-XSRF-TOKEN'] = $token }
    return $baseHeaders
}

function Invoke-Json($method, $url, $session, $body = $null, $headers = $null) {
    $resp = $null
    $content = $null
    $status = $null
    $data = $null
    try {
        if ($method -in @('GET','HEAD') -or $body -eq $null) {
            $resp = Invoke-WebRequest -Method $method -Uri $url -WebSession $session -Headers $headers -UseBasicParsing
        } else {
            $json = $body | ConvertTo-Json -Depth 6 -Compress
            $resp = Invoke-WebRequest -Method $method -Uri $url -WebSession $session -Headers $headers -ContentType 'application/json' -Body $json -UseBasicParsing
        }
        $status = [int]$resp.StatusCode
        $content = $resp.Content
    } catch {
        $ex = $_.Exception
        if ($ex.Response) {
            $status = [int]$ex.Response.StatusCode.value__
            $reader = New-Object System.IO.StreamReader($ex.Response.GetResponseStream())
            $content = $reader.ReadToEnd()
            $reader.Close()
        } else {
            $content = $ex.Message
        }
    }
    if ($content) {
        $clean = $content.TrimStart([char]0xFEFF)
        $clean = $clean -replace '^[\u00ef\u00bb\u00bf]+',''
        try { $data = $clean | ConvertFrom-Json } catch { $data = $null }
    }
    return [PSCustomObject]@{ Status = $status; Data = $data; Raw = $content }
}

function Add-Result($step, $status, $note = $null) {
    $results.Add([PSCustomObject]@{ Step = $step; Status = $status; Note = $note }) | Out-Null
}

function Resolve-PhpExe() {
    $cmd = Get-Command php -ErrorAction SilentlyContinue
    if ($cmd) {
        return $cmd.Path
    }
    $phpRoot = 'C:\laragon\bin\php'
    if (Test-Path -LiteralPath $phpRoot) {
        $candidates = Get-ChildItem -Directory -LiteralPath $phpRoot | ForEach-Object {
            $exe = Join-Path $_.FullName 'php.exe'
            if (Test-Path -LiteralPath $exe) {
                $version = $null
                if ($_.Name -match '^php-(\d+\.\d+\.\d+)') {
                    $version = [Version]$Matches[1]
                }
                [pscustomobject]@{
                    Exe = $exe
                    Version = $version
                    LastWriteTime = (Get-Item -LiteralPath $exe).LastWriteTime
                }
            }
        }
        if ($candidates) {
            $ordered = $candidates | Sort-Object @{ Expression = { $_.Version }; Descending = $true }, @{ Expression = { $_.LastWriteTime }; Descending = $true }
            return ($ordered | Select-Object -First 1).Exe
        }
    }
    return $null
}

function New-PasswordResetToken([string]$email) {
    $phpExe = Resolve-PhpExe
    if (-not $phpExe) {
        return $null
    }
    $phpCode = @'
require "vendor/autoload.php";
$app = require "bootstrap/app.php";
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();
$user = App\Models\User::where("email","EMAIL_PLACEHOLDER")->first();
if (!$user) { fwrite(STDERR, "user not found"); exit(1); }
echo Illuminate\Support\Facades\Password::broker()->createToken($user);
'@ -replace 'EMAIL_PLACEHOLDER', $email
    $raw = & $phpExe -r $phpCode 2>$null
    if (-not $raw) { return $null }
    $token = $raw.Trim()
    $token = $token.TrimStart([char]0xFEFF)
    $token = $token -replace '^[\u00ef\u00bb\u00bf]+',''
    return $token
}

# --- Login admin ---
$adminSession = New-Object Microsoft.PowerShell.Commands.WebRequestSession
$headers = Get-CsrfHeaders $adminSession
$login = Invoke-Json 'POST' "$baseUrl/api/login" $adminSession @{ identifier = 'admin@demo.com'; password = 'Password123!' } $headers
Add-Result 'login_admin' $login.Status ($login.Data.errors.root -as [string])

# --- check-auth ---
$headers = Get-CsrfHeaders $adminSession
$check = Invoke-Json 'GET' "$baseUrl/api/check-auth" $adminSession $null $headers
Add-Result 'check_auth_admin' $check.Status ($check.Data.user.email -as [string])

# --- catalogs ---
$headers = Get-CsrfHeaders $adminSession
$catalogsRes = Invoke-Json 'GET' "$baseUrl/api/catalogs" $adminSession $null $headers
Add-Result 'catalogs' $catalogsRes.Status
$catalogs = $catalogsRes.Data

# --- create ticket ---
$areas = @($catalogs.areas)
$sedes = @($catalogs.sedes)
$ubicaciones = @($catalogs.ubicaciones)
$priorities = @($catalogs.priorities)
$states = @($catalogs.ticket_states)
$types = @($catalogs.ticket_types)

$stateOpen = $states | Where-Object { $_.code -eq 'abierto' } | Select-Object -First 1
if (-not $stateOpen) { $stateOpen = $states | Select-Object -First 1 }
$priority1 = $priorities | Select-Object -First 1
$type1 = $types | Select-Object -First 1
$area1 = $areas | Select-Object -First 1
$area2 = $areas | Select-Object -Skip 1 | Select-Object -First 1
if (-not $area2) { $area2 = $area1 }
$sede1 = $sedes | Select-Object -First 1
$ubic1 = $ubicaciones | Select-Object -First 1

$headers = Get-CsrfHeaders $adminSession
$createTicket = Invoke-Json 'POST' "$baseUrl/api/tickets" $adminSession @{ subject = 'Smoke Test Ticket'; description = 'Smoke test'; area_origin_id = $area1.id; area_current_id = $area1.id; sede_id = $sede1.id; ubicacion_id = ($ubic1.id); ticket_type_id = $type1.id; priority_id = $priority1.id; ticket_state_id = $stateOpen.id; created_at = (Get-Date).ToString('o') } $headers
Add-Result 'ticket_create' $createTicket.Status
$ticketId = $createTicket.Data.id

# --- list tickets ---
$headers = Get-CsrfHeaders $adminSession
$ticketsList = Invoke-Json 'GET' "$baseUrl/api/tickets?per_page=10" $adminSession $null $headers
Add-Result 'tickets_list' $ticketsList.Status

# --- ticket detail ---
$headers = Get-CsrfHeaders $adminSession
$ticketDetail = Invoke-Json 'GET' "$baseUrl/api/tickets/$ticketId" $adminSession $null $headers
Add-Result 'ticket_detail' $ticketDetail.Status

# --- take ---
$headers = Get-CsrfHeaders $adminSession
$take = Invoke-Json 'POST' "$baseUrl/api/tickets/$ticketId/take" $adminSession @{ } $headers
Add-Result 'ticket_take' $take.Status

# --- unassign ---
$headers = Get-CsrfHeaders $adminSession
$unassign = Invoke-Json 'POST' "$baseUrl/api/tickets/$ticketId/unassign" $adminSession @{ } $headers
Add-Result 'ticket_unassign' $unassign.Status

# --- assign to another user ---
$headers = Get-CsrfHeaders $adminSession
$usersList = Invoke-Json 'GET' "$baseUrl/api/users?per_page=10" $adminSession $null $headers
$assignee = ($usersList.Data.data | Where-Object { $_.email -ne 'admin@demo.com' } | Select-Object -First 1)
$headers = Get-CsrfHeaders $adminSession
$assign = Invoke-Json 'POST' "$baseUrl/api/tickets/$ticketId/assign" $adminSession @{ assigned_user_id = $assignee.id } $headers
Add-Result 'ticket_assign' $assign.Status

# --- escalate ---
$headers = Get-CsrfHeaders $adminSession
$escalate = Invoke-Json 'POST' "$baseUrl/api/tickets/$ticketId/escalate" $adminSession @{ area_destino_id = $area2.id; note = 'Escalado smoke' } $headers
Add-Result 'ticket_escalate' $escalate.Status

# --- update ticket ---
$priority2 = $priorities | Select-Object -Skip 1 | Select-Object -First 1
if (-not $priority2) { $priority2 = $priority1 }
$state2 = $states | Select-Object -Skip 1 | Select-Object -First 1
if (-not $state2) { $state2 = $stateOpen }
$headers = Get-CsrfHeaders $adminSession
$update = Invoke-Json 'PUT' "$baseUrl/api/tickets/$ticketId" $adminSession @{ priority_id = $priority2.id; ticket_state_id = $state2.id; note = 'Actualizacion smoke' } $headers
Add-Result 'ticket_update' $update.Status

# --- notifications ---
$headers = Get-CsrfHeaders $adminSession
$notifications = Invoke-Json 'GET' "$baseUrl/api/notifications" $adminSession $null $headers
Add-Result 'notifications' $notifications.Status ("count=" + (($notifications.Data.data | Measure-Object).Count))

# --- password reset flow (forgot) ---
$headers = Get-CsrfHeaders $adminSession
$forgot = Invoke-Json 'POST' "$baseUrl/api/password/forgot" $adminSession @{ email = 'ana@demo.com' } $headers
Add-Result 'password_forgot' $forgot.Status

# --- password reset flow (token + reset + login) ---
$resetToken = New-PasswordResetToken 'ana@demo.com'
if ($resetToken) {
    Add-Result 'password_token' 200
    $headers = Get-CsrfHeaders $adminSession
    $reset = Invoke-Json 'POST' "$baseUrl/api/password/reset" $adminSession @{ email = 'ana@demo.com'; token = $resetToken; password = $userPassword; password_confirmation = $userPassword } $headers
    Add-Result 'password_reset' $reset.Status
} else {
    Add-Result 'password_token' 500 'token_not_generated'
}

# --- role permission check with usuario (post-reset) ---
$userSession = New-Object Microsoft.PowerShell.Commands.WebRequestSession
$headersUser = Get-CsrfHeaders $userSession
$loginUser = Invoke-Json 'POST' "$baseUrl/api/login" $userSession @{ identifier = 'ana@demo.com'; password = $userPassword } $headersUser
Add-Result 'login_usuario' $loginUser.Status ($loginUser.Data.errors.root -as [string])

$headersUser = Get-CsrfHeaders $userSession
$rolesCreate = Invoke-Json 'POST' "$baseUrl/api/roles" $userSession @{ name = 'smoke_role_tmp' } $headersUser
Add-Result 'roles_create_as_usuario' $rolesCreate.Status

$headersUser = Get-CsrfHeaders $userSession
$ticketsAsUser = Invoke-Json 'GET' "$baseUrl/api/tickets?per_page=5" $userSession $null $headersUser
Add-Result 'tickets_list_as_usuario' $ticketsAsUser.Status

# summary
$results | Format-Table -AutoSize
