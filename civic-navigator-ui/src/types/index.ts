// Shared types for CivicNavigator AI UI

export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  structured?: StructuredResponse;
  isLoading?: boolean;
}

export interface StructuredResponse {
  explanation: string;
  steps?: string[];
  tips?: string[];
  intent?: string;
}

export interface PollingStation {
  id: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  distance?: string;
  duration?: string;
  isOpen?: boolean;
  type: "polling" | "dropbox" | "earlyVoting" | "registrar";
}

export interface InsightCard {
  id: string;
  title: string;
  description: string;
  icon: string;
  color: string;
  type: "timeline" | "steps" | "faq";
}

export interface Election {
  id: string;
  name: string;
  date: string;
  type: string;
  daysUntil: number;
}

export interface TimelineEvent {
  id: string;
  label: string;
  date: string;
  status: "completed" | "upcoming" | "current";
}

export type QuickChipId =
  | "register"
  | "documents"
  | "polling"
  | "steps"
  | "mail"
  | "rights";

export interface QuickChip {
  id: QuickChipId;
  label: string;
  query: string;
  icon: string;
}
