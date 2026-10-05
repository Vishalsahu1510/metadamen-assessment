import { duplicateDetector } from '../ai/duplicateDetector.js';
import { llmService } from '../ai/llmProvider.js';
import {
  CandidateProfile,
  DifficultyLevel,
  HistoryItem,
  InterviewSession,
  QuestionCategory,
  QuestionMetadata,
  SkillProfile,
} from '../types/index.js';

export class AdaptiveEngine {
  /**
   * Initializes baseline skill profile based on candidate's declared skills
   */
  public initializeSkillProfile(profile: CandidateProfile): SkillProfile {
    const skillMap: SkillProfile = {
      Communication: 6,
      'Problem Solving': 6,
      'System Architecture': 5,
    };

    profile.technicalSkills.forEach((skill) => {
      skillMap[skill] = 6; // Baseline default
    });

    return skillMap;
  }

  /**
   * Adapts difficulty based on previous question performance
   * Rule:
   *   Score >= 7 -> Increase difficulty (Easy -> Medium -> Hard)
   *   Score < 5  -> Decrease difficulty (Hard -> Medium -> Easy)
   *   Score 5..6 -> Maintain current difficulty
   */
  public computeNextDifficulty(
    currentDifficulty: DifficultyLevel,
    lastScore: number
  ): DifficultyLevel {
    if (lastScore >= 7) {
      if (currentDifficulty === 'Easy') return 'Medium';
      if (currentDifficulty === 'Medium') return 'Hard';
      return 'Hard';
    } else if (lastScore < 5) {
      if (currentDifficulty === 'Hard') return 'Medium';
      if (currentDifficulty === 'Medium') return 'Easy';
      return 'Easy';
    }
    return currentDifficulty;
  }

  /**
   * Updates skill profile in real-time using exponential moving average
   */
  public updateSkillProfile(
    currentProfile: SkillProfile,
    testedSkill: string,
    score: number,
    communicationScore: number
  ): SkillProfile {
    const updated: SkillProfile = { ...currentProfile };

    // Update specific tested skill
    const currentScore = updated[testedSkill] || 6;
    updated[testedSkill] = Math.min(
      10,
      Math.max(1, Math.round(currentScore * 0.55 + score * 0.45))
    );

    // Update Communication skill globally
    const currentComm = updated['Communication'] || 6;
    updated['Communication'] = Math.min(
      10,
      Math.max(1, Math.round(currentComm * 0.6 + communicationScore * 0.4))
    );

    return updated;
  }

  /**
   * Dynamically determines the next stage and pedagogical focus based on candidate performance
   */
  public determineNextStage(session: InterviewSession): {
    stage: QuestionCategory;
    focusSkill: string;
    claimToVerify?: string;
  } {
    const historyCount = session.history.length;
    const lastItem = historyCount > 0 ? session.history[historyCount - 1] : null;

    // Stage 1: Introduction
    if (historyCount === 0) {
      return { stage: 'Introduction', focusSkill: 'Communication' };
    }

    // Check if there is an unverified claim from previous answers or project description
    let pendingClaim: string | undefined;
    if (lastItem && lastItem.evaluation.extractedClaims && lastItem.evaluation.extractedClaims.length > 0) {
      pendingClaim = lastItem.evaluation.extractedClaims[0];
    } else {
      // Check candidate profile projects for explicit claims
      for (const proj of session.candidateProfile.projects) {
        if (proj.claims && proj.claims.length > 0) {
          pendingClaim = proj.claims[0];
          break;
        }
      }
    }

    // Dynamic stage sequence based on progress
    if (historyCount === 1) {
      // Move to Technical on primary declared skill
      const skill = session.candidateProfile.technicalSkills[0] || 'Python';
      return { stage: 'Technical', focusSkill: skill };
    }

    if (historyCount === 2) {
      // If previous technical answer was very strong and had a follow up, or jump to Project Deep Dive
      if (lastItem && lastItem.evaluation.followUpRequired && pendingClaim) {
        return {
          stage: 'Project',
          focusSkill: 'Project Architecture',
          claimToVerify: pendingClaim,
        };
      }
      // Or secondary technical skill
      const secondarySkill =
        session.candidateProfile.technicalSkills[1] ||
        session.candidateProfile.technicalSkills[0] ||
        'Machine Learning';
      return { stage: 'Technical', focusSkill: secondarySkill };
    }

    if (historyCount === 3) {
      return {
        stage: 'Project',
        focusSkill: 'Project Deep Dive',
        claimToVerify: pendingClaim,
      };
    }

    if (historyCount === 4) {
      return { stage: 'ProblemSolving', focusSkill: 'Problem Solving' };
    }

    if (historyCount >= 5) {
      return { stage: 'Behavioral', focusSkill: 'Behavioral' };
    }

    return { stage: 'Technical', focusSkill: 'Software Engineering' };
  }

  /**
   * Orchestrates next question generation with duplicate detection & retry loop
   */
  public async getNextAdaptiveQuestion(session: InterviewSession): Promise<QuestionMetadata> {
    const history = session.history;
    const lastInteraction = history.length > 0 ? history[history.length - 1] : null;

    // 1. Determine next difficulty
    const targetDifficulty = lastInteraction
      ? this.computeNextDifficulty(session.currentDifficulty, lastInteraction.evaluation.overallScore)
      : 'Medium';

    // 2. Determine stage & focus
    const { stage, focusSkill, claimToVerify } = this.determineNextStage(session);

    // 3. Collect previous weaknesses
    const allWeaknesses = history.flatMap((h) => h.evaluation.weaknesses);
    const existingQuestions = history.map((h) => h.question);

    // 4. Generate question with semantic duplicate check loop (up to 3 attempts)
    let candidateQuestion: QuestionMetadata | null = null;
    let attempts = 0;
    const maxAttempts = 3;

    while (attempts < maxAttempts) {
      attempts++;
      candidateQuestion = await llmService.generateQuestion({
        candidateProfile: session.candidateProfile,
        stage,
        targetDifficulty,
        skillProfile: session.skillProfile,
        history,
        previousWeaknesses: allWeaknesses,
        focusSkill,
        claimToVerify,
      });

      // Semantic duplicate check
      const dupCheck = duplicateDetector.checkDuplicate(
        candidateQuestion.question,
        candidateQuestion.topic,
        existingQuestions
      );

      if (!dupCheck.isDuplicate) {
        break; // Passed duplicate check!
      }

      console.warn(
        `Duplicate question detected on attempt ${attempts} (${dupCheck.similarity * 100}% similarity). Regenerating with alternate focus...`
      );
    }

    if (!candidateQuestion) {
      throw new Error('Failed to generate non-duplicate question after multiple attempts.');
    }

    return candidateQuestion;
  }
}

export const adaptiveEngine = new AdaptiveEngine();
