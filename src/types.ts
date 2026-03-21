export type NoteboxSettings = {
  displayName: string;
};

export type NoteSummary = {
  lastModified: number | null;
  name: string;
  uri: string;
};

export type NoteDetail = {
  content: string;
  summary: NoteSummary;
};
