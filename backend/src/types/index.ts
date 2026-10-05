import { z } from 'zod';

export const CandidateProjectSchema = z.object({
  title: z.string().min(1, 'Project title is required'),
  description: z.string().min(5, 'Project description is required'),
  techStack: z.array(z.string()).default([]),
  claims: z.array(z.string()).optional().default([]),
});

export type CandidateProject = z.infer<typeof CandidateProjectSchema>;

export const CandidateProfileSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  degree: z.string().min(1, 'Degree is required'),
  branch: z.string().min(1, 'Branch is required'),
  year: z.string().min(1, 'Year is required'),
  targetCompany: z.string().min(1, 'Target company is required'),
  targetRole: z.string().min(1, 'Target role is required'),
  technicalSkills: z.array(z.string()).min(1, 'At least one technical skill is required'),
  projects: z.array(CandidateProjectSchema).min(1, 'At least one project is required'),
  internshipExperience: z.string().default('None'),
});

export type CandidateProfile = z.infer<typeof CandidateProfileSchema>;

export const QuestionCategorySchema = z.enum([
  'Introduction',
  'Technical',
  'Project',
  'ProblemSolving',
  'Behavioral',
]);

export type QuestionCategory = z.infer<typeof QuestionCategorySchema>;

export const DifficultyLevelSchema = z.enum(['Easy', 'Medium', 'Hard']);
export type DifficultyLevel = z.infer<typeof DifficultyLevelSchema>;

export const QuestionMetadataSchema = z.object({
  id: z.string(),
  question: z.string(),
  category: QuestionCategorySchema,
  topic: z.string(),
  subtopic: z.string(),
  difficulty: DifficultyLevelSchema,
  skill: z.string(),
  estimatedTime: z.string(),
  reason: z.string(),
  evaluationFocus: z.array(z.string()),
  embedding: z.array(z.number()).optional(),
});

export type QuestionMetadata = z.infer<typeof QuestionMetadataSchema>;

export const AnswerEvaluationSchema = z.object({
  overallScore: z.number().min(0).max(10),
  technicalAccuracy: z.number().min(0).max(10),
  communication: z.number().min(0).max(10),
  relevance: z.number().min(0).max(10),
  clarity: z.number().min(0).max(10),
  depth: z.number().min(0).max(10),
  strengths: z.array(z.string()),
  weaknesses: z.array(z.string()),
  followUpRequired: z.boolean(),
  detailedFeedback: z.string(),
  extractedClaims: z.array(z.string()).optional().default([]),
});

export type AnswerEvaluation = z.infer<typeof AnswerEvaluationSchema>;

export interface HistoryItem {
  question: QuestionMetadata;
  answer: string;
  evaluation: AnswerEvaluation;
  timestamp: string;
}

export type SkillProfile = Record<string, number>;

export const OverallRecommendationSchema = z.enum([
  'Needs Improvement',
  'Developing',
  'Placement Ready',
  'Strong Candidate',
]);

export type OverallRecommendation = z.infer<typeof OverallRecommendationSchema>;

export const AssessmentReportSchema = z.object({
  candidateName: z.string(),
  targetRole: z.string(),
  targetCompany: z.string(),
  assessmentAreas: z.object({
    technicalKnowledge: z.number().min(0).max(100),
    problemSolving: z.number().min(0).max(100),
    communication: z.number().min(0).max(100),
    projectUnderstanding: z.number().min(0).max(100),
    behavioral: z.number().min(0).max(100),
    overallReadiness: z.number().min(0).max(100),
  }),
  strengths: z.array(z.string()),
  areasForImprovement: z.array(z.string()),
  recommendedLearning: z.array(z.string()),
  overallRecommendation: OverallRecommendationSchema,
  recommendationRationale: z.string(),
  skillProfile: z.record(z.string(), z.number()),
  difficultyProgression: z.array(
    z.object({
      questionNumber: z.number(),
      category: QuestionCategorySchema,
      difficulty: DifficultyLevelSchema,
      score: z.number(),
      topic: z.string(),
    })
  ),
  totalQuestions: z.number(),
  completedAt: z.string(),
});

export type AssessmentReport = z.infer<typeof AssessmentReportSchema>;

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
