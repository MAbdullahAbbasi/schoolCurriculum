/**
 * One-time script: Keep the first 216 objective rows (as shown in the main page table)
 * and permanently delete the rest from the objectives collection.
 * Table order: grades sorted ascending, then objectives in array order within each grade.
 */
import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import Curriculum from "../models/Curriculum.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, "..", ".env") });

const KEEP_ROWS = 216;

async function run() {
  if (!process.env.MONGO_URI) {
    console.error("MONGO_URI is not set. Create backend/.env with MONGO_URI.");
    process.exit(1);
  }

  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("Connected to MongoDB.");

    const docs = await Curriculum.find({}).sort({ grade: 1 }).lean();
    let totalRows = 0;
    for (const d of docs) {
      totalRows += (d.objectives || []).length;
    }
    console.log(`Total grade documents: ${docs.length}`);
    console.log(`Total objective rows: ${totalRows}`);

    if (totalRows <= KEEP_ROWS) {
      console.log(`Nothing to delete. Total rows (${totalRows}) <= keep (${KEEP_ROWS}).`);
      await mongoose.disconnect();
      process.exit(0);
    }

    let globalIndex = 0;
    const toDelete = totalRows - KEEP_ROWS;

    for (const doc of docs) {
      const objectives = doc.objectives || [];
      const keepCount = Math.max(
        0,
        Math.min(objectives.length, KEEP_ROWS - globalIndex)
      );
      const removeCount = objectives.length - keepCount;

      if (removeCount > 0) {
        const kept = objectives.slice(0, keepCount);
        await Curriculum.updateOne(
          { _id: doc._id },
          { $set: { objectives: kept } }
        );
        console.log(
          `Grade ${doc.grade}: kept ${keepCount}, removed ${removeCount} objectives.`
        );
      }

      globalIndex += objectives.length;
      if (globalIndex >= KEEP_ROWS) break;
    }

    const afterDocs = await Curriculum.find({}).sort({ grade: 1 }).lean();
    const afterRows = afterDocs.reduce((s, d) => s + (d.objectives || []).length, 0);
    console.log(`\nDone. Remaining objective rows: ${afterRows}`);
    console.log(`Permanently deleted ${totalRows - afterRows} rows.`);
  } catch (err) {
    console.error("Error:", err);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log("Disconnected from MongoDB.");
  }
}

run();
