import { Injectable, Logger, ServiceUnavailableException, HttpException, HttpStatus } from '@nestjs/common';

/**
 * Minimal Gemini REST client (generateContent). Plain fetch — no SDK — so the
 * serverless bundle stays small. The API key is read from the server env only
 * and never reaches the browser.
 */
export interface GeminiTurn { role: 'user' | 'model'; text: string }

export interface GeminiRequest {
  system: string;
  turns: GeminiTurn[];
  /** When set, the model must return JSON matching this OpenAPI-style schema. */
  schema?: Record<string, any>;
  temperature?: number;
  maxOutputTokens?: number;
}

export interface GeminiResult { text: string; model: string; tokensIn?: number; tokensOut?: number; latencyMs: number }

const ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/models';

@Injectable()
export class GeminiClient {
  private log = new Logger('Gemini');
  get enabled() { return process.env.AI_ENABLED === 'true' && !!process.env.GEMINI_API_KEY; }
  get model() { return process.env.AI_MODEL || 'gemini-3.5-flash'; }
  /** Primary model first, then fallbacks — free-tier models are often "high demand". */
  get models() {
    const fallbacks = (process.env.AI_FALLBACK_MODELS ?? 'gemini-3.8-flash,gemini-flash-lite-latest')
      .split(',').map((m) => m.trim()).filter(Boolean);
    return [...new Set([this.model, ...fallbacks])];
  }

  async generate(req: GeminiRequest): Promise<GeminiResult> {
    if (!this.enabled) throw new ServiceUnavailableException('The AI assistant is turned off.');
    const configuredTimeout = Number(process.env.AI_TIMEOUT_MS || 20000);
    // A single budget across every attempt, leaving room for DB/audit work in
    // the 30-second Vercel function. Include reading the response body.
    const timeout = Number.isFinite(configuredTimeout) ? Math.max(1000, Math.min(configuredTimeout, 24000)) : 20000;
    const body = JSON.stringify({
      systemInstruction: { parts: [{ text: req.system }] },
      contents: req.turns.map((t) => ({ role: t.role, parts: [{ text: t.text }] })),
      generationConfig: {
        temperature: req.temperature ?? 0.3,
        maxOutputTokens: req.maxOutputTokens ?? 2048,
        ...(req.schema ? { responseMimeType: 'application/json', responseSchema: req.schema } : {}),
      },
    });

    const started = Date.now();
    let rateLimited = false;
    const models = this.models;
    for (const [index, model] of models.entries()) {
      const remaining = timeout - (Date.now() - started);
      if (remaining <= 0) break;
      // Reserve time for every fallback instead of letting an overloaded
      // primary consume the whole request budget.
      const attemptTimeout = Math.max(1, Math.floor(remaining / (models.length - index)));
      let res: Response;
      let json: any;
      try {
        res = await fetch(`${ENDPOINT}/${encodeURIComponent(model)}:generateContent`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-goog-api-key': process.env.GEMINI_API_KEY as string },
          body,
          signal: AbortSignal.timeout(attemptTimeout),
        });
        json = await res.json();
      } catch {
        this.log.warn(`Gemini ${model}: request failed or exceeded ${attemptTimeout} ms`);
        continue;
      }
      if (!res.ok) {
        // Provider error bodies can echo submitted text. Log only status.
        this.log.warn(`Gemini ${model}: HTTP ${res.status}`);
        if (res.status === 429) rateLimited = true;
        if (res.status === 429 || res.status === 404 || res.status >= 500) continue; // try the next model
        throw new ServiceUnavailableException('The AI assistant is unavailable right now.');
      }
      const cand = json.candidates?.[0];
      const text = (cand?.content?.parts || []).filter((p: any) => !p.thought).map((p: any) => p.text || '').join('').trim();
      if (!text) {
        this.log.warn(`Gemini ${model} returned no text (finishReason: ${cand?.finishReason || 'unknown'})`);
        throw new ServiceUnavailableException('The AI assistant returned no answer. Please rephrase and try again.');
      }
      return {
        text, model,
        tokensIn: json.usageMetadata?.promptTokenCount,
        tokensOut: json.usageMetadata?.candidatesTokenCount,
        latencyMs: Date.now() - started,
      };
    }
    if (rateLimited) {
      throw new HttpException('The AI assistant is busy right now. Please try again in a minute.', HttpStatus.TOO_MANY_REQUESTS);
    }
    throw new ServiceUnavailableException('The AI assistant is busy right now. Please try again shortly.');
  }

  /** generate() + JSON.parse, tolerating a fenced ```json block. */
  async generateJson<T = any>(req: GeminiRequest): Promise<{ data: T; meta: GeminiResult }> {
    const meta = await this.generate(req);
    const raw = meta.text.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '');
    try {
      const data = JSON.parse(raw);
      if (!data || typeof data !== 'object' || Array.isArray(data)) throw new Error('Expected an object');
      return { data: data as T, meta };
    } catch {
      throw new ServiceUnavailableException('The AI assistant returned an unreadable answer. Please try again.');
    }
  }
}
