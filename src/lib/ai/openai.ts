import OpenAI from 'openai';

// Lazy-initialize OpenAI client to avoid build-time errors
let openaiClient: OpenAI | null = null;

function getOpenAIClient(): OpenAI {
  if (!openaiClient) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error(
        'OPENAI_API_KEY environment variable is not set. Please add it to your .env.local file.'
      );
    }
    openaiClient = new OpenAI({ apiKey });
  }
  return openaiClient;
}

// Export a proxy that lazily initializes the client
const openai = new Proxy({} as OpenAI, {
  get(_, prop) {
    const client = getOpenAIClient();
    const value = client[prop as keyof OpenAI];
    if (typeof value === 'function') {
      return value.bind(client);
    }
    return value;
  }
});

export default openai;

// Model configurations
export const MODELS = {
  // Use GPT-4o for complex tasks (translation, disambiguation)
  ADVANCED: 'gpt-4o',
  // Use GPT-4o-mini for simpler tasks (extraction, categorization)
  FAST: 'gpt-4o-mini',
  // Vision model for image OCR
  VISION: 'gpt-4o',
} as const;

// Default settings
export const AI_SETTINGS = {
  maxTokens: 4096,
  temperature: 0.3, // Lower temperature for more consistent outputs
  confidenceThreshold: 0.85,
} as const;
