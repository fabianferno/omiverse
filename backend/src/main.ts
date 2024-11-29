import express, { Express, Request, Response } from "express";
import cors from "cors";
import morgan from "morgan";
import { MongoClient, ObjectId, Document } from "mongodb";
import { TranscriptSegment, TranscriptData } from "../types/transcript";
import dotenv from "dotenv";
import { getEmbedding } from "./utils/get-embeddings";
import { extractEntitiesAndRelationships } from "./utils/openai-helpers";
import { Noun, Relationship, GraphData } from "../types";
import { generateAnswer, Query_Relationship } from "./utils/answer-generator";
dotenv.config();

const app: Express = express();
const port = parseInt(process.env.PORT || "4000");

// MongoDB Connection
const mongoUrl = process.env.MONGO_URL || "mongodb://localhost:27017";
const dbName = "omiverse";
let db: MongoClient;

// Connect to MongoDB
async function connectToDb() {
  try {
    db = await MongoClient.connect(mongoUrl);
    console.log("Connected to MongoDB");
  } catch (err) {
    console.error("Failed to connect to MongoDB:", err);
    process.exit(1);
  }
}

// Middlewares
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());
app.use(morgan("dev"));
// Types
interface User {
  name: string;
  email: string;
  createdAt: Date;
}

app.post("/user/auth", async (req: Request, res: Response) => {
  try {
    const { userId, telegramId, telegramUsername } = req.body;
    console.log("Received auth request:", {
      userId,
      telegramId,
      telegramUsername,
    });

    const usersCollection = db.db(dbName).collection("users");
    const existingUser = await usersCollection.findOne({ userId });
    if (existingUser) {
      console.log("User already exists:", existingUser);
      return res.json({ success: true });
    }

    if (!userId || !telegramId || !telegramUsername) {
      console.log("Missing required fields:", {
        userId,
        telegramId,
        telegramUsername,
      });
      return res
        .status(400)
        .json({ error: "All fields are required", success: false });
    }

    const user = {
      userId,
      telegramId,
      telegramUsername,
      createdAt: new Date(),
    };

    const result = await db.db(dbName).collection("users").insertOne(user);
    console.log("User stored successfully:", result);

    res.status(201).json({
      message: "User information stored successfully",
      userId: result.insertedId,
      success: true,
    });
  } catch (error) {
    console.error("Error storing user information:", error);
    res
      .status(500)
      .json({ error: "Failed to store user information", success: false });
  }
});

// Get user by id
app.get("/user/:id", async (req, res) => {
  try {
    const userId = req.params.id;
    const user = await db.db(dbName).collection("users").findOne({ userId });
    if (!user) {
      return res.status(404).json({ error: "User not found", success: false });
    }

    res.status(200).json({
      message: "User found",
      userId: user.userId,
      telegramId: user.telegramId,
      telegramUsername: user.telegramUsername,
      createdAt: user.createdAt,
      success: true,
    });
  } catch (error) {
    console.error("Error getting user:", error);
    res.status(500).json({ error: "Failed to get user", success: false });
  }
});

// Process transcript and extract entities
async function processTranscript(
  transcriptId: string,
  text: string,
  userId: string
) {
  const extracted = await extractEntitiesAndRelationships(text);

  console.log("Extracted:", extracted);

  // Store nouns
  for (const noun of extracted.nouns) {
    const res = await db
      .db(dbName)
      .collection("nouns")
      .updateOne(
        { userId, baseForm: noun.baseForm },
        {
          $setOnInsert: {
            userId,
            name: noun.text,
            type: noun.type,
            baseForm: noun.baseForm,
            createdAt: new Date(),
          },
        },
        { upsert: true }
      );
    // console.log(res);
  }

  // Store relationships
  for (const rel of extracted.relationships) {
    console.log("Rel:", rel);
    const sourceNoun = await db
      .db(dbName)
      .collection("nouns")
      .findOne({ userId, baseForm: rel.source });
    const targetNoun = await db
      .db(dbName)
      .collection("nouns")
      .findOne({ userId, baseForm: rel.target });

    if (sourceNoun && targetNoun) {
      await db.db(dbName).collection("relationships").insertOne({
        userId,
        sourceNounId: sourceNoun._id,
        targetNounId: targetNoun._id,
        action: rel.action,
        baseAction: rel.baseAction,
        timestamp: new Date(),
        transcriptId,
      });
    }
  }
}

// Transcript Webhook Route
app.post("/webhook/transcript", async (req: Request, res: Response) => {
  try {
    const uid = req.query.uid;

    if (!uid || typeof uid !== "string") {
      return res
        .status(400)
        .json({ error: "User ID (uid) is required as a query parameter" });
    }

    // console.log(req.body);
    const transcript: TranscriptData = req.body;

    // Validate the transcript data
    if (!transcript || !transcript.structured.overview) {
      return res.status(400).json({ error: "Invalid transcript data" });
    }

    // Add metadata
    const transcriptWithMetadata = {
      ...transcript,
      userId: uid,
      receivedAt: new Date(),
      embeddings: getEmbedding(
        transcript.structured.overview
        // transcript.transcript_segments.map((segment) => segment.text).join(" ")
      ),
    };

    // Store in MongoDB
    const result = await db
      .db(dbName)
      .collection("transcripts")
      .insertOne(transcriptWithMetadata);

    // Process the transcript text
    const fullText = transcript.structured.overview;

    await processTranscript(result.insertedId.toString(), fullText, uid);

    res.status(201).json({
      message: "Transcript stored and processed successfully",
      transcriptId: result.insertedId,
    });
  } catch (error) {
    console.error("Error processing transcript:", error);
    res.status(500).json({ error: "Failed to process transcript" });
  }
});

// Get all transcripts endpoint
app.get("/transcripts", async (_req: Request, res: Response) => {
  try {
    const transcripts = await db
      .db(dbName)
      .collection("transcripts")
      .find({})
      .toArray();

    res.json(transcripts);
  } catch (error) {
    console.error("Error fetching transcripts:", error);
    res.status(500).json({ error: "Failed to fetch transcripts" });
  }
});

// Get knowledge graph data
app.get("/graph", async (req: Request, res: Response) => {
  try {
    const userId = req.query.userId as string;
    if (!userId) {
      return res.status(400).json({ error: "userId is required" });
    }

    const nouns = await db
      .db(dbName)
      .collection("nouns")
      .find({ userId })
      .toArray();
    const relationships = await db
      .db(dbName)
      .collection("relationships")
      .find({ userId })
      .toArray();

    const graphData: GraphData = {
      nodes: nouns.map((noun) => ({
        id: noun._id.toString(),
        label: noun.name,
        type: noun.type,
      })),
      edges: relationships.map((rel) => ({
        source: rel.sourceNounId,
        target: rel.targetNounId,
        label: rel.action,
      })),
    };

    res.json(graphData);
  } catch (error) {
    console.error("Error fetching graph data:", error);
    res.status(500).json({ error: "Failed to fetch graph data" });
  }
});

// Search by topic using embeddings
app.get("/search", async (req: Request, res: Response) => {
  try {
    const { query, userId } = req.query;
    if (!query || !userId) {
      return res.status(400).json({ error: "query and userId are required" });
    }

    // Get embedding for the query
    const queryEmbedding = await getEmbedding(query.toString());

    // First get all transcripts for the user
    const transcripts = await db
      .db(dbName)
      .collection("transcripts")
      .find({ userId })
      .toArray();

    // Calculate similarities in memory
    const relevantTranscripts = transcripts
      .map((transcript) => ({
        ...transcript,
        similarity: calculateCosineSimilarity(
          queryEmbedding,
          transcript.embeddings
        ),
      }))
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, 5);

    // Get all relationships from these transcripts
    const transcriptIds = relevantTranscripts.map((t) => t._id.toString());
    const relationships = await db
      .db(dbName)
      .collection("relationships")
      .aggregate([
        {
          $match: {
            userId: userId.toString(),
            transcriptId: { $in: transcriptIds },
          },
        },
        {
          $lookup: {
            from: "nouns",
            localField: "sourceNounId",
            foreignField: "_id",
            as: "sourceNoun",
          },
        },
        {
          $lookup: {
            from: "nouns",
            localField: "targetNounId",
            foreignField: "_id",
            as: "targetNoun",
          },
        },
        {
          $unwind: "$sourceNoun",
        },
        {
          $unwind: "$targetNoun",
        },
        {
          $project: {
            _id: 1,
            userId: 1,
            sourceNounId: 1,
            targetNounId: 1,
            action: 1,
            baseAction: 1,
            timestamp: 1,
            transcriptId: 1,
            sourceNoun: {
              name: "$sourceNoun.name",
              type: "$sourceNoun.type",
              baseForm: "$sourceNoun.baseForm",
            },
            targetNoun: {
              name: "$targetNoun.name",
              type: "$targetNoun.type",
              baseForm: "$targetNoun.baseForm",
            },
          },
        },
      ])
      .toArray();

    // Use GPT to generate a natural language answer
    const answer = await generateAnswer(
      query.toString(),
      relevantTranscripts,
      relationships as Query_Relationship[]
    );

    // Get the nouns mentioned in the answer
    const mentionedNouns = new Set<string>();
    relationships.forEach((r) => {
      const answerLower = answer.toLowerCase();
      if (
        answerLower.includes(r.sourceNoun.name.toLowerCase()) &&
        answerLower.includes(r.targetNoun.name.toLowerCase())
      ) {
        mentionedNouns.add(r.sourceNounId);
        mentionedNouns.add(r.targetNounId);
      }
    });

    // Filter relationships to only include those where both nouns are mentioned
    const relevantRelationships = relationships.filter(
      (r) =>
        mentionedNouns.has(r.sourceNounId) && mentionedNouns.has(r.targetNounId)
    );

    // Convert relationships to graph data format
    const nouns = new Map();
    relevantRelationships.forEach((r) => {
      if (r.sourceNoun) {
        nouns.set(r.sourceNounId, {
          id: r.sourceNounId,
          label: r.sourceNoun.name,
          type: r.sourceNoun.type,
        });
      }
      if (r.targetNoun) {
        nouns.set(r.targetNounId, {
          id: r.targetNounId,
          label: r.targetNoun.name,
          type: r.targetNoun.type,
        });
      }
    });

    const graphData: GraphData = {
      nodes: Array.from(nouns.values()),
      edges: relevantRelationships.map((rel) => ({
        source: rel.sourceNounId,
        target: rel.targetNounId,
        label: rel.action,
      })),
    };

    res.json({
      answer,
      context: {
        transcripts: relevantTranscripts,
        relationships: relevantRelationships.map((r) => ({
          source: r.sourceNoun.name,
          action: r.action,
          target: r.targetNoun.name,
          type: {
            source: r.sourceNoun.type,
            target: r.targetNoun.type,
          },
        })),
      },
      graphData,
    });
  } catch (error) {
    console.error("Error searching:", error);
    res.status(500).json({ error: "Failed to search" });
  }
});

// Helper function to calculate cosine similarity
function calculateCosineSimilarity(a: number[], b: number[]): number {
  if (!a || !b || a.length !== b.length) return 0;

  const dotProduct = a.reduce((sum, val, i) => sum + val * b[i], 0);
  const magnitudeA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0));
  const magnitudeB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0));

  return dotProduct / (magnitudeA * magnitudeB);
}

// Health check endpoint
app.get("/health", (_req: Request, res: Response) => {
  res.status(200).json({
    status: "ok",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// Error handling middleware
app.use(
  (err: Error, req: Request, res: Response, next: express.NextFunction) => {
    console.error(err.stack);
    res.status(500).json({
      status: "error",
      message: "Something went wrong!",
    });
  }
);

// Start server
connectToDb().then(() => {
  app.listen(port, "0.0.0.0", () => {
    console.log(`Server is running on port ${port}`);
  });
});
