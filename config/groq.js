const fetch = require('node-fetch');

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_MODEL = 'llama3-70b-8192';

/**
 * Send a chat completion request to Groq API
 * @param {string} systemPrompt - The system message
 * @param {string} userMessage - The user message
 * @returns {Promise<string>} - The AI response text
 */
async function groqChat(systemPrompt, userMessage) {
  const apiKey = process.env.GROQ_API_KEY;
  
  if (!apiKey || apiKey === 'your_groq_api_key') {
    throw new Error('Groq API key not configured. Set GROQ_API_KEY in .env file.');
  }

  const response = await fetch(GROQ_API_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: GROQ_MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage }
      ],
      temperature: 0.7,
      max_tokens: 1024
    })
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(`Groq API error: ${response.status} - ${errorData.error?.message || 'Unknown error'}`);
  }

  const data = await response.json();
  return data.choices[0]?.message?.content || '';
}

/**
 * Extract skills from text using Groq AI
 */
async function extractSkills(text) {
  const systemPrompt = `You are a skill extraction AI. Extract professional/technical skills mentioned in the text. 
Return ONLY a JSON array of skill strings, nothing else. 
Example: ["JavaScript", "React", "Machine Learning"]
If no skills are found, return an empty array: []`;

  try {
    const result = await groqChat(systemPrompt, text);
    // Parse the JSON array from the response
    const cleaned = result.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    return JSON.parse(cleaned);
  } catch (error) {
    console.error('Skill extraction error:', error.message);
    // Fallback: basic keyword matching
    return basicSkillExtraction(text);
  }
}

/**
 * Fallback skill extraction using keyword matching
 */
function basicSkillExtraction(text) {
  const knownSkills = [
    'JavaScript', 'Python', 'Java', 'C++', 'C#', 'TypeScript', 'Ruby', 'Go', 'Rust', 'Swift',
    'React', 'Angular', 'Vue', 'Node.js', 'Express', 'Django', 'Flask', 'Spring',
    'HTML', 'CSS', 'SQL', 'MongoDB', 'PostgreSQL', 'MySQL', 'Redis',
    'AWS', 'Azure', 'Google Cloud', 'Docker', 'Kubernetes',
    'Machine Learning', 'Deep Learning', 'AI', 'Data Science', 'NLP',
    'Git', 'Linux', 'DevOps', 'CI/CD', 'Agile', 'Scrum',
    'Figma', 'Photoshop', 'UI/UX', 'Design', 'Product Management',
    'Leadership', 'Communication', 'Problem Solving', 'Teamwork',
    'Marketing', 'SEO', 'Analytics', 'Content Writing', 'Sales'
  ];

  const lowerText = text.toLowerCase();
  return knownSkills.filter(skill => lowerText.includes(skill.toLowerCase()));
}

/**
 * Enhance a professional bio using Groq AI
 */
async function enhanceBio(bio) {
  const systemPrompt = `You are a professional LinkedIn bio writer. Improve the following bio to make it more professional, engaging, and impactful. 
Keep it concise (2-3 sentences max). 
Return ONLY the improved bio text, nothing else.`;

  return groqChat(systemPrompt, bio);
}

/**
 * Enhance a post caption using Groq AI
 */
async function enhanceCaption(caption) {
  const systemPrompt = `You are a social media content specialist for professional networking. Improve the following post caption to make it more engaging, professional, and impactful. 
Add relevant emojis and hashtags where appropriate.
Keep it natural and authentic.
Return ONLY the improved caption text, nothing else.`;

  return groqChat(systemPrompt, caption);
}

module.exports = { groqChat, extractSkills, enhanceBio, enhanceCaption, basicSkillExtraction };
