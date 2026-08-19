interface Message {
  id?: string;
  role: 'user' | 'assistant';
  content: string;
}

// Change this to your API endpoint or use environment variable
// Support dynamic endpoint from window object (for widget embedding)
const getApiEndpoint = () => {
  if (typeof window !== 'undefined' && (window as any).PBMP_CHAT_API_ENDPOINT) {
    return (window as any).PBMP_CHAT_API_ENDPOINT;
  }
  return import.meta.env.VITE_API_ENDPOINT || 'http://localhost:3000/api/chat';
};

export async function sendMessage(messages: Message[]): Promise<string> {
  try {
    const API_ENDPOINT = getApiEndpoint();
    const response = await fetch(API_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messages: messages.map(msg => ({
          role: msg.role,
          parts: [{ type: 'text', text: msg.content }]
        }))
      }),
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.statusText}`);
    }

    // Handle streaming response
    const reader = response.body?.getReader();
    const decoder = new TextDecoder();
    let result = '';

    if (reader) {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');
        
        for (const line of lines) {
          if (line.startsWith('0:')) {
            try {
              const jsonStr = line.substring(2);
              const parsed = JSON.parse(jsonStr);
              if (parsed && typeof parsed === 'string') {
                result += parsed;
              }
            } catch (e) {
              // Skip invalid JSON
            }
          }
        }
      }
    }

    return result || 'No response from assistant';
  } catch (error) {
    console.error('Chat service error:', error);
    throw error;
  }
}
