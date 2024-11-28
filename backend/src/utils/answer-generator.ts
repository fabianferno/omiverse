import OpenAI from "openai";
import dotenv from "dotenv";
dotenv.config();

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export interface Query_Relationship {
  _id?: string;
  userId: string;
  sourceNounId: string;
  targetNounId: string;
  action: string;
  baseAction: string;
  timestamp: Date;
  transcriptId: string;
  sourceNoun: {
    name: string;
    type: string;
    baseForm: string;
  };
  targetNoun: {
    name: string;
    type: string;
    baseForm: string;
  };
}

export async function generateAnswer(
  query: string,
  transcripts: any[],
  relationships: Query_Relationship[]
): Promise<string> {
  // Format the context for GPT
  const context = {
    transcripts: transcripts.map((t) => ({
      overview: t.structured.overview,
      similarity: t.similarity,
    })),
    relationships: relationships.map((r) => ({
      statement: `${r.sourceNoun.name} ${r.action} ${r.targetNoun.name}`,
      types: {
        source: r.sourceNoun.type,
        target: r.targetNoun.type,
      },
      entities: {
        source: {
          name: r.sourceNoun.name,
          type: r.sourceNoun.type,
          baseForm: r.sourceNoun.baseForm,
        },
        target: {
          name: r.targetNoun.name,
          type: r.targetNoun.type,
          baseForm: r.targetNoun.baseForm,
        },
      },
      action: r.action,
      baseAction: r.baseAction,
    })),
  };

  const prompt = `You are a helpful assistant that answers questions about someone's past interactions and events. Answer the following question using the provided context. Focus on extracting relevant information from the relationships and transcripts.
  If the answer cannot be determined from the context, say so.

  Question: "${query}"

  Context:
  ${JSON.stringify(context, null, 2)}

  Guidelines:
  1. Focus on the most relevant relationships and transcripts
  2. Group related information together (e.g., all interactions at a specific event)
  3. Use natural, conversational language
  4. If multiple people are involved in the same event, mention them together
  5. Include all the Nouns and Relationships when relevant
  6. If the same information appears multiple times, mention it only once

  Example responses:
  1. For "Who did I meet at ETH Global?":
     "At ETH Global, you collaborated with Alice and Bob. You worked with Alice on a DeFi project, and Bob helped with smart contract development."

  2. For "Which hackathons did I attend in Singapore?":
     "Based on the records, you attended ETH Singapore and Solana Hacker House in Singapore. At ETH Singapore, you worked with Charlie on a web3 project."

  3. For "Who did I work with at which events?":
     "You've had several collaborations: At ETH Global, you worked with Alice and Bob. Later at the Solana Hackathon, you teamed up with Charlie. Most recently, you collaborated with Daniel at ETH Singapore."

  Please provide a natural, conversational response that directly answers the question using the available information. It should be only answers from the context, dont ask any other questions to user:`;

  const response = await openai.chat.completions.create({
    model: "gpt-4-turbo-preview",
    messages: [{ role: "user", content: prompt }],
    temperature: 0.7,
    max_tokens: 500,
  });

  return (
    response.choices[0].message.content ||
    "Sorry, I couldn't generate an answer."
  );
}
