import { CoreClass } from './core/coreClass.js'
import { EventEmitterClass } from './core/eventEmitterClass.js'
import { MemoryDB } from './db/index.js'
import { LIST_ALL as EVENTS } from './io/events/index.js'
import FlowClass from './io/flowClass.js'
import { addAnswer } from './io/methods/addAnswer.js'
import { addKeyword } from './io/methods/addKeyword.js'
import { ProviderClass } from './provider/interface/provider.js'
import { TestProvider } from './provider/providerMock.js'
import type { GeneralArgs, TFlow } from './types.js'
import * as utils from './utils/index.js'

/**
 * Crear instancia de clase Bot
 */
const createBot = async <P extends ProviderClass = any, D extends MemoryDB = any>(
    { flow, database, provider }: { flow: FlowClass; database: D; provider: P },
    args?: Omit<GeneralArgs, 'listEvents'>
): Promise<CoreClass<P, D>> => {
    const defaultArgs: GeneralArgs = {
        blackList: [],
        listEvents: EVENTS,
        delay: 0,
        logs: {
            notices: true,
        },
        globalState: {},
        extensions: [],
        queue: {
            timeout: 50000,
            concurrencyLimit: 15,
        },
    }

    const combinedArgs: GeneralArgs = {
        ...defaultArgs,
        ...args,
    }
    return new CoreClass<P, D>(flow, database, provider, combinedArgs)
}

/**
 * Crear instancia de clase Io (Flow)
 */
const createFlow = (args: TFlow[]): FlowClass => {
    return new FlowClass(args)
}

/**
 * Crear instancia de clase Provider
 * Depdendiendo del Provider puedes pasar argumentos
 * Ver Documentacion
 */
const createProvider = <T = ProviderClass, K = typeof ProviderClass.prototype.globalVendorArgs>(
    providerClass: new (args: K) => T,
    args: K = null
): T => {
    const providerInstance = new providerClass(args)
    return providerInstance
}

const TestTool = {
    TestProvider,
    TestDB: MemoryDB,
}

export {
    createBot,
    createFlow,
    createProvider,
    addKeyword,
    addAnswer,
    ProviderClass,
    EventEmitterClass,
    CoreClass,
    EVENTS,
    MemoryDB,
    TestTool,
    utils,
}
