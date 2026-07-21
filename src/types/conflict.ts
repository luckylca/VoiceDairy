export type ConflictSeverity = 'info' | 'warning' | 'critical';
export type ConflictKind = 'time' | 'duplicate' | 'project' | 'dependency' | 'contradiction';

export type ConflictFinding = {
  kind: ConflictKind;
  severity: ConflictSeverity;
  title: string;
  message: string;
  suggestion: string;
  relatedIds: string[];
};

export type ConflictDetectionResult = {
  hasConflict: boolean;
  conflicts: ConflictFinding[];
};