import { eventAction } from './eventAction.js'
import { eventCall, REGEX_EVENT_CALL } from './eventCall.js'
import { REGEX_EVENT_CUSTOM } from './eventCustom.js'
import { eventDocument, REGEX_EVENT_DOCUMENT } from './eventDocument.js'
import { eventLocation, REGEX_EVENT_LOCATION } from './eventLocation.js'
import { eventMedia, REGEX_EVENT_MEDIA } from './eventMedia.js'
import { eventOrder, REGEX_EVENT_ORDER } from './eventOrder.js'
import { eventTemplate, REGEX_EVENT_TEMPLATE } from './eventTemplate.js'
import { eventVoiceNote, REGEX_EVENT_VOICE_NOTE } from './eventVoiceNote.js'
import { eventWelcome } from './eventWelcome.js'

type EventFunctionRegex = {
    [key: string]: RegExp
}

const LIST_ALL = {
    WELCOME: eventWelcome(),
    MEDIA: eventMedia(),
    LOCATION: eventLocation(),
    DOCUMENT: eventDocument(),
    VOICE_NOTE: eventVoiceNote(),
    ACTION: eventAction(),
    ORDER: eventOrder(),
    TEMPLATE: eventTemplate(),
    CALL: eventCall(),
}

const LIST_REGEX: EventFunctionRegex = {
    REGEX_EVENT_DOCUMENT,
    REGEX_EVENT_LOCATION,
    REGEX_EVENT_MEDIA,
    REGEX_EVENT_VOICE_NOTE,
    REGEX_EVENT_ORDER,
    REGEX_EVENT_TEMPLATE,
    REGEX_EVENT_CUSTOM,
    REGEX_EVENT_CALL,
}

export { LIST_ALL, LIST_REGEX }
