export type ScoringRule = Readonly<{
  id: string;
  field: "title" | "description" | "location" | "tags";
  includes: string;
  weight: number;
  reason: string;
}>;

export type ScoringProfile = Readonly<{
  id: string;
  version: string;
  rules: readonly ScoringRule[];
}>;
