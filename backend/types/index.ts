export interface TranscriptSegment {
  text: string;
  speaker: string;
  speakerId: number;
  is_user: boolean;
  start: number;
  end: number;
}

export interface ActionItem {
  description: string;
  completed: boolean;
}

export interface AppResponse {
  app_id: string;
  content: string;
}

export interface StructuredData {
  title: string;
  overview: string;
  emoji: string;
  category: string;
  action_items: ActionItem[];
  events: any[]; // You can replace 'any' with a more specific type if needed
}

export interface Transcript {
  id: number;
  created_at: string;
  started_at: string;
  finished_at: string;
  transcript: string;
  transcript_segments: TranscriptSegment[];
  photos: any[]; // You can replace 'any' with a more specific type if needed
  structured: StructuredData;
  apps_response: AppResponse[];
  discarded: boolean;
}
