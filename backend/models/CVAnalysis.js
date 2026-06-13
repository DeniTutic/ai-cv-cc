const mongoose = require('mongoose');

const grammarIssueSchema = new mongoose.Schema({
  issue: String,
  suggestion: String
}, { _id: false });

const improvementSchema = new mongoose.Schema({
  section: String,
  problem: String,
  recommendation: String
}, { _id: false });

const bulletPointSchema = new mongoose.Schema({
  original: String,
  improved: String
}, { _id: false });

const cvAnalysisSchema = new mongoose.Schema(
  {
    auth0Id: { type: String, required: true, index: true },
    originalFileName: { type: String, required: true },
    fileType: { type: String, enum: ['pdf', 'docx', 'txt'], required: true },
    extractedText: { type: String },

    // AI Analysis Results
    overallScore: { type: Number, min: 0, max: 100 },
    atsScore: { type: Number, min: 0, max: 100 },
    strengths: [String],
    weaknesses: [String],
    grammarIssues: [grammarIssueSchema],
    missingSkills: [String],
    recommendedImprovements: [improvementSchema],
    improvedSummary: String,
    improvedBulletPoints: [bulletPointSchema],
    finalRecommendation: String,

    status: {
      type: String,
      enum: ['processing', 'completed', 'failed'],
      default: 'processing'
    },
    errorMessage: String
  },
  { timestamps: true }
);

// Virtual for score label
cvAnalysisSchema.virtual('scoreLabel').get(function () {
  if (this.overallScore >= 75) return 'Excellent';
  if (this.overallScore >= 55) return 'Good';
  return 'Needs improvement';
});

module.exports = mongoose.model('CVAnalysis', cvAnalysisSchema);
