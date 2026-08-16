import type { TContext } from '../../types.js'

const toJson = (inCtx: TContext): (() => TContext[]) => {
    const lastCtx = inCtx.hasOwnProperty('ctx') ? inCtx.ctx : inCtx
    return () => lastCtx.json
}

export { toJson }
