import React, { useState } from 'react';
import { AssessmentReport, InterviewSession } from '../types';
import {
  CheckCircle2,
  AlertTriangle,
  BookOpen,
  Download,
  Printer,
  ChevronDown,
  ChevronUp,
  BrainCircuit,
  Target,
  BarChart3,
  TrendingUp,
} from 'lucide-react';
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';

interface Props {
  session: InterviewSession;
  report: AssessmentReport;
  onRestart: () => void;
}

export const AssessmentDashboard: React.FC<Props> = ({ session, report, onRestart }) => {
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

  const getRecommendationBadge = (recommendation: string) => {
    switch (recommendation) {
      case 'Strong Candidate':
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
      case 'Placement Ready':
        return 'bg-teal-500/10 text-teal-400 border-teal-500/30';
      case 'Developing':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/30';
      case 'Needs Improvement':
        return 'bg-rose-500/10 text-rose-400 border-rose-500/30';
      default:
        return 'bg-slate-800 text-slate-300 border-slate-700';
    }
  };

  // Prepare data for Radar Chart
  const radarData = [
    {
      subject: 'Technical Knowledge',
      score: report.assessmentAreas.technicalKnowledge,
      fullMark: 100,
    },
    {
      subject: 'Problem Solving',
      score: report.assessmentAreas.problemSolving,
      fullMark: 100,
    },
    {
      subject: 'Communication',
      score: report.assessmentAreas.communication,
      fullMark: 100,
    },
    {
      subject: 'Project Depth',
      score: report.assessmentAreas.projectUnderstanding,
      fullMark: 100,
    },
    {
      subject: 'Behavioral / Team',
      score: report.assessmentAreas.behavioral,
      fullMark: 100,
    },
  ];

  // Prepare data for Difficulty & Score Timeline
  const timelineData = report.difficultyProgression.map((item) => ({
    name: `Q${item.questionNumber} (${item.category.slice(0, 4)})`,
    score: item.score,
    difficulty: item.difficulty,
  }));

  const handleExportJson = () => {
    const dataStr =
      'data:text/json;charset=utf-8,' +
      encodeURIComponent(JSON.stringify({ session, report }, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute(
      'download',
      `VAANI_Assessment_${report.candidateName.replace(/\s+/g, '_')}.json`
    );
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-8 print:p-0 print:space-y-4">
      {/* Header Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden print:border-none print:shadow-none print:p-0">
        <div className="absolute top-0 right-0 w-96 h-96 bg-brand-500/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-3 py-1 rounded-full text-xs font-bold font-mono uppercase bg-brand-500/10 text-brand-500 border border-brand-500/20">
                Official Assessment Dossier
              </span>
              <span className="text-xs text-slate-400">
                Completed on {new Date(report.completedAt).toLocaleDateString()}
              </span>
            </div>

            <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
              {report.candidateName}
            </h1>
            <p className="text-slate-300 font-medium text-sm mt-1">
              Evaluated for{' '}
              <span className="text-brand-500 font-semibold">{report.targetRole}</span> at{' '}
              <span className="text-white font-semibold">{report.targetCompany}</span>
            </p>
          </div>

          <div className="flex flex-col items-start md:items-end gap-2">
            <span className="text-xs text-slate-400 uppercase font-mono tracking-wider">
              Overall Hiring Recommendation
            </span>
            <div
              className={`px-4 py-2 rounded-xl text-lg font-extrabold uppercase tracking-wide border shadow-md ${getRecommendationBadge(
                report.overallRecommendation
              )}`}
            >
              {report.overallRecommendation}
            </div>

            <div className="flex items-center gap-2 mt-1">
              <span className="text-xs text-slate-400">Composite Readiness:</span>
              <span className="text-xl font-mono font-black text-white">
                {report.assessmentAreas.overallReadiness}%
              </span>
            </div>
          </div>
        </div>

        {/* Action Buttons (Hidden on Print) */}
        <div className="flex flex-wrap items-center gap-3 mt-6 pt-6 border-t border-slate-800 print:hidden">
          <button
            onClick={() => window.print()}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-200 text-xs font-semibold flex items-center gap-2 border border-slate-700 transition-colors"
          >
            <Printer className="w-4 h-4 text-slate-400" />
            <span>Print Report</span>
          </button>

          <button
            onClick={handleExportJson}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-200 text-xs font-semibold flex items-center gap-2 border border-slate-700 transition-colors"
          >
            <Download className="w-4 h-4 text-brand-500" />
            <span>Export JSON Dossier</span>
          </button>

          <button
            onClick={onRestart}
            className="ml-auto px-5 py-2 rounded-xl bg-brand-500 hover:bg-brand-600 text-white text-xs font-bold shadow-md shadow-brand-500/20 transition-all"
          >
            New Interview Session
          </button>
        </div>
      </div>

      {/* 5 Core Assessment Areas Score Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          {
            label: 'Technical Knowledge',
            score: report.assessmentAreas.technicalKnowledge,
            color: 'from-blue-500 to-indigo-600',
          },
          {
            label: 'Problem Solving',
            score: report.assessmentAreas.problemSolving,
            color: 'from-purple-500 to-violet-600',
          },
          {
            label: 'Communication',
            score: report.assessmentAreas.communication,
            color: 'from-emerald-500 to-teal-600',
          },
          {
            label: 'Project Depth',
            score: report.assessmentAreas.projectUnderstanding,
            color: 'from-amber-500 to-orange-600',
          },
          {
            label: 'Behavioral / HR',
            score: report.assessmentAreas.behavioral,
            color: 'from-pink-500 to-rose-600',
          },
          {
            label: 'Overall Readiness',
            score: report.assessmentAreas.overallReadiness,
            color: 'from-brand-600 to-teal-400',
          },
        ].map((item, idx) => (
          <div
            key={idx}
            className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between shadow-md"
          >
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
              {item.label}
            </span>
            <div>
              <div className="text-2xl font-black font-mono text-white mb-2">
                {item.score}%
              </div>
              <div className="w-full bg-slate-950 rounded-full h-2 overflow-hidden border border-slate-800">
                <div
                  className={`h-2 rounded-full bg-gradient-to-r ${item.color}`}
                  style={{ width: `${item.score}%` }}
                ></div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Visual Analytics: Radar & Difficulty Progression */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Competency Radar Chart */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
          <div className="flex items-center gap-2 mb-4 pb-2 border-b border-slate-800">
            <BarChart3 className="w-5 h-5 text-brand-500" />
            <h3 className="text-base font-bold text-white">Competency Radar Matrix</h3>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={radarData}>
                <PolarGrid stroke="#334155" />
                <PolarAngleAxis dataKey="subject" tick={{ fill: '#94a3b8', fontSize: 11 }} />
                <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fill: '#64748b', fontSize: 10 }} />
                <Radar
                  name="Score"
                  dataKey="score"
                  stroke="#14b8a6"
                  fill="#14b8a6"
                  fillOpacity={0.4}
                />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Difficulty & Score Timeline */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
          <div className="flex items-center gap-2 mb-4 pb-2 border-b border-slate-800">
            <TrendingUp className="w-5 h-5 text-teal-400" />
            <h3 className="text-base font-bold text-white">Adaptive Difficulty Progression</h3>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={timelineData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="name" tick={{ fill: '#94a3b8', fontSize: 11 }} />
                <YAxis domain={[0, 10]} tick={{ fill: '#64748b', fontSize: 11 }} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px' }}
                />
                <Line
                  type="monotone"
                  dataKey="score"
                  stroke="#0d9488"
                  strokeWidth={3}
                  activeDot={{ r: 8 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Rationale & Insights */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Strengths */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-md">
          <div className="flex items-center gap-2 mb-3 text-emerald-400">
            <CheckCircle2 className="w-5 h-5" />
            <h3 className="text-sm font-bold uppercase tracking-wider">Demonstrated Strengths</h3>
          </div>
          <ul className="space-y-2 text-xs text-slate-300">
            {report.strengths.map((str, i) => (
              <li key={i} className="flex items-start gap-2">
                <span className="text-emerald-500 font-bold">•</span>
                <span>{str}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Areas for Improvement */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-md">
          <div className="flex items-center gap-2 mb-3 text-amber-400">
            <AlertTriangle className="w-5 h-5" />
            <h3 className="text-sm font-bold uppercase tracking-wider">Areas for Improvement</h3>
          </div>
          <ul className="space-y-2 text-xs text-slate-300">
            {report.areasForImprovement.map((area, i) => (
              <li key={i} className="flex items-start gap-2">
                <span className="text-amber-500 font-bold">•</span>
                <span>{area}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Recommended Learning */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-md">
          <div className="flex items-center gap-2 mb-3 text-brand-500">
            <BookOpen className="w-5 h-5" />
            <h3 className="text-sm font-bold uppercase tracking-wider">Recommended Learning</h3>
          </div>
          <ul className="space-y-2 text-xs text-slate-300">
            {report.recommendedLearning.map((learn, i) => (
              <li key={i} className="flex items-start gap-2">
                <span className="text-brand-500 font-bold">•</span>
                <span>{learn}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Recommendation Rationale */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-md">
        <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-2 flex items-center gap-2">
          <Target className="w-4 h-4 text-brand-500" /> Executive Hiring Synthesis
        </h3>
        <p className="text-slate-300 text-sm leading-relaxed whitespace-pre-line">
          {report.recommendationRationale}
        </p>
      </div>

      {/* Transcript & Detailed Answer Breakdown */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-md">
        <h3 className="text-base font-bold text-white mb-4 pb-2 border-b border-slate-800 flex items-center gap-2">
          <BrainCircuit className="w-5 h-5 text-indigo-400" />
          Complete Question-by-Question Transcript & Evaluation
        </h3>

        <div className="space-y-4">
          {session.history.map((item, idx) => {
            const isExpanded = expandedIndex === idx;
            return (
              <div
                key={idx}
                className="bg-slate-950 border border-slate-800 rounded-xl p-4 transition-all"
              >
                <div
                  onClick={() => setExpandedIndex(isExpanded ? null : idx)}
                  className="flex flex-wrap items-center justify-between gap-3 cursor-pointer select-none"
                >
                  <div className="flex items-center gap-2 flex-1">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold font-mono bg-slate-800 text-brand-500">
                      Q{idx + 1}
                    </span>
                    <span className="text-xs font-semibold text-white">
                      [{item.question.category}] {item.question.topic}
                    </span>
                    <span className="text-[10px] text-slate-400">
                      ({item.question.difficulty})
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="text-xs font-mono font-bold text-teal-400">
                      Score: {item.evaluation.overallScore}/10
                    </span>
                    {isExpanded ? (
                      <ChevronUp className="w-4 h-4 text-slate-400" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-slate-400" />
                    )}
                  </div>
                </div>

                {isExpanded && (
                  <div className="mt-4 pt-4 border-t border-slate-800 space-y-3 text-xs">
                    <div>
                      <span className="font-semibold text-slate-400 block mb-1">
                        Question Asked:
                      </span>
                      <p className="text-slate-200">{item.question.question}</p>
                    </div>

                    <div>
                      <span className="font-semibold text-slate-400 block mb-1">
                        Candidate Answer:
                      </span>
                      <p className="text-slate-300 bg-slate-900 p-3 rounded-lg border border-slate-800 italic">
                        "{item.answer}"
                      </p>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2">
                      <div className="p-2 rounded bg-slate-900 border border-slate-800 text-center">
                        <span className="text-[10px] text-slate-400 block">Technical</span>
                        <span className="font-mono font-bold text-white">
                          {item.evaluation.technicalAccuracy}/10
                        </span>
                      </div>
                      <div className="p-2 rounded bg-slate-900 border border-slate-800 text-center">
                        <span className="text-[10px] text-slate-400 block">Depth</span>
                        <span className="font-mono font-bold text-white">
                          {item.evaluation.depth}/10
                        </span>
                      </div>
                      <div className="p-2 rounded bg-slate-900 border border-slate-800 text-center">
                        <span className="text-[10px] text-slate-400 block">Communication</span>
                        <span className="font-mono font-bold text-white">
                          {item.evaluation.communication}/10
                        </span>
                      </div>
                      <div className="p-2 rounded bg-slate-900 border border-slate-800 text-center">
                        <span className="text-[10px] text-slate-400 block">Relevance</span>
                        <span className="font-mono font-bold text-white">
                          {item.evaluation.relevance}/10
                        </span>
                      </div>
                    </div>

                    <div className="p-3 rounded bg-slate-900 border border-slate-800 text-slate-300">
                      <span className="font-semibold text-brand-500 block mb-1">Feedback:</span>
                      {item.evaluation.detailedFeedback}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
