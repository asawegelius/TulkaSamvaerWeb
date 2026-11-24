/**
 * Types for the API contract in `api/openapi.yaml`.
 *
 * `schema.d.ts` is generated: run `npm run api:types` after changing the contract.
 * A changed field then breaks the build instead of the running app.
 */
import type { components } from './schema';

export type ApiSchemas = components['schemas'];
