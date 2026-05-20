import { create } from 'zustand';
import { AppState, LessonInfo, RoundState } from '../types';

interface Actions {
  setStep: (step: AppState['step']) => void;
  updateLessonInfo: (info: Partial<LessonInfo>) => void;
  toggleExpert: (id: string) => void;
  startDiscussion: () => void;
  updateRoundStatus: (roundIndex: number, status: RoundState['status']) => void;
  addExpertMessage: (roundIndex: number, expertId: string, content: string) => void;
  setTeacherIntervention: (roundIndex: number, text: string) => void;
  advanceRound: () => void;
  setFinalDraft: (text: string) => void;
}

export const useAppStore = create<AppState & Actions>((set) => ({
  step: 'setup',
  lessonInfo: {
    title: '',
    grade: '',
    contentText: '',
    draftOrQuestions: '',
  },
  selectedExpertIds: [],
  rounds: [],
  finalDraft: '',

  setStep: (step) => set({ step }),
  
  updateLessonInfo: (info) =>
    set((state) => ({
      lessonInfo: { ...state.lessonInfo, ...info },
    })),

  toggleExpert: (id) =>
    set((state) => {
      const isSelected = state.selectedExpertIds.includes(id);
      if (isSelected) {
        return { selectedExpertIds: state.selectedExpertIds.filter((e) => e !== id) };
      } else {
        return { selectedExpertIds: [...state.selectedExpertIds, id] };
      }
    }),

  startDiscussion: () =>
    set((state) => ({
      step: 'discussion',
      rounds: [
        {
          roundNumber: 1,
          messages: [],
          teacherIntervention: '',
          status: 'pending',
        },
      ],
      finalDraft: '',
    })),

  updateRoundStatus: (roundIndex, status) =>
    set((state) => {
      const newRounds = [...state.rounds];
      newRounds[roundIndex] = { ...newRounds[roundIndex], status };
      return { rounds: newRounds };
    }),

  addExpertMessage: (roundIndex, expertId, content) =>
    set((state) => {
      const newRounds = [...state.rounds];
      newRounds[roundIndex].messages.push({ expertId, content });
      return { rounds: newRounds };
    }),

  setTeacherIntervention: (roundIndex, text) =>
    set((state) => {
      const newRounds = [...state.rounds];
      newRounds[roundIndex].teacherIntervention = text;
      return { rounds: newRounds };
    }),

  advanceRound: () =>
    set((state) => {
      const nextRound = state.rounds.length + 1;
      if (nextRound > 3) return state; // Only 3 rounds

      return {
        rounds: [
          ...state.rounds,
          {
            roundNumber: nextRound as 1 | 2 | 3,
            messages: [],
            teacherIntervention: '',
            status: 'pending',
          },
        ],
      };
    }),
    
  setFinalDraft: (text) => set({ finalDraft: text }),
}));
