// packages/client/src/hooks/useContextualHelp.ts
import { useLocation } from 'react-router-dom';
import { useAuth } from '@/App';
import { getHelpEntry, filterHelpEntry, type HelpEntry } from '@/lib/help/help-map';

/** Resolves the current route to its help-map entry, capability-filtered for the signed-in user. Returns undefined when the route has no contextual help — callers render the generic fallback in that case. */
export function useContextualHelp(): HelpEntry | undefined {
  const { pathname } = useLocation();
  const { user } = useAuth();

  const entry = getHelpEntry(pathname);
  if (!entry) return undefined;

  const filtered = filterHelpEntry(entry, user?.role);
  return filtered.sections.length > 0 ? filtered : undefined;
}
