import { Expert } from '../data/experts';

export interface LessonInfo {
  title: string;
  grade: string;
  contentText: string;
  draftOrQuestions: string;
}

export type RoundNumber = 1 | 2 | 3;

export interface DiscussionMessage {
  expertId: string;
  content: string;
}

export interface RoundState {
  roundNumber: RoundNumber;
  messages: DiscussionMessage[];
  teacherIntervention: string;
  status: 'pending' | 'generating' | 'completed';
}

export interface AppState {
  step: 'setup' | 'discussion' | 'export';
  lessonInfo: LessonInfo;
  selectedExpertIds: string[];
  rounds: RoundState[];
  finalDraft: string;
}
