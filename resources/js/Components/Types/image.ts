export interface Image {
  id: number;
  url: string; // always provided by backend
}

// Optional type for local images before upload
export type LocalImage = {
  id: number;
  file: File;
  entity_id: number; // e.g., item ID or user ID
  url?: string;      // optional preview before uploading
};