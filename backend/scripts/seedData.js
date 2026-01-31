import mongoose from "mongoose";
import dotenv from "dotenv";
import Curriculum from "../models/Curriculum.js";

dotenv.config();

const sampleData = [
  {
    id: 1,
    grade: 1,
    objectives: [
      {
        code: "1.1",
        title: "Number Recognition",
        description: "Recognize and write numbers from 0 to 20"
      },
      {
        code: "1.2",
        title: "Basic Addition",
        description: "Add numbers up to 10 using objects or drawings"
      }
    ]
  },
  {
    id: 2,
    grade: 2,
    objectives: [
      {
        code: "2.1",
        title: "Place Value",
        description: "Understand place value for numbers up to 100"
      },
      {
        code: "2.2",
        title: "Two-Digit Addition",
        description: "Add two-digit numbers with regrouping"
      }
    ]
  },
  {
    id: 3,
    grade: 3,
    objectives: [
      {
        code: "3.1",
        title: "Multiplication",
        description: "Multiply single-digit numbers"
      },
      {
        code: "3.2",
        title: "Division",
        description: "Divide numbers using basic division facts"
      }
    ]
  }
];

const seedDatabase = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("Connected to MongoDB");

    // Clear existing data (optional - remove if you want to keep existing data)
    await Curriculum.deleteMany({});
    console.log("Cleared existing curriculum data");

    // Insert sample data
    const result = await Curriculum.insertMany(sampleData);
    console.log(`Inserted ${result.length} curriculum records`);

    process.exit(0);
  } catch (error) {
    console.error("Error seeding database:", error);
    process.exit(1);
  }
};

seedDatabase();
