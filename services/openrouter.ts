/**
 * OpenRouter API Client
 * Документация: https://openrouter.ai/docs/api/reference/overview
 */

export interface OpenRouterMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface OpenRouterRequest {
  model: string;
  messages: OpenRouterMessage[];
  temperature?: number;
  max_tokens?: number;
  stream?: boolean;
}

const TAVILY_API_KEY = "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";

export interface OpenRouterResponse {
  id: string;
  model: string;
  choices: Array<{
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export class OpenRouterClient {
  private apiKey: string;
  private baseUrl: string = 'https://openrouter.ai/api/v1';

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  /**
   * Отправка запроса к модели через OpenRouter
   * @param model - Название модели (например: "google/gemini-pro", "anthropic/claude-3.5-sonnet")
   * @param messages - Массив сообщений для отправки
   * @param options - Дополнительные параметры запроса
   */
  async chat(
    model: string,
    messages: OpenRouterMessage[],
    options: {
      temperature?: number;
      max_tokens?: number;
    } = {}
  ): Promise<OpenRouterResponse> {
    const requestBody: OpenRouterRequest = {
      model,
      messages,
      temperature: options.temperature ?? 0.7,
      max_tokens: options.max_tokens ?? 1000,
    };

    try {
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
          'HTTP-Referer': 'https://github.com/your-app', // Опционально для аналитики
          'X-Title': 'My AI Client', // Опционально для аналитики
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          `OpenRouter API error: ${response.status} - ${JSON.stringify(errorData)}`
        );
      }

      const data: OpenRouterResponse = await response.json();
      return data;
    } catch (error) {
      console.error('OpenRouter API request failed:', error);
      throw error;
    }
  }

  /**
   * Получить список доступных моделей
   */
  async getModels(): Promise<any> {
    try {
      const response = await fetch(`${this.baseUrl}/models`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch models: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to get models:', error);
      throw error;
    }
  }

  /**
   * Простая отправка текстового сообщения
   */
  async sendMessage(model: string, userMessage: string): Promise<string> {
    const response = await this.chat(model, [
      { role: 'user', content: userMessage },
    ]);

    return response.choices[0]?.message?.content || 'No response';
  }

  /**
   * Отправка полного разговора (с поддержкой истории и изображений)
   */
  async sendConversation(
    model: string,
    messages: Array<{ role: string; content: string; image?: string }>,
    options: { temperature?: number; max_tokens?: number; systemPrompt?: string } = {}
  ): Promise<string> {
    const apiMessages: any[] = [];

    if (options.systemPrompt) {
      apiMessages.push({ role: 'system', content: options.systemPrompt });
    }

    for (const msg of messages) {
      if (msg.image && msg.image.startsWith('data:')) {
        apiMessages.push({
          role: msg.role,
          content: [
            { type: 'text', text: msg.content || 'Опиши это изображение' },
            { type: 'image_url', image_url: { url: msg.image } },
          ],
        });
      } else {
        apiMessages.push({ role: msg.role, content: msg.content });
      }
    }

    const requestBody = {
      model,
      messages: apiMessages,
      temperature: options.temperature ?? 0.7,
    };

    try {
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
          'HTTP-Referer': 'https://github.com/your-app',
          'X-Title': 'My AI Client',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          `OpenRouter API error: ${response.status} - ${JSON.stringify(errorData)}`
        );
      }

      const data: OpenRouterResponse = await response.json();
      return data.choices[0]?.message?.content || 'Нет ответа';
    } catch (error) {
      console.error('OpenRouter API request failed:', error);
      throw error;
    }
  }

  /**
   * Streaming conversation — tokens arrive live via onToken callback
   */
  async streamConversation(
    model: string,
    messages: Array<{ role: string; content: string; image?: string }>,
    options: { temperature?: number; systemPrompt?: string; enableSearch?: boolean } = {},
    onToken: (fullText: string) => void
  ): Promise<string> {
    let finalSystemPrompt = options.systemPrompt || '';

    // --- 1. SEARCH LOGIC (Native Implementation) ---
    if (options.enableSearch) {
      try {
        // Находим последнее сообщение пользователя для поиска
        const lastUserMsg = [...messages].reverse().find(m => m.role === 'user');
        const query = lastUserMsg?.content;

        if (query && typeof query === 'string' && query.trim().length > 0) {
          // Сообщаем UI, что идет поиск (опционально, если UI это поддерживает, иначе просто пауза)
          // console.log(`🔍 Searching Tavily for: ${query}`);

          const searchResponse = await fetch('https://api.tavily.com/search', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              api_key: TAVILY_API_KEY,
              query: query,
              search_depth: "advanced",
              include_answer: true,
              max_results: 8
            })
          });

          if (searchResponse.ok) {
            const searchData = await searchResponse.json();
            const searchContext = this.formatSearchResults(searchData, query);

            finalSystemPrompt += "\n\n";
            finalSystemPrompt += "Пользователь запросил поиск в интернете. Вот результаты поиска. Используй их для ответа. НЕ указывай источники и ссылки, просто отвечай на вопрос.\n\n";
            finalSystemPrompt += searchContext;
          }
        }
      } catch (e) {
        console.error("❌ Tavily Search Error:", e);
        // Не падаем, просто продолжаем без поиска
      }
    }

    const apiMessages: any[] = [];
    if (finalSystemPrompt) {
      apiMessages.push({ role: 'system', content: finalSystemPrompt });
    }
    for (const msg of messages) {
      if (msg.image && msg.image.startsWith('data:')) {
        apiMessages.push({
          role: msg.role,
          content: [
            { type: 'text', text: msg.content || 'Опиши' },
            { type: 'image_url', image_url: { url: msg.image } },
          ],
        });
      } else {
        apiMessages.push({ role: msg.role, content: msg.content });
      }
    }

    const body = JSON.stringify({
      model,
      messages: apiMessages,
      temperature: options.temperature ?? 0.7,
      stream: true,
    });

    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.apiKey}`,
      'HTTP-Referer': 'https://github.com/your-app',
      'X-Title': 'My AI Client',
    };

    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers,
      body,
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(`API error: ${response.status} - ${JSON.stringify(err)}`);
    }

    let fullText = '';

    // Try streaming via ReadableStream
    if (response.body && typeof response.body.getReader === 'function') {
      try {
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buf = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buf += decoder.decode(value, { stream: true });
          const lines = buf.split('\n');
          buf = lines.pop() || '';
          for (const line of lines) {
            const t = line.trim();
            if (t.startsWith('data: ')) {
              const d = t.slice(6);
              if (d === '[DONE]') continue;
              try {
                const p = JSON.parse(d);
                const delta = p.choices?.[0]?.delta?.content;
                if (delta) { fullText += delta; onToken(fullText); }
              } catch { }
            }
          }
        }
        return fullText || 'Нет ответа';
      } catch {
        // Fall through to fallback
      }
    }

    // Fallback: parse full SSE text
    const text = await response.text();
    const lines = text.split('\n');
    for (const line of lines) {
      const t = line.trim();
      if (t.startsWith('data: ')) {
        const d = t.slice(6);
        if (d === '[DONE]') continue;
        try {
          const p = JSON.parse(d);
          const delta = p.choices?.[0]?.delta?.content;
          if (delta) { fullText += delta; onToken(fullText); }
        } catch { }
      }
    }
    return fullText || 'Нет ответа';
  }

  /**
   * Форматирование результатов поиска (аналог Python функции)
   */
  private formatSearchResults(response: any, query: string): string {
    const results: string[] = [];

    // Добавляем AI-ответ от Tavily если есть
    if (response.answer) {
      results.push(`[Краткий ответ] ${response.answer}`);
    }

    // Добавляем результаты поиска
    if (response.results && Array.isArray(response.results)) {
      response.results.slice(0, 8).forEach((r: any, i: number) => {
        const title = r.title || "Без названия";
        const url = r.url || "";
        const content = r.content || "";

        let entry = `${i + 1}. **${title}**`;
        if (url) entry += ` (${url})`;
        if (content) entry += `\n${content}`;

        results.push(entry);
      });
    }

    if (results.length === 0) {
      return `Поиск по запросу "${query}" не дал результатов.`;
    }

    return `Результаты поиска по запросу "${query}":\n\n` + results.join('\n\n');
  }
}

// Популярные модели OpenRouter
export const POPULAR_MODELS = [
  { id: 'google/gemini-pro', name: 'Google Gemini Pro' },
  { id: 'google/gemini-2.0-flash-exp:free', name: 'Google Gemini 2.0 Flash (Free)' },
  { id: 'anthropic/claude-3.5-sonnet', name: 'Claude 3.5 Sonnet' },
  { id: 'openai/gpt-4-turbo', name: 'GPT-4 Turbo' },
  { id: 'openai/gpt-3.5-turbo', name: 'GPT-3.5 Turbo' },
  { id: 'meta-llama/llama-3.1-70b-instruct', name: 'Llama 3.1 70B' },
  { id: 'mistralai/mistral-7b-instruct', name: 'Mistral 7B' },
];

