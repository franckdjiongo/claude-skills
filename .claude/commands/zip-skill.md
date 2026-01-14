---
allowed-tools: Bash(python:*)
argument-hint: <skill-folder-name>
description: Zip a skill folder for easy download
---

# Zip Skill Command

Create a downloadable .zip file of the specified skill folder.

!python scripts/zip_skill.py $ARGUMENTS

The zip file will be created in the `dist/` directory at the repository root.

After the command completes, provide the user with:
1. The path to the created zip file
2. The file size
3. Instructions on how to download it
