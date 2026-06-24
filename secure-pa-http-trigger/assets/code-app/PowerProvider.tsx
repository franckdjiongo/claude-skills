// Code App host bootstrap. Wraps the React tree, calls the Power Apps host's
// initialize() once, and gates render until the host is ready. Without this,
// generated connector services may run before the host has injected auth /
// connection context.

import { initialize } from "@microsoft/power-apps/app";
import { useEffect, useState, type PropsWithChildren } from "react";

export const PowerProvider: React.FC<PropsWithChildren> = ({ children }) => {
  const [ready, setReady] = useState<boolean>(false);

  useEffect(() => {
    (async () => {
      await initialize();
      setReady(true);
    })();
  }, []);

  if (!ready) {
    return <div>Loading Power Apps host…</div>;
  }

  return <>{children}</>;
};
