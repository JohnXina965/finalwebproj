import { useEffect, useRef } from 'react';

// Simple debounced auto-draft hook
// saveFn: async function to persist draft (e.g., HostContext.saveAsDraft)
// deps: array of values to watch; when any changes, debounce save
// enabled: boolean to toggle autosave on/off
// minDelayMs: debounce delay
export default function useAutoDraft({ saveFn, deps = [], enabled = true, minDelayMs = 1200 }) {
  const timeoutRef = useRef(null);
  const lastSerializedRef = useRef('');

  useEffect(() => {
    if (!enabled || typeof saveFn !== 'function') return;

    // Serialize deps to detect meaningful change
    let serialized = '';
    try {
      serialized = JSON.stringify(deps);
    } catch (e) {
      // Fallback: always attempt
      serialized = String(Date.now());
    }

    if (serialized === lastSerializedRef.current) return;
    lastSerializedRef.current = serialized;

    // debounce
    clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(async () => {
      try {
        await saveFn();
        // Optionally, toast/snackbar could be triggered by caller
      } catch (e) {
        // Silent fail; UI can still use manual Save as Draft
      }
    }, minDelayMs);

    return () => clearTimeout(timeoutRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, minDelayMs, saveFn, ...deps]);
}


