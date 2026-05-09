'use client';

import { useState, useRef, useEffect, useCallback, Suspense } from 'react';
import dynamic from 'next/dynamic';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter, useSearchParams } from 'next/navigation';
import { SCENARIOS, type ScenarioId } from '@/lib/scenarios';
import { loadProfile, buildSystemPrompt } from '@/lib/onboarding';
import ChatBubble, { TypingIndicator } from '@/components/ChatBubble';
import ScenarioChip from '@/components/ScenarioChip';

const AvatarScene = dynamic(() => import('@/components/AvatarScene'), { ssr: false });

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

// ElevenLabs TTS — exact same pattern as lg-aura/src/LGComponent.jsx
async function speakWithElevenLabs(text: string): Promise<void> {
  const apiKey = process.env.NEXT_PUBLIC_ELEVENLABS_API_KEY;
  if (!apiKey) return;

  const voiceId = 'Xb7hH8MSUJpSbSDYk0k2'; // same voice as lg-aura

  const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
    method: 'POST',
    headers: {
      Accept: 'audio/mpeg',
      'Content-Type': 'application/json',
      'xi-api-key': apiKey,
    },
    body: JSON.stringify({
      text,
      model_id: 'eleven_turbo_v2_5',
      voice_settings: {
        stability: 0.3,
        similarity_boost: 0.3,
      },
    }),
  });

  if (!response.ok) {
    console.error('ElevenLabs error:', response.status);
    return;
  }

  const audioBlob = await response.blob();
  const audioUrl = URL.createObjectURL(audioBlob);
  const audio = new Audio(audioUrl);

  return new Promise((resolve, reject) => {
    audio.onended = () => {
      URL.revokeObjectURL(audioUrl);
      resolve();
    };
    audio.onerror = (error) => {
      URL.revokeObjectURL(audioUrl);
      reject(error);
    };
    audio.play();
  });
}

function ChatContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialScenario = (searchParams.get('scenario') as ScenarioId) || 'C';

  const [activeScenario, setActiveScenario] = useState<ScenarioId>(initialScenario);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [showAvatar, setShowAvatar] = useState(true);
  const [isListening, setIsListening] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null);

  const scenario = SCENARIOS[activeScenario];
  const profile = loadProfile();

  useEffect(() => {
    setMessages([{ role: 'assistant', content: scenario.openingMessage }]);
  }, [activeScenario, scenario.openingMessage]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, isStreaming]);

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || isStreaming) return;
    setInput('');

    const userMsg: Message = { role: 'user', content: text };
    const updatedMsgs: Message[] = [...messages, userMsg];
    setMessages(updatedMsgs);
    setIsStreaming(true);

    const systemPrompt = buildSystemPrompt(
      profile || { name: 'friend', age: 'young', goals: 'a great life', retirementVision: 'freedom and peace' },
      scenario.systemPromptTheme
    );

    try {
      // Same streaming fetch pattern as lg-aura lgGenerateStream
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: updatedMsgs, systemPrompt }),
      });

      if (!res.ok || !res.body) throw new Error('Request failed');

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let assistantText = '';

      setMessages((prev) => [...prev, { role: 'assistant', content: '' }]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        assistantText += chunk;
        setMessages((prev) => {
          const copy = [...prev];
          copy[copy.length - 1] = { role: 'assistant', content: assistantText };
          return copy;
        });
      }

      // Speak response with ElevenLabs
      setIsSpeaking(true);
      speakWithElevenLabs(assistantText).finally(() => setIsSpeaking(false));
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: "I'm having trouble connecting. Try again in a moment." },
      ]);
    } finally {
      setIsStreaming(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isStreaming, messages, profile, scenario]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  const startListening = () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const w = window as any;
    const SpeechRecognition = w.SpeechRecognition || w.webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    const rec = new SpeechRecognition();
    rec.lang = 'en-US';
    rec.interimResults = false;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    rec.onresult = (e: any) => {
      const transcript = e.results[0][0].transcript;
      setInput(transcript);
      setIsListening(false);
    };
    rec.onerror = () => setIsListening(false);
    rec.onend = () => setIsListening(false);
    recognitionRef.current = rec;
    rec.start();
    setIsListening(true);
  };

  const stopListening = () => {
    recognitionRef.current?.stop();
    setIsListening(false);
  };

  return (
    <div className="fixed inset-0 flex flex-col" style={{ background: scenario.skyBottom }}>

      {/* Mini avatar scene */}
      <AnimatePresence>
        {showAvatar && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: '220px', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.4 }}
            className="relative shrink-0 overflow-hidden"
          >
            <Suspense fallback={<div style={{ height: 220, background: scenario.skyBottom }} />}>
              <AvatarScene scenario={scenario} interactive={false} />
            </Suspense>

            {/* Photo overlay (2D) */}
            {profile?.photoDataUrl && (
              <div className="absolute bottom-3 left-3 flex items-center gap-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={profile.photoDataUrl}
                  alt="You"
                  className="w-9 h-9 rounded-full object-cover border-2"
                  style={{ borderColor: scenario.accentColor }}
                />
                <span className="text-xs text-white/50">Your future self</span>
              </div>
            )}

            {/* Speaking pulse indicator */}
            {isSpeaking && (
              <div className="absolute bottom-3 right-12 flex items-center gap-1">
                {[0, 1, 2, 3].map((i) => (
                  <motion.div
                    key={i}
                    className="w-1 rounded-full"
                    style={{ background: scenario.accentColor }}
                    animate={{ height: ['4px', '16px', '4px'] }}
                    transition={{ duration: 0.5, delay: i * 0.1, repeat: Infinity }}
                  />
                ))}
              </div>
            )}

            <button
              onClick={() => setShowAvatar(false)}
              className="absolute top-3 right-3 w-7 h-7 rounded-full bg-black/40 text-white/60 text-xs flex items-center justify-center hover:bg-black/60"
            >
              ↑
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {!showAvatar && (
        <button
          onClick={() => setShowAvatar(true)}
          className="shrink-0 w-full py-1.5 flex items-center justify-center gap-1 text-xs text-white/30 hover:text-white/60 transition-colors"
          style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}
        >
          ↓ Show future self
        </button>
      )}

      {/* Top bar */}
      <div
        className="shrink-0 flex items-center justify-between px-4 py-3"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}
      >
        <button
          onClick={() => router.push('/home')}
          className="text-white/40 hover:text-white/70 text-sm transition-colors flex items-center gap-1"
        >
          ← Home
        </button>
        <ScenarioChip active={activeScenario} onChange={setActiveScenario} />
        <div className="w-16" />
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto chat-scroll px-4 py-4">
        {messages.map((msg, i) => (
          <ChatBubble
            key={i}
            role={msg.role}
            content={msg.content}
            accentColor={scenario.accentColor}
            isStreaming={isStreaming && i === messages.length - 1 && msg.role === 'assistant'}
          />
        ))}
        <AnimatePresence>
          {isStreaming && messages[messages.length - 1]?.role === 'user' && (
            <TypingIndicator accentColor={scenario.accentColor} />
          )}
        </AnimatePresence>

        {messages.length === 1 && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8 }}
            className="text-center my-4"
          >
            <p className="text-xs text-white/30 mb-3 italic">{scenario.reflectionPrompt}</p>
            <div className="flex flex-wrap justify-center gap-2">
              {['How do I start?', 'What do you regret most?', 'What changed for you?'].map((q) => (
                <button
                  key={q}
                  onClick={() => sendMessage(q)}
                  className="text-xs rounded-full px-3 py-1.5 transition-all hover:opacity-80"
                  style={{
                    background: scenario.accentColor + '22',
                    border: `1px solid ${scenario.accentColor}44`,
                    color: scenario.accentColor,
                  }}
                >
                  {q}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </div>

      {/* Input bar */}
      <div
        className="shrink-0 px-4 py-3 flex items-center gap-2"
        style={{
          background: 'rgba(5,5,13,0.85)',
          borderTop: '1px solid rgba(255,255,255,0.07)',
          backdropFilter: 'blur(12px)',
        }}
      >
        <button
          onMouseDown={startListening}
          onTouchStart={startListening}
          onMouseUp={stopListening}
          onTouchEnd={stopListening}
          className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 transition-all"
          style={{
            background: isListening ? scenario.accentColor : 'rgba(255,255,255,0.07)',
            border: `1px solid ${isListening ? scenario.accentColor : 'rgba(255,255,255,0.1)'}`,
          }}
        >
          <span className="text-sm">{isListening ? '🔴' : '🎤'}</span>
        </button>

        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Say something to your future self..."
          disabled={isStreaming}
          className="flex-1 bg-white/[0.06] border border-white/10 rounded-full px-4 py-2.5 text-sm text-white placeholder-white/25 focus:outline-none focus:border-white/20 transition-colors disabled:opacity-50"
        />

        <button
          onClick={() => sendMessage(input)}
          disabled={!input.trim() || isStreaming}
          className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 transition-all disabled:opacity-30"
          style={{ background: input.trim() ? scenario.accentColor : 'rgba(255,255,255,0.07)' }}
        >
          <span className="text-sm">↑</span>
        </button>
      </div>
    </div>
  );
}

export default function ChatPage() {
  return (
    <Suspense fallback={<div className="fixed inset-0 bg-[#05050d]" />}>
      <ChatContent />
    </Suspense>
  );
}
