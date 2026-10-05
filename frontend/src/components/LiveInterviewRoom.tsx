import React, { useState, useEffect, useRef } from 'react';
import {
  AnswerEvaluation,
  InterviewSession,
  QuestionMetadata,
} from '../types';
import { InterviewerAvatar } from './InterviewerAvatar';
import {
  Send,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Clock,
  Sparkles,
  Award,
  AlertCircle,
  CheckCircle2,
  TrendingUp,
  BrainCircuit,
  HelpCircle,
  ShieldAlert,
} from 'lucide-react';

interface Props {
  session: InterviewSession;
  onSubmitAnswer: (answer: string) => Promise<void>;
  onCompleteEarly: () => Promise<void>;
  isLoading: boolean;
  lastEvaluation: AnswerEvaluation | null;
}

export const LiveInterviewRoom: React.FC<Props> = ({
  session,
  onSubmitAnswer,
  onCompleteEarly,
  isLoading,
  lastEvaluation,
}) => {
  const [answerText, setAnswerText] = useState('');
  const [interimText, setInterimText] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const recognitionRef = useRef<any>(null);
  const shouldBeRecordingRef = useRef<boolean>(false);

  const currentQ: QuestionMetadata | null = session.currentQuestion;

  // Session timer
  useEffect(() => {
    const timer = setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Web Speech API: Continuous Speech-to-Text Engine
  useEffect(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      console.warn('SpeechRecognition API not available in this browser.');
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';
    recognition.maxAlternatives = 1;

    recognition.onresult = (event: any) => {
      let finalTranscriptChunk = '';
      let currentInterim = '';

      for (let i = event.resultIndex; i < event.results.length; ++i) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscriptChunk += transcript + ' ';
        } else {
          currentInterim += transcript;
        }
      }

      setInterimText(currentInterim);

      if (finalTranscriptChunk) {
        setAnswerText((prev) => {
          const trimmedPrev = prev.trim();
          const cleanChunk = finalTranscriptChunk.trim();
          return trimmedPrev ? `${trimmedPrev} ${cleanChunk}` : cleanChunk;
        });
        setInterimText('');
      }
    };

    recognition.onerror = (e: any) => {
      console.warn('Speech recognition warning/error:', e.error);
      // 'no-speech' happens when user pauses to think; do NOT cancel recording
      if (e.error === 'no-speech') {
        return;
      }
      if (e.error === 'not-allowed' || e.error === 'service-not-allowed') {
        alert('Microphone access was denied. Please allow microphone permissions in your browser URL bar.');
        shouldBeRecordingRef.current = false;
        setIsRecording(false);
        setInterimText('');
      }
    };

    // Auto-restart loop to prevent Chrome from auto-stopping after silence
    recognition.onend = () => {
      if (shouldBeRecordingRef.current) {
        try {
          recognition.start();
        } catch (err) {
          // In case start is called while already transitioning
          setTimeout(() => {
            if (shouldBeRecordingRef.current) {
              try {
                recognition.start();
              } catch (_) {}
            }
          }, 250);
        }
      } else {
        setIsRecording(false);
        setInterimText('');
      }
    };

    recognitionRef.current = recognition;

    return () => {
      shouldBeRecordingRef.current = false;
      try {
        recognition.stop();
      } catch (_) {}
    };
  }, []);

  const toggleRecording = async () => {
    if (!recognitionRef.current) {
      alert('Speech Recognition is not supported by your browser. Please use Google Chrome or Microsoft Edge, or type your answer.');
      return;
    }

    if (isRecording) {
      // User explicitly clicked "Stop Mic"
      shouldBeRecordingRef.current = false;
      setIsRecording(false);
      setInterimText('');
      try {
        recognitionRef.current.stop();
      } catch (err) {
        console.warn('Error stopping speech recognition:', err);
      }
    } else {
      // Request media stream first to ensure permission dialog doesn't abort recognition
      try {
        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          // Stop media tracks after acquiring permission
          stream.getTracks().forEach((track) => track.stop());
        }
      } catch (permErr) {
        console.warn('Mic permission error:', permErr);
      }

      shouldBeRecordingRef.current = true;
      setIsRecording(true);
      try {
        recognitionRef.current.start();
      } catch (err) {
        console.warn('Error starting speech recognition:', err);
      }
    }
  };

  // Text-to-Speech: VAANI Interviewer Voice
  const speakQuestion = () => {
    if (!currentQ || !('speechSynthesis' in window)) return;

    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }

    const utterance = new SpeechSynthesisUtterance(currentQ.question);
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    window.speechSynthesis.speak(utterance);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!answerText.trim() || isLoading) return;

    shouldBeRecordingRef.current = false;
    if (isRecording && recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (_) {}
      setIsRecording(false);
      setInterimText('');
    }

    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }

    const textToSubmit = answerText.trim();
    setAnswerText('');
    setInterimText('');
    await onSubmitAnswer(textToSubmit);
  };

  const formatTimer = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'Easy':
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
      case 'Medium':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
      case 'Hard':
        return 'bg-rose-500/10 text-rose-400 border-rose-500/20';
      default:
        return 'bg-slate-800 text-slate-300 border-slate-700';
    }
  };

  const getCategoryBadgeColor = (category: string) => {
    switch (category) {
      case 'Introduction':
        return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
      case 'Technical':
        return 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20';
      case 'Project':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
      case 'ProblemSolving':
        return 'bg-purple-500/10 text-purple-400 border-purple-500/20';
      case 'Behavioral':
        return 'bg-teal-500/10 text-teal-400 border-teal-500/20';
      default:
        return 'bg-slate-800 text-slate-300 border-slate-700';
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      {/* Top Session Stats Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 mb-6 flex flex-wrap items-center justify-between gap-4 shadow-lg">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-brand-500">
            <BrainCircuit className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-white">
                {session.candidateProfile.name}
              </h2>
              <span className="text-[11px] text-slate-400">
                ({session.candidateProfile.targetRole})
              </span>
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <span>Question {session.history.length + 1} of 5</span>
              <span>•</span>
              <span className="flex items-center gap-1 font-mono text-slate-300">
                <Clock className="w-3 h-3 text-brand-500" /> {formatTimer(elapsedSeconds)}
              </span>
            </div>
          </div>
        </div>

        {/* Live Stage Progress Indicator */}
        <div className="hidden lg:flex items-center gap-2">
          {['Introduction', 'Technical', 'Project', 'ProblemSolving', 'Behavioral'].map(
            (stage, idx) => {
              const isPast = session.history.length > idx;
              const isCurrent = session.history.length === idx;
              return (
                <div key={stage} className="flex items-center gap-1">
                  <div
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                      isCurrent
                        ? 'bg-brand-500 text-white shadow-md shadow-brand-500/20 ring-1 ring-brand-500'
                        : isPast
                        ? 'bg-slate-800 text-emerald-400 border border-emerald-500/30'
                        : 'bg-slate-950 text-slate-500 border border-slate-800'
                    }`}
                  >
                    {isPast && <CheckCircle2 className="w-3 h-3" />}
                    <span>{stage}</span>
                  </div>
                  {idx < 4 && <span className="text-slate-600 text-xs">→</span>}
                </div>
              );
            }
          )}
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          {session.history.length > 0 && (
            <button
              onClick={onCompleteEarly}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-750 text-slate-300 hover:text-white border border-slate-700 text-xs font-semibold transition-colors"
            >
              Generate Final Report
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Live Question & Answering (Span 2) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Active Question Card */}
          {currentQ ? (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl relative overflow-hidden">
              <div className="absolute top-0 left-0 h-1 bg-gradient-to-r from-brand-500 via-teal-400 to-indigo-500 w-full"></div>

              {/* Question Metadata Header */}
              <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`px-2.5 py-1 rounded-md text-xs font-bold uppercase tracking-wider border ${getCategoryBadgeColor(
                      currentQ.category
                    )}`}
                  >
                    {currentQ.category}
                  </span>

                  <span
                    className={`px-2.5 py-1 rounded-md text-xs font-bold uppercase tracking-wider border ${getDifficultyColor(
                      currentQ.difficulty
                    )}`}
                  >
                    Difficulty: {currentQ.difficulty}
                  </span>

                  <span className="px-2.5 py-1 rounded-md text-xs font-medium bg-slate-800 text-slate-300 border border-slate-700">
                    Skill: {currentQ.skill}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-400 font-mono flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-slate-500" />
                    Est: {currentQ.estimatedTime}
                  </span>

                  {/* Text-to-Speech Button */}
                  <button
                    onClick={speakQuestion}
                    className={`p-1.5 rounded-lg border text-xs transition-colors ${
                      isSpeaking
                        ? 'bg-brand-500/20 border-brand-500 text-brand-500 animate-pulse'
                        : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'
                    }`}
                    title={isSpeaking ? 'Stop Audio' : 'Listen to Question'}
                  >
                    {isSpeaking ? (
                      <VolumeX className="w-4 h-4" />
                    ) : (
                      <Volume2 className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              {/* Topic & Subtopic */}
              <div className="text-xs text-brand-500 font-mono font-medium mb-2">
                Topic: {currentQ.topic} → {currentQ.subtopic}
              </div>

              {/* Question Text */}
              <div className="text-lg sm:text-xl font-medium text-white leading-relaxed mb-4">
                {currentQ.question}
              </div>

              {/* Adaptive Selection Rationale */}
              <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800/80 text-xs text-slate-400 flex items-start gap-2.5">
                <Sparkles className="w-4 h-4 text-brand-500 shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold text-slate-300">
                    VAANI™ Adaptive Intent:{' '}
                  </span>
                  {currentQ.reason}
                </div>
              </div>

              {/* Evaluation Focus Badges */}
              <div className="mt-3 flex flex-wrap items-center gap-1.5">
                <span className="text-[11px] text-slate-500">Evaluation Focus:</span>
                {currentQ.evaluationFocus.map((f, i) => (
                  <span
                    key={i}
                    className="px-2 py-0.5 rounded text-[10px] font-mono bg-slate-800 text-slate-400 border border-slate-700"
                  >
                    {f}
                  </span>
                ))}
              </div>
            </div>
          ) : (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center text-slate-400">
              <Sparkles className="w-8 h-8 text-brand-500 mx-auto mb-2 animate-spin" />
              Evaluating responses and finalizing assessment report...
            </div>
          )}

          {/* Answer Input Card */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
            <div className="flex items-center justify-between mb-3">
              <label className="text-sm font-semibold text-white flex items-center gap-2">
                <span>Candidate Response</span>
                {isRecording && (
                  <span className="inline-flex items-center gap-1 text-xs text-rose-400 animate-pulse font-mono">
                    <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping"></span>
                    Listening (Live Transcribing)...
                  </span>
                )}
              </label>

              <div className="flex items-center gap-2">
                {/* Speech-to-Text Button */}
                <button
                  type="button"
                  onClick={toggleRecording}
                  className={`px-3 py-1.5 rounded-lg border text-xs font-semibold flex items-center gap-1.5 transition-all ${
                    isRecording
                      ? 'bg-rose-500/20 border-rose-500/50 text-rose-400 shadow-md shadow-rose-500/20'
                      : 'bg-slate-800 border-slate-700 text-slate-300 hover:text-white hover:bg-slate-750'
                  }`}
                  title="Click to speak your answer"
                >
                  {isRecording ? (
                    <>
                      <MicOff className="w-3.5 h-3.5 text-rose-400" />
                      <span>Stop Mic</span>
                    </>
                  ) : (
                    <>
                      <Mic className="w-3.5 h-3.5 text-brand-500" />
                      <span>Speak Answer</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {isRecording && (
                <div className="flex items-center justify-between p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="flex h-2.5 w-2.5 relative">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-500"></span>
                    </span>
                    <span className="font-semibold text-rose-400">Microphone Active:</span>
                    <span>Speak freely. Your answer will keep transcribing until you click "Stop Mic".</span>
                  </div>
                </div>
              )}

              {interimText && (
                <div className="p-2.5 rounded-lg bg-slate-950 border border-brand-500/40 text-xs text-brand-400 font-mono animate-pulse">
                  Listening: "{interimText}..."
                </div>
              )}

              <div className="relative">
                <textarea
                  rows={6}
                  value={answerText}
                  onChange={(e) => setAnswerText(e.target.value)}
                  placeholder="Type your technical answer here, or click 'Speak Answer' to talk directly to VAANI™... (Provide implementation rationale, design decisions, edge cases, and metrics)"
                  disabled={isLoading}
                  className="w-full px-4 py-3 bg-slate-950 border border-slate-750 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-brand-500 transition-colors resize-y leading-relaxed font-sans"
                />
                <div className="absolute bottom-3 right-3 text-[11px] text-slate-500 font-mono">
                  {answerText.trim().split(/\s+/).filter(Boolean).length} words
                </div>
              </div>

              <div className="flex items-center justify-between">
                <p className="text-xs text-slate-400">
                  Tip: Strong answers include quantitative metrics, failure modes, and clear technical rationale.
                </p>

                <button
                  type="submit"
                  disabled={isLoading || !answerText.trim()}
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-brand-600 to-teal-500 hover:from-brand-500 hover:to-teal-400 text-white font-bold text-sm flex items-center gap-2 shadow-lg shadow-brand-500/25 transition-all disabled:opacity-50 disabled:pointer-events-none"
                >
                  {isLoading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      <span>Evaluating Response...</span>
                    </>
                  ) : (
                    <>
                      <span>Submit Answer</span>
                      <Send className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Right Column: Live Recruiter Avatar, Skill Evolution & Last Feedback (Span 1) */}
        <div className="space-y-6">
          {/* Animated AI Recruiter Avatar with Neural Voice */}
          {currentQ && (
            <InterviewerAvatar
              textToSpeak={currentQ.question}
              isCandidateAnswering={isRecording}
              isEvaluating={isLoading}
              questionNumber={session.history.length + 1}
            />
          )}

          {/* Real-time Candidate Skill Profile */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl">
            <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-brand-500" />
                <h3 className="text-sm font-bold text-white">Live Candidate Skill Profile</h3>
              </div>
              <span className="text-[10px] font-mono bg-brand-500/10 text-brand-500 px-2 py-0.5 rounded-full border border-brand-500/20">
                Evolving
              </span>
            </div>

            <div className="space-y-3">
              {Object.entries(session.skillProfile).map(([skill, score]) => {
                const percentage = Math.min(100, Math.max(10, score * 10));
                return (
                  <div key={skill}>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="text-slate-300 font-medium">{skill}</span>
                      <span className="font-mono font-bold text-brand-500">{score}/10</span>
                    </div>
                    <div className="w-full bg-slate-950 rounded-full h-2 overflow-hidden border border-slate-800">
                      <div
                        className="bg-gradient-to-r from-brand-600 to-teal-400 h-2 rounded-full transition-all duration-500"
                        style={{ width: `${percentage}%` }}
                      ></div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Last Answer Evaluation Card */}
          {lastEvaluation ? (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl">
              <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <Award className="w-4 h-4 text-amber-400" />
                  <h3 className="text-sm font-bold text-white">Previous Answer Evaluation</h3>
                </div>
                <span className="px-2 py-0.5 rounded-md text-xs font-bold font-mono bg-amber-500/10 text-amber-400 border border-amber-500/20">
                  {lastEvaluation.overallScore}/10 Overall
                </span>
              </div>

              {/* Metric Breakdown Grid */}
              <div className="grid grid-cols-3 gap-2 mb-4 text-center">
                <div className="p-2 rounded-lg bg-slate-950 border border-slate-800">
                  <div className="text-[10px] text-slate-400">Technical</div>
                  <div className="text-sm font-bold font-mono text-indigo-400">
                    {lastEvaluation.technicalAccuracy}/10
                  </div>
                </div>
                <div className="p-2 rounded-lg bg-slate-950 border border-slate-800">
                  <div className="text-[10px] text-slate-400">Depth</div>
                  <div className="text-sm font-bold font-mono text-teal-400">
                    {lastEvaluation.depth}/10
                  </div>
                </div>
                <div className="p-2 rounded-lg bg-slate-950 border border-slate-800">
                  <div className="text-[10px] text-slate-400">Communication</div>
                  <div className="text-sm font-bold font-mono text-emerald-400">
                    {lastEvaluation.communication}/10
                  </div>
                </div>
              </div>

              {/* Strengths */}
              {lastEvaluation.strengths.length > 0 && (
                <div className="mb-3">
                  <span className="text-[11px] font-semibold text-emerald-400 flex items-center gap-1 mb-1">
                    <CheckCircle2 className="w-3 h-3" /> Strengths
                  </span>
                  <ul className="text-xs text-slate-300 space-y-1 list-disc list-inside">
                    {lastEvaluation.strengths.map((str, i) => (
                      <li key={i}>{str}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Weaknesses */}
              {lastEvaluation.weaknesses.length > 0 && (
                <div className="mb-3">
                  <span className="text-[11px] font-semibold text-amber-400 flex items-center gap-1 mb-1">
                    <AlertCircle className="w-3 h-3" /> Gaps & Follow-ups
                  </span>
                  <ul className="text-xs text-slate-300 space-y-1 list-disc list-inside">
                    {lastEvaluation.weaknesses.map((w, i) => (
                      <li key={i}>{w}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Extracted Claims */}
              {lastEvaluation.extractedClaims && lastEvaluation.extractedClaims.length > 0 && (
                <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs text-amber-200">
                  <div className="flex items-center gap-1 font-semibold text-amber-400 mb-1">
                    <ShieldAlert className="w-3.5 h-3.5" /> Extracted Claim:
                  </div>
                  "{lastEvaluation.extractedClaims.join('; ')}"
                </div>
              )}
            </div>
          ) : (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 text-center text-slate-400 text-xs">
              <HelpCircle className="w-6 h-6 text-slate-600 mx-auto mb-2" />
              Answer the current question above to see real-time AI scoring, technical depth analysis, and difficulty adaptation.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
