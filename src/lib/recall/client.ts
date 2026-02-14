// Recall.ai recording module — REST API wrapper
// Wraps Recall.ai REST API. No Recall types leak outside.
// See: specs/001-minerva-mvp/contracts/recorder.md
// API: https://docs.recall.ai/reference/bot_create

const RECALL_API_BASE = "https://us-east-1.recall.ai/api/v1";

export interface SessionRecorder {
  startRecording(meetingUrl: string, sessionId: string): Promise<{ botId: string }>;
  stopRecording(botId: string): Promise<{ recordingUrl: string }>;
  getTranscript(botId: string): Promise<{ speaker: string; text: string }[]>;
}

export function createSessionRecorder(): SessionRecorder {
  const apiKey = process.env.RECALL_API_KEY;
  if (!apiKey) {
    throw new Error("RECALL_API_KEY is not set");
  }

  const headers = {
    Authorization: `Token ${apiKey}`,
    "Content-Type": "application/json",
  };

  return {
    async startRecording(meetingUrl: string, sessionId: string) {
      const webhookUrl = `${process.env.NEXT_PUBLIC_URL}/api/recall/webhook`;

      const res = await fetch(`${RECALL_API_BASE}/bot/`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          meeting_url: meetingUrl,
          bot_name: "Minerva Tutor",
          recording_config: {
            transcript: {
              provider: {
                recallai_streaming: {
                  mode: "prioritize_low_latency",
                },
              },
            },
            realtime_endpoints: [
              {
                type: "webhook",
                url: webhookUrl,
                events: ["transcript.data"],
              },
            ],
            automatic_leave: {
              everyone_left_timeout: 30,
              noone_joined_timeout: 600,
            },
            metadata: {
              session_id: sessionId,
            },
          },
        }),
      });

      if (!res.ok) {
        const err = await res.text();
        throw new Error(`Recall.ai bot create failed: ${res.status} ${err}`);
      }

      const data = await res.json();
      return { botId: data.id as string };
    },

    async stopRecording(botId: string) {
      // Tell bot to leave the call
      await fetch(`${RECALL_API_BASE}/bot/${botId}/leave_call/`, {
        method: "POST",
        headers,
      });

      // Retrieve the bot to get recording info
      const res = await fetch(`${RECALL_API_BASE}/bot/${botId}/video_mixed/`, {
        method: "GET",
        headers,
      });

      if (!res.ok) {
        return { recordingUrl: "" };
      }

      const data = await res.json();
      const recordingUrl = (data?.data?.download_url as string) ?? "";
      return { recordingUrl };
    },

    async getTranscript(botId: string) {
      const res = await fetch(`${RECALL_API_BASE}/bot/${botId}/transcript/`, {
        method: "GET",
        headers,
      });

      if (!res.ok) {
        return [];
      }

      const data = await res.json();
      // Recall.ai transcript format: array of segments with speaker + words
      if (!Array.isArray(data)) return [];

      return data.map((segment: { speaker: string; words: { text: string }[] }) => ({
        speaker: segment.speaker ?? "unknown",
        text: (segment.words ?? []).map((w: { text: string }) => w.text).join(" "),
      }));
    },
  };
}
