'use client';

import { useRef, useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { saveAvatarBlob } from '@/lib/avatarStorage';

interface Props {
  onCreated: (blobUrl: string) => void;
  onSkip: () => void;
  accentColor?: string;
}

type CreatorTool = 'metaperson' | 'character';

export default function AvatarCreator({ onCreated, onSkip, accentColor = '#6366f1' }: Props) {
  const [uploading, setUploading] = useState(false);
  const [done, setDone] = useState(false);
  const [blobUrl, setBlobUrl] = useState('');
  const [showStudio, setShowStudio] = useState(false);
  const [tool, setTool] = useState<CreatorTool>('metaperson');
  const [autoReceived, setAutoReceived] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleMetaPersonExport = useCallback(async (url: string) => {
    setShowStudio(false);
    setUploading(true);
    try {
      const res = await fetch(url);
      const blob = await res.blob();
      await saveAvatarBlob(blob);
      const objectUrl = URL.createObjectURL(blob);
      setBlobUrl(objectUrl);
      setAutoReceived(true);
      setDone(true);
    } catch (err) {
      console.error('MetaPerson export fetch failed:', err);
    } finally {
      setUploading(false);
    }
  }, []);

  // Listen for MetaPerson postMessage export event
  useEffect(() => {
    if (!showStudio || tool !== 'metaperson') return;

    function onMessage(event: MessageEvent) {
      if (event.origin !== 'https://metaperson.avatarsdk.com') return;
      try {
        const data = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
        // Avatar SDK sends { eventName: 'v2.avatar_exported', url: '...' }
        // or { event: 'export', url: '...' } depending on version
        const url: string | undefined =
          data?.url ?? data?.avatarUrl ?? data?.modelUrl ?? data?.glbUrl;
        const isExportEvent =
          data?.eventName === 'v2.avatar_exported' ||
          data?.eventName === 'avatar_exported' ||
          data?.event === 'export' ||
          data?.type === 'export';

        if (url && isExportEvent) {
          handleMetaPersonExport(url);
        }
      } catch {
        // not our message
      }
    }

    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [showStudio, tool, handleMetaPersonExport]);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      await saveAvatarBlob(file);
      const url = URL.createObjectURL(file);
      setBlobUrl(url);
      setDone(true);
    } finally {
      setUploading(false);
    }
  }

  if (done) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex flex-col items-center gap-4"
      >
        <div
          className="w-20 h-20 rounded-full flex items-center justify-center text-3xl"
          style={{ background: accentColor + '22', border: `2px solid ${accentColor}` }}
        >
          ✓
        </div>
        <p className="text-sm text-white/70">
          {autoReceived ? 'Avatar received automatically — lip sync included!' : 'Avatar ready — lip sync included!'}
        </p>
        <button
          onClick={() => onCreated(blobUrl)}
          className="px-6 py-2.5 rounded-full text-sm font-semibold text-white"
          style={{ background: accentColor }}
        >
          Meet my future self →
        </button>
      </motion.div>
    );
  }

  const studioUrl = tool === 'metaperson'
    ? 'https://metaperson.avatarsdk.com/'
    : 'https://studio.m3org.com/';

  const studioLabel = tool === 'metaperson'
    ? 'MetaPerson Creator — upload selfie → Open → Export GLB (auto-received)'
    : 'CharacterStudio — customise your avatar, then Export → .vrm';

  return (
    <div className="flex flex-col gap-3 w-full">

      {/* Tool picker */}
      <div className="flex gap-2">
        {([
          { id: 'metaperson', label: '📸 MetaPerson Creator', sub: 'Uses your photo' },
          { id: 'character', label: '🎨 CharacterStudio', sub: 'Manual design' },
        ] as { id: CreatorTool; label: string; sub: string }[]).map(({ id, label, sub }) => (
          <button
            key={id}
            onClick={() => setTool(id as CreatorTool)}
            className="flex-1 rounded-xl px-3 py-2.5 text-left transition-all"
            style={{
              background: tool === id ? accentColor + '22' : 'rgba(255,255,255,0.03)',
              border: `1px solid ${tool === id ? accentColor + '66' : 'rgba(255,255,255,0.08)'}`,
            }}
          >
            <p className="text-xs font-semibold" style={{ color: tool === id ? accentColor : 'rgba(255,255,255,0.6)' }}>{label}</p>
            <p className="text-[10px] text-white/30 mt-0.5">{sub}</p>
          </button>
        ))}
      </div>

      {/* Step 1 — open creator */}
      <div
        className="rounded-2xl p-4 flex flex-col gap-3"
        style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
      >
        <p className="text-xs text-white/50 font-semibold uppercase tracking-wider">Step 1</p>
        {tool === 'metaperson' ? (
          <p className="text-sm text-white/80">
            Upload a selfie → click <strong className="text-white/60">Open</strong> → then click <strong className="text-white/60">Export GLB</strong>. The avatar loads automatically.
          </p>
        ) : (
          <p className="text-sm text-white/80">
            Create your avatar in CharacterStudio — customise face, hair, body.
          </p>
        )}
        <button
          onClick={() => setShowStudio(true)}
          className="text-sm font-medium px-4 py-2.5 rounded-xl transition-all"
          style={{ background: accentColor + '22', color: accentColor, border: `1px solid ${accentColor}44` }}
        >
          {tool === 'metaperson' ? 'Open MetaPerson Creator →' : 'Open CharacterStudio →'}
        </button>

        {/* Fullscreen overlay */}
        {showStudio && (
          <div className="fixed inset-0 z-50 flex flex-col" style={{ background: '#08081a' }}>
            <div className="flex items-center justify-between px-4 py-2 shrink-0" style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
              <span className="text-sm text-white/60 font-medium">{studioLabel}</span>
              <button
                onClick={() => setShowStudio(false)}
                className="text-white/40 hover:text-white/80 text-sm px-3 py-1 rounded-lg transition-colors"
                style={{ background: 'rgba(255,255,255,0.06)' }}
              >
                Close ✕
              </button>
            </div>
            {uploading && (
              <div className="absolute inset-0 z-10 flex items-center justify-center" style={{ background: 'rgba(8,8,26,0.85)' }}>
                <div className="flex flex-col items-center gap-3">
                  <div className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: accentColor }} />
                  <p className="text-sm text-white/60">Loading your avatar…</p>
                </div>
              </div>
            )}
            <iframe
              src={studioUrl}
              className="flex-1 w-full border-0"
              allow="camera *; microphone *"
              title={tool === 'metaperson' ? 'MetaPerson Creator' : 'CharacterStudio'}
            />
          </div>
        )}

        {tool === 'metaperson' && (
          <p className="text-xs text-white/30">
            Inside MetaPerson: click <strong className="text-white/50">Open</strong> on your avatar, then find the <strong className="text-white/50">Export</strong> button — the GLB will be sent here automatically.
          </p>
        )}
        {tool === 'character' && (
          <p className="text-xs text-white/30">
            When done, click <strong className="text-white/50">Export</strong> and save the <strong className="text-white/50">.vrm</strong> file, then upload it in Step 2 below.
          </p>
        )}
      </div>

      {/* Step 2 — manual upload fallback (always shown for character, shown as fallback for metaperson) */}
      <div
        className="rounded-2xl p-4 flex flex-col gap-3"
        style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
      >
        <p className="text-xs text-white/50 font-semibold uppercase tracking-wider">
          {tool === 'metaperson' ? 'Fallback — manual upload' : 'Step 2'}
        </p>
        <p className="text-sm text-white/80">Upload the .glb / .vrm file manually if auto-receive didn&apos;t work.</p>

        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl border-2 border-dashed transition-all disabled:opacity-50"
          style={{ borderColor: accentColor + '55', color: accentColor }}
        >
          {uploading ? (
            <>
              <div className="w-4 h-4 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: accentColor }} />
              Saving…
            </>
          ) : (
            <>
              <span className="text-lg">↑</span>
              Upload .glb / .vrm
            </>
          )}
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".vrm,.glb"
          className="hidden"
          onChange={handleFile}
        />
      </div>

      <button
        onClick={onSkip}
        className="text-xs text-white/30 hover:text-white/50 transition-colors text-center py-1"
      >
        Skip — use cartoon avatar
      </button>
    </div>
  );
}
