export interface ChatMessage {
  role: "user" | "model";
  text: string;
  imageUrl?: string;
  reasoning?: string;
  executedTools?: any[];
  toolCalls?: any[];
}

export interface FileData {
  base64: string;
  mimeType: string;
  name?: string;
}

const API_BASE_URL = import.meta.env.VITE_API_URL || '';

export async function* generateCodeStream(
  messages: ChatMessage[],
  systemInstruction?: string,
  imageUrl?: string | null,
  isThinking?: boolean,
  selectedModel?: string
) {
  const response = await fetch(`${API_BASE_URL}/api/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      messages: messages.slice(-10),
      systemInstruction,
      imageUrl,
      isThinking,
      selectedModel,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
  }

  const reader = response.body?.getReader();
  if (!reader) throw new Error('Response body is not readable');

  const decoder = new TextDecoder('utf-8');
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      if (line.startsWith('data: ')) {
        const dataStr = line.slice(6).trim();
        if (dataStr === '[DONE]') return;
        if (dataStr) {
          try {
            const data = JSON.parse(dataStr);
            yield {
              text: data.text || '',
              reasoning: data.reasoning || '',
              toolCalls: data.toolCalls || null,
              executedTools: data.executedTools || null
            };
          } catch (e) {
            console.error('Error parsing SSE data:', e);
          }
        }
      }
    }
  }
}
