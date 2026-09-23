'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { Panel, PanelBody, PanelHeader, PanelTitle } from '@/components/ui/panel';
import { Button } from '@/components/ui/button';
import { Chip } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Sparkles,
  Send,
  Clock,
  CheckCircle,
  Loader2,
  Copy,
  ChevronLeft,
  AlertTriangle,
  Instagram,
  Facebook,
  Globe,
} from 'lucide-react';

const PLATFORMS = [
  { id: 'INSTAGRAM', label: 'Instagram', cls: 'from-purple-600 to-pink-500' },
  { id: 'FACEBOOK', label: 'Facebook', cls: 'from-blue-600 to-blue-800' },
  { id: 'PINTEREST', label: 'Pinterest', cls: 'from-red-500 to-red-700' },
] as const;

const DESTINATIONS = [
  'Leh — Old Town & Shanti Stupa',
  'Nubra — Khardung La & Hunder Dunes',
  'Pangong Tso — Lakeside Camps',
  'Hanle — Dark Sky Reserve',
  'Ladakh — Leh & Pangong Tso',
  'Nubra Valley — Sand Dunes',
];

const SEASONS = ['Spring', 'Summer', 'Autumn', 'Winter', 'Peak Season (May–Jun)', 'Clear Skies (Sep–Oct)'];

export default function NewSocialPostPage() {
  const router = useRouter();

  const [destination, setDestination] = useState('Leh — Old Town & Shanti Stupa');
  const [season, setSeason] = useState('Autumn');
  const [customPrompt, setCustomPrompt] = useState('');
  const [generating, setGenerating] = useState(false);
  const [variants, setVariants] = useState<any[]>([]);
  const [generationMeta, setGenerationMeta] = useState<any>(null);

  const [selectedPlatform, setSelectedPlatform] = useState<string>('INSTAGRAM');
  const [caption, setCaption] = useState('');
  const [mediaUrl, setMediaUrl] = useState('');
  const [scheduledAt, setScheduledAt] = useState('');
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleGenerate = async () => {
    setGenerating(true);
    setVariants([]);
    try {
      const data = await api.post<any>('/social/generate', {
        destination: destination.split('—')[0].trim(),
        season,
        targetPlatform: selectedPlatform,
        customPrompt: customPrompt || undefined,
      });
      setVariants(data?.variants ?? []);
      setGenerationMeta(data);
    } catch (err: any) {
      alert(`Generation failed: ${err.message}`);
    } finally {
      setGenerating(false);
    }
  };

  const applyVariant = (v: any) => {
    const tags = (v.hashtags || []).join(' ');
    setCaption(v.caption + (tags ? '\n\n' + tags : ''));
  };

  const handleSaveDraft = async () => {
    if (!caption.trim()) { alert('Caption is required'); return; }
    setSaving(true);
    try {
      await api.post<any>('/social/posts', {
        platform: selectedPlatform,
        caption,
        mediaUrls: mediaUrl ? [mediaUrl] : [],
      });
      setSaved(true);
      setTimeout(() => router.push('/marketing/social'), 1200);
    } catch (e: any) {
      alert(`Save failed: ${e.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleSchedule = async () => {
    if (!caption.trim()) { alert('Caption is required'); return; }
    if (!scheduledAt) { alert('Pick a schedule date & time'); return; }
    setSaving(true);
    try {
      await api.post<any>('/social/posts', {
        platform: selectedPlatform,
        caption,
        mediaUrls: mediaUrl ? [mediaUrl] : [],
        scheduledAt,
      });
      router.push('/marketing/social');
    } catch (e: any) {
      alert(`Schedule failed: ${e.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handlePublishNow = async () => {
    if (!caption.trim()) { alert('Caption is required'); return; }
    if (!confirm(`Publish immediately to ${selectedPlatform}? This cannot be undone.`)) return;
    setPublishing(true);
    try {
      const created = await api.post<any>('/social/posts', {
        platform: selectedPlatform,
        caption,
        mediaUrls: mediaUrl ? [mediaUrl] : [],
      });
      const result = await api.post<any>(`/social/posts/${created.id}/publish`, {});
      if (result?.simulated) {
        alert('✅ Published (simulated) — connect a live account for real publishing.');
      } else if (result?.ok) {
        alert(`✅ Published! ID: ${result.externalPostId}`);
      } else {
        alert(`❌ Failed: ${result?.errorMessage}`);
      }
      router.push('/marketing/social');
    } catch (e: any) {
      alert(`Publish failed: ${e.message}`);
    } finally {
      setPublishing(false);
    }
  };

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => router.back()} className="text-ink-500 hover:text-ink-200 transition-colors">
          <ChevronLeft className="h-5 w-5" />
        </button>
        <div>
          <h1 className="text-xl font-semibold text-ink-100">AI Content Studio</h1>
          <p className="text-xs text-ink-500 mt-0.5">Generate captions, preview across platforms, and publish with one click</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* ── Left Column ─────────────────────────────── */}
        <div className="space-y-4">

          {/* Platform Selector */}
          <Panel>
            <PanelHeader><PanelTitle>Target Platform</PanelTitle></PanelHeader>
            <PanelBody className="flex gap-2 py-3">
              {PLATFORMS.map(p => (
                <button
                  key={p.id}
                  onClick={() => setSelectedPlatform(p.id)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-xs font-medium transition-all ${
                    selectedPlatform === p.id
                      ? `bg-gradient-to-r ${p.cls} text-white border-transparent shadow-lg`
                      : 'border-ink-700 text-ink-400 hover:border-ink-600 hover:text-ink-200'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </PanelBody>
          </Panel>

          {/* AI Generator */}
          <Panel>
            <PanelHeader>
              <PanelTitle className="flex items-center gap-2">
                <Sparkles className="h-3.5 w-3.5 text-purple-400" />
                AI Caption Generator
              </PanelTitle>
            </PanelHeader>
            <PanelBody className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] uppercase tracking-widest text-ink-500 mb-1 block">Destination</label>
                  <select
                    className="w-full border border-ink-700 rounded-md text-xs px-2 py-1.5 bg-ink-900 text-ink-200 focus:border-signal-500 focus:outline-none"
                    value={destination}
                    onChange={e => setDestination(e.target.value)}
                  >
                    {DESTINATIONS.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] uppercase tracking-widest text-ink-500 mb-1 block">Season</label>
                  <select
                    className="w-full border border-ink-700 rounded-md text-xs px-2 py-1.5 bg-ink-900 text-ink-200 focus:border-signal-500 focus:outline-none"
                    value={season}
                    onChange={e => setSeason(e.target.value)}
                  >
                    {SEASONS.map(s => <option key={s}>{s}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="text-[10px] uppercase tracking-widest text-ink-500 mb-1 block">Custom Prompt (optional)</label>
                <Input
                  placeholder="e.g. Focus on family-friendly first days in Leh…"
                  value={customPrompt}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCustomPrompt(e.target.value)}
                />
              </div>
              <Button
                className="w-full"
                variant="primary"
                onClick={handleGenerate}
                disabled={generating}
              >
                {generating
                  ? <><Loader2 className="h-4 w-4 animate-spin" />Generating variants…</>
                  : <><Sparkles className="h-4 w-4" />Generate 3 Caption Variants</>
                }
              </Button>

              {/* Variants */}
              {variants.length > 0 && (
                <div className="space-y-3 pt-2 border-t border-ink-800">
                  {variants.map((v: any, i: number) => (
                    <div key={i} className="border border-ink-800 rounded-lg p-3 hover:border-ink-600 transition-colors">
                      <div className="flex items-center justify-between mb-2">
                        <Chip>{v.title || v.tone}</Chip>
                        <Button size="sm" variant="secondary" onClick={() => applyVariant(v)}>
                          <Copy className="h-3 w-3" />Use
                        </Button>
                      </div>
                      {v.hook && (
                        <p className="text-[10px] text-signal-400 italic mb-1">"{v.hook}"</p>
                      )}
                      <p className="text-xs text-ink-400 leading-relaxed line-clamp-3">{v.caption}</p>
                      {v.hashtags?.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {v.hashtags.slice(0, 5).map((h: string, j: number) => (
                            <Chip key={j} className="text-[9px]">{h}</Chip>
                          ))}
                          {v.hashtags.length > 5 && <Chip className="text-[9px]">+{v.hashtags.length - 5}</Chip>}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </PanelBody>
          </Panel>

          {/* Composer */}
          <Panel>
            <PanelHeader><PanelTitle>Compose Post</PanelTitle></PanelHeader>
            <PanelBody className="space-y-3">
              <div>
                <label className="text-[10px] uppercase tracking-widest text-ink-500 mb-1 block">Caption</label>
                <textarea
                  className="w-full min-h-[130px] border border-ink-700 rounded-md text-sm px-3 py-2 bg-ink-900 text-ink-200 placeholder-ink-600 focus:border-signal-500 focus:outline-none resize-y"
                  placeholder="Write your caption or click 'Use' from a generated variant above…"
                  value={caption}
                  onChange={e => setCaption(e.target.value)}
                />
                <p className="text-[10px] text-ink-600 text-right mt-0.5">{caption.length} chars</p>
              </div>
              <div>
                <label className="text-[10px] uppercase tracking-widest text-ink-500 mb-1 block">Photo URL</label>
                <Input
                  placeholder="https://ladakhvacation.in/img/ladakh-hero.webp"
                  value={mediaUrl}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setMediaUrl(e.target.value)}
                />
              </div>
              <div>
                <label className="text-[10px] uppercase tracking-widest text-ink-500 mb-1 block">Schedule Date & Time</label>
                <Input
                  type="datetime-local"
                  value={scheduledAt}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setScheduledAt(e.target.value)}
                />
              </div>

              {/* Safety notice */}
              <div className="flex items-start gap-2 bg-amber-950/40 border border-amber-800/60 rounded-lg p-3">
                <AlertTriangle className="h-4 w-4 text-amber-500 flex-shrink-0 mt-0.5" />
                <p className="text-[11px] text-amber-400 leading-relaxed">
                  Always review AI-generated content before publishing. Confirm that captions represent your brand voice accurately.
                </p>
              </div>

              <div className="flex gap-2">
                <Button variant="secondary" className="flex-1" onClick={handleSaveDraft} disabled={saving || publishing}>
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save Draft'}
                </Button>
                <Button variant="secondary" className="flex-1" onClick={handleSchedule} disabled={saving || publishing}>
                  <Clock className="h-4 w-4" />Schedule
                </Button>
                <Button variant="primary" className="flex-1" onClick={handlePublishNow} disabled={saving || publishing}>
                  {publishing ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Send className="h-4 w-4" />Publish Now</>}
                </Button>
              </div>

              {saved && (
                <div className="flex items-center justify-center gap-2 text-sm text-green-400">
                  <CheckCircle className="h-4 w-4" />Saved! Redirecting…
                </div>
              )}
            </PanelBody>
          </Panel>
        </div>

        {/* ── Right Column: Live Previews ──────────────── */}
        <div className="space-y-4">
          <Panel>
            <PanelHeader>
              <PanelTitle>Live Preview — {selectedPlatform}</PanelTitle>
            </PanelHeader>
            <PanelBody className="flex justify-center py-6">
              {selectedPlatform === 'INSTAGRAM' && (
                <div className="w-full max-w-[280px] bg-white rounded-xl shadow-2xl overflow-hidden text-sm">
                  <div className="flex items-center gap-2 px-3 py-2 border-b">
                    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-purple-500 to-pink-500" />
                    <div>
                      <p className="font-semibold text-[11px] text-gray-900">ladakhvacation</p>
                      <p className="text-[9px] text-gray-400">Ladakh, India</p>
                    </div>
                  </div>
                  {mediaUrl
                    ? <img src={mediaUrl} alt="" className="w-full h-44 object-cover" />
                    : <div className="w-full h-44 bg-gradient-to-br from-purple-100 to-pink-100 flex items-center justify-center text-gray-400 text-xs">📸 Paste a photo URL</div>
                  }
                  <div className="px-3 py-2">
                    <p className="text-[11px] leading-relaxed text-gray-800 line-clamp-4 whitespace-pre-wrap">
                      {caption || 'Your caption will appear here…'}
                    </p>
                  </div>
                </div>
              )}
              {selectedPlatform === 'FACEBOOK' && (
                <div className="w-full max-w-[300px] bg-white rounded-xl shadow-2xl overflow-hidden text-sm">
                  <div className="flex items-center gap-2 px-3 py-2">
                    <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold">G</div>
                    <div>
                      <p className="font-semibold text-[11px] text-gray-900">Ladakh Vacation</p>
                      <p className="text-[9px] text-gray-400">Just now · 🌐</p>
                    </div>
                  </div>
                  <p className="px-3 pb-2 text-[11px] text-gray-800 line-clamp-3 whitespace-pre-wrap">
                    {caption || 'Your caption will appear here…'}
                  </p>
                  {mediaUrl && <img src={mediaUrl} alt="" className="w-full h-40 object-cover" />}
                  <div className="flex gap-4 px-3 py-2 border-t border-gray-100 text-[10px] text-gray-500">
                    <span>👍 Like</span><span>💬 Comment</span><span>↗️ Share</span>
                  </div>
                </div>
              )}
              {selectedPlatform === 'PINTEREST' && (
                <div className="w-full max-w-[220px] bg-white rounded-2xl shadow-2xl overflow-hidden">
                  {mediaUrl
                    ? <img src={mediaUrl} alt="" className="w-full h-64 object-cover" />
                    : <div className="w-full h-64 bg-gradient-to-br from-red-100 to-pink-100 flex items-center justify-center text-gray-400 text-xs">📌 Pin Image</div>
                  }
                  <div className="p-3">
                    <p className="font-semibold text-[11px] text-gray-900 mb-1 line-clamp-2">{caption?.slice(0, 80) || 'Pin title'}</p>
                    <p className="text-[10px] text-gray-500 line-clamp-2">{caption?.slice(80, 160) || 'Pin description…'}</p>
                  </div>
                </div>
              )}
            </PanelBody>
          </Panel>

          {/* Best posting times */}
          {generationMeta?.bestPostingTimes && (
            <Panel>
              <PanelHeader><PanelTitle>📈 Best Times to Post</PanelTitle></PanelHeader>
              <PanelBody className="space-y-2">
                {generationMeta.bestPostingTimes.map((t: any, i: number) => (
                  <div key={i} className="flex justify-between text-xs">
                    <span className="text-ink-500">{t.day}</span>
                    <span className="font-medium text-ink-200">{t.time}</span>
                  </div>
                ))}
              </PanelBody>
            </Panel>
          )}
        </div>
      </div>
    </div>
  );
}
