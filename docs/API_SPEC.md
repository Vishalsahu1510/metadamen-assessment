# VAANI™ REST API Specification

All endpoints are hosted by default at `http://localhost:5000/api`.

---

## 1. Health Check
- **Endpoint**: `GET /api/health`
- **Description**: Verifies backend server health and reports active AI provider status.
- **Response**:
```json
{
  "status": "healthy",
  "system": "VAANI™ Adaptive AI Interview & Assessment Intelligence",
  "aiProvider": "gemini",
  "geminiConfigured": true,
  "groqConfigured": false,
  "timestamp": "2026-10-03T07:38:42.000Z"
}
```

---

## 2. Start Interview Session
- **Endpoint**: `POST /api/sessions/start`
- **Description**: Ingests candidate profile, initializes the skill profile, generates Question 1 (Introduction), and returns the new session.
- **Request Body**:
```json
{
  "name": "Aarav Sharma",
  "degree": "B.Tech",
  "branch": "CSE / AI-ML",
  "year": "3rd-Year",
  "targetCompany": "MetaDamen",
  "targetRole": "Associate Software Engineer",
  "technicalSkills": ["Python", "Machine Learning", "FastAPI", "React", "SQL"],
  "projects": [
    {
      "title": "Recommendation System",
      "description": "Real-time collaborative filtering recommendation engine with neural embeddings",
      "techStack": ["Python", "PyTorch", "FastAPI", "Redis"],
      "claims": ["Achieved 95% model accuracy and sub-20ms inference latency"]
    }
  ],
  "internshipExperience": "AI/ML Intern at TechCorp (3 months)"
}
```
- **Response**: `201 Created`
```json
{
  "message": "Interview session initialized successfully",
  "session": {
    "id": "70cbd252-732d-4c66-8d37-793e7981e612",
    "status": "in_progress",
    "currentQuestionIndex": 1,
    "currentStage": "Introduction",
    "currentDifficulty": "Medium",
    "currentQuestion": {
      "id": "q-101",
      "question": "Welcome Aarav Sharma! To get started, please introduce yourself, highlight your academic journey in CSE / AI-ML...",
      "category": "Introduction",
      "topic": "Candidate Background",
      "subtopic": "Career Alignment & Communication",
      "difficulty": "Medium",
      "skill": "Communication",
      "estimatedTime": "2-3 mins",
      "reason": "Evaluate articulation, career vision, and relevance of background.",
      "evaluationFocus": ["communication", "clarity", "relevance"]
    },
    "skillProfile": {
      "Communication": 6,
      "Problem Solving": 6,
      "System Architecture": 5,
      "Python": 6,
      "Machine Learning": 6,
      "FastAPI": 6,
      "React": 6,
      "SQL": 6
    }
  }
}
```

---

## 3. Submit Candidate Answer
- **Endpoint**: `POST /api/sessions/:id/answer`
- **Description**: Submits the candidate's answer for the active question. Evaluates answer across 6 dimensions, updates skill profile & difficulty, detects technical claims, and generates the next adaptive question (or final report if interview is complete).
- **Request Body**:
```json
{
  "answer": "In my recommendation system project, we trained a two-tower neural embedding model with negative sampling. We ensured dataset integrity using strict time-based train-test splits..."
}
```
- **Response**: `200 OK`
```json
{
  "completed": false,
  "evaluation": {
    "overallScore": 8,
    "technicalAccuracy": 8,
    "communication": 8,
    "relevance": 9,
    "clarity": 8,
    "depth": 7,
    "strengths": ["Clear explanation of negative sampling and time-based splitting"],
    "weaknesses": ["Could elaborate on cold-start handling for new items"],
    "followUpRequired": true,
    "detailedFeedback": "Strong technical depth demonstrated on validation splits.",
    "extractedClaims": ["trained two-tower neural embedding model"]
  },
  "nextQuestion": {
    "id": "q-102",
    "question": "In your project, how did you handle cold-start items with zero interaction history during real-time inference?",
    "category": "Project",
    "topic": "Recommendation System Architecture",
    "subtopic": "Cold-Start Handling & Latency",
    "difficulty": "Hard",
    "skill": "Machine Learning",
    "estimatedTime": "2-3 mins",
    "reason": "Adaptive scaling: previous answer scored 8/10; probing project claim and edge cases.",
    "evaluationFocus": ["cold_start_mitigation", "architectural_tradeoffs"]
  }
}
```

---

## 4. Finalize Interview & Generate Assessment Report
- **Endpoint**: `POST /api/sessions/:id/complete`
- **Description**: Generates the comprehensive assessment report with percentage scores, strengths, areas for improvement, recommended learning, and algorithmic hiring recommendation.

---

## 5. Session History & Archives
- **`GET /api/sessions`**: List all past sessions.
- **`GET /api/sessions/:id`**: Retrieve full session state and history.
- **`DELETE /api/sessions/:id`**: Delete a session.

---

## 6. Neural Voice Synthesis (EdgeTTS)
- **`GET /api/audio/voices`**: Lists available Microsoft Azure 24kHz neural voices (Ava, Andrew, Jenny, Neerja, Sonia).
- **`POST /api/audio/tts`**:
  - Synthesizes question text into high-fidelity neural MP3 audio stream for the animated recruiter avatar.
  - **Request Body**:
  ```json
  {
    "text": "In your recommendation system, how did you prevent data leakage during train-test splitting?",
    "voice": "en-US-AvaNeural"
  }
  ```
  - **Response**: `200 OK` with binary `audio/mpeg` stream.
