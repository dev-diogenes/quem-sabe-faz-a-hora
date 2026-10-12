import { useEffect, useState } from "react";
import { onStorageChange } from "./storage";

/** Lê um valor do chrome.storage e se mantém atualizado quando ele muda. */
export function useStored<T>(key: string, load: () => Promise<T>, initial: T): T {
  const [value, setValue] = useState<T>(initial);
  useEffect(() => {
    const refresh = () => void load().then(setValue);
    refresh();
    return onStorageChange(key, refresh);
  }, [key]);
  return value;
}
