// The single enumeration of source adapters TVApp2 knows about. Ported from
// ../d-combine/sources/registry.mjs. Adding a source (Phase 2: common, Phase 3: dlhd) = write a new
// adapter under adapters/ and add it here; the boot init, sources router (manifest + proxy mounts),
// and SPA all iterate this list, so nothing else needs to change.

import duloAdapter from './adapters/dulo.js';
import type { SourceAdapter } from './types.js';

export const SOURCES: SourceAdapter[] = [duloAdapter];

export function getSource(id: string): SourceAdapter | undefined {
  return SOURCES.find((s) => s.id === id);
}
