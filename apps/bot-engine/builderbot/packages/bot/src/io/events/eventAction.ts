import { generateRef } from '../../utils/hash.js'

const eventAction = (): string => {
    return generateRef('_event_action_')
}

export { eventAction }
