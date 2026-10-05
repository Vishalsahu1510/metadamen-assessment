import React, { useEffect, useState } from 'react';
import { InterviewSession } from '../types';
import { api } from '../services/api';
import {
  History,
  Trash2,
  Eye,
  Calendar,
  Building,
  GraduationCap,
  Sparkles,
} from 'lucide-react';

interface Props {
  onSelectSession: (session: InterviewSession) => void;
}

export const SessionHistory: React.FC<Props> = ({ onSelectSession }) => {
  const [sessions, setSessions] = useState<InterviewSession[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchSessions = async () => {
    try {
      setLoading(true);
      const data = await api.listSessions();
      setSessions(data);
    } catch (err) {
      console.error('Error fetching sessions:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSessions();
  }, []);

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Are you sure you want to delete this interview record?')) return;
    try {
      await api.deleteSession(id);
      setSessions((prev) => prev.filter((s) => s.id !== id));
    } catch (err) {
      console.error('Failed to delete session:', err);
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8 pb-4 border-b border-slate-800">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <History className="w-6 h-6 text-brand-500" />
            Interview Archive & Candidate Dossiers
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Access past adaptive interviews, transcripts, scoring matrices, and finalized assessment reports.
          </p>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-16 text-slate-400">
          <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
          Loading past interviews...
        </div>
      ) : sessions.length === 0 ? (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center text-slate-400">
          <Sparkles className="w-10 h-10 text-slate-600 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-white mb-1">No Past Interviews Found</h3>
          <p className="text-xs text-slate-500">
            Start a new interview by filling out the candidate profile.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {sessions.map((session) => (
            <div
              key={session.id}
              onClick={() => onSelectSession(session)}
              className="bg-slate-900 border border-slate-800 hover:border-brand-500/50 rounded-2xl p-5 shadow-lg cursor-pointer transition-all hover:translate-y-[-2px] group"
            >
              <div className="flex items-start justify-between gap-3 mb-3">
                <div>
                  <h3 className="text-lg font-bold text-white group-hover:text-brand-500 transition-colors">
                    {session.candidateProfile.name}
                  </h3>
                  <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
                    <Building className="w-3.5 h-3.5 text-slate-500" />
                    <span>
                      {session.candidateProfile.targetRole} @ {session.candidateProfile.targetCompany}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span
                    className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider border ${
                      session.status === 'completed'
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                        : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                    }`}
                  >
                    {session.status}
                  </span>

                  <button
                    onClick={(e) => handleDelete(session.id, e)}
                    className="text-slate-500 hover:text-rose-400 p-1 transition-colors"
                    title="Delete Record"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-2 text-xs text-slate-400 mb-3">
                <GraduationCap className="w-3.5 h-3.5 text-slate-500" />
                <span>
                  {session.candidateProfile.year} • {session.candidateProfile.branch}
                </span>
              </div>

              {session.finalReport && (
                <div className="mb-3 p-2.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between text-xs">
                  <span className="text-slate-400">Recommendation:</span>
                  <span className="font-bold font-mono text-brand-500">
                    {session.finalReport.overallRecommendation} (
                    {session.finalReport.assessmentAreas.overallReadiness}%)
                  </span>
                </div>
              )}

              <div className="flex items-center justify-between pt-3 border-t border-slate-800/80 text-[11px] text-slate-500">
                <span className="flex items-center gap-1 font-mono">
                  <Calendar className="w-3 h-3" />
                  {new Date(session.createdAt).toLocaleDateString()}
                </span>
                <span className="flex items-center gap-1 text-brand-500 font-semibold">
                  <Eye className="w-3.5 h-3.5" /> View Dossier
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
