# Test project .csproj template (FakeXrmEasy v3+)

- Source file: `dataverse-csharp-plugin-engineer/references/raw-sources/Practical C# plugin code reference for Power Platform model-driven apps for early 2026.md`
- Source lines: 168-201
- Parent headings: Generate strong-name key (sn.exe is part of the Strong Name Tool)

---

### Test project `.csproj` template (FakeXrmEasy v3+)

FakeXrmEasy plugin helpers (`FakeXrmEasy.Plugins.v9`) target **.NET 8**, so tests should target **net8.0**. citeturn7view0

```xml
<Project Sdk="Microsoft.NET.Sdk">

  <PropertyGroup>
    <TargetFramework>net8.0</TargetFramework>
    <LangVersion>latest</LangVersion>
    <Nullable>enable</Nullable>
    <IsPackable>false</IsPackable>
  </PropertyGroup>

  <ItemGroup>
    <ProjectReference Include="..\..\src\Contoso.Plugins\Contoso.Plugins.csproj" />

    <PackageReference Include="FakeXrmEasy.Core.v9" Version="3.8.0" />
    <PackageReference Include="FakeXrmEasy.Plugins.v9" Version="3.8.1" />
    <PackageReference Include="FakeXrmEasy.Messages.v9" Version="3.8.0" />

    <PackageReference Include="Microsoft.NET.Test.Sdk" Version="18.0.1" />
    <PackageReference Include="xunit" Version="2.9.3" />
    <PackageReference Include="xunit.runner.visualstudio" Version="3.1.5" />

    <PackageReference Include="coverlet.collector" Version="8.0.0" PrivateAssets="all" />
    <PackageReference Include="FluentAssertions" Version="8.8.0" />
  </ItemGroup>

</Project>
```

Version references: `Microsoft.NET.Test.Sdk` 18.0.1 citeturn16search3, `xunit.runner.visualstudio` 3.1.5 citeturn33search0, `coverlet.collector` 8.0.0 citeturn33search1, `FluentAssertions` 8.8.0 citeturn33search2.
