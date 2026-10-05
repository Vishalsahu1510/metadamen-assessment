import { Router, Request, Response } from 'express';
import { EdgeTTS } from 'node-edge-tts';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { v4 as uuidv4 } from 'uuid';

export const audioRouter = Router();

// Default voices supported
export const SUPPORTED_VOICES = [
  { id: 'en-US-AvaNeural', name: 'Ava (US Professional Female)' },
  { id: 'en-US-AndrewNeural', name: 'Andrew (US Professional Male)' },
  { id: 'en-US-JennyNeural', name: 'Jenny (US Technical Recruiter)' },
  { id: 'en-IN-NeerjaNeural', name: 'Neerja (Indian English Female)' },
  { id: 'en-GB-SoniaNeural', name: 'Sonia (British English Female)' },
];

/**
 * GET /api/audio/voices
 * Lists available neural voices
 */
audioRouter.get('/voices', (_req: Request, res: Response) => {
  res.json(SUPPORTED_VOICES);
});

/**
 * POST /api/audio/tts
 * Synthesizes text into high-fidelity neural MP3 audio
 */
audioRouter.post('/tts', async (req: Request, res: Response) => {
  let tempFilePath: string | null = null;
  try {
    const { text, voice = 'en-US-AvaNeural' } = req.body;

    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      return res.status(400).json({ error: 'Text string is required for audio synthesis.' });
    }

    // Sanitize text (remove markdown formatting, asterisk, fences)
    const cleanText = text
      .replace(/[*_#`~\[\]]/g, '')
      .replace(/\s+/g, ' ')
      .trim();

    const selectedVoice =
      SUPPORTED_VOICES.find((v) => v.id === voice)?.id || 'en-US-AvaNeural';

    const tempFileName = `vaani_speech_${uuidv4()}.mp3`;
    tempFilePath = path.join(os.tmpdir(), tempFileName);

    const tts = new EdgeTTS({
      voice: selectedVoice,
      lang: 'en-US',
      outputFormat: 'audio-24khz-48kbitrate-mono-mp3',
    });

    await tts.ttsPromise(cleanText, tempFilePath);

    if (!fs.existsSync(tempFilePath)) {
      throw new Error('TTS audio file was not generated.');
    }

    const stat = fs.statSync(tempFilePath);
    res.writeHead(200, {
      'Content-Type': 'audio/mpeg',
      'Content-Length': stat.size,
      'Cache-Control': 'public, max-age=3600',
    });

    const readStream = fs.createReadStream(tempFilePath);
    readStream.pipe(res);

    readStream.on('close', () => {
      if (tempFilePath && fs.existsSync(tempFilePath)) {
        try {
          fs.unlinkSync(tempFilePath);
        } catch (_) {}
      }
    });
  } catch (error: any) {
    console.error('Error generating neural speech with EdgeTTS:', error);
    if (tempFilePath && fs.existsSync(tempFilePath)) {
      try {
        fs.unlinkSync(tempFilePath);
      } catch (_) {}
    }
    return res.status(500).json({
      error: 'Failed to synthesize audio',
      message: error.message || 'Internal server error',
    });
  }
});
