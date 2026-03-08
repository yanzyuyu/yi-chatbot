import 'dotenv/config';          // auto-load .env
import { Groq } from 'groq-sdk';

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

const chatCompletion = await groq.chat.completions.create({
  messages: [{ role: 'user', content: 'Halo, ini test.' }],
  model: 'moonshotai/kimi-k2-instruct-0905',
  temperature: 0.6,
  max_tokens: 4096,
  stream: true
});

for await (const chunk of chatCompletion) {
  process.stdout.write(chunk.choices[0]?.delta?.content || '');
}