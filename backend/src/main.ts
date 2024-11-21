import express, { Express, Request, Response } from "express";
import cors from "cors";
import morgan from "morgan";
import { MongoClient, ObjectId } from "mongodb";
import { TranscriptSegment } from "../types";
import dotenv from "dotenv";
import { getEmbedding } from "./utils/get-embeddings";
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

    res.status(201).json({
      message: "Transcript stored successfully",
      transcriptId: result.insertedId,
    });
  } catch (error) {
    console.error("Error storing transcript:", error);
    res.status(500).json({ error: "Failed to store transcript" });
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
