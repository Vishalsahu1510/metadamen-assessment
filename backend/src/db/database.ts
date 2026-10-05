import fs from 'fs';
import path from 'path';
import os from 'os';
import { neon } from '@neondatabase/serverless';
import { InterviewSession } from '../types/index.js';
import { config } from '../config/env.js';

// On Vercel / serverless lambda environments, process.cwd() is read-only.
// We safely use os.tmpdir() when running under Vercel / serverless.
const DATA_DIR = process.env.VERCEL
  ? path.join(os.tmpdir(), 'vaani_data')
  : path.resolve(process.cwd(), 'data');
const SESSIONS_FILE = path.join(DATA_DIR, 'sessions.json');

// Ensure local data directory exists for fallback safely
try {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
} catch (err) {
  console.warn('Notice: Local data directory could not be created:', err);
}

class DatabaseService {
  private localSessions: Map<string, InterviewSession> = new Map();
  private isNeon: boolean = false;
  private neonSql: ReturnType<typeof neon> | null = null;
  private tablesInitialized: boolean = false;

  constructor() {
    this.init();
  }

  private init(): void {
    if (config.databaseUrl && (config.databaseUrl.startsWith('postgres://') || config.databaseUrl.startsWith('postgresql://'))) {
      try {
        this.neonSql = neon(config.databaseUrl);
        this.isNeon = true;
        console.log('🐘 Database configured: Neon Serverless PostgreSQL');
      } catch (err) {
        console.warn('Failed to initialize Neon client, falling back to local file store:', err);
        this.isNeon = false;
        this.loadLocalFromFile();
      }
    } else {
      this.isNeon = false;
      this.loadLocalFromFile();
    }
  }

  /**
   * Ensures the PostgreSQL table exists on Neon
   */
  private async ensureNeonTables(): Promise<void> {
    if (!this.neonSql || this.tablesInitialized) return;

    try {
      await this.neonSql`
        CREATE TABLE IF NOT EXISTS interview_sessions (
          id VARCHAR(64) PRIMARY KEY,
          candidate_profile JSONB NOT NULL,
          status VARCHAR(32) NOT NULL,
          current_question_index INT NOT NULL,
          current_stage VARCHAR(32) NOT NULL,
          current_difficulty VARCHAR(32) NOT NULL,
          skill_profile JSONB NOT NULL,
          history JSONB NOT NULL,
          current_question JSONB,
          final_report JSONB,
          created_at TIMESTAMPTZ NOT NULL,
          updated_at TIMESTAMPTZ NOT NULL
        );
      `;
      this.tablesInitialized = true;
    } catch (err) {
      console.error('Error creating Neon PostgreSQL tables:', err);
    }
  }

  /**
   * Map PostgreSQL database row to InterviewSession type
   */
  private mapRowToSession(row: any): InterviewSession {
    const parseField = (val: any) => {
      if (typeof val === 'string') {
        try {
          return JSON.parse(val);
        } catch (_) {
          return val;
        }
      }
      return val;
    };

    return {
      id: row.id,
      candidateProfile: parseField(row.candidate_profile),
      status: row.status,
      currentQuestionIndex: Number(row.current_question_index),
      currentStage: row.current_stage,
      currentDifficulty: row.current_difficulty,
      skillProfile: parseField(row.skill_profile),
      history: parseField(row.history) || [],
      currentQuestion: row.current_question ? parseField(row.current_question) : null,
      finalReport: row.final_report ? parseField(row.final_report) : undefined,
      createdAt: new Date(row.created_at).toISOString(),
      updatedAt: new Date(row.updated_at).toISOString(),
    };
  }

  // ================= Local Fallback Store Helpers =================

  private loadLocalFromFile(): void {
    try {
      if (fs.existsSync(SESSIONS_FILE)) {
        const data = fs.readFileSync(SESSIONS_FILE, 'utf-8');
        const parsed = JSON.parse(data);
        if (Array.isArray(parsed)) {
          parsed.forEach((session: InterviewSession) => {
            this.localSessions.set(session.id, session);
          });
        }
      }
    } catch (error) {
      console.error('Error loading local sessions file:', error);
    }
  }

  private saveLocalToFile(): void {
    try {
      const array = Array.from(this.localSessions.values());
      fs.writeFileSync(SESSIONS_FILE, JSON.stringify(array, null, 2), 'utf-8');
    } catch (error) {
      console.error('Error saving local sessions file:', error);
    }
  }

  // ================= Public CRUD Interface =================

  public async createSession(session: InterviewSession): Promise<InterviewSession> {
    if (this.isNeon && this.neonSql) {
      try {
        await this.ensureNeonTables();
        await this.neonSql`
          INSERT INTO interview_sessions (
            id, candidate_profile, status, current_question_index, current_stage,
            current_difficulty, skill_profile, history, current_question, final_report,
            created_at, updated_at
          ) VALUES (
            ${session.id},
            ${JSON.stringify(session.candidateProfile)},
            ${session.status},
            ${session.currentQuestionIndex},
            ${session.currentStage},
            ${session.currentDifficulty},
            ${JSON.stringify(session.skillProfile)},
            ${JSON.stringify(session.history)},
            ${session.currentQuestion ? JSON.stringify(session.currentQuestion) : null},
            ${session.finalReport ? JSON.stringify(session.finalReport) : null},
            ${session.createdAt},
            ${session.updatedAt}
          )
          ON CONFLICT (id) DO UPDATE SET
            candidate_profile = EXCLUDED.candidate_profile,
            status = EXCLUDED.status,
            current_question_index = EXCLUDED.current_question_index,
            current_stage = EXCLUDED.current_stage,
            current_difficulty = EXCLUDED.current_difficulty,
            skill_profile = EXCLUDED.skill_profile,
            history = EXCLUDED.history,
            current_question = EXCLUDED.current_question,
            final_report = EXCLUDED.final_report,
            updated_at = EXCLUDED.updated_at;
        `;
        return session;
      } catch (err) {
        console.warn('Neon query failed, using local file fallback:', err);
      }
    }

    // Fallback to local
    this.localSessions.set(session.id, session);
    this.saveLocalToFile();
    return session;
  }

  public async getSession(id: string): Promise<InterviewSession | null> {
    if (this.isNeon && this.neonSql) {
      try {
        await this.ensureNeonTables();
        const rows = (await this.neonSql`
          SELECT * FROM interview_sessions WHERE id = ${id} LIMIT 1;
        `) as any[];
        if (rows && rows.length > 0) {
          return this.mapRowToSession(rows[0]);
        }
        return null;
      } catch (err) {
        console.warn('Neon getSession query failed, checking local store:', err);
      }
    }

    const session = this.localSessions.get(id);
    return session ? JSON.parse(JSON.stringify(session)) : null;
  }

  public async updateSession(session: InterviewSession): Promise<InterviewSession> {
    session.updatedAt = new Date().toISOString();

    if (this.isNeon && this.neonSql) {
      try {
        await this.ensureNeonTables();
        await this.neonSql`
          UPDATE interview_sessions SET
            candidate_profile = ${JSON.stringify(session.candidateProfile)},
            status = ${session.status},
            current_question_index = ${session.currentQuestionIndex},
            current_stage = ${session.currentStage},
            current_difficulty = ${session.currentDifficulty},
            skill_profile = ${JSON.stringify(session.skillProfile)},
            history = ${JSON.stringify(session.history)},
            current_question = ${session.currentQuestion ? JSON.stringify(session.currentQuestion) : null},
            final_report = ${session.finalReport ? JSON.stringify(session.finalReport) : null},
            updated_at = ${session.updatedAt}
          WHERE id = ${session.id};
        `;
        return session;
      } catch (err) {
        console.warn('Neon updateSession query failed, falling back to local store:', err);
      }
    }

    this.localSessions.set(session.id, session);
    this.saveLocalToFile();
    return session;
  }

  public async listSessions(): Promise<InterviewSession[]> {
    if (this.isNeon && this.neonSql) {
      try {
        await this.ensureNeonTables();
        const rows = (await this.neonSql`
          SELECT * FROM interview_sessions ORDER BY created_at DESC;
        `) as any[];
        return rows.map((r: any) => this.mapRowToSession(r));
      } catch (err) {
        console.warn('Neon listSessions query failed, checking local store:', err);
      }
    }

    return Array.from(this.localSessions.values()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  public async deleteSession(id: string): Promise<boolean> {
    if (this.isNeon && this.neonSql) {
      try {
        await this.ensureNeonTables();
        await this.neonSql`
          DELETE FROM interview_sessions WHERE id = ${id};
        `;
        return true;
      } catch (err) {
        console.warn('Neon deleteSession query failed, checking local store:', err);
      }
    }

    const deleted = this.localSessions.delete(id);
    if (deleted) {
      this.saveLocalToFile();
    }
    return deleted;
  }

  public getEngineType(): 'neon' | 'local' {
    return this.isNeon ? 'neon' : 'local';
  }
}

export const db = new DatabaseService();
