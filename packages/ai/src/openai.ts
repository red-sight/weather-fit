import OpenAI from "openai";

import { AiProvider, type Message } from "./ai-provider.js";

export class OpenAiProvider extends AiProvider {
  code = "openai";

  private client: OpenAI;
  private model: string;

  constructor({
    apiKey,
    model = "openai/gpt-4o",
    baseURL,
  }: {
    apiKey: string;
    model?: string;
    baseURL?: string;
  }) {
    super();
    this.client = new OpenAI({ ...(baseURL && { baseURL }), apiKey });
    this.model = model;
    console.log("Selected OpenAI configuration", { baseURL, model });
  }

  async complete(messages: Message[]): Promise<string> {
    const response = await this.client.chat.completions.create({
      model: this.model,
      messages,
    });

    return response.choices[0]?.message.content ?? "";
  }
}
