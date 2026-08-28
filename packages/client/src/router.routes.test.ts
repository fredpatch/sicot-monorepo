// packages/client/src/router.routes.test.ts
//
// Verifies the actual route-guard wiring in router.tsx - not just the
// hasCapability() logic (already covered in packages/shared), but that
// each route is wired to the correct capability literal. This is the
// Phase 10.2 authorization-alignment fix's core assertion: a typo'd
// capability string in router.tsx (e.g. leaving /missions/new on
// MISSION_REGISTRY_VIEW) would pass every hasCapability() unit test yet
// still be wrong - only inspecting the real route tree catches that.
//
// Imports routeConfig, not router - router itself is createBrowserRouter's
// return value, which calls createBrowserHistory() eagerly and needs
// `document` (crashes in this package's plain node-environment vitest, no
// jsdom). routeConfig is the plain RouteObject[] produced by
// createRoutesFromElements(), with no DOM dependency - CapabilityRoute is
// used as `<CapabilityRoute capability="X">`, so `element.props.capability`
// is readable directly from it, enough to prove the wiring.
import { describe, it, expect } from 'vitest';
import type { ReactElement } from 'react';
import { routeConfig } from './router';

interface RouteLike {
  path?: string;
  element?: ReactElement;
  children?: RouteLike[];
}

function findRoute(
  path: string,
  routes: RouteLike[] = routeConfig as RouteLike[]
): RouteLike | undefined {
  for (const route of routes) {
    if (route.path === path) return route;
    if (route.children) {
      const found = findRoute(path, route.children);
      if (found) return found;
    }
  }
  return undefined;
}

function capabilityOf(route: RouteLike | undefined): unknown {
  return (route?.element?.props as { capability?: unknown } | undefined)?.capability;
}

describe('mission route guards (Phase 10.2 authorization-alignment fix)', () => {
  it('/missions and /missions/:id stay on MISSION_REGISTRY_VIEW (viewing routes, unchanged)', () => {
    expect(capabilityOf(findRoute('/missions'))).toBe('MISSION_REGISTRY_VIEW');
    expect(capabilityOf(findRoute('/missions/:id'))).toBe('MISSION_REGISTRY_VIEW');
  });

  it('/missions/new requires MISSION_MANAGE, not MISSION_REGISTRY_VIEW', () => {
    expect(capabilityOf(findRoute('/missions/new'))).toBe('MISSION_MANAGE');
  });

  it('/missions/:id/edit requires MISSION_MANAGE, not MISSION_REGISTRY_VIEW', () => {
    expect(capabilityOf(findRoute('/missions/:id/edit'))).toBe('MISSION_MANAGE');
  });
});
