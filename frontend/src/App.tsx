import React, { useState, useEffect } from 'react';
import {
  AnswerEvaluation,
  AssessmentReport,
  CandidateProfile,
  InterviewSession,
} from './types';
import { api } from './services/api';
import { Navbar } from './components/Navbar';
import { CandidateProfileForm } from './components/CandidateProfileForm';
import { LiveInterviewRoom } from './components/LiveInterviewRoom';
import { AssessmentDashboard } from './components/AssessmentDashboard';
import { SessionHistory } from './components/SessionHistory';

export const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<'profile' | 'interview' | 'report' | 'history'>('profile');
  const [activeSession, setActiveSession] = useState<InterviewSession | null>(null);
  const [finalReport, setFinalReport] = useState<AssessmentReport | null>(null);
  const [lastEvaluation, setLastEvaluation] = useState<AnswerEvaluation | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [aiStatus, setAiStatus] = useState<{ healthy: boolean; provider: string }>({
    healthy: true,
    provider: 'gemini',
  });

  // Health check on mount
  useEffect(() => {
    api
      .checkHealth()
      .then((data) => {
        setAiStatus({
          healthy: data.status === 'healthy',
          provider: data.aiProvider || 'gemini',
        });
      })
      .catch(() => {
        setAiStatus({ healthy: false, provider: 'offline' });
      });
  }, []);

  // Silence any speech when navigating away from interview view
  useEffect(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
  }, [currentView]);

  // Start new interview session
  const handleStartInterview = async (profile: CandidateProfile) => {
    try {
      setIsLoading(true);
      const res = await api.startSession(profile);
      setActiveSession(res.session);
      setFinalReport(null);
      setLastEvaluation(null);
      setCurrentView('interview');
    } catch (err: any) {
      alert(`Error starting interview: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Submit candidate answer
  const handleSubmitAnswer = async (answer: string) => {
    if (!activeSession) return;
    try {
      setIsLoading(true);
      const res = await api.submitAnswer(activeSession.id, answer);
      setActiveSession(res.session);
      setLastEvaluation(res.evaluation);

      if (res.completed && res.finalReport) {
        if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
          window.speechSynthesis.cancel();
        }
        setFinalReport(res.finalReport);
        setCurrentView('report');
      }
    } catch (err: any) {
      alert(`Error processing answer: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Complete interview early
  const handleCompleteEarly = async () => {
    if (!activeSession) return;
    try {
      setIsLoading(true);
      const res = await api.completeSession(activeSession.id);
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
      setActiveSession(res.session);
      setFinalReport(res.finalReport);
      setCurrentView('report');
    } catch (err: any) {
      alert(`Error finalizing interview: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Select past session from history
  const handleSelectHistorySession = (session: InterviewSession) => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setActiveSession(session);
    if (session.finalReport) {
      setFinalReport(session.finalReport);
      setCurrentView('report');
    } else {
      setCurrentView('interview');
    }
  };

  // Restart / New Interview
  const handleRestart = () => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setActiveSession(null);
    setFinalReport(null);
    setLastEvaluation(null);
    setCurrentView('profile');
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      <Navbar
        currentView={currentView}
        onNavigate={setCurrentView}
        hasActiveSession={Boolean(activeSession && activeSession.status === 'in_progress')}
        hasReport={Boolean(finalReport)}
        aiStatus={aiStatus}
      />

      <main className="flex-1 pb-16">
        {currentView === 'profile' && (
          <CandidateProfileForm
            onSubmit={handleStartInterview}
            isLoading={isLoading}
          />
        )}

        {currentView === 'interview' && activeSession && (
          <LiveInterviewRoom
            session={activeSession}
            onSubmitAnswer={handleSubmitAnswer}
            onCompleteEarly={handleCompleteEarly}
            isLoading={isLoading}
            lastEvaluation={lastEvaluation}
          />
        )}

        {currentView === 'report' && activeSession && finalReport && (
          <AssessmentDashboard
            session={activeSession}
            report={finalReport}
            onRestart={handleRestart}
          />
        )}

        {currentView === 'history' && (
          <SessionHistory onSelectSession={handleSelectHistorySession} />
        )}
      </main>

      <footer className="border-t border-slate-800/80 py-6 text-center text-xs text-slate-500">
        <p>
          VAANI™ — Adaptive AI Interview & Assessment Intelligence • Developed for MetaDamen Internship Assignment
        </p>
      </footer>
    </div>
  );
};

export default App;
