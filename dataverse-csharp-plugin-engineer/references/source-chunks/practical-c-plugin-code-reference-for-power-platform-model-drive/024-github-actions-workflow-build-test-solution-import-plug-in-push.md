# GitHub Actions workflow (build → test → solution import → plug-in push)

- Source file: `dataverse-csharp-plugin-engineer/references/raw-sources/Practical C# plugin code reference for Power Platform model-driven apps for early 2026.md`
- Source lines: 1236-1313
- Parent headings: Generate strong-name key (sn.exe is part of the Strong Name Tool) > CI/CD code reference

---

### GitHub Actions workflow (build → test → solution import → plug-in push)

This is a plug-in–centric variant built on top of Microsoft’s action input names (notably `environment-url`, `app-id`, `tenant-id`, `client-secret`). citeturn30view0turn1search19

```yaml
name: deploy-dataverse-plugins

on:
  workflow_dispatch:

env:
  DOTNET_NOLOGO: true
  NUGET_XMLDOC_MODE: skip

  # Update these in repo settings or environments
  ENVIRONMENT_URL: ${{ secrets.PP_ENVIRONMENT_URL }}
  TENANT_ID: ${{ secrets.PP_TENANT_ID }}
  CLIENT_ID: ${{ secrets.PP_CLIENT_ID }}
  # Client secret stored as GitHub secret (Microsoft tutorial uses "PowerPlatformSPN")
  CLIENT_SECRET: ${{ secrets.PowerPlatformSPN }}

jobs:
  build_test_deploy:
    runs-on: windows-latest
    steps:
      - uses: actions/checkout@v4

      - name: setup .net
        uses: actions/setup-dotnet@v4
        with:
          dotnet-version: '8.0.x'

      - name: restore
        run: dotnet restore

      - name: build
        run: dotnet build --configuration Release --no-restore

      - name: test
        run: dotnet test --configuration Release --no-build --collect:"XPlat Code Coverage"

      # Optional: pack plugin project into nupkg (plugin package / dependent assemblies)
      - name: pack plugin package
        run: dotnet pack .\src\Contoso.Plugins\Contoso.Plugins.csproj --configuration Release --no-build --output .\out\nupkg

      - name: who-am-i
        uses: microsoft/powerplatform-actions/who-am-i@v0
        with:
          environment-url: ${{ env.ENVIRONMENT_URL }}
          app-id: ${{ env.CLIENT_ID }}
          client-secret: ${{ env.CLIENT_SECRET }}
          tenant-id: ${{ env.TENANT_ID }}

      # Preferred: import solution that already includes plug-in assembly + steps
      - name: import solution
        uses: microsoft/powerplatform-actions/import-solution@v0
        with:
          environment-url: ${{ env.ENVIRONMENT_URL }}
          app-id: ${{ env.CLIENT_ID }}
          client-secret: ${{ env.CLIENT_SECRET }}
          tenant-id: ${{ env.TENANT_ID }}
          solution-file: .\out\solution\Contoso.Managed.zip
          force-overwrite: true
          publish-changes: true
          activate-plugins: true

      # Alternative / supplement: push plugin package directly (requires pluginId from Dataverse)
      # Uses pac plugin push conceptually; the command group exists and supports --type Nuget. citeturn12view0
      # - name: pac plugin push (optional)
      #   run: pac plugin push --pluginId ${{ secrets.DATAVERSE_PLUGINPACKAGE_ID }} --type Nuget --pluginFile .\out\nupkg\Contoso.Plugins.1.0.0.nupkg
```

Notes backed by sources:

- `import-solution` action supports `activate-plugins`, `publish-changes`, and other inputs. citeturn1search19  
- Authentication pattern (service principal secret, `who-am-i` action inputs) is shown in Microsoft’s Power Platform Actions Lab sample YAML. citeturn30view0turn28view0  
- `pac plugin push` exists and accepts `--pluginId` and type `Nuget`/`Assembly`. citeturn12view0
