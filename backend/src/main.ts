import express, { Express, Request, Response } from "express";
import cors from "cors";
import morgan from "morgan";
import { MongoClient, ObjectId } from "mongodb";
import { TranscriptSegment } from "../types";
import dotenv from "dotenv";
import { getEmbedding } from "./utils/get-embeddings";
import { extractEntitiesAndRelationships } from "./utils/openai-helpers";
import { Noun, Relationship, GraphData } from "../types";
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

interface TranscriptWithId {
  sessionId: string;
  segments: TranscriptSegment[];
}

// User Routes
app.post("/users", async (req: Request, res: Response) => {
  try {
    const { name, email } = req.body;

    if (!name || !email) {
      return res.status(400).json({ error: "Name and email are required" });
    }

    const user: User = {
      name,
      email,
      createdAt: new Date(),
    };

    const result = await db.db(dbName).collection("users").insertOne(user);
    res.status(201).json({
      message: "User created successfully",
      userId: result.insertedId,
    });
  } catch (error) {
    console.error("Error creating user:", error);
    res.status(500).json({ error: "Failed to create user" });
  }
});

app.get("/users", async (_req: Request, res: Response) => {
  try {
    const users = await db.db(dbName).collection("users").find({}).toArray();
    res.json(users);
  } catch (error) {
    console.error("Error fetching users:", error);
    res.status(500).json({ error: "Failed to fetch users" });
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
    console.log(res);
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

    const transcript: TranscriptWithId = req.body;

    // Validate the transcript data
    if (
      !transcript ||
      !transcript.segments ||
      transcript.segments.length === 0
    ) {
      return res.status(400).json({ error: "Invalid transcript data" });
    }

    // Add metadata
    const transcriptWithMetadata = {
      ...transcript,
      userId: uid,
      receivedAt: new Date(),
      embeddings: getEmbedding(
        transcript.segments.map((segment) => segment.text).join(" ")
      ),
    };

    // Store in MongoDB
    const result = await db
      .db(dbName)
      .collection("transcripts")
      .insertOne(transcriptWithMetadata);

    // Process the transcript text
    const fullText = transcript.segments
      .map((segment) => segment.text)
      .join(" ");
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

    const queryEmbedding = await getEmbedding(query);

    const results = await db
      .db(dbName)
      .collection("transcripts")
      .aggregate([
        {
          $match: { userId },
        },
        {
          $addFields: {
            similarity: {
              $function: {
                body: function (a: number[], b: number[]) {
                  return a.reduce(
                    (sum: number, val: number, i: number) => sum + val * b[i],
                    0
                  );
                },
                args: ["$embeddings", queryEmbedding],
                lang: "js",
              },
            },
          },
        },
        {
          $sort: { similarity: -1 },
        },
        {
          $limit: 5,
        },
      ])
      .toArray();

    res.json(results);
  } catch (error) {
    console.error("Error searching transcripts:", error);
    res.status(500).json({ error: "Failed to search transcripts" });
  }
});

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
