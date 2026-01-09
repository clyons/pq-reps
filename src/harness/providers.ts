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
      'Sit comfortably. Close your eyes. Let your attention settle into the points of contact where your body meets the surface beneath you.',
      'Feel the weight of your body pressing down.',
      'Sense the texture of the surface against your skin.',
      '[pause:1.5]',
      'If your mind drifts, that’s normal. Gently return your attention to the sensations of touch.',
      'Notice the pressure in your legs, your back, your arms.',
      'Feel the temperature of the air on your skin.',
      '[pause:1.5]',
      'Stay with these sensations for a moment.',
      '[pause:10]',
      '[pause:1.5]',
      'Now, bring your awareness back to the points of contact. Feel the stability they provide.',
      '[pause:1.5]',
      'You can open your eyes. That’s it.',
      '[pause:1.5]'
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
