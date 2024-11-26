import OpenAI from "openai";
import dotenv from "dotenv";
dotenv.config();

// Setup OpenAI configuration
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Function to get the embeddings using the OpenAI API
export async function getEmbedding(text: any) {
  const results = await openai.embeddings.create({
    model: "text-embedding-3-small",
    input: text,
    encoding_format: "float",
  });
  return results.data[0].embedding;
}
