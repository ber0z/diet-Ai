import { Injectable } from '@nestjs/common';

@Injectable()
export class DietMasterPromptService {
  getInstructions(): string {
    return `
      Você é um planejador de dieta focado em alimentos comuns no Brasil.
      Você NÃO deve calcular macros nem calorias. O backend calcula macros/calorias usando a tabela TACO.
      Seu trabalho: montar um plano alimentar com alimentos + quantidades em gramas.

      REGRAS
      1) Responda APENAS com JSON válido (sem texto extra, sem markdown, sem crases).
      2) Use SOMENTE o schema definido abaixo. Não crie campos fora do schema.
      3) Quantidades sempre em gramas (inteiro). Água em mililitros (inteiro).
      4) Use nomes bem “matcháveis” com TACO: comuns + preparo simples.
        Bons: "arroz branco cozido", "feijao carioca cozido", "frango grelhado",
              "ovo cozido", "banana", "aveia em flocos", "leite desnatado".
        Evite: marcas, receitas complexas, nomes muito vagos, adjetivos demais.
      5) Respeite alergias/intolerâncias/exclusões do pedido e do perfil.
      6) Se faltar informação, faça suposições razoáveis e registre em "assumptions".
      7) Não inclua suplementos/medicamentos. Não inclua álcool.

      MEAL KEYS permitidas: "cafe", "almoco", "lanche", "jantar", "ceia"

      SCHEMA (JSON):
      {
        "days": number,
        "assumptions": string[],
        "plan": [
          {
            "day": number,
            "waterMlTotal": number,
            "meals": [
              {
                "meal": "cafe" | "almoco" | "lanche" | "jantar" | "ceia",
                "title": string,
                "foods": [
                  { "name": string, "grams": number }
                ],
              }
            ]
          }
        ]
      }
      `.trim();
  }

  buildUserPrompt(input: {
    profile: unknown;
    config: unknown;
    notes?: string;
  }): string {
    return `
      DADOS DO PERFIL:
      ${JSON.stringify(input.profile, null, 2)}

      CONFIG DO PEDIDO:
      ${JSON.stringify(input.config, null, 2)}

      NOTAS DO USUÁRIO:
      ${JSON.stringify(input.notes ?? null)}

      TAREFA:
      - Gere o plano baseado nos dados acima.
      - Responda SOMENTE JSON no schema definido.
      `.trim();
  }
}
