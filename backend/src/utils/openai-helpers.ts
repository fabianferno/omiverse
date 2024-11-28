import OpenAI from "openai";
import dotenv from "dotenv";
dotenv.config();

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

interface EntityExtraction {
  nouns: Array<{
    text: string;
    type: "PERSON" | "PLACE" | "THING" | "OTHER";
    baseForm: string;
  }>;
  relationships: Array<{
    source: string;
    action: string;
    target: string;
    baseAction: string;
  }>;
}

export async function extractEntitiesAndRelationships(
  text: string
): Promise<EntityExtraction> {
  const prompt = `Extract nouns (entities) and relationships from the following text. For relationships involving multiple entities (like "Person A participated with Person B at Event C"), create multiple connected relationships to capture the full context.
  Format the response as JSON with the following structure:
  {
    "nouns": [{"text": "actual text", "type": "PERSON|PLACE|THING|OTHER", "baseForm": "base form"}],
    "relationships": [
      {"source": "subject", "action": "actual verb", "target": "object", "baseAction": "base form of verb"}
    ]
  }
  
  For compound relationships like "Leo participated with Fabian at ETH Global in Singapore", create multiple relationships:
  1. Leo -> participated in -> ETH Global
  2. ETH Global -> Held in -> Singapore
  3. Leo -> participated with -> Fabian
  4. Fabian -> participated in -> ETH Global 
  5. Leo -> At -> Singapore
  6. Fabian -> At -> Singapore
  


  Text: "${text}"`;

  const response = await openai.chat.completions.create({
    model: "gpt-4-turbo-preview",
    messages: [{ role: "user", content: prompt }],
    response_format: { type: "json_object" },
  });

  return JSON.parse(
    response.choices[0].message.content || ""
  ) as EntityExtraction;
}
