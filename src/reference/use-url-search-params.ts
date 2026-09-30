import { useCallback, useEffect, useState } from "react";

export function useUrlSearchParams(): [
  URLSearchParams,
  (next: URLSearchParams, options?: { replace?: boolean }) => void,
] {
  const [serialized, setSerialized] = useState(() => window.location.search);

  useEffect(() => {
    const sync = () => setSerialized(window.location.search);
    window.addEventListener("popstate", sync);
    return () => window.removeEventListener("popstate", sync);
  }, []);

  const update = useCallback((next: URLSearchParams, options?: { replace?: boolean }) => {
    const query = next.toString();
    const url = `${window.location.pathname}${query ? `?${query}` : ""}`;
    if (options?.replace === false) window.history.pushState(null, "", url);
    else window.history.replaceState(null, "", url);
    window.dispatchEvent(new PopStateEvent("popstate"));
  }, []);

  return [new URLSearchParams(serialized), update];
}
