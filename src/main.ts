import express, { Express, Request, Response } from "express";
import cors from "cors";
import morgan from "morgan";
import { MongoClient, ObjectId } from "mongodb";

const app: Express = express();
const port = process.env.PORT || 3000;

// MongoDB Connection
const mongoUrl = process.env.MONGODB_URI || "mongodb://localhost:27017";
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

app.get("/users/:id", async (req: Request, res: Response) => {
  try {
    const id = new ObjectId(req.params.id);
    const user = await db.db(dbName).collection("users").findOne({ _id: id });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json(user);
  } catch (error) {
    console.error("Error fetching user:", error);
    res.status(500).json({ error: "Failed to fetch user" });
  }
});

app.put("/users/:id", async (req: Request, res: Response) => {
  try {
    const id = new ObjectId(req.params.id);
    const { name, email } = req.body;

    if (!name && !email) {
      return res
        .status(400)
        .json({ error: "At least one field to update is required" });
    }

    const updateData: Partial<User> = {};
    if (name) updateData.name = name;
    if (email) updateData.email = email;

    const result = await db
      .db(dbName)
      .collection("users")
      .updateOne({ _id: id }, { $set: updateData });

    if (result.matchedCount === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json({ message: "User updated successfully" });
  } catch (error) {
    console.error("Error updating user:", error);
    res.status(500).json({ error: "Failed to update user" });
  }
});

app.delete("/users/:id", async (req: Request, res: Response) => {
  try {
    const id = new ObjectId(req.params.id);
    const result = await db
      .db(dbName)
      .collection("users")
      .deleteOne({ _id: id });

    if (result.deletedCount === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json({ message: "User deleted successfully" });
  } catch (error) {
    console.error("Error deleting user:", error);
    res.status(500).json({ error: "Failed to delete user" });
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
  app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
  });
});
