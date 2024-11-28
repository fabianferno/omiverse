import axios from "axios";
import { TranscriptData } from "../../types/transcript";

interface TranscriptSegment {
  text: string;
  speaker: string;
  speaker_id: number;
  is_user: boolean;
  person_id: null;
  start: number;
  end: number;
}

async function callTranscriptWebhook() {
  const baseUrl = "http://localhost:4000"; // Using the same port as in main.ts
  const uid = "X1L2QMdDesYN2iWzy0Gu0mmskjY2";
  const webhookUrl = `${baseUrl}/webhook/transcript?uid=${uid}`;

  const data: TranscriptData = {
    id: "f054176b-e566-4ba8-9b77-6975aaf0ebd1",
    created_at: "2024-11-28T07:29:33.624261+00:00",
    started_at: "2024-11-28T07:29:33.624261+00:00",
    finished_at: "2024-11-28T07:29:45.349487+00:00",
    source: "friend",
    language: "en",
    structured: {
      title: "Participation in ETH Global Hackathon",
      overview:
        "Leo participated in ETH Global Hackathon in Bangkok with Fabian Ferno.",
      emoji: "💻",
      category: "technology",
      action_items: [],
      events: [],
    },
    transcript_segments: [
      {
        text: "Leo participated in ETH Global Hackathon in Bangkok with Fabian Ferno.",
        speaker: "SPEAKER_0",
        speaker_id: 0,
        is_user: false,
        person_id: null,
        start: 0,
        end: 7.23,
      },
    ],
    geolocation: null,
    photos: [],
    plugins_results: [],
    external_data: null,
    discarded: false,
    deleted: false,
    visibility: "private",
    processing_memory_id: null,
    status: "completed",
  };

  try {
    const response = await axios.post(webhookUrl, data);
    console.log("Webhook called successfully");
    console.log("Response:", response.data);
  } catch (error) {
    console.error("Error calling webhook:", error);
  }
}

// Execute the function
callTranscriptWebhook();
