// Deepgram real-time ASR client — browser-side
// Streams microphone audio to Deepgram WebSocket for real-time transcription.
// Replaces HeyGen's built-in ASR (used in FULL mode).
// No SDK types leak outside this module.

export interface ASRClient {
  /** Connect to Deepgram and acquire mic permission. */
  connect(): Promise<void>;
  /** Disconnect and release resources. */
  disconnect(): void;
  /** Start streaming mic audio to Deepgram (push-to-talk: Space down). */
  startListening(): void;
  /** Stop streaming and flush (push-to-talk: Space up). */
  stopListening(): void;
  /** Register callback for transcription events. */
  onTranscript(cb: (text: string, isFinal: boolean) => void): void;
}

// Audio config — Deepgram expects linear16 (PCM 16-bit) at 16kHz
const SAMPLE_RATE = 16000;
const DEEPGRAM_WS_URL = "wss://api.deepgram.com/v1/listen";

export function createASRClient(): ASRClient {
  let ws: WebSocket | null = null;
  let micStream: MediaStream | null = null;
  let audioContext: AudioContext | null = null;
  let processor: ScriptProcessorNode | null = null;
  let sourceNode: MediaStreamAudioSourceNode | null = null;
  let isListening = false;
  let isFlushing = false; // Keep audio flowing briefly after stopListening
  let apiKey: string | null = null;

  const transcriptCallbacks: ((text: string, isFinal: boolean) => void)[] = [];

  function notifyTranscript(text: string, isFinal: boolean) {
    transcriptCallbacks.forEach((cb) => cb(text, isFinal));
  }

  function connectWebSocket() {
    if (!apiKey) return;

    const params = new URLSearchParams({
      model: "nova-3",
      language: "en",
      smart_format: "true",
      interim_results: "true",
      endpointing: "300", // 300ms silence = end of utterance (Finalize handles flush)
      sample_rate: String(SAMPLE_RATE),
      encoding: "linear16",
      channels: "1",
    });

    ws = new WebSocket(`${DEEPGRAM_WS_URL}?${params}`, ["token", apiKey]);

    ws.onopen = () => {
      console.log("[DeepgramASR] WebSocket connected");
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === "Results" && data.channel?.alternatives?.[0]) {
          const alt = data.channel.alternatives[0];
          const transcript = alt.transcript as string;
          const isFinal = data.is_final === true;

          if (transcript && transcript.trim().length > 0) {
            console.log(
              `[DeepgramASR] ${isFinal ? "FINAL" : "interim"}: "${transcript}"`
            );
            notifyTranscript(transcript, isFinal);
          }
        }
      } catch {
        // Ignore non-JSON messages (e.g., metadata)
      }
    };

    ws.onerror = (err) => {
      console.error("[DeepgramASR] WebSocket error:", err);
    };

    ws.onclose = (event) => {
      console.log("[DeepgramASR] WebSocket closed:", event.code, event.reason);
      ws = null;
    };
  }

  function startAudioCapture() {
    if (!micStream || !ws || ws.readyState !== WebSocket.OPEN) return;

    audioContext = new AudioContext({ sampleRate: SAMPLE_RATE });
    sourceNode = audioContext.createMediaStreamSource(micStream);

    // ScriptProcessor for raw PCM — simple and widely supported
    // bufferSize=4096 at 16kHz = ~256ms chunks
    processor = audioContext.createScriptProcessor(4096, 1, 1);
    processor.onaudioprocess = (e) => {
      if ((!isListening && !isFlushing) || !ws || ws.readyState !== WebSocket.OPEN) return;

      const float32 = e.inputBuffer.getChannelData(0);
      // Convert float32 [-1,1] to int16 [-32768,32767]
      const int16 = new Int16Array(float32.length);
      for (let i = 0; i < float32.length; i++) {
        const s = Math.max(-1, Math.min(1, float32[i]));
        int16[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
      }

      ws.send(int16.buffer);
    };

    sourceNode.connect(processor);
    processor.connect(audioContext.destination);
  }

  function stopAudioCapture() {
    if (processor) {
      processor.disconnect();
      processor = null;
    }
    if (sourceNode) {
      sourceNode.disconnect();
      sourceNode = null;
    }
    if (audioContext && audioContext.state !== "closed") {
      audioContext.close();
      audioContext = null;
    }
  }

  return {
    async connect() {
      // Fetch API key from server
      const res = await fetch("/api/deepgram/key", { method: "POST" });
      if (!res.ok) throw new Error("Failed to fetch Deepgram API key");
      const data = await res.json();
      apiKey = data.key;

      // Get mic permission
      micStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: SAMPLE_RATE,
        },
      });

      // Connect WebSocket
      connectWebSocket();

      console.log("[DeepgramASR] Connected — mic ready, WebSocket open");
    },

    disconnect() {
      isListening = false;
      stopAudioCapture();

      if (ws) {
        // Send close signal to Deepgram
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: "CloseStream" }));
        }
        ws.close();
        ws = null;
      }

      if (micStream) {
        micStream.getTracks().forEach((t) => t.stop());
        micStream = null;
      }

      apiKey = null;
      console.log("[DeepgramASR] Disconnected");
    },

    startListening() {
      if (isListening) return;
      isListening = true;

      // Reconnect WebSocket if closed
      if (!ws || ws.readyState !== WebSocket.OPEN) {
        connectWebSocket();
        // Wait for connection before starting capture
        const checkInterval = setInterval(() => {
          if (ws && ws.readyState === WebSocket.OPEN) {
            clearInterval(checkInterval);
            startAudioCapture();
          }
        }, 50);
        // Timeout after 3s
        setTimeout(() => clearInterval(checkInterval), 3000);
      } else {
        startAudioCapture();
      }

      console.log("[DeepgramASR] Listening started (push-to-talk)");
    },

    stopListening() {
      if (!isListening) return;
      isListening = false;
      isFlushing = true; // Keep audio flowing to flush the buffer

      console.log("[DeepgramASR] Listening stopped — flushing buffer");

      // Keep the ScriptProcessor running for 300ms to flush remaining audio buffer
      // Then send Finalize to force Deepgram to emit final transcript immediately
      setTimeout(() => {
        isFlushing = false;
        stopAudioCapture();

        // Tell Deepgram to finalize any buffered audio NOW (don't wait for silence)
        // This forces an immediate final transcript for whatever audio is pending
        if (ws && ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: "Finalize" }));
          console.log("[DeepgramASR] Sent Finalize — forcing final transcript");
        }
      }, 300);
    },

    onTranscript(cb) {
      transcriptCallbacks.push(cb);
    },
  };
}
