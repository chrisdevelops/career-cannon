import OpenAI from 'openai';
import type {
  AIProvider,
  ChatMessage,
  CompletionOptions,
  CompletionResult,
  StreamCompletionOptions,
} from './types.js';

export class OpenAIProvider implements AIProvider {
  readonly name = 'openai';
  private client: OpenAI | null = null;
  private model: string;

  constructor(model = 'gpt-4o') {
    this.model = model;
    if (this.isConfigured()) {
      this.client = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
      });
    }
  }

  isConfigured(): boolean {
    return !!process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY !== 'your-api-key-here';
  }

  async complete(
    messages: ChatMessage[],
    options: CompletionOptions = {}
  ): Promise<CompletionResult> {
    if (!this.client) {
      throw new Error('OpenAI is not configured. Set OPENAI_API_KEY environment variable.');
    }

    const { temperature = 0.7, maxTokens = 4096, responseSchema } = options;

    // Build request params
    const params: OpenAI.ChatCompletionCreateParams = {
      model: this.model,
      messages: messages.map((m) => ({
        role: m.role,
        content: m.content,
      })),
      temperature,
      max_tokens: maxTokens,
    };

    // Use structured output if schema provided
    if (responseSchema) {
      params.response_format = {
        type: 'json_schema',
        json_schema: {
          name: responseSchema.name,
          description: responseSchema.description,
          schema: responseSchema.schema,
          strict: true,
        },
      };
    }

    const response = await this.client.chat.completions.create(params);

    const content = response.choices[0]?.message?.content ?? '';
    let parsed: unknown;

    if (responseSchema && content) {
      try {
        parsed = JSON.parse(content);
      } catch {
        console.warn('Failed to parse structured response:', content);
      }
    }

    return {
      content,
      parsed,
      usage: response.usage
        ? {
            promptTokens: response.usage.prompt_tokens,
            completionTokens: response.usage.completion_tokens,
            totalTokens: response.usage.total_tokens,
          }
        : undefined,
    };
  }

  async completeStream(
    messages: ChatMessage[],
    options: StreamCompletionOptions = {}
  ): Promise<CompletionResult> {
    if (!this.client) {
      throw new Error('OpenAI is not configured. Set OPENAI_API_KEY environment variable.');
    }

    const { temperature = 0.7, maxTokens = 4096, onChunk } = options;

    const stream = await this.client.chat.completions.create({
      model: this.model,
      messages: messages.map((m) => ({
        role: m.role,
        content: m.content,
      })),
      temperature,
      max_tokens: maxTokens,
      stream: true,
    });

    let fullContent = '';
    let usage: CompletionResult['usage'];

    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta?.content ?? '';
      if (delta) {
        fullContent += delta;
        onChunk?.(delta);
      }

      // Capture usage from final chunk
      if (chunk.usage) {
        usage = {
          promptTokens: chunk.usage.prompt_tokens,
          completionTokens: chunk.usage.completion_tokens,
          totalTokens: chunk.usage.total_tokens,
        };
      }
    }

    return { content: fullContent, usage };
  }
}

// Singleton instance
let provider: OpenAIProvider | null = null;

export function getOpenAIProvider(): OpenAIProvider {
  if (!provider) {
    provider = new OpenAIProvider();
  }
  return provider;
}
