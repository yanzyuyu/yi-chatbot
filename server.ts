import express from 'express';
import cors from 'cors';
import { createServer as createViteServer } from 'vite';
import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import fs from 'fs';
import { Groq } from 'groq-sdk';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = 3000;
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

app.use(cors());
app.use(express.json({ limit: '50mb' }));

// Utility paths
const CHATS_FILE = path.join(process.cwd(), 'chats.json');
const MEMORY_FILE = path.join(process.cwd(), 'memory.json');
const TASKS_FILE = path.join(process.cwd(), 'workspace', 'tasks.json');

// Ensure files exist
if (!fs.existsSync(CHATS_FILE)) fs.writeFileSync(CHATS_FILE, JSON.stringify([]));
if (!fs.existsSync(MEMORY_FILE)) fs.writeFileSync(MEMORY_FILE, JSON.stringify({ facts: [] }));
if (!fs.existsSync(path.dirname(TASKS_FILE))) fs.mkdirSync(path.dirname(TASKS_FILE), { recursive: true });
if (!fs.existsSync(TASKS_FILE)) fs.writeFileSync(TASKS_FILE, JSON.stringify([]));

async function startServer() {
  // API Routes
  app.get('/api/chats', (req, res) => {
    const data = fs.readFileSync(CHATS_FILE, 'utf-8');
    res.json(JSON.parse(data));
  });

  app.post('/api/chats', (req, res) => {
    fs.writeFileSync(CHATS_FILE, JSON.stringify(req.body.chats, null, 2));
    res.json({ success: true });
  });

  app.get('/api/memory', (req, res) => {
    const data = fs.readFileSync(MEMORY_FILE, 'utf-8');
    res.json(JSON.parse(data));
  });

  app.post('/api/memory', (req, res) => {
    fs.writeFileSync(MEMORY_FILE, JSON.stringify(req.body, null, 2));
    res.json({ success: true });
  });

  app.get('/api/tasks', (req, res) => {
    const data = fs.readFileSync(TASKS_FILE, 'utf-8');
    res.json(JSON.parse(data));
  });

  app.post('/api/tasks', (req, res) => {
    fs.writeFileSync(TASKS_FILE, JSON.stringify(req.body, null, 2));
    res.json({ success: true });
  });

  app.post('/api/execute', async (req, res) => {
    try {
      const { command } = req.body;
      const { stdout, stderr } = await promisify(exec)(command);
      res.json({ output: stdout || stderr });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post('/api/write_file', (req, res) => {
    try {
      const { filePath, content } = req.body;
      const absolutePath = path.resolve(process.cwd(), filePath);
      fs.mkdirSync(path.dirname(absolutePath), { recursive: true });
      fs.writeFileSync(absolutePath, content);
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post('/api/reset', (req, res) => {
    fs.writeFileSync(CHATS_FILE, JSON.stringify([]));
    fs.writeFileSync(TASKS_FILE, JSON.stringify([]));
    res.json({ success: true });
  });

  app.post('/api/upload', (req, res) => {
    const { base64 } = req.body;
    res.json({ url: `data:image/jpeg;base64,${base64}` });
  });

  app.post('/api/chat', async (req, res) => {
    const { messages, systemInstruction, imageUrl, isThinking, selectedModel } = req.body;
    
    try {
      let modelId = selectedModel || "openai/gpt-oss-20b";
      if (imageUrl) modelId = "meta-llama/llama-4-scout-17b-16e-instruct";

      let finalMessages: any[] = [];

      const isSearchModel = modelId === "openai/gpt-oss-20b" || modelId.includes("qwen");
      
      if (isSearchModel && messages.length > 0) {
        try {
          const lastMsg = messages[messages.length - 1].text;
          const history = messages.slice(-3, -1).map((m: any) => `${m.role === 'model' ? 'AI' : 'User'}: ${m.text}`).join('\n');
          
          const kimiRefiner = await groq.chat.completions.create({
            model: "moonshotai/kimi-k2-instruct-0905",
            messages: [
              { role: 'system', content: 'Ringkas konteks percakapan sebelumnya dalam 1 kalimat pendek untuk membantu pencarian. JANGAN BERI TEKS LAIN. Gunakan Bahasa Indonesia.' },
              { role: 'user', content: `HISTORY:\n${history}\n\nQUESTION:${lastMsg}` }
            ],
            temperature: 0.1,
            max_tokens: 50
          });

          const contextHint = kimiRefiner.choices[0].message.content || "";
          
          finalMessages = [
            { role: 'system', content: `Kamu AI Research Assistant akurat. WAJIB JAWAB DALAM BAHASA INDONESIA. TUGAS: Jawab pertanyaan user berdasarkan data terbaru lewat browser_search. Konteks: ${contextHint}` },
            { role: 'user', content: lastMsg }
          ];
        } catch (e) {
          finalMessages = [{ role: 'system', content: 'WAJIB JAWAB DALAM BAHASA INDONESIA. Gunakan browser_search untuk akurasi.' }, { role: 'user', content: messages[messages.length - 1].text }];
        }
      } else {
        if (systemInstruction) finalMessages.push({ role: 'system', content: systemInstruction });
        const recent = messages.slice(-5).map((msg: any) => ({
          role: msg.role === 'model' ? 'assistant' : 'user',
          content: typeof msg.text === 'string' ? msg.text.substring(0, 1500) : "..."
        }));
        
        if (imageUrl) {
          recent.forEach((msg: any, idx: number) => {
            if (idx === recent.length - 1 && msg.role === 'user') {
              finalMessages.push({ role: "user", content: [{ type: "text", text: msg.content || "Analyze image" }, { type: "image_url", image_url: { url: imageUrl } }] });
            } else finalMessages.push(msg);
          });
        } else finalMessages.push(...recent);
      }

      const options: any = {
        model: modelId,
        messages: finalMessages,
        stream: true
      };

      if (isSearchModel) {
        options.tools = [{ type: "browser_search" }];
        options.reasoning_effort = "high";
        options.tool_choice = "auto"; // Changed from required to auto to avoid crash
        options.max_tokens = 2048;
      } else {
        options.temperature = 0.5;
      }

      const chatCompletion = await groq.chat.completions.create(options) as any;

      res.setHeader('Content-Type', 'text/event-stream');
      for await (const chunk of chatCompletion) {
        const choice = (chunk as any).choices[0];
        const content = choice?.delta?.content || '';
        const reasoning = choice?.delta?.reasoning || null;
        const toolCalls = choice?.delta?.tool_calls || null;
        const executedTools = choice?.message?.executed_tools || null;

        if (content || reasoning || toolCalls || executedTools) {
          res.write(`data: ${JSON.stringify({ text: content, reasoning, toolCalls, executedTools })}\n\n`);
        }
      }
      res.write('data: [DONE]\n\n');
      res.end();
    } catch (error: any) {
      console.error('Groq Error:', error);
      if (!res.headersSent) res.status(error.status || 500).json({ error: error.message });
      else { res.write(`data: ${JSON.stringify({ error: "API Error. Try restarting." })}\n\n`); res.end(); }
    }
  });

  // --- PRODUCTION SETUP ---
  if (process.env.NODE_ENV === 'production') {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  } else {
    const vite = await createViteServer({ server: { middlewareMode: true }, appType: 'spa' });
    app.use(vite.middlewares);
  }

  const port = process.env.PORT || PORT;
  app.listen(port, '0.0.0.0', () => console.log(`Server running on port ${port}`));
}

startServer();
