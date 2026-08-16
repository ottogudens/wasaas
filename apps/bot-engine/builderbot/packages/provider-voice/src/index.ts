export { VoiceProvider } from './voice/provider.js'
export { SttModel, TtsModel, TtsVoice } from './types.js'
export type { IVoiceProviderArgs, VoicePayload } from './types.js'

// STT adapters
export { OpenAISTTAdapter } from './adapters/stt/openai.js'
export { DeepgramSTTAdapter, DeepgramSTTModel } from './adapters/stt/deepgram.js'

// TTS adapters
export { OpenAITTSAdapter } from './adapters/tts/openai.js'
export { ElevenLabsTTSAdapter, ElevenLabsModel } from './adapters/tts/elevenlabs.js'
export { DeepgramTTSAdapter, DeepgramTTSModel } from './adapters/tts/deepgram.js'
export { CartesiaTTSAdapter, CartesiaModel } from './adapters/tts/cartesia.js'

// Adapter interfaces
export type { ISttAdapter, ITtsAdapter } from './adapters/index.js'

// Audio utilities (shared with provider-voice-whatsapp and other consumers)
export { SilenceSegmenter, chunkPcm, bufferToInt16, int16ToBuffer, pcmToWav, frameRms, resamplePcm } from './audio.js'
export type { SilenceSegmenterOptions } from './audio.js'

// ── Meta (WhatsApp Business) call core — shared by provider-voice-whatsapp and provider-meta ──
export { MetaCallCoreVendor } from './calls/core.js'
export type { MetaCallCoreVendorArgs } from './calls/core.js'
export { MetaCallClient } from './calls/meta-call-client.js'
export type { MetaCallClientArgs } from './calls/meta-call-client.js'
export { transformAnswer, assertOpus } from './calls/sdp.js'
export { createPeerConnection, createAudioSink, createAudioSource, waitForIceGathering } from './calls/webrtc.js'
export type { AudioSinkData, RTCAudioSinkInstance, RTCAudioSourceInstance } from './calls/webrtc.js'
export { CallEvent, CallAction, CallDirection, CallState } from './calls/types.js'
export type {
    IMetaCallCoreConfig,
    WhatsAppCallSession,
    WhatsAppCallEntryEvent,
    WhatsAppCallValue,
    WhatsAppCallEntry,
    WhatsAppCallWebhookPayload,
    CallActionBody,
    WhatsAppVoicePayload,
} from './calls/types'
