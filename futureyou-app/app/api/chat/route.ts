import { NextRequest, NextResponse } from 'next/server';

const HF_MODEL = 'mistralai/Mistral-7B-Instruct-v0.3';

export async function POST(req: NextRequest) {
  try {
    const { messages, systemPrompt } = await req.json() as {
      messages: { role: 'user' | 'assistant'; content: string }[];
      systemPrompt: string;
    };

    if (!messages?.length || !systemPrompt) {
      return NextResponse.json({ error: 'Missing messages or systemPrompt' }, { status: 400 });
    }

    const hfMessages = [
      { role: 'system', content: systemPrompt },
      ...messages,
    ];

    // Same fetch + ReadableStream pattern as lg-aura lgGenerateStream
    const response = await fetch(
      `https://api-inference.huggingface.co/v1/chat/completions`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.HUGGINGFACE_API_TOKEN}`,
        },
        body: JSON.stringify({
          model: HF_MODEL,
          messages: hfMessages,
          stream: true,
          max_tokens: 256,
          temperature: 0.75,
        }),
      }
    );

    if (!response.ok) {
      const err = await response.text();
      console.error('[HuggingFace API error]', response.status, err);
      return NextResponse.json({ error: 'HuggingFace API error', detail: err }, { status: 502 });
    }

    const encoder = new TextEncoder();

    // Parse SSE stream from HuggingFace and forward plain text chunks
    const readable = new ReadableStream({
      async start(controller) {
        const reader = response.body!.getReader();
        const decoder = new TextDecoder();

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split('\n');

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed.startsWith('data:')) continue;
            const data = trimmed.slice(5).trim();
            if (data === '[DONE]') continue;

            try {
              const parsed = JSON.parse(data);
              const text = parsed.choices?.[0]?.delta?.content;
              if (text) controller.enqueue(encoder.encode(text));
            } catch {
              // skip malformed chunks
            }
          }
        }
        controller.close();
      },
    });

    return new Response(readable, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Transfer-Encoding': 'chunked',
        'Cache-Control': 'no-cache',
      },
    });
  } catch (err) {
    console.error('[chat route]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
