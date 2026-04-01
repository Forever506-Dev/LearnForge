import { useState, useCallback } from 'react';
import api from '../api/client';
import type {
  Section,
  SubmitAnswerResponse,
  CodeExecuteRequest,
  CodeExecuteResponse,
} from '../types';

interface QuizState {
  currentIndex: number;
  selectedAnswer: string | null;
  feedback: SubmitAnswerResponse | null;
  codeOutput: CodeExecuteResponse | null;
  isSubmitting: boolean;
  score: number;
  totalAnswered: number;
  correctCount: number;
}

export function useQuiz(sections: Section[]) {
  const [state, setState] = useState<QuizState>({
    currentIndex: 0,
    selectedAnswer: null,
    feedback: null,
    codeOutput: null,
    isSubmitting: false,
    score: 0,
    totalAnswered: 0,
    correctCount: 0,
  });

  const currentSection = sections[state.currentIndex] ?? null;

  const selectAnswer = useCallback((answer: string) => {
    setState((s) => ({ ...s, selectedAnswer: answer, feedback: null }));
  }, []);

  const submitQuizAnswer = useCallback(async () => {
    if (!currentSection || !state.selectedAnswer) return;
    setState((s) => ({ ...s, isSubmitting: true }));

    try {
      const { data } = await api.post<SubmitAnswerResponse>(
        '/learn/submit-answer',
        {
          section_id: currentSection.id,
          answer: state.selectedAnswer,
        }
      );
      setState((s) => ({
        ...s,
        feedback: data,
        isSubmitting: false,
        score: s.score + data.xp_earned,
        totalAnswered: s.totalAnswered + 1,
        correctCount: s.correctCount + (data.correct ? 1 : 0),
      }));
    } catch (err) {
      setState((s) => ({ ...s, isSubmitting: false }));
      throw err;
    }
  }, [currentSection, state.selectedAnswer]);

  const submitCode = useCallback(
    async (req: CodeExecuteRequest) => {
      setState((s) => ({ ...s, isSubmitting: true, codeOutput: null }));

      try {
        const { data } = await api.post<CodeExecuteResponse>(
          '/code/execute',
          req
        );
        setState((s) => ({
          ...s,
          codeOutput: data,
          isSubmitting: false,
          score: s.score + data.xp_earned,
          totalAnswered:
            s.totalAnswered + (data.passed !== null ? 1 : 0),
          correctCount:
            s.correctCount + (data.passed !== null && data.total !== null && data.passed === data.total ? 1 : 0),
        }));
        return data;
      } catch (err) {
        setState((s) => ({ ...s, isSubmitting: false }));
        throw err;
      }
    },
    []
  );

  const nextSection = useCallback(() => {
    setState((s) => ({
      ...s,
      currentIndex: Math.min(s.currentIndex + 1, sections.length - 1),
      selectedAnswer: null,
      feedback: null,
      codeOutput: null,
    }));
  }, [sections.length]);

  const prevSection = useCallback(() => {
    setState((s) => ({
      ...s,
      currentIndex: Math.max(s.currentIndex - 1, 0),
      selectedAnswer: null,
      feedback: null,
      codeOutput: null,
    }));
  }, []);

  const goToSection = useCallback(
    (index: number) => {
      if (index < 0 || index >= sections.length) return;
      setState((s) => ({
        ...s,
        currentIndex: index,
        selectedAnswer: null,
        feedback: null,
        codeOutput: null,
      }));
    },
    [sections.length]
  );

  const isFinished = state.currentIndex >= sections.length - 1 && state.feedback !== null;

  return {
    ...state,
    currentSection,
    selectAnswer,
    submitQuizAnswer,
    submitCode,
    nextSection,
    prevSection,
    goToSection,
    isFinished,
    totalSections: sections.length,
  };
}
