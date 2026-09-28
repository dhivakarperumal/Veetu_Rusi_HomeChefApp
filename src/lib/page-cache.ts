import { useCallback, useState } from "react";
import type { Dispatch, SetStateAction } from "react";

const pageCache = new Map<string, unknown>();

export function hasCachedPageData(key: string): boolean {
  return pageCache.has(key);
}

export function getCachedPageData<T>(key: string): T | undefined {
  return pageCache.get(key) as T | undefined;
}

export function setCachedPageData<T>(key: string, data: T): void {
  pageCache.set(key, data);
}

export function deleteCachedPageData(key: string): void {
  pageCache.delete(key);
}

export function clearPageCache(): void {
  pageCache.clear();
}

export function usePageLoadingState(key: string): [boolean, (value: boolean) => void] {
  const [state, setState] = useState(() => ({
    key,
    loading: !hasCachedPageData(key),
  }));
  const loading =
    state.key === key ? state.loading : !hasCachedPageData(key);
  const setLoading = useCallback(
    (nextLoading: boolean) => setState({ key, loading: nextLoading }),
    [key],
  );

  return [loading, setLoading];
}

export function usePageCacheState<T>(
  key: string,
  initialValue: T,
): [T, Dispatch<SetStateAction<T>>] {
  const [state, setState] = useState(() => ({
    key,
    value: hasCachedPageData(key)
      ? (getCachedPageData<T>(key) as T)
      : initialValue,
  }));
  const value =
    state.key === key
      ? state.value
      : hasCachedPageData(key)
        ? (getCachedPageData<T>(key) as T)
        : initialValue;

  const setCachedValue = useCallback<Dispatch<SetStateAction<T>>>(
    (nextValue) => {
      setState((currentState) => {
        const currentValue =
          currentState.key === key
            ? currentState.value
            : hasCachedPageData(key)
              ? (getCachedPageData<T>(key) as T)
              : initialValue;
        const resolvedValue =
          typeof nextValue === "function"
            ? (nextValue as (previousValue: T) => T)(currentValue)
            : nextValue;
        setCachedPageData(key, resolvedValue);
        return { key, value: resolvedValue };
      });
    },
    [initialValue, key],
  );

  return [value, setCachedValue];
}