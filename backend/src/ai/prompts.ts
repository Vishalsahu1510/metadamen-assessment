import {
  CandidateProfile,
  DifficultyLevel,
  HistoryItem,
  QuestionCategory,
  SkillProfile,
} from '../types/index.js';

export const SYSTEM_PERSONA_PROMPT = `You are VAANI™ (Adaptive AI Interview & Assessment Intelligence), an elite technical interviewer and hiring intelligence system for leading technology companies.
Your core objectives:
1. Conduct highly personalized, dynamic technical and behavioral interviews.
2. Adapt questions in real-time based on candidate answers, demonstrated depth, and technical claims.
3. Rigorously evaluate answers for technical depth, accuracy, relevance, and communication.
4. Verify resume and project claims with targeted probing questions (e.g., verifying dataset size, validation splits, latency trade-offs, edge-cases).
5. Never behave like a generic chatbot or ask pre-scripted static questions. Every question must have clear architectural intent.
6. Always output valid JSON conforming strictly to the requested schema.`;

/**
 * Prompt for generating the next adaptive question
 */
export function buildQuestionPrompt(params: {
  candidateProfile: CandidateProfile;
  stage: QuestionCategory;
  targetDifficulty: DifficultyLevel;
  skillProfile: SkillProfile;
  history: HistoryItem[];
  previousWeaknesses: string[];
  focusTopic?: string;
  focusSkill?: string;
  claimToVerify?: string;
}): string {
  const {
    candidateProfile,
    stage,
    targetDifficulty,
    skillProfile,
    history,
    previousWeaknesses,
    focusTopic,
    focusSkill,
    claimToVerify,
  } = params;

  const lastInteraction = history.length > 0 ? history[history.length - 1] : null;

  return `Generate the next interview question for the candidate based on adaptive context.

--- CANDIDATE PROFILE ---
Name: ${candidateProfile.name}
Academic: ${candidateProfile.year} | ${candidateProfile.degree} in ${candidateProfile.branch}
Target Role: ${candidateProfile.targetRole} at ${candidateProfile.targetCompany}
Declared Technical Skills: ${candidateProfile.technicalSkills.join(', ')}
Key Projects:
${candidateProfile.projects
  .map(
    (p, i) =>
      `  [${i + 1}] ${p.title} (${p.techStack.join(', ')}): ${p.description} ${
        p.claims && p.claims.length ? '| Claims: ' + p.claims.join('; ') : ''
      }`
  )
  .join('\n')}
Experience: ${candidateProfile.internshipExperience}

--- CURRENT INTERVIEW STATE ---
Stage: ${stage} (Introduction | Technical | Project | ProblemSolving | Behavioral)
Target Difficulty: ${targetDifficulty} (Easy | Medium | Hard)
Current Skill Estimates: ${JSON.stringify(skillProfile)}
Identified Weaknesses to Probe: ${
    previousWeaknesses.length > 0 ? previousWeaknesses.join('; ') : 'None yet'
  }
${focusTopic ? `Requested Focus Topic: ${focusTopic}` : ''}
${focusSkill ? `Target Skill: ${focusSkill}` : ''}
${claimToVerify ? `CLAIM VERIFICATION REQUIRED: Probing specific claim: "${claimToVerify}"` : ''}

${
  lastInteraction
    ? `--- PREVIOUS INTERACTION ---
Previous Question (${lastInteraction.question.category} - ${lastInteraction.question.topic}): "${lastInteraction.question.question}"
Candidate Answer: "${lastInteraction.answer}"
AI Evaluation: Score ${lastInteraction.evaluation.overallScore}/10 | Accuracy: ${lastInteraction.evaluation.technicalAccuracy}/10 | Depth: ${lastInteraction.evaluation.depth}/10
Weaknesses Noted: ${lastInteraction.evaluation.weaknesses.join('; ') || 'None'}
Follow-up Required: ${lastInteraction.evaluation.followUpRequired}
`
    : 'This is the initial question of the interview.'
}

--- PREVIOUSLY ASKED QUESTIONS (DO NOT REPEAT CONCEPTS) ---
${history.map((h, i) => `${i + 1}. [${h.question.category}] ${h.question.question}`).join('\n') || 'None'}

--- INSTRUCTIONS FOR QUESTION GENERATION ---
1. STAGE OBJECTIVES:
   - "Introduction": Focus on concise self-introduction, technical background, and passion alignment with ${candidateProfile.targetRole}.
   - "Technical": In-depth concept or architectural question on declared skills (${focusSkill || candidateProfile.technicalSkills[0] || 'Python'}). Difficulty must be strictly ${targetDifficulty}.
   - "Project": Deep dive into candidate's actual projects. Probe implementation details, why specific choices were made, and verify concrete metrics.
   - "ProblemSolving": Present a concrete debugging scenario, edge-case handling, system design trade-off, or data structure challenge.
   - "Behavioral": Situational scenario evaluating engineering ethics, pressure handling, conflicting requirements, or post-mortem learning.
2. ADAPTIVE LOGIC:
   - If previous score was strong (>=7), scale difficulty or push into optimization, latency, concurrency, or scale.
   - If previous score was weak (<5), pivot to fundamental mechanisms or ask clarifying baseline question.
   - If a technical claim was flagged (e.g., high accuracy, real-time latency), probe dataset integrity or leakage.
3. OUTPUT FORMAT:
Return ONLY a valid JSON object matching this schema without any markdown backticks:
{
  "question": "string (the interview question text addressed directly to the candidate)",
  "category": "${stage}",
  "topic": "string (e.g. 'Machine Learning / Model Evaluation')",
  "subtopic": "string (e.g. 'Data Leakage & Train-Test Splitting')",
  "difficulty": "${targetDifficulty}",
  "skill": "string (e.g. 'Python', 'System Design', 'ML')",
  "estimatedTime": "string (e.g. '2-3 mins')",
  "reason": "string (explicit rationale explaining why this question was chosen based on candidate history and adaptive trajectory)",
  "evaluationFocus": ["string", "string", "string"]
}`;
}

/**
 * Prompt for evaluating the candidate's answer
 */
export function buildEvaluationPrompt(params: {
  candidateProfile: CandidateProfile;
  question: any;
  candidateAnswer: string;
}): string {
  const { candidateProfile, question, candidateAnswer } = params;

  return `You are evaluating a candidate's answer in a rigorous technical interview.

--- QUESTION DETAILS ---
Category: ${question.category}
Topic: ${question.topic} (${question.subtopic})
Difficulty: ${question.difficulty}
Target Skill: ${question.skill}
Question Asked: "${question.question}"
Evaluation Focus: ${question.evaluationFocus.join(', ')}

--- CANDIDATE INFORMATION ---
Target Role: ${candidateProfile.targetRole}
Target Company: ${candidateProfile.targetCompany}

--- CANDIDATE ANSWER ---
"${candidateAnswer}"

--- EVALUATION GUIDELINES ---
1. Score each metric on an integer scale from 1 to 10:
   - overallScore: Holistic rating of the response (1-10)
   - technicalAccuracy: Correctness of concepts, algorithms, APIs, or architectural claims (1-10)
   - communication: Articulation, structure, conciseness, and professionalism (1-10)
   - relevance: How directly and specifically they answered what was asked (1-10)
   - clarity: Ease of comprehension, logical flow, avoiding rambling (1-10)
   - depth: Nuance, edge-case awareness, explaining *why* instead of just *what* (1-10)
2. Identify:
   - strengths: 1 to 3 specific positive technical or behavioral elements demonstrated
   - weaknesses: 1 to 3 gaps, inaccuracies, missing edge cases, or superficial statements
   - followUpRequired: boolean (true if answer left key claims unverified, had hand-waving, or begs deeper architectural probing)
   - extractedClaims: array of strings containing any concrete technical claims made in this answer (e.g. "achieved 95% precision", "reduced Redis query time to 5ms", "built Kafka consumer with at-least-once delivery")
   - detailedFeedback: constructive feedback for the candidate

Return ONLY a valid JSON object matching this schema without markdown code fences:
{
  "overallScore": number,
  "technicalAccuracy": number,
  "communication": number,
  "relevance": number,
  "clarity": number,
  "depth": number,
  "strengths": ["string"],
  "weaknesses": ["string"],
  "followUpRequired": boolean,
  "detailedFeedback": "string",
  "extractedClaims": ["string"]
}`;
}

/**
 * Prompt for generating the final comprehensive assessment report
 */
export function buildReportPrompt(params: {
  candidateProfile: CandidateProfile;
  history: HistoryItem[];
  skillProfile: SkillProfile;
}): string {
  const { candidateProfile, history, skillProfile } = params;

  const historySummary = history
    .map(
      (h, i) =>
        `Q${i + 1} [${h.question.category} - ${h.question.topic} (${h.question.difficulty})]:
Question: "${h.question.question}"
Answer: "${h.answer}"
Scores: Overall ${h.evaluation.overallScore}/10 | Tech ${h.evaluation.technicalAccuracy}/10 | Comm ${h.evaluation.communication}/10 | Depth ${h.evaluation.depth}/10
Strengths: ${h.evaluation.strengths.join(', ')}
Weaknesses: ${h.evaluation.weaknesses.join(', ')}`
    )
    .join('\n\n');

  return `Generate a comprehensive final interview assessment report for candidate: ${candidateProfile.name}.

Candidate Target: ${candidateProfile.targetRole} at ${candidateProfile.targetCompany}
Skill Evolution Profile: ${JSON.stringify(skillProfile)}

--- COMPLETE INTERVIEW TRANSCRIPT & EVALUATIONS ---
${historySummary}

--- REPORT REQUIREMENTS ---
1. Calculate rigorous percentage scores (0 to 100) for the 5 Core Assessment Areas + Overall Readiness:
   - Technical Knowledge (accuracy & depth in declared technologies)
   - Problem Solving (debugging, system trade-offs, algorithmic thinking)
   - Communication (clarity, precision, structured expression)
   - Project Understanding (ownership, metric validation, claim authenticity)
   - Behavioral (adaptability, accountability, team alignment)
   - Overall Readiness (weighted composite representing employability for ${candidateProfile.targetRole})
2. Overall Recommendation MUST be strictly one of:
   - "Strong Candidate" (Overall Readiness >= 80% with solid technical & project understanding)
   - "Placement Ready" (Overall Readiness 70% - 79% with good foundations)
   - "Developing" (Overall Readiness 55% - 69% with notable gaps requiring coaching)
   - "Needs Improvement" (Overall Readiness < 55%)
3. Synthesize actionable, authentic:
   - strengths: 3 to 5 highlights with technical specificity
   - areasForImprovement: 3 to 4 concrete engineering or behavioral gaps identified
   - recommendedLearning: 3 to 4 specific courses, topics, or engineering practices to study
   - recommendationRationale: 2-3 paragraph executive summary explaining the hiring decision.

Return ONLY a valid JSON object matching this schema without markdown fences:
{
  "candidateName": "${candidateProfile.name}",
  "targetRole": "${candidateProfile.targetRole}",
  "targetCompany": "${candidateProfile.targetCompany}",
  "assessmentAreas": {
    "technicalKnowledge": number,
    "problemSolving": number,
    "communication": number,
    "projectUnderstanding": number,
    "behavioral": number,
    "overallReadiness": number
  },
  "strengths": ["string"],
  "areasForImprovement": ["string"],
  "recommendedLearning": ["string"],
  "overallRecommendation": "Strong Candidate" | "Placement Ready" | "Developing" | "Needs Improvement",
  "recommendationRationale": "string"
}`;
}
