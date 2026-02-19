# Step registration parameter matrix

- Source file: `dataverse-csharp-plugin-engineer/references/raw-sources/C# plugin development for Dataverse - exhaustive technical reference.md`
- Source lines: 173-186
- Parent headings: C# plugin development for Dataverse: exhaustive technical reference > 4. Plugin registration reference

---

### Step registration parameter matrix

| Parameter | Values / Type | Notes |
|---|---|---|
| **Message** | Create, Update, Delete, Retrieve, RetrieveMultiple, Associate, Disassociate, Assign, SetState, GrantAccess, RevokeAccess, ModifyAccess, Merge, Route, Send, + Custom API messages | Full list in `SdkMessage` table; filter on `iscustomprocessingstepallowed = true` |
| **Primary Entity** | Entity logical name | Omit = fires for ALL entities supporting the message |
| **Secondary Entity** | Entity logical name | Rarely used; backward compatibility |
| **Filtering Attributes** | Comma-separated attribute names | **Update message only.** Fires when listed attributes are *present* in request (regardless of value change). Never include primary key. |
| **Stage** | 10 (PreValidation), 20 (PreOperation), 40 (PostOperation) | Stage 30 is internal only (Custom API/virtual tables) |
| **Execution Mode** | Synchronous, Asynchronous | Async available **only** at PostOperation (40) |
| **Execution Order** | Integer | Lower = earlier. Same value = non-deterministic order |
| **Run in User's Context** | Calling User (default) or specific user GUID | Controls `context.UserId` |
| **Deployment** | Server (default), Offline | Offline = Dynamics 365 for Outlook client |
