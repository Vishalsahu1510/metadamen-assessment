import React, { useState } from 'react';
import { CandidateProfile, CandidateProject } from '../types';
import { User, Briefcase, Code2, FolderGit2, Plus, Trash2, Zap, ArrowRight } from 'lucide-react';

interface Props {
  onSubmit: (profile: CandidateProfile) => void;
  isLoading: boolean;
}

export const CandidateProfileForm: React.FC<Props> = ({ onSubmit, isLoading }) => {
  const [name, setName] = useState('Aarav Sharma');
  const [degree, setDegree] = useState('B.Tech');
  const [branch, setBranch] = useState('Computer Science & Engineering (AI-ML)');
  const [year, setYear] = useState('3rd-Year');
  const [targetCompany, setTargetCompany] = useState('MetaDamen');
  const [targetRole, setTargetRole] = useState('Associate Software Engineer');
  const [skillsText, setSkillsText] = useState('Python, Machine Learning, FastAPI, React, SQL, PyTorch');
  const [internshipExperience, setInternshipExperience] = useState(
    'AI/ML Intern at TechCorp (3 months, built model pipelines)'
  );

  const [projects, setProjects] = useState<CandidateProject[]>([
    {
      title: 'Real-Time Recommendation System',
      description: 'Collaborative filtering recommendation engine with neural embeddings serving personalized feeds.',
      techStack: ['Python', 'PyTorch', 'FastAPI', 'Redis', 'Docker'],
      claims: ['Achieved 95% model accuracy and sub-20ms inference latency on 100k items'],
    },
    {
      title: 'Time-Series Anomaly Detection System',
      description: 'Unsupervised telemetry anomaly detector for microservices with automated alerting.',
      techStack: ['Python', 'Isolation Forest', 'Prometheus', 'FastAPI'],
      claims: ['Reduced false-positive alerts by 42% in live staging cluster'],
    },
  ]);

  const loadPresetCandidate = () => {
    setName('Aarav Sharma');
    setDegree('B.Tech');
    setBranch('CSE / AI-ML');
    setYear('3rd-Year');
    setTargetCompany('MetaDamen');
    setTargetRole('Associate Software Engineer');
    setSkillsText('Python, Machine Learning, FastAPI, React, SQL, PyTorch');
    setInternshipExperience('AI/ML Intern at TechCorp (3 months)');
    setProjects([
      {
        title: 'Recommendation System',
        description: 'Real-time collaborative filtering recommendation engine with neural embeddings.',
        techStack: ['Python', 'PyTorch', 'FastAPI', 'Redis'],
        claims: ['Achieved 95% model accuracy and sub-20ms inference latency'],
      },
      {
        title: 'Anomaly Detection System',
        description: 'Unsupervised time-series anomaly detection for financial microtransactions.',
        techStack: ['Python', 'IsolationForest', 'FastAPI', 'Docker'],
        claims: ['Trained on 500k transactions with robust recall under class imbalance'],
      },
    ]);
  };

  const handleAddProject = () => {
    setProjects([
      ...projects,
      {
        title: '',
        description: '',
        techStack: [],
        claims: [],
      },
    ]);
  };

  const handleRemoveProject = (index: number) => {
    if (projects.length === 1) return;
    setProjects(projects.filter((_, i) => i !== index));
  };

  const handleUpdateProject = (index: number, field: keyof CandidateProject, value: any) => {
    const updated = [...projects];
    updated[index] = { ...updated[index], [field]: value };
    setProjects(updated);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const technicalSkills = skillsText
      .split(',')
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    const profile: CandidateProfile = {
      name,
      degree,
      branch,
      year,
      targetCompany,
      targetRole,
      technicalSkills,
      projects,
      internshipExperience,
    };

    onSubmit(profile);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-brand-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-brand-500/10 text-brand-500 border border-brand-500/20 mb-2">
            <Zap className="w-3.5 h-3.5" /> Stage 1: Candidate Profiling
          </span>
          <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
            Create Candidate Profile
          </h1>
          <p className="text-slate-400 text-sm mt-1 max-w-xl">
            VAANI™ uses these credentials, technical skills, and project claims to dynamically calibrate
            real-time interview questions, claim verification, and difficulty progression.
          </p>
        </div>

        <button
          type="button"
          onClick={loadPresetCandidate}
          className="self-start md:self-center px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-200 hover:text-white border border-slate-700 text-xs font-semibold flex items-center gap-2 transition-all hover:border-brand-500/50 shadow-sm"
        >
          <Zap className="w-4 h-4 text-amber-400" />
          <span>Load MetaDamen Scenario</span>
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Personal & Academic Details */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-md">
          <div className="flex items-center gap-2 mb-4 pb-2 border-b border-slate-800">
            <User className="w-5 h-5 text-brand-500" />
            <h2 className="text-lg font-semibold text-white">Academic & Personal Profile</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Full Name</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-750 rounded-lg text-sm text-white focus:outline-none focus:border-brand-500 transition-colors"
                placeholder="e.g. Aarav Sharma"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Degree</label>
              <input
                type="text"
                required
                value={degree}
                onChange={(e) => setDegree(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-750 rounded-lg text-sm text-white focus:outline-none focus:border-brand-500 transition-colors"
                placeholder="e.g. B.Tech"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Branch / Specialization</label>
              <input
                type="text"
                required
                value={branch}
                onChange={(e) => setBranch(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-750 rounded-lg text-sm text-white focus:outline-none focus:border-brand-500 transition-colors"
                placeholder="e.g. CSE / AI-ML"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Year of Study</label>
              <input
                type="text"
                required
                value={year}
                onChange={(e) => setYear(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-750 rounded-lg text-sm text-white focus:outline-none focus:border-brand-500 transition-colors"
                placeholder="e.g. 3rd-Year"
              />
            </div>
          </div>
        </div>

        {/* Target Position */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-md">
          <div className="flex items-center gap-2 mb-4 pb-2 border-b border-slate-800">
            <Briefcase className="w-5 h-5 text-teal-400" />
            <h2 className="text-lg font-semibold text-white">Target Position & Experience</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Target Company</label>
              <input
                type="text"
                required
                value={targetCompany}
                onChange={(e) => setTargetCompany(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-750 rounded-lg text-sm text-white focus:outline-none focus:border-brand-500 transition-colors"
                placeholder="e.g. MetaDamen"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Target Role</label>
              <input
                type="text"
                required
                value={targetRole}
                onChange={(e) => setTargetRole(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-750 rounded-lg text-sm text-white focus:outline-none focus:border-brand-500 transition-colors"
                placeholder="e.g. Associate Software Engineer"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-slate-400 mb-1">
                Internship / Industry Experience
              </label>
              <input
                type="text"
                value={internshipExperience}
                onChange={(e) => setInternshipExperience(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-750 rounded-lg text-sm text-white focus:outline-none focus:border-brand-500 transition-colors"
                placeholder="e.g. AI/ML Intern at TechCorp (3 months)"
              />
            </div>
          </div>
        </div>

        {/* Technical Skills */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-md">
          <div className="flex items-center gap-2 mb-4 pb-2 border-b border-slate-800">
            <Code2 className="w-5 h-5 text-indigo-400" />
            <h2 className="text-lg font-semibold text-white">Technical Skills</h2>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">
              Declared Skills (comma separated)
            </label>
            <input
              type="text"
              required
              value={skillsText}
              onChange={(e) => setSkillsText(e.target.value)}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-750 rounded-lg text-sm text-white focus:outline-none focus:border-brand-500 transition-colors"
              placeholder="e.g. Python, Machine Learning, FastAPI, React, SQL"
            />
            <div className="flex flex-wrap gap-1.5 mt-3">
              {skillsText
                .split(',')
                .map((s) => s.trim())
                .filter((s) => s.length > 0)
                .map((skill, idx) => (
                  <span
                    key={idx}
                    className="px-2.5 py-1 rounded-md text-xs font-medium bg-brand-500/10 text-brand-500 border border-brand-500/20"
                  >
                    {skill}
                  </span>
                ))}
            </div>
          </div>
        </div>

        {/* Project Claims & Deep Dive */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-md">
          <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <FolderGit2 className="w-5 h-5 text-amber-400" />
              <div>
                <h2 className="text-lg font-semibold text-white">Key Technical Projects & Claims</h2>
                <p className="text-xs text-slate-400">
                  VAANI™ will probe technical claims (e.g., accuracy, latency, scale) during Project Deep Dive.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleAddProject}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-750 text-slate-200 text-xs font-semibold flex items-center gap-1.5 border border-slate-700 hover:border-brand-500/40"
            >
              <Plus className="w-4 h-4" /> Add Project
            </button>
          </div>

          <div className="space-y-4">
            {projects.map((proj, pIdx) => (
              <div
                key={pIdx}
                className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-3 relative group"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono font-bold text-brand-500 uppercase tracking-wider">
                    Project #{pIdx + 1}
                  </span>
                  {projects.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveProject(pIdx)}
                      className="text-slate-500 hover:text-rose-400 p-1 transition-colors"
                      title="Remove Project"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1">Project Title</label>
                    <input
                      type="text"
                      required
                      value={proj.title}
                      onChange={(e) => handleUpdateProject(pIdx, 'title', e.target.value)}
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-750 rounded-lg text-sm text-white focus:outline-none focus:border-brand-500"
                      placeholder="e.g. Recommendation System"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1">
                      Tech Stack (comma separated)
                    </label>
                    <input
                      type="text"
                      value={proj.techStack.join(', ')}
                      onChange={(e) =>
                        handleUpdateProject(
                          pIdx,
                          'techStack',
                          e.target.value.split(',').map((s) => s.trim()).filter(Boolean)
                        )
                      }
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-750 rounded-lg text-sm text-white focus:outline-none focus:border-brand-500"
                      placeholder="e.g. Python, PyTorch, FastAPI, Redis"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Description</label>
                  <textarea
                    rows={2}
                    required
                    value={proj.description}
                    onChange={(e) => handleUpdateProject(pIdx, 'description', e.target.value)}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-750 rounded-lg text-sm text-white focus:outline-none focus:border-brand-500"
                    placeholder="Brief description of the problem solved and architecture..."
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-amber-400/90 mb-1">
                    Key Technical Claims to Probe (comma separated)
                  </label>
                  <input
                    type="text"
                    value={(proj.claims || []).join('; ')}
                    onChange={(e) =>
                      handleUpdateProject(
                        pIdx,
                        'claims',
                        e.target.value.split(';').map((s) => s.trim()).filter(Boolean)
                      )
                    }
                    className="w-full px-3 py-2 bg-slate-900 border border-amber-500/30 rounded-lg text-sm text-amber-100 focus:outline-none focus:border-amber-400"
                    placeholder="e.g. Achieved 95% model accuracy; Handled 50k requests/sec"
                  />
                  <p className="text-[11px] text-slate-500 mt-1">
                    Tip: VAANI™ identifies claims like "95% accuracy" and probes dataset splits, leakage prevention, and metrics.
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Submit Button */}
        <div className="flex justify-end pt-4">
          <button
            type="submit"
            disabled={isLoading}
            className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-gradient-to-r from-brand-600 to-teal-500 hover:from-brand-500 hover:to-teal-400 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-brand-500/25 transition-all transform hover:-translate-y-0.5 disabled:opacity-50 disabled:pointer-events-none"
          >
            {isLoading ? (
              <>
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                <span>Calibrating VAANI™ Engine...</span>
              </>
            ) : (
              <>
                <span>Begin Adaptive Interview</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};
