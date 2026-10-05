export interface CandidateProject {
  title: string;
  description: string;
  techStack: string[];
  claims?: string[];
}

export interface CandidateProfile {
  name: string;
  degree: string;
  branch: string;
  year: string;
  targetCompany: string;
  targetRole: string;
  technicalSkills: string[];
  projects: CandidateProject[];
  internshipExperience: string;
}

export type QuestionCategory =
  | 'Introduction'
  | 'Technical'
  | 'Project'
  | 'ProblemSolving'
  | 'Behavioral';

export type DifficultyLevel = 'Easy' | 'Medium' | 'Hard';

export interface QuestionMetadata {
  id: string;
  question: string;
  category: QuestionCategory;
  topic: string;
  subtopic: string;
  difficulty: DifficultyLevel;
  skill: string;
  estimatedTime: string;
  reason: string;
  evaluationFocus: string[];
  embedding?: number[];
}

export interface AnswerEvaluation {
  overallScore: number;
  technicalAccuracy: number;
  communication: number;
  relevance: number;
  clarity: number;
  depth: number;
  strengths: string[];
  weaknesses: string[];
  followUpRequired: boolean;
  detailedFeedback: string;
  extractedClaims?: string[];
}

export interface HistoryItem {
  question: QuestionMetadata;
  answer: string;
  evaluation: AnswerEvaluation;
  timestamp: string;
}

export type SkillProfile = Record<string, number>;

export type OverallRecommendation =
  | 'Needs Improvement'
  | 'Developing'
  | 'Placement Ready'
  | 'Strong Candidate';

export interface AssessmentReport {
  candidateName: string;
  targetRole: string;
  targetCompany: string;
  assessmentAreas: {
    technicalKnowledge: number;
    problemSolving: number;
    communication: number;
    projectUnderstanding: number;
    behavioral: number;
    overallReadiness: number;
  };
  strengths: string[];
  areasForImprovement: string[];
  recommendedLearning: string[];
  overallRecommendation: OverallRecommendation;
  recommendationRationale: string;
  skillProfile: SkillProfile;
  difficultyProgression: Array<{
    questionNumber: number;
    category: QuestionCategory;
    difficulty: DifficultyLevel;
    score: number;
    topic: string;
  }>;
  totalQuestions: number;
  completedAt: string;
}

export interface InterviewSession {
  id: string;
  candidateProfile: CandidateProfile;
  status: 'in_progress' | 'completed';
  currentQuestionIndex: number;
  currentStage: QuestionCategory;
  currentDifficulty: DifficultyLevel;
  skillProfile: SkillProfile;
  history: HistoryItem[];
  currentQuestion: QuestionMetadata | null;
  finalReport?: AssessmentReport;
  createdAt: string;
  updatedAt: string;
}
