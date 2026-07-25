import { useEffect, useRef, useState } from 'react';

export interface AsyncState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

/**
 * Runs an async loader and tracks {data, loading, error}. `enabled` gates the
 * call (e.g. only when Supabase is configured / the user is authenticated).
 * `deps` re-runs the loader when they change. Guards against setState after
 * unmount and out-of-order responses.
 */
export function useAsync<T>(
  loader: () => Promise<T>,
  enabled: boolean = true,
  deps: unknown[] = [],
): AsyncState<T> {
  const [state, setState] = useState<AsyncState<T>>({ data: null, loading: enabled, error: null });
  const reqId = useRef(0);

  useEffect(() => {
    if (!enabled) {
      setState({ data: null, loading: false, error: null });
      return;
    }
    const id = ++reqId.current;
    setState((s) => ({ ...s, loading: true, error: null }));
    loader()
      .then((data) => { if (id === reqId.current) setState({ data, loading: false, error: null }); })
      .catch((e) => {
        if (id === reqId.current) {
          setState({ data: null, loading: false, error: e instanceof Error ? e.message : 'Load failed' });
        }
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, ...deps]);

  return state;
}
