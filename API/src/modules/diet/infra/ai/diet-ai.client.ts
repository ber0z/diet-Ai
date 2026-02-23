import OpenAI from 'openai';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export type LlmGenerateTextParams = {
  model: string;
  instructions: string;
  input: string;
};

export interface LlmClient {
  generateText(params: LlmGenerateTextParams): Promise<string>;
}

@Injectable()
export class OpenAiDietAiClient implements LlmClient {
  private client: OpenAI;

  constructor(private config: ConfigService) {
    const apiKey = this.config.get<string>('OPENAI_API_KEY');
    if (!apiKey) throw new Error('OPENAI_API_KEY não definido');
    this.client = new OpenAI({ apiKey });
  }

  async generateText(params: LlmGenerateTextParams): Promise<string> {
    const res = await this.client.responses.create({
      model: params.model,
      instructions: params.instructions,
      input: params.input,
    });

    const text = res.output_text;
    if (!text) throw new Error('OpenAI retornou resposta sem output_text');
    return text;
  }
}
