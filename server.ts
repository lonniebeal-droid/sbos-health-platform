import express from 'express';
import path from 'path';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';
import { createServer as createViteServer } from 'vite';

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT) || 3000;

// Gemini model is configurable via env. The previous hardcoded value
// ('gemini-3.6-flash') is not a real model and 404s on every call. Verify the
// exact model available on your account/SDK version before relying on this.
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.0-flash';

// ---------------------------
// SECURITY & HARDENING MIDDLEWARE
// ---------------------------

// Hide the Express fingerprint.
app.disable('x-powered-by');

// Trust a single upstream proxy/load balancer so req.ip reflects the client
// (needed for correct per-IP rate limiting behind a proxy in production).
app.set('trust proxy', 1);

// Cap request bodies — AI prompts are text; this prevents oversized-payload
// abuse/DoS. Applies to every JSON route below.
app.use(express.json({ limit: '256kb' }));

// Security headers (hand-rolled to avoid an extra dependency; mirrors the
// helmet defaults relevant to a JSON API that also hosts an SPA).
app.use((_req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('X-DNS-Prefetch-Control', 'off');
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
  if (process.env.NODE_ENV === 'production') {
    res.setHeader(
      'Strict-Transport-Security',
      'max-age=31536000; includeSubDomains',
    );
  }
  next();
});

// Fixed-window, per-IP in-memory rate limiter. Adequate for a single instance;
// for multi-instance deployments replace the Map with a shared store (Redis).
export function rateLimit(opts: { windowMs: number; max: number; key: string }) {
  const hits = new Map<string, { count: number; resetAt: number }>();
  return (
    req: express.Request,
    res: express.Response,
    next: express.NextFunction,
  ) => {
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    const id = `${opts.key}:${ip}`;
    const now = Date.now();
    const entry = hits.get(id);
    if (!entry || entry.resetAt <= now) {
      hits.set(id, { count: 1, resetAt: now + opts.windowMs });
    } else {
      entry.count += 1;
      if (entry.count > opts.max) {
        res.setHeader(
          'Retry-After',
          String(Math.ceil((entry.resetAt - now) / 1000)),
        );
        return res
          .status(429)
          .json({ error: 'Too many requests. Please slow down.' });
      }
    }
    // Opportunistic cleanup of expired windows to bound memory.
    if (hits.size > 5000) {
      for (const [k, v] of hits) if (v.resetAt <= now) hits.delete(k);
    }
    next();
  };
}

// Global API budget + a stricter budget on the expensive AI (Gemini) routes.
app.use('/api', rateLimit({ windowMs: 60_000, max: 120, key: 'global' }));
app.use('/api/ai', rateLimit({ windowMs: 60_000, max: 15, key: 'ai' }));

// Structured request logging for API routes (method, path, status, duration).
app.use('/api', (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const start = Date.now();
  res.on('finish', () => {
    console.log(
      `[SBOS] ${req.method} ${req.originalUrl} ${res.statusCode} ${Date.now() - start}ms`,
    );
  });
  next();
});

// Initialize Google GenAI Server SDK lazily or with fallbacks
function getGeminiClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

// ---------------------------
// REST API ENDPOINTS
// ---------------------------

// Health check
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    system: 'SBOS Healthcare Operating System Engine',
    version: '3.4.0-enterprise',
    timestamp: new Date().toISOString(),
    aiEngineActive: !!process.env.GEMINI_API_KEY,
  });
});

// AI Conversational Assistant (Jessie AI Receptionist, Care Navigator, Benefits Explainer)
app.post('/api/ai/chat', async (req, res) => {
  try {
    const { prompt, context = 'general_patient' } = req.body ?? {};

    if (typeof prompt !== 'string' || prompt.trim().length === 0) {
      return res
        .status(400)
        .json({ error: 'prompt is required and must be a non-empty string' });
    }
    if (prompt.length > 8000) {
      return res
        .status(400)
        .json({ error: 'prompt exceeds the 8000-character limit' });
    }

    const ai = getGeminiClient();

    let systemInstruction = `You are Jessie, the AI Care Navigator and Healthcare Assistant for SBOS HealthOS (White-Label Multi-Tenant Healthcare Operating System).
You serve multiple enterprise tenant organizations (healthcare systems, payers, behavioral health clinics, employers, and hospitals including SuccessBrand Medical Group, Bay Area Health System, and Apex Health Alliance).
You speak with Apple-quality clarity, clinical empathy, and high security standard (HIPAA compliant tone).
Provide concise, helpful, and structured advice for patients, providers, and HR admins.
When asked about benefits, copays, scheduling, claims, or symptom intake, explain clearly in plain English.
Never provide definitive medical diagnoses; always recommend consulting with a licensed provider for specific diagnoses.`;

    if (context === 'clinical_provider') {
      systemInstruction = `You are the SBOS AI Clinical & Medical Coding Assistant.
Help physicians and clinical staff with differential diagnosis reasoning, drug interaction warnings, ICD-10-CM / CPT coding guidelines, and evidence-based clinical protocols.
Be succinct, precise, and format answers using structured bullet points.`;
    } else if (context === 'insurance_admin') {
      systemInstruction = `You are the SBOS Claims & Fraud Intelligence AI.
Assist payer administrators with claims adjudication explanations, medical necessity evaluation, and fraud risk score breakdown.`;
    } else if (context === 'employer_hr') {
      systemInstruction = `You are the SBOS Employer Benefits AI Advisor.
Help HR directors with employee plan comparisons, open enrollment questions, wellness participation optimization, and premium ROI analysis.`;
    }

    if (!ai) {
      // Fallback response if GEMINI_API_KEY is not configured
      return res.json({
        reply: `[SBOS Jessie Assistant]: Thank you for your inquiry regarding "${prompt}". As your AI Care Navigator, I can confirm that your SBOS Gold Premier PPO plan covers telehealth visits at $20 copay and primary care visits at $20 copay. Would you like me to book an appointment or check your claim status?`,
        suggestedActions: [
          'Schedule Telehealth Visit',
          'View Plan Benefits & Deductible',
          'Track My Claims',
          'Speak with Care Navigator'
        ]
      });
    }

    const response = await ai.models.generateContent({
      model: GEMINI_MODEL,
      contents: prompt,
      config: {
        systemInstruction,
        temperature: 0.3,
      },
    });

    return res.json({
      reply: response.text || 'I have processed your health query.',
      suggestedActions: [
        'Find In-Network Specialist',
        'Explain EOB Explanation of Benefits',
        'Refill Active Prescription',
        'Check Prior Auth Status'
      ]
    });
  } catch (error: any) {
    // Log full detail server-side; return a generic message so internal error
    // text (SDK internals, keys in messages) never leaks to the client —
    // consistent with the clinical-notes and fraud-analysis handlers.
    console.error('Error in /api/ai/chat:', error);
    return res.status(500).json({ error: 'Failed to process AI chat query' });
  }
});

// AI Clinical BIRP Documentation & Medical Coding Assistant
app.post('/api/ai/clinical-notes', async (req, res) => {
  try {
    const { rawNotes, patientName, visitType } = req.body ?? {};
    if (typeof rawNotes !== 'string' || rawNotes.trim().length === 0) {
      return res
        .status(400)
        .json({ error: 'rawNotes is required and must be a non-empty string' });
    }
    if (rawNotes.length > 20000) {
      return res
        .status(400)
        .json({ error: 'rawNotes exceeds the 20000-character limit' });
    }

    const ai = getGeminiClient();

    if (!ai) {
      return res.json({
        birpNote: {
          behavior: `Patient ${patientName || 'Sarah Jenkins'} presented alert and cooperative for ${visitType || 'telehealth evaluation'}. Reported work-related anxiety and episodic mild hypertension.`,
          intervention: `Administered 45-min CBT consultation, diaphragmatic breathing technique, and reviewed BP self-monitoring protocol.`,
          response: `Patient demonstrated proficiency in 4-7-8 breathing loop and reported subjectively lower stress level (7/10 to 3/10).`,
          plan: `Follow-up in 2 weeks via SBOS Telehealth. Continue daily Lisinopril 10mg and daily stress journal.`,
          suggestedICD: ['F41.1 (Generalized Anxiety Disorder)', 'I10 (Essential Hypertension)'],
          suggestedCPT: ['90837 (Psychotherapy, 60 min)', '99214 (Office Visit, Moderate Complexity)']
        }
      });
    }

    const prompt = `Convert the following raw clinician notes into a standardized BIRP (Behavior, Intervention, Response, Plan) clinical note for patient ${patientName || 'Patient'}.
Include recommended ICD-10 diagnosis codes and CPT procedure codes.

Raw Clinician Dictation/Notes:
"${rawNotes}"

Format as JSON with keys: behavior, intervention, response, plan, suggestedICD (array of strings), suggestedCPT (array of strings).`;

    const response = await ai.models.generateContent({
      model: GEMINI_MODEL,
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        temperature: 0.2,
      }
    });

    const parsed = JSON.parse(response.text || '{}');
    return res.json({ birpNote: parsed });
  } catch (error: any) {
    console.error('Error in /api/ai/clinical-notes:', error);
    return res.status(500).json({ error: 'Failed to generate BIRP note' });
  }
});

// AI Claims Fraud, Waste & Abuse (FWA) Detector
app.post('/api/ai/fraud-analysis', async (req, res) => {
  try {
    const { claimData } = req.body ?? {};
    if (claimData === null || typeof claimData !== 'object') {
      return res
        .status(400)
        .json({ error: 'claimData is required and must be an object' });
    }
    const ai = getGeminiClient();

    if (!ai) {
      return res.json({
        riskScore: 12,
        recommendation: 'Auto-Approve: Claim pricing aligns with regional Medicare fee schedule and standard CPT frequency guidelines.',
        riskFlags: ['Routine high-volume billing check passed', 'In-network provider verified']
      });
    }

    const prompt = `Analyze this healthcare insurance claim for Fraud, Waste, and Abuse (FWA) risk:
${JSON.stringify(claimData, null, 2)}

Provide a JSON output with:
- riskScore (number between 0 and 100)
- recommendation (string)
- riskFlags (array of string bullet points explaining flags or clean status)`;

    const response = await ai.models.generateContent({
      model: GEMINI_MODEL,
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        temperature: 0.1
      }
    });

    const parsed = JSON.parse(response.text || '{}');
    return res.json(parsed);
  } catch (error: any) {
    console.error('Error in /api/ai/fraud-analysis:', error);
    return res.status(500).json({ error: 'Fraud analysis failed' });
  }
});

// ---------------------------
// NOTE: the previous /api/{auth,tenants,appointments,messages,telehealth,
// billing,notifications,storage,audit,analytics,graphql} endpoints were fake
// stubs returning fabricated literals. They were unused by the client (which
// reads data directly from Supabase) and have been removed. The real API
// surface is /api/health, /api/ai/*, and the OpenAPI spec below. Unknown /api
// routes now return a JSON 404 (see startServer).
// ---------------------------

// ---------------------------
// 12. OPENAPI SPECIFICATIONS ROUTE
// ---------------------------
app.get('/api/docs/openapi.json', (_req, res) => {
  res.sendFile(path.join(process.cwd(), 'docs', 'openapi.json'));
});


// ---------------------------
// VITE MIDDLEWARE & SERVER LISTEN
// ---------------------------
async function startServer() {
  // Unknown API routes return a JSON 404 (registered after all /api routes,
  // before the SPA catch-all so non-API paths still fall through to the app).
  app.use('/api', (_req, res) => {
    res.status(404).json({ error: 'Not found' });
  });

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  // Centralized error handler: consistent JSON, never leak stack traces.
  app.use(
    (
      err: unknown,
      _req: express.Request,
      res: express.Response,
      _next: express.NextFunction,
    ) => {
      console.error('[SBOS] Unhandled error:', err);
      if (res.headersSent) return;
      res.status(500).json({ error: 'Internal server error' });
    },
  );

  const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`[SBOS Platform] Running on http://0.0.0.0:${PORT}`);
  });

  // Graceful shutdown so container stops (SIGTERM) drain in-flight requests.
  const shutdown = (signal: string) => {
    console.log(`[SBOS Platform] ${signal} received — shutting down.`);
    server.close(() => process.exit(0));
    setTimeout(() => process.exit(1), 10_000).unref();
  };
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

// Auto-start when run as the app (dev via tsx, prod via dist/server.cjs), but
// NOT under Vitest, so unit tests can import this module (e.g. `rateLimit`)
// without binding a port or booting Vite.
if (!process.env.VITEST) {
  startServer();
}
