const DEFAULT_AI_ENDPOINT = 'https://ai.ej90.me/api/generate';
const DEFAULT_AI_MODEL = 'eal-qwen3:latest';
const DEFAULT_TIMEOUT_MS = 30_000;

type AiEvaluationInput = {
  grade: string;
  ceiling: string;
  validLevels: string;
  task: string;
  studentText: string;
};

export type AiEvaluationResult =
  | {
      ok: true;
      status: 200;
      evaluation: string;
    }
  | {
      ok: false;
      status: number;
      code: string;
      message: string;
      details?: string;
    };

function asCleanString(value: unknown, fallback = ''): string {
  if (typeof value === 'string') {
    return value.trim();
  }
  if (value === null || value === undefined) {
    return fallback;
  }
  return String(value).trim();
}

function pickString(payload: Record<string, unknown>, keys: string[], fallback = ''): string {
  for (const key of keys) {
    const value = asCleanString(payload[key]);
    if (value) {
      return value;
    }
  }
  return fallback;
}

function buildPrompt({ grade, ceiling, validLevels, task, studentText }: AiEvaluationInput): string {
  return `Assess this student writing sample using the Alberta EAL Benchmarks 2.0 writing rubric.

Context:

Grade:${grade}

Ceiling:${ceiling}

Valid levels:${validLevels}

task:"${task}"

Student text: ${studentText}

Give:

Vocabulary level with text evidence and rubric match

Sentence Structure level with text evidence and rubric match

Connections and Transitions level with text evidence and rubric match`;
}

function getTimeoutMs(): number {
  const configured = Number(process.env.AI_GENERATE_TIMEOUT_MS);
  if (Number.isFinite(configured) && configured >= DEFAULT_TIMEOUT_MS) {
    return configured;
  }
  return DEFAULT_TIMEOUT_MS;
}

export function extractEvaluationInput(payload: unknown): AiEvaluationInput {
  const source = payload && typeof payload === 'object' && !Array.isArray(payload)
    ? payload as Record<string, unknown>
    : {};

  return {
    grade: pickString(source, ['grade', 'student_grade', 'studentGrade', 'gradeLabel'], 'Unknown'),
    ceiling: pickString(source, ['ceiling', 'eal_ceiling', 'ealCeiling', 'rubricName', 'rubric_name'], 'Unknown'),
    validLevels: pickString(source, ['valid_levels', 'validLevels'], 'A,B,1,2,3'),
    task: pickString(source, ['task', 'assessment_title', 'assessmentTitle', 'assignment_title', 'assignmentTitle'], ''),
    studentText: pickString(source, ['student_text', 'studentText', 'extractedText', 'currentText', 'text'], ''),
  };
}

export async function requestAiEvaluation(payload: unknown): Promise<AiEvaluationResult> {
  const input = extractEvaluationInput(payload);

  if (!input.studentText) {
    return {
      ok: false,
      status: 400,
      code: 'MISSING_STUDENT_TEXT',
      message: 'student_text is required for AI evaluation.',
    };
  }

  const requestBody = JSON.stringify({
    model: process.env.AI_GENERATE_MODEL || DEFAULT_AI_MODEL,
    prompt: buildPrompt(input),
    stream: false,
    keep_alive: '1h',
  });

  const timeoutMs = getTimeoutMs();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(process.env.AI_GENERATE_URL || DEFAULT_AI_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: requestBody,
      signal: controller.signal,
    });

    const rawBody = await response.text();

    if (response.status === 502) {
      return {
        ok: false,
        status: 502,
        code: 'AI_OFFLINE',
        message: 'Assessment service is temporarily unavailable.',
      };
    }

    if (!response.ok) {
      return {
        ok: false,
        status: response.status,
        code: 'UPSTREAM_AI_ERROR',
        message: 'Upstream AI service returned an error.',
        details: rawBody.slice(0, 2_000),
      };
    }

    let parsedBody: unknown;
    try {
      parsedBody = JSON.parse(rawBody);
    } catch {
      return {
        ok: false,
        status: 502,
        code: 'INVALID_AI_RESPONSE',
        message: 'Failed to parse AI service JSON response.',
      };
    }

    const evaluation = parsedBody && typeof parsedBody === 'object'
      ? asCleanString((parsedBody as Record<string, unknown>).response)
      : '';

    return {
      ok: true,
      status: 200,
      evaluation: evaluation || 'No evaluation generated.',
    };
  } catch (error) {
    const isTimeout = error instanceof Error && error.name === 'AbortError';
    return {
      ok: false,
      status: isTimeout ? 504 : 500,
      code: isTimeout ? 'AI_TIMEOUT' : 'AI_CONNECTION_FAILED',
      message: isTimeout
        ? 'Assessment service timed out while generating the evaluation.'
        : 'Network connection to assessment service failed.',
      details: error instanceof Error ? error.message : undefined,
    };
  } finally {
    clearTimeout(timeout);
  }
}
