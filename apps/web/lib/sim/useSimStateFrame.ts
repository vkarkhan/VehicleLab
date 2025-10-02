import { useSyncExternalStore } from "react";

import { simStateBus, type SimStateFrame } from "./stateBus";

const subscribe = (onStoreChange: () => void) => {
  const unsubscribe = simStateBus.subscribe(() => {
    onStoreChange();
  }, false);
  return () => {
    if (typeof unsubscribe === "function") {
      unsubscribe();
    }
  };
};

const getSnapshot = () => simStateBus.getSnapshot();

export const useSimStateFrame = (): SimStateFrame | null => useSyncExternalStore(subscribe, getSnapshot, () => null);
