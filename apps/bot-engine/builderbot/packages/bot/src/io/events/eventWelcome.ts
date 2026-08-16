import { generateRef } from '../../utils/hash.js'

const eventWelcome = (): string => {
    return generateRef('_event_welcome_')
}

export { eventWelcome }
