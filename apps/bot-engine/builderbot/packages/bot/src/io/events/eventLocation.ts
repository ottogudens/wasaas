import { generateRef, generateRegex } from '../../utils/hash.js'

const eventLocation = (): string => {
    return generateRef('_event_location_')
}

const REGEX_EVENT_LOCATION = generateRegex(`_event_location`)

export { eventLocation, REGEX_EVENT_LOCATION }
