// Triggers the protected Power Automate flow via the custom connector.
// Replace `YourConnectorService` / `YourConnectorModel` with the names emitted
// by `pac code add-data-source -a "shared_yourconnector" -c "<connectionId>"`.
//
// The connector runtime surfaces 401/403 / timeouts as ConnectorError instances
// with a `.message` field — fine to present directly to the user. Always
// generate a correlation ID per click so you can match client and flow run.

import { useState } from "react";
import { YourConnectorService } from "../Services/YourConnectorService";
import type {
  TriggerFlowRequest,
  TriggerFlowResponse,
} from "../Models/YourConnectorModel";

interface Props {
  accountId: string;
}

export const InvokeFlowButton: React.FC<Props> = ({ accountId }) => {
  const [busy, setBusy] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const handleClick = async (): Promise<void> => {
    setBusy(true);
    setError(null);

    const req: TriggerFlowRequest = {
      accountId,
      source: "code-app",
      correlationId: crypto.randomUUID(),
    };

    try {
      const result: TriggerFlowResponse = await YourConnectorService.TriggerFlow(req);
      console.info("Flow run id:", result.runId);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <button onClick={handleClick} disabled={busy}>
        {busy ? "Running…" : "Run flow"}
      </button>
      {error && (
        <div role="alert" style={{ color: "crimson" }}>
          {error}
        </div>
      )}
    </>
  );
};
