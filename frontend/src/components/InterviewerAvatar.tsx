import React, { useState, useEffect, useRef } from 'react';
import {
  Volume2,
  VolumeX,
  RotateCcw,
  Sparkles,
  Headphones,
  SlidersHorizontal,
} from 'lucide-react';

interface Props {
  textToSpeak: string;
  isCandidateAnswering: boolean;
  isEvaluating: boolean;
  questionNumber: number;
}

export const InterviewerAvatar: React.FC<Props> = ({
  textToSpeak,
  isCandidateAnswering,
  isEvaluating,
  questionNumber,
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [autoSpeak, setAutoSpeak] = useState(true);
  const [selectedVoice, setSelectedVoice] = useState('en-US-AvaNeural');
  const [mouthOpen, setMouthOpen] = useState(0); // 0 (closed) to 1 (open)
  const [isBlinking, setIsBlinking] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const [showVoiceSettings, setShowVoiceSettings] = useState(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const previousTextRef = useRef<string>('');

  // Eye blinking loop (natural 3-4s blinks)
  useEffect(() => {
    const blinkInterval = setInterval(() => {
      setIsBlinking(true);
      setTimeout(() => setIsBlinking(false), 150);
    }, 3500);

    return () => clearInterval(blinkInterval);
  }, []);

  // Voice options
  const voices = [
    { id: 'en-US-AvaNeural', name: 'Ava (US Female - Natural)' },
    { id: 'en-US-AndrewNeural', name: 'Andrew (US Male - Professional)' },
    { id: 'en-US-JennyNeural', name: 'Jenny (US Female - Warm)' },
    { id: 'en-IN-NeerjaNeural', name: 'Neerja (Indian English)' },
  ];

  // Auto-speak when new question arrives
  useEffect(() => {
    if (textToSpeak && textToSpeak !== previousTextRef.current) {
      previousTextRef.current = textToSpeak;
      if (autoSpeak) {
        // Small delay to allow component mounting
        const timer = setTimeout(() => {
          speakQuestion(textToSpeak);
        }, 400);
        return () => clearTimeout(timer);
      }
    }
  }, [textToSpeak, questionNumber, autoSpeak]);

  // Clean up audio on unmount
  useEffect(() => {
    return () => {
      stopAudio();
    };
  }, []);

  const stopAudio = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = '';
      audioRef.current = null;
    }
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    setIsPlaying(false);
    setMouthOpen(0);
    setAudioLevel(0);
  };

  const speakQuestion = async (text: string) => {
    stopAudio();

    if (!text || text.trim().length === 0) return;

    try {
      setIsPlaying(true);

      // Call backend EdgeTTS neural voice endpoint
      const response = await fetch('/api/audio/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, voice: selectedVoice }),
      });

      if (!response.ok) {
        throw new Error('Neural TTS failed, falling back to browser voice');
      }

      const blob = await response.blob();
      const audioUrl = URL.createObjectURL(blob);
      const audio = new Audio(audioUrl);
      audioRef.current = audio;

      // Connect Web Audio API Analyser for real-time lip sync
      try {
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioContextClass) {
          const audioContext = new AudioContextClass();
          audioContextRef.current = audioContext;
          const source = audioContext.createMediaElementSource(audio);
          const analyser = audioContext.createAnalyser();
          analyser.fftSize = 64;
          source.connect(analyser);
          analyser.connect(audioContext.destination);
          analyserRef.current = analyser;

          const dataArray = new Uint8Array(analyser.frequencyBinCount);
          const updateLipSync = () => {
            if (!analyserRef.current || !audioRef.current || audioRef.current.paused) {
              setMouthOpen(0);
              setAudioLevel(0);
              return;
            }
            analyserRef.current.getByteFrequencyData(dataArray);
            let sum = 0;
            for (let i = 0; i < dataArray.length; i++) {
              sum += dataArray[i];
            }
            const avg = sum / dataArray.length;
            const normalized = Math.min(1, avg / 80);
            setMouthOpen(normalized);
            setAudioLevel(normalized);
            animationFrameRef.current = requestAnimationFrame(updateLipSync);
          };
          animationFrameRef.current = requestAnimationFrame(updateLipSync);
        }
      } catch (audioCtxErr) {
        // Fallback procedural mouth oscillation if Web Audio API is restricted
        const interval = setInterval(() => {
          if (!audioRef.current || audioRef.current.paused) {
            clearInterval(interval);
            setMouthOpen(0);
          } else {
            setMouthOpen(Math.random() * 0.8 + 0.2);
            setAudioLevel(Math.random());
          }
        }, 120);
      }

      audio.onended = () => {
        setIsPlaying(false);
        setMouthOpen(0);
        setAudioLevel(0);
      };

      audio.onerror = () => {
        fallbackBrowserSpeech(text);
      };

      await audio.play();
    } catch (err) {
      console.warn('Backend EdgeTTS unavailable, falling back to browser speech synthesis:', err);
      fallbackBrowserSpeech(text);
    }
  };

  const fallbackBrowserSpeech = (text: string) => {
    if (!('speechSynthesis' in window)) {
      setIsPlaying(false);
      return;
    }
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.0;
    utterance.pitch = 1.0;

    utterance.onstart = () => {
      setIsPlaying(true);
      const interval = setInterval(() => {
        if (!window.speechSynthesis.speaking) {
          clearInterval(interval);
          setMouthOpen(0);
          setAudioLevel(0);
        } else {
          setMouthOpen(Math.random() * 0.7 + 0.3);
          setAudioLevel(Math.random());
        }
      }, 130);
    };

    utterance.onend = () => {
      setIsPlaying(false);
      setMouthOpen(0);
      setAudioLevel(0);
    };

    utterance.onerror = () => {
      setIsPlaying(false);
      setMouthOpen(0);
      setAudioLevel(0);
    };

    window.speechSynthesis.speak(utterance);
  };

  // Determine current active status text
  const getStatusInfo = () => {
    if (isEvaluating) {
      return {
        badge: 'Neural Analysis',
        text: 'Evaluating technical depth & trade-offs...',
        color: 'text-amber-400 border-amber-500/30 bg-amber-500/10',
        ring: 'ring-amber-500/40',
      };
    }
    if (isPlaying) {
      return {
        badge: 'Speaking Question',
        text: 'Asking interview question with neural voice...',
        color: 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10',
        ring: 'ring-emerald-500/50',
      };
    }
    if (isCandidateAnswering) {
      return {
        badge: 'Listening Intently',
        text: 'Transcribing & analyzing candidate response...',
        color: 'text-brand-400 border-brand-500/30 bg-brand-500/10',
        ring: 'ring-brand-500/30',
      };
    }
    return {
      badge: 'Ready',
      text: 'Virtual Interviewer Connected',
      color: 'text-slate-400 border-slate-700 bg-slate-800',
      ring: 'ring-slate-700/30',
    };
  };

  const status = getStatusInfo();

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-2xl relative overflow-hidden flex flex-col justify-between">
      {/* Top Header / Video Call Pill */}
      <div className="flex items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping"></div>
          <span className="text-xs font-bold uppercase tracking-wider text-white flex items-center gap-1.5 font-mono">
            <Sparkles className="w-3.5 h-3.5 text-brand-400" />
            VAANI™ AI Recruiter Feed
          </span>
        </div>

        <div className="flex items-center gap-2">
          <span
            className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold font-mono uppercase tracking-wide border ${status.color}`}
          >
            {status.badge}
          </span>

          <button
            onClick={() => setShowVoiceSettings(!showVoiceSettings)}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-750 text-slate-300 hover:text-white border border-slate-700 transition-colors"
            title="Voice & Speech Settings"
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Voice Settings Flyout Drawer */}
      {showVoiceSettings && (
        <div className="mb-4 p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-2 text-xs">
          <div className="flex items-center justify-between">
            <span className="text-slate-300 font-semibold">Select AI Neural Voice:</span>
            <label className="flex items-center gap-1.5 text-slate-400 cursor-pointer">
              <input
                type="checkbox"
                checked={autoSpeak}
                onChange={(e) => setAutoSpeak(e.target.checked)}
                className="rounded border-slate-700 text-brand-500 focus:ring-brand-500"
              />
              <span>Auto-Speak</span>
            </label>
          </div>
          <select
            value={selectedVoice}
            onChange={(e) => {
              setSelectedVoice(e.target.value);
              stopAudio();
            }}
            className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-750 text-white font-medium focus:outline-none focus:border-brand-500"
          >
            {voices.map((v) => (
              <option key={v.id} value={v.id}>
                {v.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Interactive Avatar Video Canvas */}
      <div className="relative flex flex-col items-center justify-center py-6 px-4 bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 rounded-2xl border border-slate-800/80 overflow-hidden group">
        {/* Ambient Halo Ring */}
        <div
          className={`absolute w-44 h-44 rounded-full filter blur-2xl opacity-20 transition-all duration-700 ${
            isPlaying
              ? 'bg-emerald-400 scale-125 opacity-30'
              : isCandidateAnswering
              ? 'bg-brand-500 scale-110 opacity-25'
              : 'bg-indigo-500'
          }`}
        ></div>

        {/* Headset / Communicator Icon */}
        <div className="absolute top-3 left-3 flex items-center gap-1 text-[10px] text-slate-500 font-mono">
          <Headphones className="w-3 h-3 text-brand-400" />
          <span>Azure Neural TTS 24kHz</span>
        </div>

        {/* SVG Animated Avatar Character */}
        <div
          className={`relative z-10 transition-transform duration-300 ${
            isPlaying ? 'scale-105' : 'scale-100'
          }`}
        >
          <svg
            width="140"
            height="140"
            viewBox="0 0 140 140"
            className="drop-shadow-[0_10px_20px_rgba(0,0,0,0.5)]"
          >
            <defs>
              <linearGradient id="faceGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#1e293b" />
                <stop offset="100%" stopColor="#0f172a" />
              </linearGradient>
              <linearGradient id="accentGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#14b8a6" />
                <stop offset="100%" stopColor="#06b6d4" />
              </linearGradient>
              <linearGradient id="glowGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#10b981" />
                <stop offset="100%" stopColor="#14b8a6" />
              </linearGradient>
            </defs>

            {/* Recruiter Head Base / Face Silhouette */}
            <circle
              cx="70"
              cy="70"
              r="52"
              fill="url(#faceGrad)"
              stroke={isPlaying ? '#10b981' : '#334155'}
              strokeWidth={isPlaying ? '3' : '2'}
              className="transition-colors duration-300"
            />

            {/* Hair / Forehead Frame */}
            <path
              d="M 28 62 C 30 35, 110 35, 112 62 C 105 48, 35 48, 28 62 Z"
              fill="#334155"
            />

            {/* Left Eye */}
            {isBlinking ? (
              <line x1="45" y1="65" x2="57" y2="65" stroke="#94a3b8" strokeWidth="2.5" strokeLinecap="round" />
            ) : (
              <g>
                <circle cx="51" cy="64" r="5.5" fill="#f8fafc" />
                <circle
                  cx={isPlaying ? 52 : 51}
                  cy="64"
                  r="3.2"
                  fill="#0d9488"
                  className="transition-all"
                />
                <circle cx="49.5" cy="62.5" r="1.2" fill="#ffffff" />
              </g>
            )}

            {/* Right Eye */}
            {isBlinking ? (
              <line x1="83" y1="65" x2="95" y2="65" stroke="#94a3b8" strokeWidth="2.5" strokeLinecap="round" />
            ) : (
              <g>
                <circle cx="89" cy="64" r="5.5" fill="#f8fafc" />
                <circle
                  cx={isPlaying ? 90 : 89}
                  cy="64"
                  r="3.2"
                  fill="#0d9488"
                  className="transition-all"
                />
                <circle cx="87.5" cy="62.5" r="1.2" fill="#ffffff" />
              </g>
            )}

            {/* Eyebrows (Dynamic expression when speaking or listening) */}
            <path
              d={isPlaying ? 'M 44 54 Q 51 51 58 55' : 'M 44 55 Q 51 53 58 55'}
              stroke="#64748b"
              strokeWidth="2"
              fill="none"
              strokeLinecap="round"
            />
            <path
              d={isPlaying ? 'M 82 55 Q 89 51 96 54' : 'M 82 55 Q 89 53 96 55'}
              stroke="#64748b"
              strokeWidth="2"
              fill="none"
              strokeLinecap="round"
            />

            {/* Nose Tip */}
            <path
              d="M 70 67 L 68 76 L 72 76"
              stroke="#475569"
              strokeWidth="1.8"
              fill="none"
              strokeLinecap="round"
            />

            {/* Animated Mouth (Lip-Synced via mouthOpen value 0 to 1) */}
            {mouthOpen > 0.05 ? (
              <g>
                <ellipse
                  cx="70"
                  cy="91"
                  rx={8 + mouthOpen * 6}
                  ry={2 + mouthOpen * 8}
                  fill="#020617"
                  stroke="#14b8a6"
                  strokeWidth="1.8"
                />
                {/* Teeth highlight */}
                <path
                  d={`M ${70 - (4 + mouthOpen * 3)} 88 Q 70 87 ${70 + (4 + mouthOpen * 3)} 88`}
                  stroke="#ffffff"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
              </g>
            ) : (
              /* Closed friendly smile */
              <path
                d="M 61 90 Q 70 94 79 90"
                stroke="#64748b"
                strokeWidth="2.5"
                fill="none"
                strokeLinecap="round"
              />
            )}

            {/* Professional AI Recruiter Headset / Mic Boom */}
            <path
              d="M 22 70 C 20 40, 120 40, 118 70"
              stroke="#38bdf8"
              strokeWidth="3.5"
              fill="none"
              strokeLinecap="round"
              opacity="0.8"
            />
            {/* Left Ear Cup */}
            <rect x="18" y="62" width="6" height="16" rx="3" fill="#0284c7" />
            {/* Right Ear Cup */}
            <rect x="116" y="62" width="6" height="16" rx="3" fill="#0284c7" />
            {/* Mic boom curving down towards mouth with illuminated LED */}
            <path
              d="M 119 72 Q 105 92 84 94"
              stroke="#0ea5e9"
              strokeWidth="2.5"
              fill="none"
              strokeLinecap="round"
            />
            <circle
              cx="83"
              cy="94"
              r={isPlaying ? '3.5' : '2.5'}
              fill={isPlaying ? '#10b981' : '#0284c7'}
              className="transition-all duration-200"
            />
          </svg>
        </div>

        {/* Dynamic Sound Equalizer Waves */}
        <div className="flex items-center gap-1 mt-3 h-5">
          {[4, 8, 12, 16, 14, 18, 15, 10, 6, 14, 8, 4].map((baseHeight, idx) => {
            const dynamicHeight = isPlaying
              ? Math.max(3, Math.min(20, baseHeight * (audioLevel * 1.6 + 0.3)))
              : 3;
            return (
              <span
                key={idx}
                className={`w-1 rounded-full transition-all duration-75 ${
                  isPlaying ? 'bg-emerald-400' : 'bg-slate-700'
                }`}
                style={{ height: `${dynamicHeight}px` }}
              ></span>
            );
          })}
        </div>

        <p className="text-[11px] text-slate-400 text-center mt-2 max-w-xs font-medium">
          {status.text}
        </p>
      </div>

      {/* Audio Playback & Replay Controls */}
      <div className="flex items-center justify-between gap-2 mt-4 pt-3 border-t border-slate-800">
        <button
          onClick={() => (isPlaying ? stopAudio() : speakQuestion(textToSpeak))}
          className={`flex-1 px-3 py-2 rounded-xl font-bold text-xs flex items-center justify-center gap-2 border transition-all ${
            isPlaying
              ? 'bg-rose-500/20 border-rose-500/40 text-rose-400 hover:bg-rose-500/30'
              : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20'
          }`}
        >
          {isPlaying ? (
            <>
              <VolumeX className="w-4 h-4 text-rose-400" />
              <span>Stop Speaking</span>
            </>
          ) : (
            <>
              <Volume2 className="w-4 h-4 text-emerald-400" />
              <span>Ask Aloud (Neural Voice)</span>
            </>
          )}
        </button>

        <button
          onClick={() => speakQuestion(textToSpeak)}
          className="p-2 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-300 hover:text-white border border-slate-700 transition-colors"
          title="Replay Voice Question"
        >
          <RotateCcw className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
