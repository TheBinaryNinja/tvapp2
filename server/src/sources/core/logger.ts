// Tiny tagged logger matching the existing console style ("[mongo] connected", "[api] …").
// Ported from d-combine/lib/core/logger.mjs, trimmed to what the core uses.

type Level = 'info' | 'warn' | 'error' | 'ok';

function emit(level: Level, tag: string, msg: string): void {
  const line = `[${tag}] ${msg}`;
  if (level === 'error') console.error(line);
  else if (level === 'warn') console.warn(line);
  else console.info(line);
}

export const logger = {
  info: (tag: string, msg: string) => emit('info', tag, msg),
  warn: (tag: string, msg: string) => emit('warn', tag, msg),
  error: (tag: string, msg: string) => emit('error', tag, msg),
  ok: (tag: string, msg: string) => emit('ok', tag, msg),
};
