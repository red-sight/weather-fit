export interface Message {
  role: "user" | "assistant" | "system";
  content: string;
}

export abstract class AiProvider {
  abstract code: string;

  abstract complete(messages: Message[]): Promise<string>;
}
