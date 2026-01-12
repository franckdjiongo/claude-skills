# Power Platform Governance Patterns & Best Practices

## Overview

This document outlines common governance patterns, use cases, and best practices for managing Power Platform at scale using PAC CLI and PowerShell.

---

## Core Governance Principles

### 1. Principle of Least Privilege
- Grant minimum permissions required
- Use Azure AD security groups for access control
- Regularly audit environment access
- Remove unnecessary permissions promptly

### 2. Environment Strategy
- **Production**: Managed solutions only, strict DLP policies
- **Test/UAT**: Testing managed solutions, moderate DLP
- **Development**: Active development, relaxed DLP for productivity
- **Sandbox**: Experimentation, temporary environments

### 3. Solution Management
- Use ALM (Application Lifecycle Management) practices
- All production code in managed solutions
- Version control with git
- Automated CI/CD pipelines

### 4. Monitoring & Compliance
- Regular audits (weekly/monthly)
- Automated alerts for policy violations
- Capacity monitoring
- License usage tracking

### 5. Maker Enablement
- Clear guidelines and documentation
- Training programs
- Template libraries
- CoE support channels

---

## Common Governance Scenarios

### Scenario 1: New Environment Request Process

**Challenge**: Users creating environments without governance oversight

**Solution Pattern**:
```powershell
# Automated environment provisioning workflow

function New-GovernedEnvironment {
    param(
        [string]$DisplayName,
        [string]$Requestor,
        [string]$BusinessJustification,
        [ValidateSet('Sandbox', 'Production')]
        [string]$Type,
        [string]$Region = "unitedstates",
        [string]$SecurityGroupId
    )
    
    # 1. Validate request
    Write-Host "Validating environment request..."
    
    # 2. Create environment
    Write-Host "Creating environment: $DisplayName"
    $env = New-AdminPowerAppEnvironment `
        -DisplayName $DisplayName `
        -LocationName $Region `
        -EnvironmentSku $Type `
        -ProvisionDatabase `
        -SecurityGroupId $SecurityGroupId
    
    # 3. Apply DLP policies
    Write-Host "Applying DLP policies..."
    Add-AdminDlpPolicyEnvironment `
        -PolicyName "Corporate-DLP-Policy" `
        -EnvironmentName $env.EnvironmentName
    
    # 4. Set permissions
    Write-Host "Setting environment admin..."
    Set-AdminPowerAppEnvironmentRoleAssignment `
        -EnvironmentName $env.EnvironmentName `
        -PrincipalType User `
        -PrincipalObjectId (Get-AzureADUser -SearchString $Requestor).ObjectId `
        -RoleName EnvironmentAdmin
    
    # 5. Log creation
    $logEntry = @{
        Timestamp = Get-Date
        EnvironmentName = $DisplayName
        EnvironmentId = $env.EnvironmentName
        Requestor = $Requestor
        Type = $Type
        Justification = $BusinessJustification
    }
    
    $logEntry | Export-Csv -Path "environment-audit.csv" -Append -NoTypeInformation
    
    Write-Host "Environment created successfully: $($env.EnvironmentName)" -ForegroundColor Green
    return $env
}

# Usage
New-GovernedEnvironment `
    -DisplayName "Sales Analytics Dev" `
    -Requestor "john.doe@company.com" `
    -BusinessJustification "Q4 Sales Dashboard Development" `
    -Type Sandbox `
    -Region "unitedstates" `
    -SecurityGroupId "aad-group-guid"
```

**Benefits**:
- Standardized environment creation
- Automatic DLP policy application
- Audit trail of all environments
- Consistent naming and tagging

---

### Scenario 2: Orphaned Resource Management

**Challenge**: Apps and flows without active owners after employee departures

**Solution Pattern**:
```powershell
# Detect and reassign orphaned resources

function Find-OrphanedResources {
    param(
        [string]$NewOwnerEmail = "admin@company.com",
        [bool]$AutoReassign = $false
    )
    
    $orphanedReport = @()
    
    Write-Host "Scanning for orphaned resources..." -ForegroundColor Cyan
    
    $environments = Get-AdminPowerAppEnvironment
    
    foreach ($env in $environments) {
        Write-Host "Checking environment: $($env.DisplayName)"
        
        # Check apps
        $apps = Get-AdminPowerApp -EnvironmentName $env.EnvironmentName
        
        foreach ($app in $apps) {
            try {
                $owner = Get-AdminPowerAppRoleAssignment `
                    -EnvironmentName $env.EnvironmentName `
                    -AppName $app.AppName | 
                    Where-Object { $_.RoleType -eq "Owner" }
                
                if (-not $owner -or $owner.Count -eq 0) {
                    $orphanedReport += [PSCustomObject]@{
                        Type = "App"
                        Name = $app.DisplayName
                        ResourceId = $app.AppName
                        Environment = $env.DisplayName
                        EnvironmentId = $env.EnvironmentName
                        LastModified = $app.LastModifiedTime
                        CreatedBy = $app.Owner.displayName
                    }
                    
                    if ($AutoReassign) {
                        Write-Host "  Reassigning app: $($app.DisplayName)" -ForegroundColor Yellow
                        Set-AdminPowerAppOwner `
                            -EnvironmentName $env.EnvironmentName `
                            -AppName $app.AppName `
                            -AppOwner $NewOwnerEmail
                    }
                }
            }
            catch {
                Write-Warning "Error checking app: $($app.DisplayName)"
            }
        }
        
        # Check flows
        $flows = Get-AdminFlow -EnvironmentName $env.EnvironmentName
        
        foreach ($flow in $flows) {
            try {
                $owner = Get-AdminFlowOwnerRole `
                    -EnvironmentName $env.EnvironmentName `
                    -FlowName $flow.FlowName
                
                if (-not $owner -or $owner.Count -eq 0) {
                    $orphanedReport += [PSCustomObject]@{
                        Type = "Flow"
                        Name = $flow.DisplayName
                        ResourceId = $flow.FlowName
                        Environment = $env.DisplayName
                        EnvironmentId = $env.EnvironmentName
                        LastModified = $flow.LastModifiedTime
                        CreatedBy = $flow.CreatedBy.displayName
                    }
                    
                    if ($AutoReassign) {
                        Write-Host "  Reassigning flow: $($flow.DisplayName)" -ForegroundColor Yellow
                        Set-AdminFlowOwnerRole `
                            -EnvironmentName $env.EnvironmentName `
                            -FlowName $flow.FlowName `
                            -PrincipalType User `
                            -PrincipalObjectId (Get-AzureADUser -SearchString $NewOwnerEmail).ObjectId
                    }
                }
            }
            catch {
                Write-Warning "Error checking flow: $($flow.DisplayName)"
            }
        }
    }
    
    # Export report
    $orphanedReport | Export-Csv -Path "orphaned-resources-$(Get-Date -Format 'yyyy-MM-dd').csv" -NoTypeInformation
    
    Write-Host "`nFound $($orphanedReport.Count) orphaned resources" -ForegroundColor Cyan
    
    return $orphanedReport
}

# Usage
# Scan only (no reassignment)
Find-OrphanedResources

# Scan and automatically reassign to admin
Find-OrphanedResources -NewOwnerEmail "admin@company.com" -AutoReassign $true
```

**Scheduling**: Run weekly via Azure Automation or Task Scheduler

---

### Scenario 3: Capacity Management & Alerts

**Challenge**: Environments approaching storage limits without warning

**Solution Pattern**:
```powershell
# Monitor capacity and send alerts

function Monitor-EnvironmentCapacity {
    param(
        [int]$AlertThreshold = 80,
        [string]$AlertEmail = "admin@company.com"
    )
    
    $capacityAlerts = @()
    
    Write-Host "Monitoring environment capacity..." -ForegroundColor Cyan
    
    $environments = Get-AdminPowerAppEnvironment | 
        Where-Object { $_.EnvironmentType -eq "Production" }
    
    foreach ($env in $environments) {
        try {
            $capacity = Get-AdminPowerAppEnvironmentCapacity -EnvironmentName $env.EnvironmentName
            
            $dbPercent = ($capacity.ActualConsumption.Database / $capacity.Capacity.Database) * 100
            $filePercent = ($capacity.ActualConsumption.File / $capacity.Capacity.File) * 100
            
            $capacityInfo = [PSCustomObject]@{
                Environment = $env.DisplayName
                EnvironmentId = $env.EnvironmentName
                DatabaseUsedGB = [math]::Round($capacity.ActualConsumption.Database / 1024, 2)
                DatabaseTotalGB = [math]::Round($capacity.Capacity.Database / 1024, 2)
                DatabasePercent = [math]::Round($dbPercent, 2)
                FileUsedGB = [math]::Round($capacity.ActualConsumption.File / 1024, 2)
                FileTotalGB = [math]::Round($capacity.Capacity.File / 1024, 2)
                FilePercent = [math]::Round($filePercent, 2)
                Alert = ($dbPercent -gt $AlertThreshold) -or ($filePercent -gt $AlertThreshold)
            }
            
            if ($capacityInfo.Alert) {
                $capacityAlerts += $capacityInfo
                Write-Host "  ALERT: $($env.DisplayName) exceeds $AlertThreshold%" -ForegroundColor Red
            }
            
        }
        catch {
            Write-Warning "Could not get capacity for: $($env.DisplayName)"
        }
    }
    
    # Send email alert if any environments exceed threshold
    if ($capacityAlerts.Count -gt 0) {
        $emailBody = @"
<html>
<body>
<h2>Power Platform Capacity Alert</h2>
<p>The following environments have exceeded $AlertThreshold% capacity:</p>
<table border='1'>
<tr>
    <th>Environment</th>
    <th>Database Used</th>
    <th>Database %</th>
    <th>File Used</th>
    <th>File %</th>
</tr>
"@
        
        foreach ($alert in $capacityAlerts) {
            $emailBody += @"
<tr>
    <td>$($alert.Environment)</td>
    <td>$($alert.DatabaseUsedGB) GB / $($alert.DatabaseTotalGB) GB</td>
    <td style='color:red;'>$($alert.DatabasePercent)%</td>
    <td>$($alert.FileUsedGB) GB / $($alert.FileTotalGB) GB</td>
    <td style='color:red;'>$($alert.FilePercent)%</td>
</tr>
"@
        }
        
        $emailBody += @"
</table>
<p>Please review and take action to free up capacity.</p>
</body>
</html>
"@
        
        # Send email (requires Send-MailMessage or similar)
        Send-MailMessage `
            -To $AlertEmail `
            -From "powerplatform@company.com" `
            -Subject "Power Platform Capacity Alert - $($capacityAlerts.Count) Environments" `
            -Body $emailBody `
            -BodyAsHtml `
            -SmtpServer "smtp.company.com"
    }
    
    return $capacityAlerts
}

# Usage
Monitor-EnvironmentCapacity -AlertThreshold 80 -AlertEmail "admin@company.com"
```

**Scheduling**: Run daily via Azure Automation

---

### Scenario 4: Inactive Resource Cleanup

**Challenge**: Unused apps and flows consuming licenses and capacity

**Solution Pattern**:
```powershell
# Identify and optionally disable/delete inactive resources

function Remove-InactiveResources {
    param(
        [int]$InactiveDays = 180,
        [bool]$DisableOnly = $true,
        [bool]$DeletePermanently = $false,
        [string[]]$ExcludeEnvironments = @()
    )
    
    $inactiveThreshold = (Get-Date).AddDays(-$InactiveDays)
    $inactiveResources = @()
    
    Write-Host "Scanning for resources inactive for $InactiveDays days..." -ForegroundColor Cyan
    
    $environments = Get-AdminPowerAppEnvironment | 
        Where-Object { $_.DisplayName -notin $ExcludeEnvironments }
    
    foreach ($env in $environments) {
        Write-Host "Checking environment: $($env.DisplayName)"
        
        # Check apps
        $apps = Get-AdminPowerApp -EnvironmentName $env.EnvironmentName | 
            Where-Object { [DateTime]$_.LastModifiedTime -lt $inactiveThreshold }
        
        foreach ($app in $apps) {
            $inactiveResources += [PSCustomObject]@{
                Type = "App"
                Name = $app.DisplayName
                ResourceId = $app.AppName
                Environment = $env.DisplayName
                EnvironmentId = $env.EnvironmentName
                LastModified = $app.LastModifiedTime
                InactiveDays = ((Get-Date) - [DateTime]$app.LastModifiedTime).Days
                Owner = $app.Owner.displayName
            }
            
            if ($DeletePermanently) {
                Write-Host "  Deleting app: $($app.DisplayName)" -ForegroundColor Red
                Remove-AdminPowerApp -EnvironmentName $env.EnvironmentName -AppName $app.AppName
            }
        }
        
        # Check flows
        $flows = Get-AdminFlow -EnvironmentName $env.EnvironmentName | 
            Where-Object { [DateTime]$_.LastModifiedTime -lt $inactiveThreshold }
        
        foreach ($flow in $flows) {
            $inactiveResources += [PSCustomObject]@{
                Type = "Flow"
                Name = $flow.DisplayName
                ResourceId = $flow.FlowName
                Environment = $env.DisplayName
                EnvironmentId = $env.EnvironmentName
                LastModified = $flow.LastModifiedTime
                InactiveDays = ((Get-Date) - [DateTime]$flow.LastModifiedTime).Days
                Owner = $flow.CreatedBy.displayName
                Enabled = $flow.Enabled
            }
            
            if ($DisableOnly -and $flow.Enabled) {
                Write-Host "  Disabling flow: $($flow.DisplayName)" -ForegroundColor Yellow
                Disable-AdminFlow -EnvironmentName $env.EnvironmentName -FlowName $flow.FlowName
            }
            elseif ($DeletePermanently) {
                Write-Host "  Deleting flow: $($flow.DisplayName)" -ForegroundColor Red
                Remove-AdminFlow -EnvironmentName $env.EnvironmentName -FlowName $flow.FlowName
            }
        }
    }
    
    # Export report
    $inactiveResources | Export-Csv -Path "inactive-resources-$(Get-Date -Format 'yyyy-MM-dd').csv" -NoTypeInformation
    
    Write-Host "`nFound $($inactiveResources.Count) inactive resources" -ForegroundColor Cyan
    Write-Host "  Apps: $(($inactiveResources | Where-Object Type -eq 'App').Count)"
    Write-Host "  Flows: $(($inactiveResources | Where-Object Type -eq 'Flow').Count)"
    
    return $inactiveResources
}

# Usage
# Scan only
Remove-InactiveResources -InactiveDays 180

# Disable inactive flows
Remove-InactiveResources -InactiveDays 180 -DisableOnly $true

# Delete permanently (CAUTION!)
Remove-InactiveResources -InactiveDays 365 -DeletePermanently $true -ExcludeEnvironments @("Production")
```

**Best Practice**: Start with longer inactive periods (365 days) and disable-only mode

---

### Scenario 5: Connector Usage Audit

**Challenge**: Tracking premium connector usage for licensing compliance

**Solution Pattern**:
```powershell
# Audit connector usage across tenant

function Get-ConnectorUsageReport {
    param(
        [switch]$IncludePremiumOnly
    )
    
    $premiumConnectors = @(
        "shared_sql", "shared_azureblob", "shared_sharepointonline",
        "shared_office365users", "shared_commondataservice",
        "shared_azuread", "shared_dynamicscrmonline"
    )
    
    $connectorReport = @()
    
    Write-Host "Analyzing connector usage..." -ForegroundColor Cyan
    
    $environments = Get-AdminPowerAppEnvironment
    
    foreach ($env in $environments) {
        Write-Host "Checking environment: $($env.DisplayName)"
        
        $connections = Get-AdminPowerAppConnection -EnvironmentName $env.EnvironmentName
        
        foreach ($connection in $connections) {
            $isPremium = $premiumConnectors -contains $connection.ConnectorName
            
            if (-not $IncludePremiumOnly -or $isPremium) {
                $connectorReport += [PSCustomObject]@{
                    Environment = $env.DisplayName
                    EnvironmentId = $env.EnvironmentName
                    ConnectorName = $connection.ConnectorName
                    ConnectionName = $connection.ConnectionName
                    DisplayName = $connection.DisplayName
                    IsPremium = $isPremium
                    CreatedTime = $connection.CreatedTime
                    CreatedBy = $connection.CreatedBy.displayName
                }
            }
        }
    }
    
    # Group by connector
    $connectorSummary = $connectorReport | 
        Group-Object -Property ConnectorName | 
        Select-Object @{Name='ConnectorName';Expression={$_.Name}}, 
                      @{Name='ConnectionCount';Expression={$_.Count}},
                      @{Name='IsPremium';Expression={$premiumConnectors -contains $_.Name}} |
        Sort-Object ConnectionCount -Descending
    
    # Export reports
    $connectorReport | Export-Csv -Path "connector-usage-detail-$(Get-Date -Format 'yyyy-MM-dd').csv" -NoTypeInformation
    $connectorSummary | Export-Csv -Path "connector-usage-summary-$(Get-Date -Format 'yyyy-MM-dd').csv" -NoTypeInformation
    
    # Display summary
    Write-Host "`nTop 10 Connectors:" -ForegroundColor Cyan
    $connectorSummary | Select-Object -First 10 | Format-Table -AutoSize
    
    # Premium connector alert
    $premiumCount = ($connectorReport | Where-Object IsPremium -eq $true).Count
    Write-Host "`nPremium Connections: $premiumCount" -ForegroundColor Yellow
    
    return $connectorReport
}

# Usage
Get-ConnectorUsageReport

# Only premium connectors
Get-ConnectorUsageReport -IncludePremiumOnly
```

---

### Scenario 6: DLP Policy Compliance Check

**Challenge**: Ensuring all environments have appropriate DLP policies

**Solution Pattern**:
```powershell
# Verify DLP policy coverage

function Test-DLPCompliance {
    param(
        [string[]]$RequiredPolicies = @("Corporate-DLP-Policy"),
        [switch]$AutoRemediate
    )
    
    $complianceReport = @()
    
    Write-Host "Checking DLP policy compliance..." -ForegroundColor Cyan
    
    $environments = Get-AdminPowerAppEnvironment
    $dlpPolicies = Get-AdminDlpPolicy
    
    foreach ($env in $environments) {
        $appliedPolicies = @()
        
        foreach ($policy in $dlpPolicies) {
            if ($policy.environments.name -contains $env.EnvironmentName) {
                $appliedPolicies += $policy.displayName
            }
        }
        
        $isCompliant = $true
        $missingPolicies = @()
        
        foreach ($requiredPolicy in $RequiredPolicies) {
            if ($appliedPolicies -notcontains $requiredPolicy) {
                $isCompliant = $false
                $missingPolicies += $requiredPolicy
                
                if ($AutoRemediate) {
                    Write-Host "  Applying policy '$requiredPolicy' to $($env.DisplayName)" -ForegroundColor Yellow
                    
                    $policyObj = $dlpPolicies | Where-Object { $_.displayName -eq $requiredPolicy }
                    if ($policyObj) {
                        Add-AdminDlpPolicyEnvironment `
                            -PolicyName $policyObj.name `
                            -EnvironmentName $env.EnvironmentName
                    }
                }
            }
        }
        
        $complianceReport += [PSCustomObject]@{
            Environment = $env.DisplayName
            EnvironmentId = $env.EnvironmentName
            EnvironmentType = $env.EnvironmentType
            IsCompliant = $isCompliant
            AppliedPolicies = ($appliedPolicies -join "; ")
            MissingPolicies = ($missingPolicies -join "; ")
        }
    }
    
    # Export report
    $complianceReport | Export-Csv -Path "dlp-compliance-$(Get-Date -Format 'yyyy-MM-dd').csv" -NoTypeInformation
    
    # Display non-compliant environments
    $nonCompliant = $complianceReport | Where-Object { -not $_.IsCompliant }
    
    if ($nonCompliant.Count -gt 0) {
        Write-Host "`nNon-Compliant Environments: $($nonCompliant.Count)" -ForegroundColor Red
        $nonCompliant | Format-Table Environment, EnvironmentType, MissingPolicies -AutoSize
    }
    else {
        Write-Host "`nAll environments are DLP compliant!" -ForegroundColor Green
    }
    
    return $complianceReport
}

# Usage
Test-DLPCompliance -RequiredPolicies @("Corporate-DLP-Policy")

# Auto-remediate non-compliance
Test-DLPCompliance -RequiredPolicies @("Corporate-DLP-Policy") -AutoRemediate
```

---

### Scenario 7: Environment Lifecycle Management

**Challenge**: Managing environment expiration and cleanup

**Solution Pattern**:
```powershell
# Manage environment lifecycle with expiration dates

function Manage-EnvironmentLifecycle {
    param(
        [int]$SandboxExpiryDays = 90,
        [int]$WarningDays = 7,
        [bool]$AutoDelete = $false
    )
    
    $lifecycleReport = @()
    
    Write-Host "Checking environment lifecycle..." -ForegroundColor Cyan
    
    $environments = Get-AdminPowerAppEnvironment | 
        Where-Object { $_.EnvironmentType -eq "Sandbox" }
    
    foreach ($env in $environments) {
        $createdDate = [DateTime]$env.CreatedTime
        $age = ((Get-Date) - $createdDate).Days
        $daysUntilExpiry = $SandboxExpiryDays - $age
        
        $status = if ($daysUntilExpiry -le 0) {
            "Expired"
        }
        elseif ($daysUntilExpiry -le $WarningDays) {
            "Expiring Soon"
        }
        else {
            "Active"
        }
        
        $lifecycleReport += [PSCustomObject]@{
            Environment = $env.DisplayName
            EnvironmentId = $env.EnvironmentName
            CreatedDate = $createdDate
            AgeDays = $age
            DaysUntilExpiry = $daysUntilExpiry
            Status = $status
        }
        
        if ($status -eq "Expired" -and $AutoDelete) {
            Write-Host "  Deleting expired environment: $($env.DisplayName)" -ForegroundColor Red
            Remove-AdminPowerAppEnvironment -EnvironmentName $env.EnvironmentName
        }
        elseif ($status -eq "Expiring Soon") {
            Write-Host "  WARNING: $($env.DisplayName) expires in $daysUntilExpiry days" -ForegroundColor Yellow
            # Send notification to environment admins
        }
    }
    
    # Export report
    $lifecycleReport | Export-Csv -Path "environment-lifecycle-$(Get-Date -Format 'yyyy-MM-dd').csv" -NoTypeInformation
    
    # Summary
    Write-Host "`nEnvironment Lifecycle Summary:" -ForegroundColor Cyan
    Write-Host "  Active: $(($lifecycleReport | Where-Object Status -eq 'Active').Count)"
    Write-Host "  Expiring Soon: $(($lifecycleReport | Where-Object Status -eq 'Expiring Soon').Count)"
    Write-Host "  Expired: $(($lifecycleReport | Where-Object Status -eq 'Expired').Count)"
    
    return $lifecycleReport
}

# Usage
Manage-EnvironmentLifecycle -SandboxExpiryDays 90 -WarningDays 7

# Auto-delete expired (CAUTION!)
Manage-EnvironmentLifecycle -SandboxExpiryDays 90 -AutoDelete $true
```

---

## Automation & Scheduling Strategies

### Azure Automation

**Setup**:
1. Create Azure Automation Account
2. Import PowerShell modules
3. Create runbooks from governance scripts
4. Schedule runbook execution

**Example Runbook**:
```powershell
# Azure Automation Runbook - Daily Capacity Check

param()

# Connect using Managed Identity
Connect-AzAccount -Identity

# Authenticate to Power Platform
Add-PowerAppsAccount -TenantID $env:AUTOMATION_TENANT_ID

# Run capacity monitoring
Monitor-EnvironmentCapacity -AlertThreshold 80 -AlertEmail "admin@company.com"
```

### Windows Task Scheduler

**Setup**:
```powershell
# Create scheduled task for weekly orphan check

$action = New-ScheduledTaskAction -Execute "PowerShell.exe" `
    -Argument "-File C:\Scripts\Find-OrphanedResources.ps1"

$trigger = New-ScheduledTaskTrigger -Weekly -DaysOfWeek Monday -At 8am

$principal = New-ScheduledTaskPrincipal -UserId "SYSTEM" -LogonType ServiceAccount

Register-ScheduledTask -TaskName "PowerPlatform-OrphanCheck" `
    -Action $action `
    -Trigger $trigger `
    -Principal $principal `
    -Description "Weekly scan for orphaned Power Platform resources"
```

### Power Automate (for notifications)

**Pattern**: Use HTTP connector to trigger Power Automate flows for notifications

```powershell
# Send alert via Power Automate HTTP trigger
$flowUrl = "https://prod-XX.westus.logic.azure.com/workflows/..."

$body = @{
    subject = "Power Platform Alert"
    message = "5 environments exceed capacity threshold"
    severity = "High"
} | ConvertTo-Json

Invoke-RestMethod -Uri $flowUrl -Method Post -Body $body -ContentType "application/json"
```

---

## Best Practices Summary

### 1. Documentation
- Document all governance policies
- Maintain runbook documentation
- Keep script comments up-to-date
- Version control all scripts

### 2. Testing
- Test scripts in dev/sandbox first
- Use `-WhatIf` parameters where available
- Implement dry-run modes
- Validate with small datasets first

### 3. Error Handling
- Implement comprehensive try-catch blocks
- Add retry logic for transient failures
- Log all errors with context
- Set up alerting for critical failures

### 4. Security
- Use service principals for automation
- Store credentials in Azure Key Vault
- Follow least privilege principle
- Rotate credentials regularly
- Audit script execution

### 5. Performance
- Use parallel processing for large operations
- Implement caching for expensive calls
- Batch operations where possible
- Monitor and optimize slow scripts

### 6. Monitoring
- Track script execution success/failure
- Monitor execution duration
- Alert on anomalies
- Regular review of governance metrics

### 7. Communication
- Notify stakeholders before major changes
- Provide clear violation messages
- Offer remediation guidance
- Maintain maker communication channels

---

## Governance Metrics to Track

### Environment Health
- Total environment count by type
- Environments without DLP policies
- Environments exceeding capacity
- Environment creation rate

### Resource Health
- Total apps/flows/bots count
- Orphaned resource count
- Inactive resource count
- Solution vs non-solution resources

### Compliance
- DLP policy coverage %
- Policy violation count
- Remediation time
- Audit findings

### Adoption
- Active maker count
- New apps/flows per month
- User engagement metrics
- Training completion rates

### Capacity
- Database capacity utilization
- File capacity utilization
- API call volume
- License utilization

---

## Sample Governance Dashboard Data

```powershell
# Generate comprehensive governance dashboard data

function Get-GovernanceDashboardData {
    $dashboardData = @{
        Timestamp = Get-Date
        Environments = @{
            Total = 0
            ByType = @{}
            WithoutDLP = 0
            OverCapacity = 0
        }
        Resources = @{
            Apps = 0
            Flows = 0
            Bots = 0
            Orphaned = 0
            Inactive = 0
        }
        Compliance = @{
            DLPCoverage = 0
            PolicyViolations = 0
        }
        TopMakers = @()
        TopConnectors = @()
    }
    
    # Collect all metrics
    $environments = Get-AdminPowerAppEnvironment
    $dashboardData.Environments.Total = $environments.Count
    
    $environments | Group-Object EnvironmentType | ForEach-Object {
        $dashboardData.Environments.ByType[$_.Name] = $_.Count
    }
    
    # Add more metrics...
    
    return $dashboardData
}

# Export to JSON for dashboard consumption
Get-GovernanceDashboardData | ConvertTo-Json -Depth 10 | Out-File "dashboard-data.json"
```

---

## Additional Resources

- **CoE Starter Kit**: https://github.com/microsoft/coe-starter-kit
- **ALM Accelerator**: https://github.com/microsoft/coe-alm-accelerator
- **Admin in a Day**: https://github.com/microsoft/powerapps-tools
- **Best Practices**: https://learn.microsoft.com/power-platform/guidance/
- **Community**: https://powerusers.microsoft.com/

---

*Last Updated: October 2025*
*Based on Power Platform governance best practices and CoE Starter Kit patterns*
