import OpenAI from "openai";

import { AiProvider, type Message } from "./ai-provider.js";

export class OpenAiProvider extends AiProvider {
  code = "openai";

  private client: OpenAI;
  private model: string;

  constructor({
    apiKey,
    model = "gpt-4o-mini",
  }: {
    apiKey: string;
    model?: string;
  }) {
    super();
    this.client = new OpenAI({ apiKey });
    this.model = model;
  }

  async complete(messages: Message[]): Promise<string> {
    const response = await this.client.chat.completions.create({
      model: this.model,
      messages,
    });

    return response.choices[0]?.message.content ?? "";
  }
}
