import {
  AnswerEvaluation,
  AssessmentReport,
  CandidateProfile,
  InterviewSession,
  QuestionMetadata,
} from '../types';

const API_BASE = '/api';

export const api = {
  async checkHealth(): Promise<any> {
    const res = await fetch(`${API_BASE}/health`);
    if (!res.ok) throw new Error('Backend is unreachable');
    return res.json();
  },

  async startSession(profile: CandidateProfile): Promise<{ message: string; session: InterviewSession }> {
    const res = await fetch(`${API_BASE}/sessions/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(profile),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Failed to start session' }));
      throw new Error(err.error || 'Failed to start session');
    }
    return res.json();
  },

  async getSession(id: string): Promise<InterviewSession> {
    const res = await fetch(`${API_BASE}/sessions/${id}`);
    if (!res.ok) throw new Error('Failed to load session');
    return res.json();
  },

  async submitAnswer(
    id: string,
    answer: string
  ): Promise<{
    completed: boolean;
    evaluation: AnswerEvaluation;
    nextQuestion?: QuestionMetadata;
    finalReport?: AssessmentReport;
    session: InterviewSession;
  }> {
    const res = await fetch(`${API_BASE}/sessions/${id}/answer`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ answer }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Failed to evaluate answer' }));
      throw new Error(err.error || 'Failed to submit answer');
    }
    return res.json();
  },

  async completeSession(
    id: string
  ): Promise<{ message: string; session: InterviewSession; finalReport: AssessmentReport }> {
    const res = await fetch(`${API_BASE}/sessions/${id}/complete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Failed to complete session' }));
      throw new Error(err.error || 'Failed to complete session');
    }
    return res.json();
  },

  async listSessions(): Promise<InterviewSession[]> {
    const res = await fetch(`${API_BASE}/sessions`);
    if (!res.ok) throw new Error('Failed to list sessions');
    return res.json();
  },

  async deleteSession(id: string): Promise<void> {
    const res = await fetch(`${API_BASE}/sessions/${id}`, {
      method: 'DELETE',
    });
    if (!res.ok) throw new Error('Failed to delete session');
  },
};
