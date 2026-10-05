import { GoogleGenerativeAI } from '@google/generative-ai';
import { config } from '../config/env.js';
import {
  AnswerEvaluation,
  AnswerEvaluationSchema,
  AssessmentReport,
  CandidateProfile,
  DifficultyLevel,
  HistoryItem,
  QuestionCategory,
  QuestionMetadata,
  QuestionMetadataSchema,
  SkillProfile,
} from '../types/index.js';
import { v4 as uuidv4 } from 'uuid';
import {
  SYSTEM_PERSONA_PROMPT,
  buildEvaluationPrompt,
  buildQuestionPrompt,
  buildReportPrompt,
} from './prompts.js';

export class LLMService {
  private geminiClient: GoogleGenerativeAI | null = null;

  constructor() {
    if (config.geminiApiKey) {
      this.geminiClient = new GoogleGenerativeAI(config.geminiApiKey);
    }
  }

  /**
   * Helper to clean JSON string from LLM responses (stripping markdown fences)
   */
  private cleanJsonString(raw: string): string {
    let clean = raw.trim();
    if (clean.startsWith('```json')) {
      clean = clean.replace(/^```json\s*/, '').replace(/\s*```$/, '');
    } else if (clean.startsWith('```')) {
      clean = clean.replace(/^```\s*/, '').replace(/\s*```$/, '');
    }
    return clean.trim();
  }

  /**
   * Invokes Google Gemini with JSON enforcement
   */
  private async callGemini(systemPrompt: string, prompt: string): Promise<string> {
    if (!this.geminiClient) {
      throw new Error('Gemini API key is not configured.');
    }
    const model = this.geminiClient.getGenerativeModel({
      model: config.geminiModel,
      generationConfig: {
        responseMimeType: 'application/json',
        temperature: 0.4,
      },
      systemInstruction: systemPrompt,
    });

    const result = await model.generateContent(prompt);
    return result.response.text();
  }

  /**
   * Invokes Groq Cloud API with JSON enforcement
   */
  private async callGroq(systemPrompt: string, prompt: string): Promise<string> {
    if (!config.groqApiKey) {
      throw new Error('Groq API key is not configured.');
    }

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.groqApiKey}`,
      },
      body: JSON.stringify({
        model: config.groqModel,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: prompt },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.4,
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`Groq API error (${response.status}): ${err}`);
    }

    const data = (await response.json()) as any;
    return data.choices?.[0]?.message?.content || '{}';
  }

  /**
   * Core dispatcher that tries Gemini, then Groq, then falls back to intelligent mock engine
   */
  private async generateJsonWithFallback<T>(
    prompt: string,
    validator: (data: any) => T,
    mockFallback: () => T
  ): Promise<T> {
    // 1. Try Gemini if configured
    if (config.geminiApiKey) {
      try {
        const rawJson = await this.callGemini(SYSTEM_PERSONA_PROMPT, prompt);
        const parsed = JSON.parse(this.cleanJsonString(rawJson));
        return validator(parsed);
      } catch (geminiError) {
        console.warn('Gemini invocation failed, falling back to secondary provider/mock:', geminiError);
      }
    }

    // 2. Try Groq if configured
    if (config.groqApiKey) {
      try {
        const rawJson = await this.callGroq(SYSTEM_PERSONA_PROMPT, prompt);
        const parsed = JSON.parse(this.cleanJsonString(rawJson));
        return validator(parsed);
      } catch (groqError) {
        console.warn('Groq invocation failed, falling back to mock:', groqError);
      }
    }

    // 3. Fallback to intelligent local mock
    return mockFallback();
  }

  /**
   * Generates a context-aware question
   */
  public async generateQuestion(params: {
    candidateProfile: CandidateProfile;
    stage: QuestionCategory;
    targetDifficulty: DifficultyLevel;
    skillProfile: SkillProfile;
    history: HistoryItem[];
    previousWeaknesses: string[];
    focusTopic?: string;
    focusSkill?: string;
    claimToVerify?: string;
  }): Promise<QuestionMetadata> {
    const prompt = buildQuestionPrompt(params);

    return this.generateJsonWithFallback<QuestionMetadata>(
      prompt,
      (data) => {
        return QuestionMetadataSchema.parse({
          id: uuidv4(),
          question: data.question || data.next_question,
          category: data.category || params.stage,
          topic: data.topic || 'Technical Assessment',
          subtopic: data.subtopic || 'General Concepts',
          difficulty: data.difficulty || params.targetDifficulty,
          skill: data.skill || params.focusSkill || 'Software Engineering',
          estimatedTime: data.estimatedTime || data.estimated_time || '2-3 mins',
          reason: data.reason || 'Dynamically generated based on candidate context.',
          evaluationFocus: Array.isArray(data.evaluationFocus)
            ? data.evaluationFocus
            : data.evaluation_focus || ['technical_accuracy', 'depth'],
        });
      },
      () => this.mockGenerateQuestion(params)
    );
  }

  /**
   * Evaluates candidate's answer with 6 metrics + strengths + weaknesses
   */
  public async evaluateAnswer(params: {
    candidateProfile: CandidateProfile;
    question: QuestionMetadata;
    candidateAnswer: string;
  }): Promise<AnswerEvaluation> {
    const prompt = buildEvaluationPrompt(params);

    return this.generateJsonWithFallback<AnswerEvaluation>(
      prompt,
      (data) => {
        return AnswerEvaluationSchema.parse({
          overallScore: Number(data.overallScore ?? data.overall_score ?? 6),
          technicalAccuracy: Number(data.technicalAccuracy ?? data.technical_accuracy ?? 6),
          communication: Number(data.communication ?? 7),
          relevance: Number(data.relevance ?? 7),
          clarity: Number(data.clarity ?? 7),
          depth: Number(data.depth ?? 6),
          strengths: Array.isArray(data.strengths) ? data.strengths : ['Clear attempt at answering'],
          weaknesses: Array.isArray(data.weaknesses) ? data.weaknesses : ['Could explain practical trade-offs'],
          followUpRequired: Boolean(data.followUpRequired ?? data.follow_up_required ?? false),
          detailedFeedback:
            data.detailedFeedback ||
            data.detailed_feedback ||
            'Good structural understanding demonstrated. Focus on explaining edge cases and production constraints.',
          extractedClaims: Array.isArray(data.extractedClaims) ? data.extractedClaims : [],
        });
      },
      () => this.mockEvaluateAnswer(params)
    );
  }

  /**
   * Generates the final comprehensive assessment report
   */
  public async generateReport(params: {
    candidateProfile: CandidateProfile;
    history: HistoryItem[];
    skillProfile: SkillProfile;
  }): Promise<AssessmentReport> {
    const prompt = buildReportPrompt(params);

    // Compute empirical difficulty progression
    const difficultyProgression = params.history.map((h, i) => ({
      questionNumber: i + 1,
      category: h.question.category,
      difficulty: h.question.difficulty,
      score: h.evaluation.overallScore,
      topic: h.question.topic,
    }));

    return this.generateJsonWithFallback<AssessmentReport>(
      prompt,
      (data) => {
        return {
          candidateName: params.candidateProfile.name,
          targetRole: params.candidateProfile.targetRole,
          targetCompany: params.candidateProfile.targetCompany,
          assessmentAreas: {
            technicalKnowledge: Math.round(Number(data.assessmentAreas?.technicalKnowledge ?? 75)),
            problemSolving: Math.round(Number(data.assessmentAreas?.problemSolving ?? 70)),
            communication: Math.round(Number(data.assessmentAreas?.communication ?? 80)),
            projectUnderstanding: Math.round(Number(data.assessmentAreas?.projectUnderstanding ?? 72)),
            behavioral: Math.round(Number(data.assessmentAreas?.behavioral ?? 82)),
            overallReadiness: Math.round(Number(data.assessmentAreas?.overallReadiness ?? 76)),
          },
          strengths: Array.isArray(data.strengths) ? data.strengths : ['Solid fundamental grasp'],
          areasForImprovement: Array.isArray(data.areasForImprovement)
            ? data.areasForImprovement
            : ['System design scalability'],
          recommendedLearning: Array.isArray(data.recommendedLearning)
            ? data.recommendedLearning
            : ['Distributed systems patterns'],
          overallRecommendation: data.overallRecommendation || 'Placement Ready',
          recommendationRationale:
            data.recommendationRationale ||
            'Candidate demonstrates strong technical competence and clear communication suitable for the role.',
          skillProfile: params.skillProfile,
          difficultyProgression,
          totalQuestions: params.history.length,
          completedAt: new Date().toISOString(),
        };
      },
      () => this.mockGenerateReport(params, difficultyProgression)
    );
  }

  // ==================== MOCK FALLBACK IMPLEMENTATIONS ====================

  private mockGenerateQuestion(params: {
    candidateProfile: CandidateProfile;
    stage: QuestionCategory;
    targetDifficulty: DifficultyLevel;
    skillProfile: SkillProfile;
    history: HistoryItem[];
    previousWeaknesses: string[];
    focusTopic?: string;
    focusSkill?: string;
    claimToVerify?: string;
  }): QuestionMetadata {
    const { candidateProfile, stage, targetDifficulty } = params;
    const primarySkill = candidateProfile.technicalSkills[0] || 'Python';
    const primaryProject = candidateProfile.projects[0];

    let question = '';
    let topic = '';
    let subtopic = '';
    let skill = primarySkill;
    let reason = '';
    let focus = ['accuracy', 'depth'];

    switch (stage) {
      case 'Introduction':
        question = `Welcome ${candidateProfile.name}! To get started, please introduce yourself, highlight your academic journey in ${candidateProfile.branch}, and tell me what excites you most about the ${candidateProfile.targetRole} role at ${candidateProfile.targetCompany}.`;
        topic = 'Candidate Background';
        subtopic = 'Career Alignment & Communication';
        skill = 'Communication';
        reason = 'Evaluate articulation, career vision, and relevance of background.';
        focus = ['communication', 'clarity', 'relevance'];
        break;

      case 'Technical':
        if (targetDifficulty === 'Easy') {
          question = `In ${primarySkill}, explain the fundamental differences between mutable and immutable data structures, and how memory references behave during function calls.`;
          topic = `${primarySkill} Core Fundamentals`;
          subtopic = 'Memory & Data Types';
        } else if (targetDifficulty === 'Medium') {
          question = `When developing a backend or pipeline in ${primarySkill}, how would you handle concurrent asynchronous tasks and prevent race conditions or blocking the event loop?`;
          topic = `${primarySkill} Concurrency & Performance`;
          subtopic = 'Async Execution & Threading';
        } else {
          question = `In a high-throughput production environment using ${primarySkill}, how would you profile memory bottlenecks, detect memory leaks, and optimize garbage collection latency under heavy load?`;
          topic = `${primarySkill} Advanced Systems`;
          subtopic = 'Memory Profiling & GC Optimization';
        }
        reason = `Probing ${primarySkill} at ${targetDifficulty} difficulty based on candidate's skill profile.`;
        focus = ['technical_accuracy', 'depth', 'performance_tradeoffs'];
        break;

      case 'Project':
        if (params.claimToVerify) {
          question = `In your project "${primaryProject?.title || 'System'}", you mentioned: "${params.claimToVerify}". Could you walk me through the exact validation methodology, dataset split, and how you guarded against data leakage or overfitting?`;
          topic = 'Project Claim Verification';
          subtopic = 'Validation Integrity & Leakage Prevention';
          reason = `Rigorous claim verification probing: ${params.claimToVerify}`;
        } else {
          question = `In your project "${primaryProject?.title || 'System'}", what was the most difficult architectural bottleneck you encountered with ${primaryProject?.techStack.join(', ') || primarySkill}, and how did you resolve it?`;
          topic = 'Project Architecture';
          subtopic = 'Design Decisions & Trade-offs';
          reason = 'Evaluating technical ownership and depth in declared project.';
        }
        skill = 'System Architecture';
        focus = ['claim_validation', 'architectural_depth', 'ownership'];
        break;

      case 'ProblemSolving':
        question = `Suppose a customer reports that an API endpoint handling recommendation scores intermittently times out under peak traffic. How would you systematically diagnose whether the issue lies in database locks, network serialization, or algorithmic complexity?`;
        topic = 'Debugging & System Reliability';
        subtopic = 'Latency Diagnosis & Root Cause Analysis';
        skill = 'Problem Solving';
        reason = 'Assessing diagnostic methodology, observability instincts, and systematic debugging.';
        focus = ['algorithmic_reasoning', 'systematic_debugging', 'edge_cases'];
        break;

      case 'Behavioral':
        question = `Tell me about a time during a team project or internship when you had a technical disagreement with a peer regarding an architectural choice. How did you evaluate the competing approaches and reach a consensus?`;
        topic = 'Engineering Collaboration';
        subtopic = 'Conflict Resolution & Technical Consensus';
        skill = 'Behavioral / Leadership';
        reason = 'Assessing teamwork, maturity, humility, and engineering decision-making.';
        focus = ['emotional_intelligence', 'communication', 'accountability'];
        break;
    }

    return {
      id: uuidv4(),
      question,
      category: stage,
      topic,
      subtopic,
      difficulty: targetDifficulty,
      skill,
      estimatedTime: '2-3 mins',
      reason,
      evaluationFocus: focus,
    };
  }

  private mockEvaluateAnswer(params: {
    candidateProfile: CandidateProfile;
    question: QuestionMetadata;
    candidateAnswer: string;
  }): AnswerEvaluation {
    const text = params.candidateAnswer.trim();
    const wordCount = text.split(/\s+/).length;

    // Heuristic scoring based on length, detail, and technical keywords
    let score = 5;
    if (wordCount > 40) score += 2;
    if (wordCount > 80) score += 1;
    if (/because|trade-off|latency|index|dataset|validation|lock|concurrency|pipeline/i.test(text)) {
      score += 1;
    }
    if (wordCount < 15) score = Math.max(3, score - 2);
    score = Math.min(10, Math.max(1, score));

    const technicalAccuracy = Math.min(10, Math.max(3, score + (wordCount > 50 ? 1 : 0)));
    const communication = Math.min(10, Math.max(4, score + (wordCount > 30 ? 1 : 0)));
    const relevance = wordCount > 20 ? 8 : 5;
    const clarity = 7;
    const depth = Math.min(10, Math.max(2, score - 1));

    // Extract potential claim patterns
    const claimMatches = text.match(
      /(\d+%\s*(accuracy|precision|recall|improvement|reduction)|\d+\s*(ms|seconds|rps|users))/gi
    );
    const extractedClaims = claimMatches ? Array.from(new Set(claimMatches)) : [];

    const followUpRequired = depth < 6 || extractedClaims.length > 0;

    return {
      overallScore: score,
      technicalAccuracy,
      communication,
      relevance,
      clarity,
      depth,
      strengths: [
        wordCount > 40
          ? 'Articulate explanation with good technical vocabulary'
          : 'Concise, direct answer',
        'Addresses the core question directly',
      ],
      weaknesses: [
        depth < 7
          ? 'Could provide more concrete production edge cases or quantifiable metrics'
          : 'Could further elaborate on alternative design trade-offs',
      ],
      followUpRequired,
      detailedFeedback: `Candidate scored ${score}/10. Response demonstrates baseline competence with room for deeper technical elaboration.`,
      extractedClaims,
    };
  }

  private mockGenerateReport(
    params: {
      candidateProfile: CandidateProfile;
      history: HistoryItem[];
      skillProfile: SkillProfile;
    },
    difficultyProgression: any[]
  ): AssessmentReport {
    const scores = params.history.map((h) => h.evaluation.overallScore);
    const avgScore =
      scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 7;

    const technicalKnowledge = Math.min(100, Math.round(avgScore * 9.8));
    const problemSolving = Math.min(100, Math.round((avgScore - 0.4) * 9.5));
    const communication = Math.min(100, Math.round((avgScore + 0.6) * 10));
    const projectUnderstanding = Math.min(100, Math.round(avgScore * 9.2));
    const behavioral = Math.min(100, Math.round((avgScore + 0.8) * 9.8));

    const overallReadiness = Math.round(
      technicalKnowledge * 0.3 +
        problemSolving * 0.25 +
        projectUnderstanding * 0.2 +
        communication * 0.15 +
        behavioral * 0.1
    );

    let recommendation: 'Needs Improvement' | 'Developing' | 'Placement Ready' | 'Strong Candidate';
    if (overallReadiness >= 80) {
      recommendation = 'Strong Candidate';
    } else if (overallReadiness >= 70) {
      recommendation = 'Placement Ready';
    } else if (overallReadiness >= 55) {
      recommendation = 'Developing';
    } else {
      recommendation = 'Needs Improvement';
    }

    return {
      candidateName: params.candidateProfile.name,
      targetRole: params.candidateProfile.targetRole,
      targetCompany: params.candidateProfile.targetCompany,
      assessmentAreas: {
        technicalKnowledge,
        problemSolving,
        communication,
        projectUnderstanding,
        behavioral,
        overallReadiness,
      },
      strengths: [
        `Strong fundamentals in ${params.candidateProfile.technicalSkills.slice(0, 2).join(' & ')}`,
        'Clear, structured communication during technical explanations',
        'Good understanding of project architecture and trade-offs',
      ],
      areasForImprovement: [
        'Deeper exploration of edge cases and distributed failure modes',
        'More rigorous validation metrics when making technical claims',
        'Structured system design storytelling under time constraints',
      ],
      recommendedLearning: [
        'Advanced system design patterns and latency optimization',
        'Rigorous ML model evaluation & data leakage prevention techniques',
        'STAR method for technical leadership and conflict resolution',
      ],
      overallRecommendation: recommendation,
      recommendationRationale: `Based on a comprehensive 5-stage adaptive evaluation, ${params.candidateProfile.name} demonstrates an overall readiness score of ${overallReadiness}%. Their technical foundation in ${params.candidateProfile.technicalSkills.join(', ')} is solid. They are rated as "${recommendation}".`,
      skillProfile: params.skillProfile,
      difficultyProgression,
      totalQuestions: params.history.length,
      completedAt: new Date().toISOString(),
    };
  }
}

export const llmService = new LLMService();
