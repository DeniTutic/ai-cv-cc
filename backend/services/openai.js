const OpenAI = require('openai');

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const SYSTEM_PROMPT = `You are an expert CV/resume reviewer, ATS specialist, recruiter, and career coach.
Analyze the provided CV text carefully and return practical improvement recommendations.
Focus on:
- CV structure and layout
- ATS compatibility (keywords, formatting, sections)
- Grammar and wording
- Professional tone
- Missing skills relevant to the candidate's field
- Weak bullet points lacking measurable achievements
- Clarity of experience descriptions
- Technical skills completeness
- Project descriptions
- Education section quality
- Overall job readiness

Return ONLY valid JSON. No markdown. No explanations outside the JSON.
Be strict but constructive. Act like a senior recruiter reviewing a real candidate.
Do not invent experience, companies, degrees, or skills — only analyze what is present.
Suggestions must be professional and actionable.`;

const USER_PROMPT = (cvText) => `Analyze the following CV and return a JSON object with this exact structure:
{
  "overallScore": <number 0-100>,
  "atsScore": <number 0-100>,
  "strengths": ["string"],
  "weaknesses": ["string"],
  "grammarIssues": [{ "issue": "string", "suggestion": "string" }],
  "missingSkills": ["string"],
  "recommendedImprovements": [{ "section": "string", "problem": "string", "recommendation": "string" }],
  "improvedSummary": "string",
  "improvedBulletPoints": [{ "original": "string", "improved": "string" }],
  "finalRecommendation": "string"
}

Scoring rules:
- overallScore: 0-100 (be realistic; weak CVs should score 30-55, average 55-70, strong 75+)
- atsScore: 0-100 (based on keywords, section headers, formatting)
- Include 3-6 strengths
- Include 3-6 weaknesses
- Include all grammar/wording issues found (up to 5)
- Include 5-10 missing skills relevant to the candidate's field
- Include 4-7 recommended improvements with specific sections
- improvedSummary: write a better professional summary based on what's in the CV
- improvedBulletPoints: rewrite 3-5 of the weakest bullet points
- finalRecommendation: 3-5 sentence action plan

CV text:
${cvText}`;

async function analyzeCV(cvText) {
  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: USER_PROMPT(cvText) }
      ],
      temperature: 0.4,
      max_tokens: 3000,
      response_format: { type: 'json_object' }
    });

    const content = response.choices[0]?.message?.content;
    if (!content) throw new Error('No response from OpenAI');

    const result = JSON.parse(content);

    // Validate required fields
    const required = ['overallScore', 'atsScore', 'strengths', 'weaknesses',
      'grammarIssues', 'missingSkills', 'recommendedImprovements',
      'improvedSummary', 'improvedBulletPoints', 'finalRecommendation'];

    for (const field of required) {
      if (result[field] === undefined) {
        throw new Error(`Missing required field in AI response: ${field}`);
      }
    }

    // Clamp scores to 0-100
    result.overallScore = Math.max(0, Math.min(100, Math.round(result.overallScore)));
    result.atsScore = Math.max(0, Math.min(100, Math.round(result.atsScore)));

    return result;
  } catch (err) {
    if (err instanceof SyntaxError) {
      throw new Error('AI returned invalid JSON. Please try again.');
    }
    throw new Error(`AI analysis failed: ${err.message}`);
  }
}

module.exports = { analyzeCV };
