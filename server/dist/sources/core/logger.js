// Tiny tagged logger matching the existing console style ("[mongo] connected", "[api] …").
// Ported from d-combine/lib/core/logger.mjs, trimmed to what the core uses.
function emit(level, tag, msg) {
    const line = `[${tag}] ${msg}`;
    if (level === 'error')
        console.error(line);
    else if (level === 'warn')
        console.warn(line);
    else
        console.info(line);
}
export const logger = {
    info: (tag, msg) => emit('info', tag, msg),
    warn: (tag, msg) => emit('warn', tag, msg),
    error: (tag, msg) => emit('error', tag, msg),
    ok: (tag, msg) => emit('ok', tag, msg),
};
//# sourceMappingURL=logger.js.map