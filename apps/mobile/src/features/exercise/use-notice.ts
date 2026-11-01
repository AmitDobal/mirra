import { useCallback, useEffect, useState } from "react";

/** Short-lived inline message (clears itself after `ms`). */
export const useNotice = (ms = 3200) => {
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    if (!notice) return;
    const id = setTimeout(() => setNotice(null), ms);
    return () => clearTimeout(id);
  }, [notice, ms]);

  const show = useCallback((message: string) => setNotice(message), []);
  return { notice, show };
};
