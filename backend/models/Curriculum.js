import mongoose from "mongoose";

const objectiveSchema = mongoose.Schema({
  code: String,
  title: String,
  description: String,
});

const curriculumSchema = mongoose.Schema({
  id: Number,
  grade: Number,
  objectives: [objectiveSchema],
}, {
  collection: "objectives" // Explicitly set collection name to "objectives"
});

const Curriculum = mongoose.model("Curriculum", curriculumSchema, "objectives");

export default Curriculum;
