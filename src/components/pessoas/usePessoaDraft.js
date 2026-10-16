import { useEffect, useState } from "react";

// Only an in-memory comparison; no credentials or drafts are persisted.
export default function usePessoaDraft(key, value, onDirty) {
  const fingerprint = JSON.stringify(value);
  const [saved, setSaved] = useState(fingerprint);
  useEffect(() => {
    onDirty?.(key, fingerprint !== saved);
    return () => onDirty?.(key, false);
  }, [key, fingerprint, saved, onDirty]);
  return (next = value) => setSaved(JSON.stringify(next));
}
