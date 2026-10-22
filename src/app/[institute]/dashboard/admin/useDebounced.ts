import { useEffect, useState } from "react";

// A value that only updates after it has stopped changing for `ms` — so typing in a
// search box doesn't fire a request on every keystroke.
export function useDebounced<T>(value: T, ms = 300): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return debounced;
}
