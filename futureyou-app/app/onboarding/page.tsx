'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { ONBOARDING_QUESTIONS, saveProfile, type UserProfile } from '@/lib/onboarding';
import AvatarCreator from '@/components/AvatarCreator';

const EMPTY_PROFILE: UserProfile = { name: '', age: '', goals: '', retirementVision: '' };

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [profile, setProfile] = useState<UserProfile>(EMPTY_PROFILE);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(true);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const question = ONBOARDING_QUESTIONS[step];

  useEffect(() => {
    setIsTyping(true);
    const timer = setTimeout(() => {
      setIsTyping(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    }, 1200);
    return () => clearTimeout(timer);
  }, [step]);

  const handleNext = useCallback(() => {
    const field = question.id as keyof UserProfile;
    const value = field === 'photoDataUrl' ? (photoPreview ?? '') : input.trim();
    const updated = { ...profile, [field]: value };
    setProfile(updated);

    if (step < ONBOARDING_QUESTIONS.length - 1) {
      setStep((s) => s + 1);
      setInput('');
      setPhotoPreview(null);
    } else {
      saveProfile(updated);
      router.push('/home');
    }
  }, [question.id, input, photoPreview, profile, step, router]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey && question.inputType !== 'textarea') {
      e.preventDefault();
      if (input.trim() || question.inputType === 'photo') handleNext();
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string;
      if (!dataUrl) return;
      setPhotoPreview(dataUrl);

      // Extract skin + hair colors from the photo for avatar personalization
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = 64;
        canvas.height = 64;
        const ctx = canvas.getContext('2d')!;
        ctx.drawImage(img, 0, 0, 64, 64);
        // Face center ≈ skin color
        const skin = ctx.getImageData(32, 22, 1, 1).data;
        // Top strip ≈ hair color
        const hair = ctx.getImageData(32, 5, 1, 1).data;
        setProfile((prev) => ({
          ...prev,
          avatarColors: {
            skin: `rgb(${skin[0]},${skin[1]},${skin[2]})`,
            hair: `rgb(${hair[0]},${hair[1]},${hair[2]})`,
          },
        }));
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  };

  const canAdvance = (question.inputType === 'photo' || question.inputType === 'avatarUrl')
    ? true
    : input.trim().length > 0;

  return (
    <div className="fixed inset-0 bg-[#05050d] flex flex-col items-center justify-center p-6">
      {/* Background glow */}
      <div
        className="absolute inset-0 opacity-20 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse at 50% 60%, #6366f133 0%, transparent 70%)',
        }}
      />

      {/* Logo */}
      <motion.div
        className="absolute top-8 left-1/2 -translate-x-1/2 text-xs tracking-[0.3em] uppercase text-white/30 font-semibold"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
      >
        FutureYou
      </motion.div>

      {/* Progress dots */}
      <div className="absolute top-16 left-1/2 -translate-x-1/2 flex gap-1.5">
        {ONBOARDING_QUESTIONS.map((_, i) => (
          <div
            key={i}
            className="w-1.5 h-1.5 rounded-full transition-all duration-300"
            style={{
              background: i <= step ? '#6366f1' : 'rgba(255,255,255,0.15)',
              transform: i === step ? 'scale(1.3)' : 'scale(1)',
            }}
          />
        ))}
      </div>

      <div className="w-full max-w-md">
        {/* Avatar bubble */}
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.3 }}
            className="mb-6"
          >
            <div className="flex items-end gap-3">
              {/* Future self avatar pip */}
              <div className="w-10 h-10 rounded-full bg-purple-500/20 border border-purple-500/30 flex items-center justify-center text-sm font-bold text-purple-400 shrink-0">
                67
              </div>

              <div className="rounded-2xl rounded-bl-sm px-5 py-4 max-w-sm"
                style={{
                  background: 'rgba(255,255,255,0.06)',
                  border: '1px solid rgba(255,255,255,0.09)',
                }}>
                {isTyping ? (
                  <div className="flex gap-1.5 items-center h-5">
                    {[0, 1, 2].map((i) => (
                      <motion.div
                        key={i}
                        className="w-1.5 h-1.5 rounded-full bg-purple-400"
                        animate={{ scale: [1, 1.5, 1], opacity: [0.4, 1, 0.4] }}
                        transition={{ duration: 0.8, delay: i * 0.18, repeat: Infinity }}
                      />
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-white/85 leading-relaxed">{question.avatarText}</p>
                )}
              </div>
            </div>
          </motion.div>
        </AnimatePresence>

        {/* Input area */}
        <AnimatePresence>
          {!isTyping && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25 }}
              className="flex flex-col gap-3"
            >
              {question.inputType === 'avatarUrl' ? (
                <AvatarCreator
                  onCreated={(url) => {
                    const updated = { ...profile, avatarUrl: url };
                    setProfile(updated);
                    saveProfile(updated);
                    router.push('/home');
                  }}
                  onSkip={() => {
                    saveProfile(profile);
                    router.push('/home');
                  }}
                />
              ) : question.inputType === 'photo' ? (
                <div className="flex flex-col items-center gap-4">
                  {photoPreview ? (
                    <div className="relative">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={photoPreview}
                        alt="Your photo"
                        className="w-24 h-24 rounded-full object-cover border-2 border-purple-500"
                      />
                      <button
                        onClick={() => setPhotoPreview(null)}
                        className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-white/20 text-white text-xs flex items-center justify-center"
                      >
                        ×
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="w-24 h-24 rounded-full border-2 border-dashed border-white/20 flex flex-col items-center justify-center gap-1 text-white/40 hover:border-purple-500/50 hover:text-purple-400 transition-all"
                    >
                      <span className="text-2xl">+</span>
                      <span className="text-[10px]">Upload</span>
                    </button>
                  )}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleFileChange}
                  />
                  <p className="text-xs text-white/30 text-center">
                    Optional — your face will appear on your future self.
                  </p>
                </div>
              ) : question.inputType === 'textarea' ? (
                <textarea
                  ref={inputRef as React.RefObject<HTMLTextAreaElement>}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={question.placeholder}
                  rows={3}
                  className="w-full bg-white/[0.06] border border-white/10 rounded-2xl px-4 py-3 text-sm text-white placeholder-white/25 resize-none focus:outline-none focus:border-purple-500/50 transition-colors"
                />
              ) : (
                <input
                  ref={inputRef as React.RefObject<HTMLInputElement>}
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={question.placeholder}
                  className="w-full bg-white/[0.06] border border-white/10 rounded-2xl px-4 py-3 text-sm text-white placeholder-white/25 focus:outline-none focus:border-purple-500/50 transition-colors"
                />
              )}

              {question.inputType !== 'avatarUrl' && (
                <div className="flex gap-2 justify-end">
                  {question.inputType === 'photo' && (
                    <button
                      onClick={handleNext}
                      className="px-4 py-2 text-xs text-white/40 hover:text-white/60 transition-colors"
                    >
                      Skip
                    </button>
                  )}
                  <button
                    onClick={handleNext}
                    disabled={!canAdvance}
                    className="px-6 py-2.5 rounded-full text-sm font-semibold transition-all duration-200 disabled:opacity-30 disabled:cursor-not-allowed"
                    style={{ background: canAdvance ? '#6366f1' : 'rgba(99,102,241,0.3)', color: '#fff' }}
                  >
                    {step === ONBOARDING_QUESTIONS.length - 1 ? 'Meet my future self →' : 'Continue →'}
                  </button>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
