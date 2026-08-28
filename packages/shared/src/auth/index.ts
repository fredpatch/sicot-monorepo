// packages/shared/src/auth/index.ts
// Pure authorization primitives shared by client and server. No Express,
// no React, no DB imports here - see role-capabilities.ts for why.
export * from './roles';
export * from './capabilities';
export * from './role-capabilities';
