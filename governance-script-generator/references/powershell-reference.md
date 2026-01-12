# PowerShell Reference for Power Platform Administration

## Overview

PowerShell cmdlets for Power Platform enable automation of monitoring and management tasks for Power Apps, Power Automate, and Dataverse environments.

**Modules Required**:
1. `Microsoft.PowerApps.Administration.PowerShell` - Admin cmdlets
2. `Microsoft.PowerApps.PowerShell` - Creator cmdlets
3. `Microsoft.Xrm.Data.PowerShell` - Dataverse operations (optional)
4. `Microsoft.Xrm.Tooling.CrmConnector.PowerShell` - Dataverse connection (optional)

**Requirements**:
- Windows PowerShell 5.x (not compatible with PowerShell 6.0+ / PowerShell Core)
- .NET Framework (incompatible with .NET Core)
- Administrator role for full functionality
- Power Apps Per User license (for full features)

---

## Installation & Setup

### Install Modules

```powershell
# Run PowerShell as Administrator

# Install admin module
Install-Module -Name Microsoft.PowerApps.Administration.PowerShell

# Install creator module
Install-Module -Name Microsoft.PowerApps.PowerShell -AllowClobber

# Install Dataverse modules (optional)
Install-Module -Name Microsoft.Xrm.Data.PowerShell
Install-Module -Name Microsoft.Xrm.Tooling.CrmConnector.PowerShell

# Force install/update
Install-Module -Name Microsoft.PowerApps.Administration.PowerShell -Force
Install-Module -Name Microsoft.PowerApps.PowerShell -AllowClobber -Force
```

### Install Without Admin Rights

```powershell
# Save module locally
Save-Module -Name Microsoft.PowerApps.Administration.PowerShell -Path C:\LocalModules

# Import from local path
Import-Module -Name Microsoft.PowerApps.Administration.PowerShell
```

### Update Modules

```powershell
# Update all modules
Update-Module

# Update specific module
Update-Module -Name Microsoft.PowerApps.Administration.PowerShell
Update-Module -Name Microsoft.PowerApps.PowerShell

# Check current version
Get-Module -Name "Microsoft.PowerApps.Administration.PowerShell"
Get-Module -Name "Microsoft.PowerApps.PowerShell"
```

### Automated Installation Script

```powershell
# Automated PowerShell modules installation script
$requiredModules = @(
    "Microsoft.PowerApps.Administration.PowerShell",
    "Microsoft.PowerApps.PowerShell",
    "Microsoft.Xrm.Data.PowerShell",
    "Microsoft.Xrm.Tooling.CrmConnector.PowerShell"
)

foreach ($module in $requiredModules) {
    Write-Host "Checking module: $module" -ForegroundColor Cyan
    
    if (Get-Module -ListAvailable -Name $module) {
        Write-Host "  Module $module is already installed" -ForegroundColor Green
        
        # Update to latest version
        Update-Module -Name $module -Force -ErrorAction SilentlyContinue
        Write-Host "  Module $module updated to latest version" -ForegroundColor Yellow
    }
    else {
        Write-Host "  Installing module: $module" -ForegroundColor Yellow
        try {
            Install-Module -Name $module -Scope CurrentUser -Force -AllowClobber -ErrorAction Stop
            Write-Host "  Module $module installed successfully" -ForegroundColor Green
        }
        catch {
            Write-Host "  Error installing module $module : $_" -ForegroundColor Red
        }
    }
}

Write-Host "`nAll required modules processed." -ForegroundColor Green
```

### Authentication

```powershell
# Interactive login (Public Cloud)
Add-PowerAppsAccount

# Login to specific environment
Add-PowerAppsAccount -Endpoint prod

# Login to GCC
Add-PowerAppsAccount -Endpoint usgov

# Login to GCC High
Add-PowerAppsAccount -Endpoint usgovhigh

# Login to GCC DOD
Add-PowerAppsAccount -Endpoint dod

# Login with Service Principal
$appId = "YOUR_APP_ID"
$secret = "YOUR_SECRET"
$tenantId = "YOUR_TENANT_ID"

Add-PowerAppsAccount -Endpoint prod `
    -TenantID $tenantId `
    -ApplicationId $appId `
    -ClientSecret $secret
```

### Execution Policy

```powershell
# Check current execution policy
Get-ExecutionPolicy

# Set execution policy (run as Administrator)
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser

# Or for more permissive
Set-ExecutionPolicy -ExecutionPolicy Bypass -Scope Process
```

---

## Environment Management Cmdlets

### Get Environments

```powershell
# Get all environments
Get-AdminPowerAppEnvironment

# Get specific environment
Get-AdminPowerAppEnvironment -EnvironmentName "env-guid"

# Get environment details with expand
$env = Get-AdminPowerAppEnvironment -EnvironmentName "env-guid"
$env | ConvertTo-Json -Depth 10

# Filter environments by type
Get-AdminPowerAppEnvironment | Where-Object { $_.EnvironmentType -eq "Production" }
Get-AdminPowerAppEnvironment | Where-Object { $_.EnvironmentType -eq "Sandbox" }
Get-AdminPowerAppEnvironment | Where-Object { $_.EnvironmentType -eq "Trial" }

# Get environments created in last 30 days
Get-AdminPowerAppEnvironment | Where-Object {
    (Get-Date) - [DateTime]$_.CreatedTime -lt (New-TimeSpan -Days 30)
}
```

### Create Environment

```powershell
# Create new environment
New-AdminPowerAppEnvironment `
    -DisplayName "Development Environment" `
    -LocationName "unitedstates" `
    -EnvironmentSku Sandbox `
    -ProvisionDatabase

# Create with Dataverse and specific settings
New-AdminPowerAppEnvironment `
    -DisplayName "Production Environment" `
    -LocationName "europe" `
    -EnvironmentSku Production `
    -ProvisionDatabase `
    -CurrencyName USD `
    -LanguageName 1033 `
    -DomainName "prod-env"

# Create with security group
New-AdminPowerAppEnvironment `
    -DisplayName "Restricted Environment" `
    -LocationName "unitedstates" `
    -EnvironmentSku Sandbox `
    -ProvisionDatabase `
    -SecurityGroupId "aad-group-guid"
```

### Update Environment

```powershell
# Rename environment
Set-AdminPowerAppEnvironmentDisplayName `
    -EnvironmentName "env-guid" `
    -NewDisplayName "New Environment Name"

# Update properties
Set-AdminPowerAppEnvironmentRuntimeState `
    -EnvironmentName "env-guid" `
    -RuntimeState Enabled

# Disable environment
Set-AdminPowerAppEnvironmentRuntimeState `
    -EnvironmentName "env-guid" `
    -RuntimeState Disabled
```

### Delete Environment

```powershell
# Delete environment (CAUTION!)
Remove-AdminPowerAppEnvironment -EnvironmentName "env-guid"
```

### Environment Capacity

```powershell
# Get tenant capacity
Get-AdminPowerAppTenantCapacity

# Get environment capacity
Get-AdminPowerAppEnvironmentCapacity -EnvironmentName "env-guid"

# Get storage usage by environment
$environments = Get-AdminPowerAppEnvironment
foreach ($env in $environments) {
    $capacity = Get-AdminPowerAppEnvironmentCapacity -EnvironmentName $env.EnvironmentName
    [PSCustomObject]@{
        EnvironmentName = $env.DisplayName
        DatabaseCapacity = $capacity.ActualConsumption.Database
        FileCapacity = $capacity.ActualConsumption.File
        LogCapacity = $capacity.ActualConsumption.Log
    }
}
```

---

## Power Apps Management Cmdlets

### Get Apps

```powershell
# Get all apps in tenant (Admin)
Get-AdminPowerApp

# Get apps in specific environment
Get-AdminPowerApp -EnvironmentName "env-guid"

# Get specific app
Get-AdminPowerApp -AppName "app-guid"

# Get your own apps (Creator)
Get-PowerApp

# Get app with owner details
$apps = Get-AdminPowerApp
foreach ($app in $apps) {
    Get-AdminPowerAppRoleAssignment -EnvironmentName $app.EnvironmentName -AppName $app.AppName
}
```

### App Properties

```powershell
# Get apps created in last 30 days
Get-AdminPowerApp | Where-Object {
    (Get-Date) - [DateTime]$_.CreatedTime -lt (New-TimeSpan -Days 30)
}

# Get apps by creator
$creatorId = "user-guid"
Get-AdminPowerApp | Where-Object { $_.Owner.id -eq $creatorId }

# Get apps without owners (orphaned)
Get-AdminPowerApp | Where-Object {
    $owner = Get-AdminPowerAppRoleAssignment -EnvironmentName $_.EnvironmentName -AppName $_.AppName
    $owner.Count -eq 0
}

# Get apps not opened in last 90 days
Get-AdminPowerApp | Where-Object {
    (Get-Date) - [DateTime]$_.LastModifiedTime -gt (New-TimeSpan -Days 90)
}
```

### App Permissions

```powershell
# Get app role assignments
Get-AdminPowerAppRoleAssignment `
    -EnvironmentName "env-guid" `
    -AppName "app-guid"

# Add app owner
Set-AdminPowerAppOwner `
    -EnvironmentName "env-guid" `
    -AppName "app-guid" `
    -AppOwner "new-owner-email@domain.com"

# Share app with user
Set-AdminPowerAppRoleAssignment `
    -EnvironmentName "env-guid" `
    -AppName "app-guid" `
    -PrincipalType User `
    -PrincipalObjectId "user-guid" `
    -RoleName CanEdit

# Share app with group
Set-AdminPowerAppRoleAssignment `
    -EnvironmentName "env-guid" `
    -AppName "app-guid" `
    -PrincipalType Group `
    -PrincipalObjectId "group-guid" `
    -RoleName CanView

# Remove app access
Remove-AdminPowerAppRoleAssignment `
    -EnvironmentName "env-guid" `
    -AppName "app-guid" `
    -RoleId "role-guid"
```

### Delete Apps

```powershell
# Delete app
Remove-AdminPowerApp -EnvironmentName "env-guid" -AppName "app-guid"

# Bulk delete inactive apps (CAUTION!)
$inactiveApps = Get-AdminPowerApp | Where-Object {
    (Get-Date) - [DateTime]$_.LastModifiedTime -gt (New-TimeSpan -Days 180)
}

foreach ($app in $inactiveApps) {
    Write-Host "Deleting app: $($app.DisplayName)"
    Remove-AdminPowerApp -EnvironmentName $app.EnvironmentName -AppName $app.AppName
}
```

---

## Power Automate Flow Management Cmdlets

### Get Flows

```powershell
# Get all flows in tenant
Get-AdminFlow

# Get flows in specific environment
Get-AdminFlow -EnvironmentName "env-guid"

# Get specific flow
Get-AdminFlow -EnvironmentName "env-guid" -FlowName "flow-guid"

# Get your own flows (Creator)
Get-Flow

# Get flows with details
$flows = Get-AdminFlow -EnvironmentName "env-guid"
$flows | Select-Object DisplayName, FlowName, CreatedTime, Enabled
```

### Flow Properties

```powershell
# Get enabled flows
Get-AdminFlow | Where-Object { $_.Enabled -eq $true }

# Get disabled flows
Get-AdminFlow | Where-Object { $_.Enabled -eq $false }

# Get flows created in last 7 days
Get-AdminFlow | Where-Object {
    (Get-Date) - [DateTime]$_.CreatedTime -lt (New-TimeSpan -Days 7)
}

# Get flows by creator
$creatorId = "user-guid"
Get-AdminFlow | Where-Object { $_.CreatedBy.userId -eq $creatorId }

# Get cloud flows (not solution-aware)
Get-AdminFlow | Where-Object { -not $_.IsSolutionAware }

# Get solution flows
Get-AdminFlow | Where-Object { $_.IsSolutionAware }
```

### Flow Permissions

```powershell
# Get flow owner
Get-AdminFlowOwnerRole `
    -EnvironmentName "env-guid" `
    -FlowName "flow-guid"

# Set flow owner
Set-AdminFlowOwnerRole `
    -EnvironmentName "env-guid" `
    -FlowName "flow-guid" `
    -PrincipalType User `
    -PrincipalObjectId "user-guid"

# Get flow user details
Get-AdminFlowUserDetails `
    -EnvironmentName "env-guid" `
    -FlowName "flow-guid"
```

### Enable/Disable Flows

```powershell
# Enable flow
Enable-AdminFlow -EnvironmentName "env-guid" -FlowName "flow-guid"

# Disable flow
Disable-AdminFlow -EnvironmentName "env-guid" -FlowName "flow-guid"

# Bulk disable inactive flows
$inactiveFlows = Get-AdminFlow | Where-Object {
    (Get-Date) - [DateTime]$_.LastModifiedTime -gt (New-TimeSpan -Days 90) -and $_.Enabled -eq $true
}

foreach ($flow in $inactiveFlows) {
    Write-Host "Disabling flow: $($flow.DisplayName)"
    Disable-AdminFlow -EnvironmentName $flow.EnvironmentName -FlowName $flow.FlowName
}
```

### Delete Flows

```powershell
# Delete flow
Remove-AdminFlow -EnvironmentName "env-guid" -FlowName "flow-guid"

# Remove flow app context
Remove-AdminFlowPowerAppContext `
    -EnvironmentName "env-guid" `
    -FlowName "flow-guid" `
    -AppName "app-guid"
```

### Flow Run History

```powershell
# Get flow runs (requires flow owner permissions)
Get-FlowRun -EnvironmentName "env-guid" -FlowName "flow-guid"

# Get last 10 runs
Get-FlowRun -EnvironmentName "env-guid" -FlowName "flow-guid" -Top 10

# Get failed runs
$runs = Get-FlowRun -EnvironmentName "env-guid" -FlowName "flow-guid"
$runs | Where-Object { $_.Status -eq "Failed" }
```

---

## Connector Management Cmdlets

### Get Connectors

```powershell
# Get all connections in tenant
Get-AdminPowerAppConnection

# Get connections in environment
Get-AdminPowerAppConnection -EnvironmentName "env-guid"

# Get specific connection
Get-AdminPowerAppConnection `
    -EnvironmentName "env-guid" `
    -ConnectorName "connector-name"

# Get custom connectors
Get-AdminPowerAppConnector

# Get connector details
Get-AdminPowerAppConnector -ConnectorName "connector-guid"
```

### Connection Permissions

```powershell
# Get connection role assignments
Get-AdminPowerAppConnectionRoleAssignment `
    -EnvironmentName "env-guid" `
    -ConnectorName "connector-name" `
    -ConnectionName "connection-guid"

# Set connection role
Set-AdminPowerAppConnectionRoleAssignment `
    -EnvironmentName "env-guid" `
    -ConnectorName "connector-name" `
    -ConnectionName "connection-guid" `
    -PrincipalType User `
    -PrincipalObjectId "user-guid" `
    -RoleName CanEdit

# Remove connection role
Remove-AdminPowerAppConnectionRoleAssignment `
    -EnvironmentName "env-guid" `
    -ConnectorName "connector-name" `
    -ConnectionName "connection-guid" `
    -RoleId "role-guid"
```

### Delete Connections

```powershell
# Delete connection
Remove-AdminPowerAppConnection `
    -EnvironmentName "env-guid" `
    -ConnectorName "connector-name" `
    -ConnectionName "connection-guid"
```

---

## Data Loss Prevention (DLP) Policy Cmdlets

### Get DLP Policies

```powershell
# Get all DLP policies
Get-AdminDlpPolicy

# Get specific DLP policy
Get-AdminDlpPolicy -PolicyName "policy-guid"

# Get DLP policies for environment
$policies = Get-AdminDlpPolicy
$policies | Where-Object { $_.environments.name -contains "env-guid" }
```

### Create DLP Policy

```powershell
# Create new DLP policy
New-AdminDlpPolicy `
    -DisplayName "Corporate DLP Policy" `
    -EnvironmentName "env-guid" `
    -BlockNonBusinessDataGroup $true

# Create DLP policy with connector groups
$policy = New-AdminDlpPolicy `
    -DisplayName "Connector Restriction Policy" `
    -EnvironmentName "env-guid"

# Add connectors to business data group
Add-ConnectorToBusinessDataGroup `
    -PolicyName $policy.PolicyName `
    -ConnectorName "shared_office365users"

Add-ConnectorToBusinessDataGroup `
    -PolicyName $policy.PolicyName `
    -ConnectorName "shared_sharepointonline"

# Add connectors to non-business data group
Add-ConnectorToNonBusinessDataGroup `
    -PolicyName $policy.PolicyName `
    -ConnectorName "shared_twitter"
```

### Update DLP Policy

```powershell
# Add environment to policy
Add-AdminDlpPolicyEnvironment `
    -PolicyName "policy-guid" `
    -EnvironmentName "env-guid"

# Remove environment from policy
Remove-AdminDlpPolicyEnvironment `
    -PolicyName "policy-guid" `
    -EnvironmentName "env-guid"

# Move connector between groups
Remove-ConnectorFromBusinessDataGroup `
    -PolicyName "policy-guid" `
    -ConnectorName "shared_sql"

Add-ConnectorToNonBusinessDataGroup `
    -PolicyName "policy-guid" `
    -ConnectorName "shared_sql"
```

### Delete DLP Policy

```powershell
# Delete DLP policy
Remove-AdminDlpPolicy -PolicyName "policy-guid"
```

---

## User & Permission Management

### Get Users

```powershell
# Get tenant users
Get-AdminPowerAppUser

# Get environment users
Get-AdminPowerAppEnvironmentUser -EnvironmentName "env-guid"
```

### Environment Permissions

```powershell
# Add environment admin
Set-AdminPowerAppEnvironmentRoleAssignment `
    -EnvironmentName "env-guid" `
    -PrincipalType User `
    -PrincipalObjectId "user-guid" `
    -RoleName EnvironmentAdmin

# Add environment maker
Set-AdminPowerAppEnvironmentRoleAssignment `
    -EnvironmentName "env-guid" `
    -PrincipalType User `
    -PrincipalObjectId "user-guid" `
    -RoleName EnvironmentMaker

# Remove environment role
Remove-AdminPowerAppEnvironmentRoleAssignment `
    -EnvironmentName "env-guid" `
    -RoleId "role-guid"

# Get environment role assignments
Get-AdminPowerAppEnvironmentRoleAssignment -EnvironmentName "env-guid"
```

---

## Tenant Settings Cmdlets

### Get Tenant Settings

```powershell
# Get tenant settings
Get-TenantSettings

# Get specific settings
$settings = Get-TenantSettings
$settings.disableEnvironmentCreationByNonAdminUsers
$settings.disablePortalsCreationByNonAdminUsers
$settings.disableSurveyScreenshots
$settings.disableTrialEnvironmentCreationByNonAdminUsers
$settings.disableCapacityAllocationByEnvironmentAdmins
$settings.disableNewsletterSendout
$settings.disableNPSCommentsReachout
$settings.disableSupportTicketsVisibleByAllUsers
$settings.powerPlatform.powerApps.disableShareWithEveryone
$settings.powerPlatform.powerApps.enableGuestsToMake
$settings.powerPlatform.powerAutomate.disableCopilot
```

### Set Tenant Settings

```powershell
# Disable environment creation by non-admins
Set-TenantSettings -RequestBody @{
    "disableEnvironmentCreationByNonAdminUsers" = $true
}

# Disable trial environment creation
Set-TenantSettings -RequestBody @{
    "disableTrialEnvironmentCreationByNonAdminUsers" = $true
}

# Disable portals creation
Set-TenantSettings -RequestBody @{
    "disablePortalsCreationByNonAdminUsers" = $true
}

# Disable share with everyone
Set-TenantSettings -RequestBody @{
    "powerPlatform" = @{
        "powerApps" = @{
            "disableShareWithEveryone" = $true
        }
    }
}
```

---

## Copilot Studio (Power Virtual Agents) Cmdlets

### Get Bots

```powershell
# Get all bots/chatbots
Get-AdminPowerAppChatbot

# Get bots in environment
Get-AdminPowerAppChatbot -EnvironmentName "env-guid"

# Get specific bot
Get-AdminPowerAppChatbot -BotName "bot-guid"
```

### Bot Permissions

```powershell
# Get bot role assignments
Get-AdminPowerAppChatbotRoleAssignment `
    -EnvironmentName "env-guid" `
    -BotName "bot-guid"

# Set bot owner
Set-AdminPowerAppChatbotOwner `
    -EnvironmentName "env-guid" `
    -BotName "bot-guid" `
    -BotOwner "new-owner-email@domain.com"
```

### Delete Bots

```powershell
# Delete bot
Remove-AdminPowerAppChatbot `
    -EnvironmentName "env-guid" `
    -BotName "bot-guid"
```

---

## Reporting & Analytics Cmdlets

### License Allocation

```powershell
# Get Power Apps license allocation
Get-AdminPowerAppLicensesReport

# Export to CSV
Get-AdminPowerAppLicensesReport | Export-Csv -Path "licenses.csv" -NoTypeInformation
```

### Environment Report

```powershell
# Comprehensive environment report
$report = @()

$environments = Get-AdminPowerAppEnvironment

foreach ($env in $environments) {
    $apps = Get-AdminPowerApp -EnvironmentName $env.EnvironmentName
    $flows = Get-AdminFlow -EnvironmentName $env.EnvironmentName
    $connections = Get-AdminPowerAppConnection -EnvironmentName $env.EnvironmentName
    
    $report += [PSCustomObject]@{
        EnvironmentName = $env.DisplayName
        EnvironmentType = $env.EnvironmentType
        Region = $env.Location.Name
        AppsCount = $apps.Count
        FlowsCount = $flows.Count
        ConnectionsCount = $connections.Count
        CreatedTime = $env.CreatedTime
        CreatedBy = $env.CreatedBy.displayName
    }
}

$report | Export-Csv -Path "environment-report.csv" -NoTypeInformation
$report | Format-Table -AutoSize
```

### Maker Report

```powershell
# Top makers report
$apps = Get-AdminPowerApp
$makers = $apps | Group-Object -Property { $_.Owner.displayName } | 
    Select-Object Name, Count | 
    Sort-Object Count -Descending | 
    Select-Object -First 10

$makers | Format-Table -AutoSize
```

### Connector Usage Report

```powershell
# Connector usage across tenant
$connections = Get-AdminPowerAppConnection

$connectorUsage = $connections | 
    Group-Object -Property ConnectorName | 
    Select-Object @{Name='ConnectorName';Expression={$_.Name}}, @{Name='Count';Expression={$_.Count}} |
    Sort-Object Count -Descending

$connectorUsage | Export-Csv -Path "connector-usage.csv" -NoTypeInformation
$connectorUsage | Format-Table -AutoSize
```

---

## Advanced Governance Scripts

### Script 1: Orphaned Apps Detection

```powershell
# Find and report apps without active owners
$orphanedApps = @()

$environments = Get-AdminPowerAppEnvironment

foreach ($env in $environments) {
    Write-Host "Checking environment: $($env.DisplayName)"
    
    $apps = Get-AdminPowerApp -EnvironmentName $env.EnvironmentName
    
    foreach ($app in $apps) {
        try {
            $owner = Get-AdminPowerAppRoleAssignment `
                -EnvironmentName $env.EnvironmentName `
                -AppName $app.AppName |
                Where-Object { $_.RoleType -eq "Owner" }
            
            if ($owner.Count -eq 0) {
                $orphanedApps += [PSCustomObject]@{
                    EnvironmentName = $env.DisplayName
                    AppName = $app.DisplayName
                    AppGuid = $app.AppName
                    CreatedTime = $app.CreatedTime
                    LastModifiedTime = $app.LastModifiedTime
                }
            }
        }
        catch {
            Write-Warning "Error checking app: $($app.DisplayName)"
        }
    }
}

$orphanedApps | Export-Csv -Path "orphaned-apps.csv" -NoTypeInformation
Write-Host "Found $($orphanedApps.Count) orphaned apps"
```

### Script 2: Inactive Resources Cleanup

```powershell
# Identify inactive apps and flows (not modified in 180 days)
$inactiveThreshold = (Get-Date).AddDays(-180)

$inactiveApps = Get-AdminPowerApp | Where-Object {
    [DateTime]$_.LastModifiedTime -lt $inactiveThreshold
}

$inactiveFlows = Get-AdminFlow | Where-Object {
    [DateTime]$_.LastModifiedTime -lt $inactiveThreshold
}

$report = @{
    InactiveApps = $inactiveApps | Select-Object DisplayName, EnvironmentName, LastModifiedTime, Owner
    InactiveFlows = $inactiveFlows | Select-Object DisplayName, EnvironmentName, LastModifiedTime, CreatedBy
}

$report.InactiveApps | Export-Csv -Path "inactive-apps.csv" -NoTypeInformation
$report.InactiveFlows | Export-Csv -Path "inactive-flows.csv" -NoTypeInformation

Write-Host "Inactive Apps: $($inactiveApps.Count)"
Write-Host "Inactive Flows: $($inactiveFlows.Count)"
```

### Script 3: Environment Capacity Monitoring

```powershell
# Monitor environment capacity usage
$capacityReport = @()

$environments = Get-AdminPowerAppEnvironment | 
    Where-Object { $_.EnvironmentType -eq "Production" }

foreach ($env in $environments) {
    try {
        $capacity = Get-AdminPowerAppEnvironmentCapacity -EnvironmentName $env.EnvironmentName
        
        $capacityReport += [PSCustomObject]@{
            EnvironmentName = $env.DisplayName
            DatabaseUsed = [math]::Round($capacity.ActualConsumption.Database, 2)
            DatabaseAvailable = [math]::Round($capacity.Capacity.Database, 2)
            DatabasePercent = [math]::Round(($capacity.ActualConsumption.Database / $capacity.Capacity.Database) * 100, 2)
            FileUsed = [math]::Round($capacity.ActualConsumption.File, 2)
            FileAvailable = [math]::Round($capacity.Capacity.File, 2)
            FilePercent = [math]::Round(($capacity.ActualConsumption.File / $capacity.Capacity.File) * 100, 2)
        }
    }
    catch {
        Write-Warning "Could not get capacity for: $($env.DisplayName)"
    }
}

$capacityReport | Export-Csv -Path "capacity-report.csv" -NoTypeInformation

# Alert if any environment exceeds 80% capacity
$alerts = $capacityReport | Where-Object { 
    $_.DatabasePercent -gt 80 -or $_.FilePercent -gt 80 
}

if ($alerts.Count -gt 0) {
    Write-Host "WARNING: $($alerts.Count) environments exceed 80% capacity!" -ForegroundColor Red
    $alerts | Format-Table -AutoSize
}
```

### Script 4: DLP Policy Audit

```powershell
# Audit DLP policies and coverage
$dlpReport = @()

$policies = Get-AdminDlpPolicy

foreach ($policy in $policies) {
    $envCount = if ($policy.environments) { $policy.environments.Count } else { 0 }
    
    $businessConnectors = $policy.connectorGroups | 
        Where-Object { $_.classification -eq "General" } |
        Select-Object -ExpandProperty connectors | 
        Measure-Object | 
        Select-Object -ExpandProperty Count
    
    $nonBusinessConnectors = $policy.connectorGroups | 
        Where-Object { $_.classification -eq "Confidential" } |
        Select-Object -ExpandProperty connectors | 
        Measure-Object | 
        Select-Object -ExpandProperty Count
    
    $dlpReport += [PSCustomObject]@{
        PolicyName = $policy.displayName
        PolicyGuid = $policy.name
        EnvironmentCount = $envCount
        BusinessConnectors = $businessConnectors
        NonBusinessConnectors = $nonBusinessConnectors
        CreatedTime = $policy.createdTime
        CreatedBy = $policy.createdBy.displayName
    }
}

$dlpReport | Export-Csv -Path "dlp-audit.csv" -NoTypeInformation
$dlpReport | Format-Table -AutoSize
```

### Script 5: Comprehensive Tenant Inventory

```powershell
# Complete tenant inventory report
$tenantInventory = @{
    GeneratedDate = Get-Date
    Environments = @()
    TotalApps = 0
    TotalFlows = 0
    TotalConnections = 0
    TotalBots = 0
}

$environments = Get-AdminPowerAppEnvironment

foreach ($env in $environments) {
    Write-Host "Processing: $($env.DisplayName)"
    
    $apps = Get-AdminPowerApp -EnvironmentName $env.EnvironmentName
    $flows = Get-AdminFlow -EnvironmentName $env.EnvironmentName
    $connections = Get-AdminPowerAppConnection -EnvironmentName $env.EnvironmentName
    $bots = Get-AdminPowerAppChatbot -EnvironmentName $env.EnvironmentName
    
    $tenantInventory.Environments += [PSCustomObject]@{
        EnvironmentName = $env.DisplayName
        EnvironmentType = $env.EnvironmentType
        Region = $env.Location.Name
        Apps = $apps.Count
        Flows = $flows.Count
        Connections = $connections.Count
        Bots = $bots.Count
        CreatedTime = $env.CreatedTime
    }
    
    $tenantInventory.TotalApps += $apps.Count
    $tenantInventory.TotalFlows += $flows.Count
    $tenantInventory.TotalConnections += $connections.Count
    $tenantInventory.TotalBots += $bots.Count
}

# Export inventory
$tenantInventory.Environments | Export-Csv -Path "tenant-inventory.csv" -NoTypeInformation

# Summary
Write-Host "`n===== TENANT INVENTORY SUMMARY =====" -ForegroundColor Cyan
Write-Host "Total Environments: $($tenantInventory.Environments.Count)"
Write-Host "Total Apps: $($tenantInventory.TotalApps)"
Write-Host "Total Flows: $($tenantInventory.TotalFlows)"
Write-Host "Total Connections: $($tenantInventory.TotalConnections)"
Write-Host "Total Bots: $($tenantInventory.TotalBots)"
Write-Host "====================================" -ForegroundColor Cyan
```

---

## Error Handling & Best Practices

### Retry Logic

```powershell
function Invoke-WithRetry {
    param(
        [ScriptBlock]$ScriptBlock,
        [int]$MaxRetries = 3,
        [int]$RetryDelaySeconds = 5
    )
    
    $attempt = 1
    
    while ($attempt -le $MaxRetries) {
        try {
            return & $ScriptBlock
        }
        catch {
            if ($attempt -eq $MaxRetries) {
                throw
            }
            
            Write-Warning "Attempt $attempt failed. Retrying in $RetryDelaySeconds seconds..."
            Start-Sleep -Seconds $RetryDelaySeconds
            $attempt++
        }
    }
}

# Usage
Invoke-WithRetry -ScriptBlock {
    Get-AdminPowerApp -EnvironmentName $envId
}
```

### Rate Limiting Handling

```powershell
# Handle rate limits with exponential backoff
function Invoke-WithRateLimit {
    param(
        [ScriptBlock]$ScriptBlock,
        [int]$MaxRetries = 5
    )
    
    $attempt = 1
    $baseDelay = 2
    
    while ($attempt -le $MaxRetries) {
        try {
            return & $ScriptBlock
        }
        catch {
            $exception = $_.Exception
            
            if ($exception -match "429" -or $exception -match "rate limit") {
                $delay = [math]::Pow($baseDelay, $attempt)
                Write-Warning "Rate limit hit. Waiting $delay seconds..."
                Start-Sleep -Seconds $delay
                $attempt++
            }
            else {
                throw
            }
        }
    }
    
    throw "Max retries exceeded due to rate limiting"
}

# Usage
Invoke-WithRateLimit -ScriptBlock {
    Get-AdminFlow
}
```

### Progress Tracking

```powershell
# Track progress for long-running operations
$environments = Get-AdminPowerAppEnvironment
$total = $environments.Count
$current = 0

foreach ($env in $environments) {
    $current++
    $percentComplete = ($current / $total) * 100
    
    Write-Progress -Activity "Processing Environments" `
        -Status "$current of $total - $($env.DisplayName)" `
        -PercentComplete $percentComplete
    
    # Do work here
    Get-AdminPowerApp -EnvironmentName $env.EnvironmentName
}

Write-Progress -Activity "Processing Environments" -Completed
```

### Logging

```powershell
# Comprehensive logging function
function Write-Log {
    param(
        [string]$Message,
        [ValidateSet("Info", "Warning", "Error")]
        [string]$Level = "Info",
        [string]$LogFile = "governance-script.log"
    )
    
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $logEntry = "$timestamp [$Level] $Message"
    
    Add-Content -Path $LogFile -Value $logEntry
    
    switch ($Level) {
        "Info" { Write-Host $logEntry }
        "Warning" { Write-Host $logEntry -ForegroundColor Yellow }
        "Error" { Write-Host $logEntry -ForegroundColor Red }
    }
}

# Usage
Write-Log "Script started" -Level Info
Write-Log "Processing environment: Dev" -Level Info
Write-Log "Rate limit encountered" -Level Warning
Write-Log "Failed to retrieve app" -Level Error
```

---

## Performance Optimization

### Parallel Processing

```powershell
# Process environments in parallel
$environments = Get-AdminPowerAppEnvironment

$environments | ForEach-Object -Parallel {
    $env = $_
    $apps = Get-AdminPowerApp -EnvironmentName $env.EnvironmentName
    
    [PSCustomObject]@{
        Environment = $env.DisplayName
        AppCount = $apps.Count
    }
} -ThrottleLimit 5
```

### Caching Results

```powershell
# Cache expensive operations
$script:EnvironmentCache = @{}

function Get-CachedEnvironment {
    param([string]$EnvironmentName)
    
    if (-not $script:EnvironmentCache.ContainsKey($EnvironmentName)) {
        $script:EnvironmentCache[$EnvironmentName] = Get-AdminPowerAppEnvironment -EnvironmentName $EnvironmentName
    }
    
    return $script:EnvironmentCache[$EnvironmentName]
}
```

---

## Troubleshooting

### Common Issues

1. **Module Not Found**
   ```powershell
   # Reinstall module
   Uninstall-Module -Name Microsoft.PowerApps.Administration.PowerShell
   Install-Module -Name Microsoft.PowerApps.Administration.PowerShell -Force
   ```

2. **Authentication Errors**
   ```powershell
   # Clear and re-authenticate
   Remove-PowerAppsAccount
   Add-PowerAppsAccount
   ```

3. **Permission Denied**
   - Verify user has Power Platform Administrator or Dynamics 365 Administrator role
   - Ensure first-time sign-in to Power Platform admin center completed

4. **Rate Limiting**
   - Implement retry logic with exponential backoff
   - Add delays between bulk operations
   - Use parallel processing with throttle limits

### Diagnostic Commands

```powershell
# Check module version
Get-Module -Name "Microsoft.PowerApps.Administration.PowerShell" -ListAvailable

# Test authentication
Get-AdminPowerAppEnvironment | Select-Object -First 1

# Check PowerShell version
$PSVersionTable.PSVersion

# View loaded modules
Get-Module
```

---

## Additional Resources

- **PowerShell Gallery**: https://www.powershellgallery.com/packages/Microsoft.PowerApps.Administration.PowerShell
- **Microsoft Learn**: https://learn.microsoft.com/power-platform/admin/powerapps-powershell
- **CoE Starter Kit**: https://github.com/microsoft/coe-starter-kit
- **Admin in a Day**: https://github.com/microsoft/powerapps-tools/tree/master/Administration/AdminInADay

---

*Last Updated: October 2025*
*Based on Microsoft.PowerApps.Administration.PowerShell version 2.0+ and Microsoft Learn documentation*
