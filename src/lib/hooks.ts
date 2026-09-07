"use client";

import { useEffect, useState } from "react";
import { ApiError } from "@/lib/api/client";

interface FetchState<T> {
  data: T | null;
  error: string | null;
  loading: boolean;
  reload: () => void;
}

// Runs `fn` on mount and whenever the serialized `deps` changes, tracking
// loading/error state for the common "GET a list, render a table" page shape.
export function useApiResource<T>(fn: () => Promise<T>, deps: unknown[] = []): FetchState<T> {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [tick, setTick] = useState(0);
  const depsKey = JSON.stringify(deps);

  useEffect(() => {
    // One-shot fetch triggered by mount or a dependency change — the
    // conventional data-fetching-in-effect shape, not a render loop.
    /* eslint-disable react-hooks/set-state-in-effect */
    let cancelled = false;
    setLoading(true);
    setError(null);
    fn()
      .then((result) => {
        if (!cancelled) setData(result);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof ApiError ? String(err.detail ?? err.message) : "Something went wrong.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
    /* eslint-enable react-hooks/set-state-in-effect */
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [depsKey, tick]);

  return { data, error, loading, reload: () => setTick((t) => t + 1) };
}
