function getApiKey() {
  return process.env.ELEVENLABS_API_KEY;
}

function getAgentId() {
  return process.env.ELEVENLABS_AGENT_ID;
}

export interface VocabItem {
  id: string;
  english: string;
  kanji: string;
  hiragana: string;
  category: string | null;
}

export interface SpeakingSessionConfig {
  agentId: string;
  vocabulary: VocabItem[];
  systemPrompt: string;
}

function buildSystemPrompt(vocabulary: VocabItem[]): string {
  const vocabList = vocabulary
    .map((v) => `- ${v.kanji} (${v.hiragana}): ${v.english} [${v.category ?? 'general'}]`)
    .join('\n');

  return `You are a friendly Japanese language tutor. Your job is to practice ONLY the following vocabulary words with the student through conversation. Use each word in context, ask the student to pronounce it, use it in a sentence, or translate it. Give gentle corrections when needed. Speak mostly in English but use Japanese naturally when practicing the words.

Vocabulary to practice:
${vocabList}

Guidelines:
- Only practice the words listed above
- Start by greeting the student and introducing the first word
- Move through the words naturally, spending about 30-60 seconds on each
- Encourage the student and correct pronunciation gently
- After covering all words, do a quick review and end the session
- Keep your responses concise for natural conversation flow`;
}

export type SpeakingMode = 'conversation' | 'pronunciation';

function buildPronunciationPrompt(vocabulary: VocabItem[]): string {
  const vocabList = vocabulary
    .map((v) => `- ${v.kanji} (${v.hiragana}): ${v.english}`)
    .join('\n');

  return `You are a Japanese pronunciation coach. Your ONLY job is to help the student practice pronouncing the words below, one at a time.

Vocabulary:
${vocabList}

Strict flow for EACH word:
1. Say: "Next word:" then clearly pronounce the Japanese word ONCE, slowly.
2. Wait for the student to repeat.
3. Listen carefully and give brief, specific feedback on their pronunciation.
   - If correct: say "Good!" or "Perfect!" and move on.
   - If incorrect: say what to fix (e.g. "Try lengthening the う sound"), then pronounce it again and wait for one more attempt.
4. Move to the next word.

Rules:
- Go through the list IN ORDER.
- Do NOT make conversation. This is pronunciation drill only.
- Keep all feedback to ONE short sentence.
- Do NOT skip words.
- After all words are done, say: "That's all the words! Great practice today." and stop.
- Speak in English for instructions, Japanese only when pronouncing the target word.`;
}

export function createSessionConfig(vocabulary: VocabItem[], mode: SpeakingMode = 'conversation'): SpeakingSessionConfig {
  const agentId = getAgentId();
  if (!agentId) {
    throw new Error('ELEVENLABS_AGENT_ID environment variable is not set');
  }

  const systemPrompt = mode === 'pronunciation'
    ? buildPronunciationPrompt(vocabulary)
    : buildSystemPrompt(vocabulary);

  return {
    agentId,
    vocabulary,
    systemPrompt,
  };
}

export async function getSignedUrl(): Promise<string> {
  const apiKey = getApiKey();
  const agentId = getAgentId();
  if (!apiKey || !agentId) {
    throw new Error('ElevenLabs environment variables are not configured');
  }

  const response = await fetch(
    `https://api.elevenlabs.io/v1/convai/conversation/get_signed_url?agent_id=${agentId}`,
    {
      method: 'GET',
      headers: { 'xi-api-key': apiKey },
    }
  );

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`ElevenLabs API error: ${response.status} ${text}`);
  }

  const data = await response.json();
  return data.signed_url;
}
