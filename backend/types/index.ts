export interface TranscriptSegment {
  text: string;
  speaker: string;
  speaker_id: number;
  is_user: boolean;
  person_id: string | null;
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

export interface Noun {
  _id?: string;
  userId: string;
  name: string;
  type: "PERSON" | "PLACE" | "THING" | "OTHER";
  baseForm: string;
  createdAt: Date;
}

export interface Relationship {
  _id?: string;
  userId: string;
  sourceNounId: string;
  targetNounId: string;
  action: string;
  baseAction: string;
  timestamp: Date;
  transcriptId: string;
}

export interface GraphData {
  nodes: Array<{
    id: string;
    label: string;
    type: string;
  }>;
  edges: Array<{
    source: string;
    target: string;
    label: string;
  }>;
}
