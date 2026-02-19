trigger:
- main

pool:
  vmImage: windows-latest

steps:
- task: UseDotNet@2
  displayName: Use .NET SDK 8.x
  inputs:
    packageType: sdk
    version: 8.x

- script: dotnet restore
  displayName: Restore

- script: dotnet build --configuration Release --no-restore
  displayName: Build

- script: dotnet test --configuration Release --no-build
  displayName: Test

- task: PublishBuildArtifacts@1
  displayName: Publish plugin artifacts
  inputs:
    PathtoPublish: '$(Build.SourcesDirectory)'
    ArtifactName: plugin-artifacts
