# PAC CLI Reference for Power Platform Governance

## Overview

The Microsoft Power Platform CLI (PAC CLI) is a command-line tool for developers and administrators to perform operations on Power Platform environments, solutions, and resources.

**Current Version**: 1.30.3+ (as of October 2025)

**Installation Methods**:
1. **Visual Studio Code Extension** (Windows, Linux, macOS)
2. **Windows MSI** (Windows only - enables `pac data` and `pac package` commands)
3. **.NET Tool** (Cross-platform but limited Windows commands)

**Key Resources**:
- GitHub Discussions: https://github.com/microsoft/powerplatform-build-tools/discussions
- Microsoft Learn: https://learn.microsoft.com/power-platform/developer/cli/introduction

---

## Installation & Setup

### Installation Commands

```powershell
# Check if PAC CLI is installed
Get-Command pac | Format-List

# Update PAC CLI (if using .NET Tool)
dotnet tool update --global Microsoft.PowerApps.CLI.Tool

# View version
pac
```

### Authentication

```bash
# Interactive authentication
pac auth create

# Authenticate with specific environment
pac auth create --environment <environment-id-or-url>

# Authenticate with environment URL
pac auth create --environment https://your-env.crm.dynamics.com

# Authenticate for GCC/Government clouds
pac auth create --endpoint usgov           # GCC Moderate
pac auth create --endpoint usgovhigh       # GCC High
pac auth create --endpoint dod             # GCC DOD

# Device code flow (non-interactive)
pac auth create --deviceCode

# Service Principal authentication
pac auth create --name MyOrg-SPN \
  --applicationId 00000000-0000-0000-0000-000000000000 \
  --clientSecret $clientSecret \
  --tenant 00000000-0000-0000-0000-000000000000

# Azure DevOps Federation for Service Principal (Preview)
pac auth create --azureDevOpsFederation \
  --tenant 00000000-0000-0000-0000-000000000000 \
  --applicationId 00000000-0000-0000-0000-000000000000

# List all authentication profiles
pac auth list

# Select a different authentication profile
pac auth select --index 1

# Delete an authentication profile
pac auth delete --index 1

# Clear all authentication profiles
pac auth clear
```

### Tab Completion Setup (PowerShell)

```powershell
# Add to PowerShell profile for tab completion
Register-ArgumentCompleter -Native -CommandName pac -ScriptBlock {
    param($wordToComplete, $commandAst, $cursorPosition)
    $Local:word = $wordToComplete.Replace('"', '""')
    $Local:ast = $commandAst.ToString().Replace('"', '""')
    pac complete --word=$Local:word --commandline $Local:ast --position $cursorPosition | ForEach-Object {
        [System.Management.Automation.CompletionResult]::new($_, $_, 'ParameterValue', $_)
    }
}
```

---

## Environment Management Commands

### List Environments

```bash
# List all environments in tenant
pac admin list

# Get environment details
pac admin list --environment <env-id>

# Filter environments by type
pac admin list --type Production
pac admin list --type Sandbox
pac admin list --type Trial
pac admin list --type Developer

# Output to JSON
pac admin list --json
```

### Create Environment

```bash
# Create new environment
pac admin create --name "Dev Environment" \
  --type Sandbox \
  --region unitedstates \
  --currency USD \
  --language 1033

# Create environment with Dataverse
pac admin create --name "Production Environment" \
  --type Production \
  --region unitedstates \
  --currency USD \
  --language 1033 \
  --domain prod-env \
  --security-group <aad-group-id>

# Create environment with templates
pac admin create --name "Customer Service Env" \
  --type Sandbox \
  --region europe \
  --templates D365_CustomerService
```

### Delete Environment

```bash
# Delete environment (CAUTION!)
pac admin delete --environment <env-id>

# Delete with confirmation
pac admin delete --environment <env-id> --confirm
```

### Backup & Restore

```bash
# Create backup
pac admin backup --environment <env-id> --label "Monthly Backup"

# List backups
pac admin list-backups --environment <env-id>

# Restore from backup
pac admin restore --source-environment <env-id> \
  --target-environment <env-id> \
  --backup-id <backup-id>

# Copy environment
pac admin copy --source-environment <env-id> \
  --target-environment <env-id> \
  --copy-type FullCopy
```

---

## Solution Management Commands

### Export Solution

```bash
# Export unmanaged solution
pac solution export --path solution.zip \
  --name MySolution \
  --managed false

# Export managed solution
pac solution export --path solution.zip \
  --name MySolution \
  --managed true

# Export with async (for large solutions)
pac solution export --path solution.zip \
  --name MySolution \
  --async \
  --max-async-wait-time 60

# Export solution with specific version
pac solution export --path solution.zip \
  --name MySolution \
  --exportAutoNumberingSettings \
  --exportCalendarSettings \
  --exportCustomizationSettings \
  --exportEmailTrackingSettings \
  --exportGeneralSettings \
  --exportMarketingSettings \
  --exportOutlookSynchronizationSettings \
  --exportRelationshipRoles \
  --exportIsvConfig
```

### Import Solution

```bash
# Import solution
pac solution import --path solution.zip

# Import with publish
pac solution import --path solution.zip --publish-changes

# Import async
pac solution import --path solution.zip --async

# Import as holding solution
pac solution import --path solution.zip --import-as-holding

# Import with deployment settings
pac solution import --path solution.zip \
  --settings-file deploymentsettings.json

# Force overwrite customizations
pac solution import --path solution.zip \
  --force-overwrite

# Skip dependency check
pac solution import --path solution.zip \
  --skip-dependency-check

# Activate plugins and workflows
pac solution import --path solution.zip \
  --activate-plugins
```

### Clone Solution

```bash
# Clone solution from environment
pac solution clone --name MySolution \
  --output-directory ./MySolution

# Clone and include all dependencies
pac solution clone --name MySolution \
  --output-directory ./MySolution \
  --include-dependencies
```

### Pack & Unpack Solution

```bash
# Unpack solution
pac solution unpack --zipfile solution.zip \
  --folder ./src \
  --packagetype Both

# Pack solution
pac solution pack --folder ./src \
  --zipfile solution.zip \
  --packagetype Both

# Pack with solution version
pac solution pack --folder ./src \
  --zipfile solution.zip \
  --packagetype Managed \
  --solution-version 1.0.0.1
```

### Upgrade Solution

```bash
# Upgrade solution (apply changes and delete old solution)
pac solution upgrade --solution-name MySolution

# Stage for upgrade (don't delete old version)
pac solution import --path solution.zip --stage-and-upgrade
```

### Add Components to Solution

```bash
# Add table to solution
pac solution add-solution-component \
  --solutionUniqueName MySolution \
  --component contact \
  --componentType 1

# Add form to solution
pac solution add-solution-component \
  --solutionUniqueName MySolution \
  --component <form-guid> \
  --componentType 60

# Add with dependencies
pac solution add-solution-component \
  --solutionUniqueName MySolution \
  --component contact \
  --componentType 1 \
  --addRequiredComponents
```

**Component Types** (most common):
- 1: Entity/Table
- 2: Attribute/Column
- 9: Option Set
- 20: Security Role
- 29: Process (Workflow)
- 60: System Form
- 61: Web Resource
- 62: Chart
- 80: Model-driven App
- 300: Canvas App

---

## Application Management

### List Applications

```bash
# List all applications in tenant
pac application list

# List applications in environment
pac application list --environment-id <env-id>

# Save list as JSON
pac application list --output applicationslist.json
```

### Install Applications

```bash
# Install application
pac application install \
  --environment-id <env-id> \
  --application-name MSFT_EmployeeIdeas

# Install multiple applications from JSON file
pac application install \
  --environment-id <env-id> \
  --application-list applicationslist.json
```

---

## Data Management

**Note**: These commands are only available in the .NET Full Framework version of PAC CLI (Windows MSI installation).

### Export Data

```bash
# Export data using schema file
pac data export --schemaFile schema.xml \
  --dataFile data.zip

# Export with overwrite
pac data export --schemaFile schema.xml \
  --dataFile data.zip \
  --overwrite

# Export to specific environment
pac data export --schemaFile schema.xml \
  --dataFile data.zip \
  --environment <env-url>

# Verbose output
pac data export --schemaFile schema.xml \
  --dataFile data.zip \
  --verbose
```

### Import Data

```bash
# Import data
pac data import --dataFile data.zip

# Import with parallel connections (max 5)
pac data import --dataFile data.zip \
  --parallel-connections 5

# Import to specific environment
pac data import --dataFile data.zip \
  --environment <env-url>

# Verbose import
pac data import --dataFile data.zip --verbose
```

**Important Notes**:
- Schema files are created using Configuration Migration Tool
- These commands handle configuration data (not large volumes)
- Default parallel connections: 5
- Data file must be in .zip format

---

## Tool Management

```bash
# List available tools
pac tool list

# Launch Power Platform Admin Center
pac tool paportal

# Launch Configuration Migration Tool
pac tool cmt

# Launch Package Deployer
pac tool pd

# Launch Plug-in Registration Tool
pac tool prt

# Update tool to latest version
pac tool cmt --update
pac tool pd --update
pac tool prt --update

# Clear tool cache
pac tool cmt --clear
```

---

## Plugin Management

### Create Plugin Project

```bash
# Initialize plugin project
pac plugin init

# Build plugin
dotnet build

# Deploy plugin to environment
pac plugin push
```

---

## PCF (Power Apps Component Framework) Commands

### Initialize PCF Component

```bash
# Create field component (HTML)
pac pcf init --namespace SampleNameSpace \
  --name SampleComponent \
  --template field

# Create field component with React
pac pcf init --namespace SampleNameSpace \
  --name SampleComponent \
  --template field \
  --framework react

# Create dataset component
pac pcf init --namespace SampleNameSpace \
  --name DatasetComponent \
  --template dataset

# Auto-run npm install
pac pcf init --namespace SampleNameSpace \
  --name SampleComponent \
  --template field \
  --run-npm-install
```

### Build PCF Component

```bash
# Build for production
npm run build

# Build and watch for changes
npm start watch

# Build with version update
pac pcf version
```

### Push PCF Component

```bash
# Push component to environment
pac pcf push --publisher-prefix dev

# Push to specific environment
pac pcf push --publisher-prefix dev \
  --environment <env-id>
```

---

## Power Pages Commands

**Note**: `pac paportal` is being deprecated in favor of `pac pages` (as of version 1.27+).

### List Power Pages Sites

```bash
# List all sites
pac pages list

# List with verbose output
pac pages list -v
```

### Download Site Content

```bash
# Download site content
pac pages download \
  --path c:\portals\downloads \
  --id d44574f9-acc3-4ccc-8d8d-85cf5b7ad141 \
  --modelVersion 2

# Download using standard data model (model 1)
pac pages download \
  --path c:\portals\downloads \
  --id <site-id> \
  --modelVersion 1
```

### Upload Site Content

```bash
# Upload changes
pac pages upload \
  --path c:\portals\downloads\custom-portal \
  --modelVersion 2

# Upload specific folder
pac pages upload \
  --path c:\portals\downloads\custom-portal \
  --modelVersion 2 \
  --deploymentProfile Production
```

**Important Notes**:
- Model version 1: Standard data model
- Model version 2: Enhanced data model
- Use `pac pages list -v` to check which model your site uses
- Only changed content is uploaded

---

## Connector Management

### List Connectors

```bash
# List all custom connectors in environment
pac connector list

# List with environment ID
pac connector list --environment <env-id>
```

### Download Connector

```bash
# Download connector definition
pac connector download \
  --connector-id <connector-id> \
  --environment <env-id>
```

### Create/Update Connector

```bash
# Create custom connector from OpenAPI definition
pac connector create \
  --settings-file apiProperties.json \
  --api-definition-file apiDefinition.swagger.json \
  --icon icon.png

# Update existing connector
pac connector update \
  --connector-id <connector-id> \
  --settings-file apiProperties.json \
  --api-definition-file apiDefinition.swagger.json
```

### Validate Connector

```bash
# Validate connector definition
pac connector validate \
  --api-definition-file apiDefinition.swagger.json
```

---

## Governance & Auditing Use Cases

### Audit Inactive Flows

```bash
# Export all flows, then parse for last run date
pac solution export --path flows.zip --name FlowsSolution
```

### List All Environments

```bash
# Get environment inventory
pac admin list --json > environments.json
```

### Check Solution Dependencies

```bash
# Clone solution to check dependencies
pac solution clone --name MySolution --output-directory ./MySolution
```

### Bulk Operations

```bash
# Backup all production environments
$envs = pac admin list --type Production --json | ConvertFrom-Json
foreach ($env in $envs) {
    pac admin backup --environment $env.id --label "Automated Backup $(Get-Date -Format 'yyyy-MM-dd')"
}
```

---

## Advanced Features

### Solution Checker

```bash
# Run solution checker
pac solution check --path solution.zip

# Check with specific ruleset
pac solution check --path solution.zip \
  --ruleset Solution-Checker-Rules

# Save results
pac solution check --path solution.zip \
  --output-directory ./results
```

### Deployment Profiles

Create `deploymentprofiles/Production.json`:

```json
{
  "EnvironmentVariables": [
    {
      "SchemaName": "env_ApiEndpoint",
      "Value": "https://api.production.com"
    }
  ],
  "ConnectionReferences": [
    {
      "LogicalName": "cr_SharedSQL",
      "ConnectionId": "00000000-0000-0000-0000-000000000000",
      "ConnectorId": "/providers/Microsoft.PowerApps/apis/shared_sql"
    }
  ]
}
```

Then import with:

```bash
pac solution import --path solution.zip \
  --settings-file deploymentprofiles/Production.json
```

---

## API Limits & Best Practices

### Rate Limits

- **Service Protection Limits**: 6,000 requests per 5 minutes per user
- **Concurrent Requests**: Maximum 52 concurrent requests
- **Execution Time**: 2-minute timeout per request

### Best Practices

1. **Use Service Principal for automation** (avoid interactive auth)
2. **Implement retry logic** for rate limit errors (429)
3. **Use `--async` flag** for long-running operations
4. **Cache auth profiles** (don't recreate for each command)
5. **Use `--environment` parameter** to avoid switching profiles
6. **Export to JSON** for programmatic parsing
7. **Test in sandbox environments first**
8. **Use solution checker** before deploying to production

### Error Handling

```powershell
# PowerShell example with error handling
try {
    pac solution import --path solution.zip --async
    if ($LASTEXITCODE -ne 0) {
        throw "Solution import failed with exit code $LASTEXITCODE"
    }
} catch {
    Write-Error "Error: $_"
    # Implement retry or notification logic
}
```

---

## Common PAC CLI Patterns for Governance

### Pattern 1: Environment Inventory Report

```bash
# Export all environment data
pac admin list --json > environments.json

# Parse and analyze (use PowerShell or Python)
```

### Pattern 2: Daily Solution Backup

```bash
# Backup critical solutions daily
pac auth select --index 1
pac solution export --path "backup-$(Get-Date -Format 'yyyy-MM-dd').zip" \
  --name CriticalSolution \
  --managed true \
  --async
```

### Pattern 3: Promote Solution Across Environments

```bash
# Dev -> Test -> Prod pipeline
pac auth select --name Dev
pac solution export --path solution.zip --name MySolution

pac auth select --name Test
pac solution import --path solution.zip --publish-changes

# After testing
pac auth select --name Prod
pac solution import --path solution.zip --publish-changes
```

### Pattern 4: Audit Custom Connectors

```bash
# List all connectors
pac connector list --json > connectors.json

# Analyze for premium/standard connectors
```

---

## Endpoint Configuration

Available endpoints:
- `prod` (default): Public cloud
- `preview`: Preview cloud
- `tip1`, `tip2`: Test environments
- `usgov`: GCC Moderate
- `usgovhigh`: GCC High
- `dod`: GCC DOD
- `china`: China cloud

```bash
# Example: Connect to GCC High
pac auth create --endpoint usgovhigh --environment <env-id>
```

---

## Troubleshooting

### Common Issues

1. **"Authorization failed"**
   - Ensure user has admin rights
   - Verify environment ID is correct
   - Re-authenticate: `pac auth clear && pac auth create`

2. **"Environment not found"**
   - Use environment GUID, not display name
   - Verify environment exists: `pac admin list`

3. **"Solution import failed"**
   - Check dependencies: `pac solution online-version`
   - Verify environment has required solutions
   - Review import log in target environment

4. **"Rate limit exceeded"**
   - Implement delays between requests
   - Use async operations
   - Switch to service principal authentication

### Diagnostic Commands

```bash
# Check PAC CLI version
pac

# Verify authentication
pac auth list

# Test environment connection
pac admin list --environment <env-id>

# Check solution dependencies
pac solution online-version --solution-name MySolution
```

---

## Version History & Updates

### Version 1.30.3+ (Current - October 2025)
- Enhanced `pac code` commands (Preview)
- Improved async operation handling
- Better error messages
- Performance improvements

### Recommended Update Frequency
- Check for updates monthly
- Update before major deployments
- Test in dev environment after updating

```bash
# Update PAC CLI (.NET Tool)
dotnet tool update --global Microsoft.PowerApps.CLI.Tool

# Update PowerShell modules
Update-Module -Name Microsoft.PowerApps.Administration.PowerShell
Update-Module -Name Microsoft.PowerApps.PowerShell
```

---

## Additional Resources

- **Official Documentation**: https://learn.microsoft.com/power-platform/developer/cli/
- **GitHub Discussions**: https://github.com/microsoft/powerplatform-build-tools/discussions
- **Power Platform Admin Center**: https://admin.powerplatform.microsoft.com/
- **CoE Starter Kit**: https://github.com/microsoft/coe-starter-kit

---

*Last Updated: October 2025*
*Based on PAC CLI Version 1.30.3 and Microsoft Learn documentation*
