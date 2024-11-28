export interface TranscriptSegment {
  text: string;
  speaker: string;
  speaker_id: number;
  is_user: boolean;
  person_id: string | null;
  start: number;
  end: number;
}

export interface TranscriptStructured {
  title: string;
  overview: string;
  emoji: string;
  category: string;
  action_items: any[];
  events: any[];
}

export interface TranscriptData {
  id: string;
  created_at: string;
  started_at: string;
  finished_at: string;
  source: string;
  language: string;
  structured: TranscriptStructured;
  transcript_segments: TranscriptSegment[];
  geolocation: null | any;
  photos: any[];
  plugins_results: any[];
  external_data: null | any;
  discarded: boolean;
  deleted: boolean;
  visibility: "private" | "public";
  processing_memory_id: string | null;
  status: "completed" | "processing" | "failed";
}
