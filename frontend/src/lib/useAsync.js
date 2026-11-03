import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Runs an async loader (receives an AbortSignal) and tracks {data, error, loading}.
 * `reload()` re-runs it; `setData` allows optimistic updates.
 */
export function useAsync(loader, deps = []) {
  const [state, setState] = useState({ data: null, error: null, loading: true });
  const controller = useRef(null);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const load = useCallback(loader, deps);

  const run = useCallback(
    async ({ silent = false } = {}) => {
      controller.current?.abort();
      const ctrl = new AbortController();
      controller.current = ctrl;
      if (!silent) setState((s) => ({ ...s, loading: true, error: null }));
      try {
        const data = await load(ctrl.signal);
        if (!ctrl.signal.aborted) setState({ data, error: null, loading: false });
        return data;
      } catch (error) {
        if (error?.name === "AbortError" || ctrl.signal.aborted) return undefined;
        setState((s) => ({ ...s, error, loading: false }));
        return undefined;
      }
    },
    [load]
  );

  useEffect(() => {
    run();
    return () => controller.current?.abort();
  }, [run]);

  const setData = useCallback((updater) => {
    setState((s) => ({ ...s, data: typeof updater === "function" ? updater(s.data) : updater }));
  }, []);

  return { ...state, reload: run, setData };
}
