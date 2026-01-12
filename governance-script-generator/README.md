# Power Platform Governance Script Generator - Skill Package

## Overview

This skill enables Claude to generate production-ready PowerShell and PAC CLI scripts for Power Platform governance and administration tasks.

## Package Contents

```
governance-script-generator/
├── SKILL.md (12,500 words)
├── README.md (this file)
└── references/
    ├── pac-cli-reference.md (16,200 words)
    ├── powershell-reference.md (19,800 words)
    └── governance-patterns.md (12,100 words)
```

**Total Documentation**: ~60,600 words

## What This Skill Does

The skill translates natural language governance requirements into robust, production-ready scripts that:
- Audit Power Platform resources (apps, flows, environments, connectors)
- Detect and remediate orphaned or inactive resources
- Monitor capacity and license usage
- Enforce DLP policies and compliance
- Automate environment lifecycle management
- Generate governance reports and dashboards
- Implement CoE Starter Kit patterns

## Key Features

### Intelligent Tool Selection
- Automatically chooses between PAC CLI and PowerShell based on the task
- Hybrid approach for complex scenarios
- Clear decision matrix included

### Production-Ready Scripts
- Comprehensive error handling with retry logic
- Detailed logging to both console and file
- Dry-run mode for safe testing
- Progress indicators for long operations
- Rate limiting and throttling support

### Safety Features
- Confirmation prompts for destructive actions
- Backup strategies
- Rollback capabilities
- Phased rollout support

### Documentation
- Complete parameter descriptions
- Usage examples
- Scheduling instructions (Azure Automation, Task Scheduler)
- Troubleshooting guides

## Reference Documentation

### 1. PAC CLI Reference (16,200 words)
Complete reference for Microsoft Power Platform CLI including:
- All commands and parameters (as of version 1.30.3+)
- Authentication methods
- Environment, solution, and data management
- Tool management and PCF commands
- Power Pages and connector operations
- Governance use cases and patterns
- Error handling and troubleshooting

### 2. PowerShell Reference (19,800 words)
Comprehensive PowerShell cmdlet reference including:
- Module installation and authentication
- Environment and capacity management
- Power Apps, Power Automate, and connector cmdlets
- DLP policy management
- User and permission management
- Advanced governance scripts (5+ complete examples)
- Error handling, retry logic, and best practices

### 3. Governance Patterns (12,100 words)
Common governance scenarios with complete implementations:
- New environment provisioning workflow
- Orphaned resource detection and reassignment
- Capacity monitoring with alerting
- Inactive resource cleanup
- Connector usage auditing
- DLP policy compliance checking
- Environment lifecycle management
- Automation strategies (Azure Automation, Task Scheduler, Power Automate)

## Installation

### For Claude Projects

1. **Upload to Claude**:
   - Extract the zip file
   - Upload the entire `governance-script-generator` folder to your Claude project

2. **Reference in Prompts**:
   ```
   Using the Power Platform Governance Script Generator skill,
   create a script to [your governance requirement]
   ```

### For Claude.ai (Non-Project)

1. **Reference the skill**:
   ```
   I need a Power Platform governance script for [requirement].
   Please use the governance script generator approach.
   ```

2. **Claude will automatically**:
   - Read the appropriate reference documentation
   - Apply best practices
   - Generate production-ready code

## Usage Examples

### Example 1: Simple Audit

**Prompt**:
```
Create a script to list all Power Apps not modified in the last 6 months
```

**Claude will generate**:
- Complete PowerShell script with error handling
- CSV export functionality
- Usage instructions and scheduling guidance

### Example 2: Complex Cleanup

**Prompt**:
```
I need to disable all flows that haven't run in 90 days in sandbox environments,
but only after sending a notification to the flow owners
```

**Claude will generate**:
- Multi-stage PowerShell script
- Email notification logic
- Dry-run mode for testing
- Owner lookup and notification
- Comprehensive logging

### Example 3: Monitoring Setup

**Prompt**:
```
Set up automated capacity monitoring with email alerts when any production
environment exceeds 80% capacity for database or file storage
```

**Claude will generate**:
- Capacity checking script
- Alert threshold logic
- HTML email template
- Azure Automation configuration
- Daily scheduling instructions

### Example 4: Compliance Enforcement

**Prompt**:
```
Create a weekly audit script that checks if all environments have the
"Corporate-DLP-Policy" applied and automatically applies it if missing
```

**Claude will generate**:
- DLP policy compliance checker
- Auto-remediation logic
- Exception handling for special environments
- Audit report generation
- Scheduling for weekly execution

## Script Features

All generated scripts include:

### Core Functionality
- ✅ Parameter validation
- ✅ Prerequisites checking
- ✅ Authentication handling
- ✅ Error handling with retry logic
- ✅ Rate limiting protection
- ✅ Progress indicators
- ✅ Detailed logging (console + file)

### Safety Features
- ✅ Dry-run mode (`-DryRun` parameter)
- ✅ Confirmation prompts for destructive actions
- ✅ Backup creation before modifications
- ✅ Rollback capabilities
- ✅ Validation before execution

### Reporting
- ✅ CSV export of results
- ✅ Summary statistics
- ✅ Email notifications (optional)
- ✅ Audit trail logging

### Documentation
- ✅ Synopsis and description
- ✅ Parameter documentation
- ✅ Usage examples
- ✅ Prerequisites list
- ✅ Scheduling instructions
- ✅ Troubleshooting tips

## Prerequisites

### For Generated Scripts

**Software Requirements**:
- Windows PowerShell 5.1+ (not compatible with PowerShell Core 6.0+)
- PAC CLI (optional, for PAC CLI-based scripts)

**PowerShell Modules**:
```powershell
Install-Module -Name Microsoft.PowerApps.Administration.PowerShell
Install-Module -Name Microsoft.PowerApps.PowerShell -AllowClobber
```

**Permissions**:
- Power Platform Administrator or Dynamics 365 Administrator role
- First-time sign-in to Power Platform admin center (https://admin.powerplatform.microsoft.com)

**Licenses**:
- Power Apps Per User license (non-trial)
- Power Automate Per User or Per Flow license (for flow operations)

## Best Practices

### When to Use This Skill

**Ideal for**:
- Automating repetitive governance tasks
- Creating custom governance workflows
- Implementing CoE Starter Kit patterns
- Building tenant-specific governance solutions
- Generating audit and compliance reports

**Not ideal for**:
- One-time manual operations (use admin portal)
- Real-time interactive troubleshooting
- Ad-hoc data queries (use Power BI for CoE Kit)

### Script Development Workflow

1. **Start with dry-run**: Always test scripts in dry-run mode first
2. **Test in sandbox**: Run against non-production environments initially
3. **Small batches**: Test with limited scope before full tenant execution
4. **Monitor first run**: Watch the first execution closely
5. **Automate gradually**: Start with manual execution, then automate

### Security Best Practices

- **Never** hardcode credentials in scripts
- **Always** use service principals for automation
- **Store** credentials in Azure Key Vault
- **Implement** least privilege access
- **Rotate** credentials regularly
- **Audit** script execution
- **Review** generated scripts before execution

## Scheduling Scripts

### Azure Automation (Recommended)

**Advantages**:
- Cloud-based execution
- Managed identity support
- Built-in scheduling
- Execution history
- Email integration

**Setup**:
1. Create Azure Automation Account
2. Import PowerShell modules
3. Create runbook from generated script
4. Set up schedule
5. Configure alerts

### Windows Task Scheduler

**Advantages**:
- No additional cost
- Local execution
- Simple setup

**Setup**:
1. Save script to local path
2. Create scheduled task
3. Set trigger (daily, weekly, etc.)
4. Configure credentials

### Power Automate

**Advantages**:
- Native Power Platform integration
- Easy notification setup
- No infrastructure required

**Use for**:
- Email notifications
- Teams notifications
- Approval workflows
- Simple recurring tasks

## Troubleshooting

### Common Issues

**"Module not found"**:
```powershell
Install-Module -Name Microsoft.PowerApps.Administration.PowerShell -Force
```

**"Authentication failed"**:
- Verify user has admin role
- Complete first-time sign-in to admin center
- Re-authenticate: `Add-PowerAppsAccount`

**"Rate limit exceeded"**:
- Scripts include automatic retry logic
- Add delays between bulk operations
- Use parallel processing with throttle limits

**"Permission denied"**:
- Verify Power Platform Administrator role
- Check environment-specific permissions
- Ensure first-time admin center sign-in completed

### Getting Help

- **Microsoft Learn**: https://learn.microsoft.com/power-platform/
- **CoE Starter Kit**: https://github.com/microsoft/coe-starter-kit
- **Community Forums**: https://powerusers.microsoft.com/
- **GitHub Issues**: For skill-specific feedback

## Governance Metrics Dashboard

Generated scripts can feed into dashboards tracking:

**Environment Health**:
- Environment count by type
- DLP policy coverage
- Capacity utilization
- Creation rate trends

**Resource Health**:
- App/flow/bot counts
- Orphaned resources
- Inactive resources
- Solution adoption rate

**Compliance**:
- Policy violations
- Remediation status
- Audit findings
- License compliance

**Adoption**:
- Active maker count
- New resources per month
- Connector usage trends
- Training completion

## Version History

### Version 1.0 (October 2025)
- Initial release
- PAC CLI support (version 1.30.3+)
- PowerShell support (module version 2.0+)
- 7 common governance scenarios
- 60,600 words of documentation
- Production-ready script templates

## Contributing

This skill is based on:
- Microsoft Learn official documentation (October 2025)
- CoE Starter Kit best practices
- Power Platform community patterns
- Real-world governance implementations

## License

This skill package is provided as-is for use with Claude AI. The generated scripts follow Microsoft Power Platform terms of service and licensing requirements.

## Support

For questions about:
- **The skill itself**: Reference the documentation in this package
- **Power Platform**: Microsoft Learn and support channels
- **CoE Starter Kit**: GitHub repository and community
- **Script issues**: Review troubleshooting section and Microsoft documentation

---

**Generated**: October 2025  
**Documentation Size**: ~60,600 words  
**Based on**: PAC CLI 1.30.3+, PowerShell Module 2.0+, Microsoft Learn (Oct 2025)  
**Quality**: Production-ready, tested patterns, comprehensive error handling
