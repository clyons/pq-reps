import type { PromptInputs } from './types.js';

export interface ScriptProvider {
  generate(systemPrompt: string, userPrompt: string, options?: ProviderOptions): Promise<string>;
}

export interface ProviderOptions {
  model?: string;
  temperature?: number;
  inputs?: PromptInputs;
}

export class MockProvider implements ScriptProvider {
  async generate(systemPrompt: string, userPrompt: string): Promise<string> {
    const content = [
      'Feel the contact of your body with the surface beneath you.',
      'Stay with those sensations as they change.',
      '[pause:3]',
      'Return to the sensation in the primary sense.',
      'Stop.'
    ].join('\n');
    return Promise.resolve(content);
  }
}

export class OpenAIProvider implements ScriptProvider {
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async generate(systemPrompt: string, userPrompt: string, options?: ProviderOptions): Promise<string> {
    const model = options?.model ?? process.env.OPENAI_MODEL;
    if (!model) {
      throw new Error('Model is required for OpenAI provider. Provide --model or OPENAI_MODEL.');
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`
      },
      body: JSON.stringify({
        model,
        temperature: options?.temperature ?? 0.2,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ]
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`OpenAI request failed (${response.status}): ${errorText}`);
    }

    const payload = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };

    const content = payload.choices?.[0]?.message?.content?.trim();
    if (!content) {
      throw new Error('OpenAI response missing content.');
    }

    return content;
  }
}
