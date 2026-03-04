import mongoose from "mongoose";

const objectiveSchema = mongoose.Schema({
  subject: { type: String, default: "" },
  code: String,
  title: String,
  description: String,
});

const curriculumSchema = mongoose.Schema({
  id: { type: mongoose.Schema.Types.Mixed, default: null },
  grade: { type: mongoose.Schema.Types.Mixed, required: true }, // Number (1,2,3...) or String ("KG-1","KG-2","KG-3")
  objectives: [objectiveSchema],
}, {
  collection: "objectives" // Explicitly set collection name to "objectives"
});

const Curriculum = mongoose.model("Curriculum", curriculumSchema, "objectives");

export default Curriculum;
