import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../db/database.js';
import {
  CandidateProfileSchema,
  InterviewSession,
} from '../types/index.js';
import { adaptiveEngine } from '../services/adaptiveEngine.js';
import { llmService } from '../ai/llmProvider.js';

export const sessionRouter = Router();

/**
 * POST /api/sessions/start
 * Initializes a new interview session and generates Question 1 (Introduction)
 */
sessionRouter.post('/start', async (req: Request, res: Response) => {
  try {
    const parseResult = CandidateProfileSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        error: 'Invalid candidate profile',
        details: parseResult.error.errors,
      });
    }

    const candidateProfile = parseResult.data;
    const sessionId = uuidv4();

    const initialSkillProfile = adaptiveEngine.initializeSkillProfile(candidateProfile);

    // Create session template
    const newSession: InterviewSession = {
      id: sessionId,
      candidateProfile,
      status: 'in_progress',
      currentQuestionIndex: 1,
      currentStage: 'Introduction',
      currentDifficulty: 'Medium',
      skillProfile: initialSkillProfile,
      history: [],
      currentQuestion: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Generate Question 1
    const firstQuestion = await adaptiveEngine.getNextAdaptiveQuestion(newSession);
    newSession.currentQuestion = firstQuestion;
    newSession.currentStage = firstQuestion.category;
    newSession.currentDifficulty = firstQuestion.difficulty;

    await db.createSession(newSession);

    return res.status(201).json({
      message: 'Interview session initialized successfully',
      session: newSession,
    });
  } catch (error: any) {
    console.error('Error starting session:', error);
    return res.status(500).json({
      error: 'Failed to start interview session',
      message: error.message || 'Internal server error',
    });
  }
});

/**
 * GET /api/sessions/:id
 * Fetches the current session state
 */
sessionRouter.get('/:id', async (req: Request, res: Response) => {
  try {
    const sessionId = req.params.id as string;
    const session = await db.getSession(sessionId);
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }
    return res.json(session);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/sessions/:id/answer
 * Submits an answer, evaluates it, updates skill profile, and generates next question or report
 */
sessionRouter.post('/:id/answer', async (req: Request, res: Response) => {
  try {
    const sessionId = req.params.id as string;
    const session = await db.getSession(sessionId);
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    if (session.status === 'completed') {
      return res.status(400).json({ error: 'This interview has already completed.' });
    }

    const { answer } = req.body;
    if (!answer || typeof answer !== 'string' || answer.trim().length === 0) {
      return res.status(400).json({ error: 'Candidate answer text is required.' });
    }

    const currentQ = session.currentQuestion;
    if (!currentQ) {
      return res.status(400).json({ error: 'No active question found to answer.' });
    }

    // 1. Evaluate answer
    const evaluation = await llmService.evaluateAnswer({
      candidateProfile: session.candidateProfile,
      question: currentQ,
      candidateAnswer: answer.trim(),
    });

    // 2. Record to history
    session.history.push({
      question: currentQ,
      answer: answer.trim(),
      evaluation,
      timestamp: new Date().toISOString(),
    });

    // 3. Update skill profile & difficulty
    session.skillProfile = adaptiveEngine.updateSkillProfile(
      session.skillProfile,
      currentQ.skill,
      evaluation.overallScore,
      evaluation.communication
    );

    session.currentDifficulty = adaptiveEngine.computeNextDifficulty(
      session.currentDifficulty,
      evaluation.overallScore
    );

    // 4. Check if interview reached completion threshold (default: 5 stages completed)
    const MAX_QUESTIONS = 5;
    if (session.history.length >= MAX_QUESTIONS) {
      // Finalize and generate report
      session.status = 'completed';
      session.currentQuestion = null;
      session.finalReport = await llmService.generateReport({
        candidateProfile: session.candidateProfile,
        history: session.history,
        skillProfile: session.skillProfile,
      });

      await db.updateSession(session);

      return res.json({
        completed: true,
        evaluation,
        session,
        finalReport: session.finalReport,
      });
    }

    // 5. Generate next adaptive question
    const nextQuestion = await adaptiveEngine.getNextAdaptiveQuestion(session);
    session.currentQuestion = nextQuestion;
    session.currentQuestionIndex += 1;
    session.currentStage = nextQuestion.category;
    session.currentDifficulty = nextQuestion.difficulty;

    await db.updateSession(session);

    return res.json({
      completed: false,
      evaluation,
      nextQuestion,
      session,
    });
  } catch (error: any) {
    console.error('Error submitting answer:', error);
    return res.status(500).json({
      error: 'Failed to process answer',
      message: error.message || 'Internal server error',
    });
  }
});

/**
 * POST /api/sessions/:id/complete
 * Prematurely or explicitly concludes the interview and generates the final report
 */
sessionRouter.post('/:id/complete', async (req: Request, res: Response) => {
  try {
    const sessionId = req.params.id as string;
    const session = await db.getSession(sessionId);
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    if (session.history.length === 0) {
      return res.status(400).json({
        error: 'Cannot generate a final report before answering at least one question.',
      });
    }

    session.status = 'completed';
    session.currentQuestion = null;
    session.finalReport = await llmService.generateReport({
      candidateProfile: session.candidateProfile,
      history: session.history,
      skillProfile: session.skillProfile,
    });

    await db.updateSession(session);

    return res.json({
      message: 'Interview completed successfully',
      session,
      finalReport: session.finalReport,
    });
  } catch (error: any) {
    console.error('Error completing session:', error);
    return res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/sessions
 * List all sessions
 */
sessionRouter.get('/', async (_req: Request, res: Response) => {
  try {
    const sessions = await db.listSessions();
    return res.json(sessions);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

/**
 * DELETE /api/sessions/:id
 * Delete session
 */
sessionRouter.delete('/:id', async (req: Request, res: Response) => {
  try {
    const sessionId = req.params.id as string;
    const deleted = await db.deleteSession(sessionId);
    if (!deleted) {
      return res.status(404).json({ error: 'Session not found' });
    }
    return res.json({ message: 'Session deleted successfully' });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});
