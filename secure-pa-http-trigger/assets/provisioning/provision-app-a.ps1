# Provision App A — Microsoft.Graph PowerShell variant.
# Same intent as provision-app-a.sh.
#
# Pre-req:
#   Install-Module Microsoft.Graph -Scope CurrentUser
#   Connect-MgGraph -Scopes "Application.ReadWrite.All","DelegatedPermissionGrant.ReadWrite.All"

param(
    [string]$DisplayName = "pa-http-trigger-server-prod"
)

$flowSpAppId = "7df0a125-d3be-4c96-aa54-591f83ff541c"

Write-Host "==> Creating app registration: $DisplayName"
$app = New-MgApplication -DisplayName $DisplayName -SignInAudience "AzureADMyOrg"
Write-Host "    appId = $($app.AppId)"

Write-Host "==> Resolving Flow Service service principal and 'User' scope"
$flowSp = Get-MgServicePrincipal -Filter "appId eq '$flowSpAppId'"
$userScope = $flowSp.Oauth2PermissionScopes | Where-Object { $_.Value -eq 'User' }
Write-Host "    User scope id = $($userScope.Id)"

Write-Host "==> Adding required resource access (delegated User)"
Update-MgApplication -ApplicationId $app.Id -RequiredResourceAccess @(@{
    ResourceAppId  = $flowSpAppId
    ResourceAccess = @(@{ Id = $userScope.Id; Type = "Scope" })
})

Write-Host ""
Write-Host "App A provisioned. Next:"
Write-Host "  - Grant tenant-wide admin consent in the Entra portal, or:"
Write-Host "      New-MgOauth2PermissionGrant -ResourceId <flowSp.Id> -ClientId <app sp object id> -ConsentType AllPrincipals -Scope 'User'"
Write-Host "  - Add a federated credential (Pattern A) or a certificate (Pattern B / external):"
Write-Host "      New-AzADAppFederatedCredential -ApplicationObjectId $($app.Id) ..."
Write-Host "      New-AzADAppCredential -ObjectId $($app.Id) -CertValue ..."
