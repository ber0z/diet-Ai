// src/modules/diet/domain/ports/llm.client.ts

export const LLM_CLIENT = Symbol('LLM_CLIENT');

export type LlmGenerateTextParams = {
  model: string;
  instructions: string;
  input: string;
};

export interface LlmClient {
  generateText(params: LlmGenerateTextParams): Promise<string>;
}
