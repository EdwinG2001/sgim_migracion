# Script de Configuración de los 5 Reinos en Keycloak Central (:8080)
# Respeta 100% la orden: NO TOCAR 'esmeraldas-resiliente'

$baseUrl = "http://localhost:8080"
$masterAdminUser = "admin"
$masterAdminPass = "Esmeraldas2026*"

Write-Host "=========================================================="
Write-Host "1. Autenticando en Keycloak Master..."
Write-Host "=========================================================="

$tokenBody = @{
    client_id  = "admin-cli"
    username   = $masterAdminUser
    password   = $masterAdminPass
    grant_type = "password"
}

$loginResp = Invoke-RestMethod -Uri "$baseUrl/realms/master/protocol/openid-connect/token" -Method Post -Body $tokenBody
$adminToken = $loginResp.access_token

if (-not $adminToken) {
    Write-Error "No se pudo obtener el token de administrador."
    exit 1
}
Write-Host "✔ Token de administrador obtenido con éxito."

$headers = @{
    "Authorization" = "Bearer $adminToken"
    "Content-Type"  = "application/json"
}

# Definición de los 5 Reinos
$realmsConfig = @(
    @{
        id          = "Policia"
        displayName = "Policía Nacional del Ecuador (SIGESP)"
        clientId    = "sigesp-policia"
    },
    @{
        id          = "Migracion"
        displayName = "Subsecretaría de Migración (SGIM)"
        clientId    = "sgim-migracion"
    },
    @{
        id          = "Banco"
        displayName = "NexoBank - Sistema Bancario Digital"
        clientId    = "nexobank-digital"
    },
    @{
        id          = "RegistroCivil"
        displayName = "Registro Civil del Ecuador (DIGERCIC)"
        clientId    = "digercic-registro-civil"
    },
    @{
        id          = "Iess"
        displayName = "Instituto Ecuatoriano de Seguridad Social (IESS)"
        clientId    = "iess-seguridad-social"
    }
)

# Obtener reinos existentes
$existingRealms = Invoke-RestMethod -Uri "$baseUrl/admin/realms" -Method Get -Headers $headers | ForEach-Object { $_.realm }

foreach ($r in $realmsConfig) {
    $realmName = $r.id
    Write-Host "`n----------------------------------------------------------"
    Write-Host "Configurando Reino: $realmName ($($r.displayName))"
    Write-Host "----------------------------------------------------------"

    # 1. Crear el reino si no existe
    if ($existingRealms -contains $realmName) {
        Write-Host "✔ El reino '$realmName' ya existe."
    } else {
        $realmPayload = @{
            id          = $realmName
            realm       = $realmName
            displayName = $r.displayName
            enabled     = $true
            sslRequired = "none"
        } | ConvertTo-Json
        
        Invoke-RestMethod -Uri "$baseUrl/admin/realms" -Method Post -Headers $headers -Body $realmPayload
        Write-Host "✔ Reino '$realmName' creado exitosamente."
    }

    # 2. Crear rol 'ADMIN' a nivel de Realm
    try {
        $rolePayload = @{
            name        = "ADMIN"
            description = "Rol de Administrador con acceso total a la entidad y al Software Central"
        } | ConvertTo-Json

        Invoke-RestMethod -Uri "$baseUrl/admin/realms/$realmName/roles" -Method Post -Headers $headers -Body $rolePayload
        Write-Host "✔ Rol 'ADMIN' creado en '$realmName'."
    } catch {
        Write-Host "✔ Rol 'ADMIN' ya existía en '$realmName'."
    }

    # 3. Crear Cliente específico de la entidad y Cliente 'software-central'
    $clientsToCreate = @(
        @{ clientId = $r.clientId; name = $r.displayName },
        @{ clientId = "software-central"; name = "Software Central de Interoperabilidad" }
    )

    $existingClients = Invoke-RestMethod -Uri "$baseUrl/admin/realms/$realmName/clients" -Method Get -Headers $headers | ForEach-Object { $_.clientId }

    foreach ($cli in $clientsToCreate) {
        if ($existingClients -contains $cli.clientId) {
            Write-Host "✔ Cliente '$($cli.clientId)' ya existe en '$realmName'."
        } else {
            $clientPayload = @{
                clientId                  = $cli.clientId
                name                      = $cli.name
                enabled                   = $true
                publicClient              = $true
                directAccessGrantsEnabled = $true
                standardFlowEnabled       = $true
                redirectUris              = @("*")
                webOrigins                = @("*")
            } | ConvertTo-Json

            Invoke-RestMethod -Uri "$baseUrl/admin/realms/$realmName/clients" -Method Post -Headers $headers -Body $clientPayload
            Write-Host "✔ Cliente '$($cli.clientId)' creado en '$realmName'."
        }
    }

    # 4. Crear Usuario 'admin'
    $existingUsers = Invoke-RestMethod -Uri "$baseUrl/admin/realms/$realmName/users?username=admin" -Method Get -Headers $headers
    $userId = $null

    if ($existingUsers.Count -gt 0) {
        $userId = $existingUsers[0].id
        Write-Host "✔ Usuario 'admin' ya existe en '$realmName' (ID: $userId)."
    } else {
        $userPayload = @{
            username  = "admin"
            enabled   = $true
            email     = "admin@$($realmName.ToLower()).gob.ec"
            firstName = "Administrador"
            lastName  = "General"
        } | ConvertTo-Json

        Invoke-RestMethod -Uri "$baseUrl/admin/realms/$realmName/users" -Method Post -Headers $headers -Body $userPayload
        
        $createdUser = Invoke-RestMethod -Uri "$baseUrl/admin/realms/$realmName/users?username=admin" -Method Get -Headers $headers
        $userId = $createdUser[0].id
        Write-Host "✔ Usuario 'admin' creado en '$realmName' (ID: $userId)."
    }

    # 5. Establecer la contraseña 'Esmeraldas2026*'
    $credPayload = @{
        type      = "password"
        value     = "Esmeraldas2026*"
        temporary = $false
    } | ConvertTo-Json

    Invoke-RestMethod -Uri "$baseUrl/admin/realms/$realmName/users/$userId/reset-password" -Method Put -Headers $headers -Body $credPayload
    Write-Host "✔ Contraseña 'Esmeraldas2026*' asignada a 'admin' en '$realmName'."

    # 6. Asignar el rol 'ADMIN' al usuario 'admin'
    $adminRole = Invoke-RestMethod -Uri "$baseUrl/admin/realms/$realmName/roles/ADMIN" -Method Get -Headers $headers
    $roleAssignPayload = @($adminRole) | ConvertTo-Json

    Invoke-RestMethod -Uri "$baseUrl/admin/realms/$realmName/users/$userId/role-mappings/realm" -Method Post -Headers $headers -Body $roleAssignPayload
    Write-Host "✔ Rol 'ADMIN' asignado a 'admin' en '$realmName'."

    # 7. Probar autenticación directa en este reino
    try {
        $testAuthBody = @{
            client_id  = "software-central"
            username   = "admin"
            password   = "Esmeraldas2026*"
            grant_type = "password"
        }
        $testAuthResp = Invoke-RestMethod -Uri "$baseUrl/realms/$realmName/protocol/openid-connect/token" -Method Post -Body $testAuthBody
        if ($testAuthResp.access_token) {
            Write-Host "⭐ PRUEBA EXITOSA: Login verificado en reino '$realmName' con 'admin' / 'Esmeraldas2026*'." -ForegroundColor Green
        }
    } catch {
        Write-Host "⚠ Advertencia en prueba de login: $($_.Exception.Message)" -ForegroundColor Yellow
    }
}

Write-Host "`n=========================================================="
Write-Host "TODOS LOS 5 REINOS CONFIGURADOS CON ÉXITO EN KEYCLOAK"
Write-Host "=========================================================="
