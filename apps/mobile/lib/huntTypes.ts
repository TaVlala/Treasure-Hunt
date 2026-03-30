// huntTypes.ts — mobile-local type definitions for the v2 hunt model.
// Defined locally so the mobile branch builds independently of the schema branch.

export type HuntStartMode = 'CLUE_FIRST' | 'LOCATION_FIRST';
export type UnlockType = 'GPS_PROXIMITY' | 'PASSWORD' | 'PHOTO';
export type ContentType = 'TEXT' | 'IMAGE';

export interface ClueContent {
  id: string;
  type: ContentType;
  content: string | null;
  imageUrl: string | null;
  isHint: boolean;
  order: number;
}

export interface AnswerCheckResult {
  result: 'correct' | 'close' | 'wrong';
  message: string;
}
