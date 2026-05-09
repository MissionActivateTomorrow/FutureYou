'use client';

import { motion } from 'framer-motion';

interface ChatBubbleProps {
  role: 'user' | 'assistant';
  content: string;
  accentColor?: string;
  isStreaming?: boolean;
}

export default function ChatBubble({ role, content, accentColor = '#6366f1', isStreaming }: ChatBubbleProps) {
  const isUser = role === 'user';

  return (
    <motion.div
      initial={{ opacity: 0, y: 10, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.2 }}
      className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-3`}
    >
      {!isUser && (
        <div
          className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold mr-2 shrink-0 self-end mb-1"
          style={{ background: accentColor + '33', color: accentColor }}
        >
          67
        </div>
      )}
      <div
        className="max-w-[78%] rounded-2xl px-4 py-3 text-sm leading-relaxed"
        style={
          isUser
            ? { background: accentColor, color: '#fff' }
            : {
                background: 'rgba(255,255,255,0.07)',
                border: '1px solid rgba(255,255,255,0.1)',
                color: '#e2e8f0',
              }
        }
      >
        {content}
        {isStreaming && (
          <span className="inline-block w-1.5 h-3.5 ml-1 rounded-sm animate-pulse" style={{ background: accentColor }} />
        )}
      </div>
    </motion.div>
  );
}

export function TypingIndicator({ accentColor = '#6366f1' }: { accentColor?: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      className="flex items-end gap-2 mb-3"
    >
      <div
        className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
        style={{ background: accentColor + '33', color: accentColor }}
      >
        67
      </div>
      <div
        className="rounded-2xl px-4 py-3 flex gap-1.5 items-center"
        style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)' }}
      >
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            className="w-1.5 h-1.5 rounded-full"
            style={{ background: accentColor }}
            animate={{ scale: [1, 1.4, 1], opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 0.9, delay: i * 0.2, repeat: Infinity }}
          />
        ))}
      </div>
    </motion.div>
  );
}
