// ElevenLabs TTS wrapper — server-side only
// Streams text → PCM 16-bit 24kHz audio via ElevenLabs HTTP streaming API.
// Output is ready for HeyGen LITE mode (repeatAudio expects PCM 24kHz).
// No SDK types leak outside this module.
//
// Latency optimizations (Feb 2026):
// - eleven_flash_v2_5: ~75ms TTFB (vs ~500ms for multilingual_v2)
// - optimize_streaming_latency=4: max server-side optimization
// - style=0, use_speaker_boost=false: skip expensive post-processing
// - pcm_24000: no encode/decode overhead

const ELEVENLABS_API_URL = "https://api.elevenlabs.io/v1/text-to-speech";

export interface TTSClient {
  /** Stream text to PCM 24kHz audio. Yields Uint8Array chunks as they arrive.
   *  Returns empty iterable if TTS is not configured (graceful degradation). */
  streamSpeech(text: string): AsyncIterable<Uint8Array>;
  /** Whether ElevenLabs TTS is available (API key + voice configured). */
  readonly available: boolean;
}

export function createTTSClient(): TTSClient {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  const voiceId = process.env.ELEVENLABS_VOICE_ID;
  const isAvailable = Boolean(apiKey && voiceId);

  // Circuit breaker: once quota is exceeded, skip all TTS for the rest of this
  // server instance to avoid spamming errors. Resets on server restart.
  let quotaExhausted = false;

  if (!isAvailable) {
    console.warn("[ElevenLabs] TTS not configured — no API key or voice ID. Audio will be skipped.");
  }

  return {
    get available() {
      return isAvailable && !quotaExhausted;
    },

    async *streamSpeech(text: string): AsyncIterable<Uint8Array> {
      if (!isAvailable || quotaExhausted) return; // Gracefully yield nothing

      const url = `${ELEVENLABS_API_URL}/${voiceId}/stream?output_format=pcm_24000&optimize_streaming_latency=4`;
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "xi-api-key": apiKey!,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text,
          model_id: "eleven_flash_v2_5",
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.75,
            style: 0,
            use_speaker_boost: false,
          },
        }),
      });

      if (!res.ok) {
        const errText = await res.text().catch(() => "unknown");
        // Detect quota exhaustion — stop trying for this server instance
        if (errText.includes("quota_exceeded")) {
          console.error("[ElevenLabs] Quota exhausted — disabling TTS until server restart");
          quotaExhausted = true;
          return; // Yield nothing instead of throwing
        }
        throw new Error(`ElevenLabs TTS failed (${res.status}): ${errText}`);
      }

      if (!res.body) throw new Error("ElevenLabs returned no body");

      const reader = res.body.getReader();
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          yield value;
        }
      } finally {
        reader.releaseLock();
      }
    },
  };
}
