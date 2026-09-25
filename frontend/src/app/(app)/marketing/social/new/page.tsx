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
  Linkedin,
  Globe,
  Image as ImageIcon,
  RefreshCw,
  ExternalLink,
  ThumbsUp,
  MessageCircle,
  Repeat2,
  Bookmark,
  Heart,
  Share2,
  Wand2,
} from 'lucide-react';

const PLATFORMS = [
  { id: 'INSTAGRAM', label: 'Instagram', cls: 'from-pink-600 via-rose-500 to-amber-500', icon: Instagram },
  { id: 'LINKEDIN', label: 'LinkedIn', cls: 'from-sky-700 to-blue-600', icon: Linkedin },
  { id: 'FACEBOOK', label: 'Facebook', cls: 'from-blue-600 to-indigo-600', icon: Facebook },
  { id: 'PINTEREST', label: 'Pinterest', cls: 'from-red-600 to-rose-600', icon: Globe },
] as const;

const DESTINATIONS = [
  'Pangong Tso — Turquoise Waters & Camps',
  'Hanle — Dark Sky Reserve & Milky Way',
  'Nubra Valley — Hunder Dunes & Camels',
  'Khardung La — 17,582 ft High Pass',
  'Leh — Old Town, Palace & Shanti Stupa',
  'Thiksey & Hemis Monasteries',
  'Turtuk — Apricot Blossoms & Border Valley',
  'Manali-Leh Highway — Mountain Road Trip',
];

const SEASONS = [
  'Autumn (Sep–Oct — Golden Poplars & Milky Way)',
  'Summer (Jun–Aug — Clear Passes & Mild Days)',
  'Spring (Apr–May — Apricot Blossoms)',
  'Winter (Dec–Feb — Frozen Lakes & Snow Leopards)',
];

const IMAGE_STYLES = [
  { id: 'FLUX.1 Photorealistic 8K', label: '8K Photorealistic (FLUX.1)', desc: 'Ultra-crisp, realistic 35mm photography' },
  { id: 'Cinematic Drone Aerial', label: 'Cinematic Drone', desc: 'Sweeping high-altitude aerial perspectives' },
  { id: 'Golden Hour Himalayan Glow', label: 'Golden Hour Glow', desc: 'Warm amber sunlight & mountain shadows' },
  { id: 'Hanle Night Sky Astrophotography', label: 'Hanle Dark Sky Astro', desc: 'Milky Way galaxy & starry night skies' },
  { id: 'Monastery & Ladakhi Heritage', label: 'Monastery & Heritage', desc: 'Tibetan architecture & prayer flags' },
];

export default function NewSocialPostPage() {
  const router = useRouter();

  const [destination, setDestination] = useState(DESTINATIONS[0]);
  const [season, setSeason] = useState(SEASONS[0]);
  const [imageStyle, setImageStyle] = useState(IMAGE_STYLES[0].id);
  const [customPrompt, setCustomPrompt] = useState('');

  // AI Generation States
  const [generatingCopy, setGeneratingCopy] = useState(false);
  const [generatingImage, setGeneratingImage] = useState(false);
  const [generatingAll, setGeneratingAll] = useState(false);
  const [generatedImage, setGeneratedImage] = useState<{
    url: string;
    prompt: string;
    model: string;
    provider: string;
    base64?: string;
  } | null>(null);

  const [variants, setVariants] = useState<any[]>([]);
  const [generationMeta, setGenerationMeta] = useState<any>(null);

  // Composer States
  const [selectedPlatform, setSelectedPlatform] = useState<string>('INSTAGRAM');
  const [previewPlatform, setPreviewPlatform] = useState<string>('INSTAGRAM');
  const [caption, setCaption] = useState('');
  const [mediaUrl, setMediaUrl] = useState('');
  const [scheduledAt, setScheduledAt] = useState('');
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [saved, setSaved] = useState(false);

  // Sync preview platform with selected platform when changed
  const handleSelectPlatform = (platformId: string) => {
    setSelectedPlatform(platformId);
    setPreviewPlatform(platformId);
  };

  // Generate Image Only
  const handleGenerateImage = async () => {
    setGeneratingImage(true);
    try {
      const data = await api.post<any>('/social/generate-image', {
        destination: destination.split('—')[0].trim(),
        style: imageStyle,
        customPrompt: customPrompt || undefined,
      });

      if (data?.url) {
        setGeneratedImage(data);
        setMediaUrl(data.url);
      }
    } catch (err: any) {
      alert(`Image generation failed: ${err.message}`);
    } finally {
      setGeneratingImage(false);
    }
  };

  // Generate Copy Only
  const handleGenerateCopy = async () => {
    setGeneratingCopy(true);
    setVariants([]);
    try {
      const data = await api.post<any>('/social/generate', {
        destination: destination.split('—')[0].trim(),
        season: season.split('(')[0].trim(),
        targetPlatform: selectedPlatform,
        customPrompt: customPrompt || undefined,
      });
      setVariants(data?.variants ?? []);
      setGenerationMeta(data);
    } catch (err: any) {
      alert(`Caption generation failed: ${err.message}`);
    } finally {
      setGeneratingCopy(false);
    }
  };

  // 1-Click Generate Full Post (Image + Captions)
  const handleGenerateFullPost = async () => {
    setGeneratingAll(true);
    try {
      await Promise.all([handleGenerateImage(), handleGenerateCopy()]);
    } finally {
      setGeneratingAll(false);
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
        alert(`✅ Published! Post ID: ${result.externalPostId}`);
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
          <h1 className="text-xl font-semibold text-ink-100 flex items-center gap-2">
            <span>Social Studio & AI Creator</span>
            <Chip className="bg-signal-500/10 text-signal-400 border-signal-500/30 text-[10px]">
              FLUX.1 + Multi-LLM
            </Chip>
          </h1>
          <p className="text-xs text-ink-500 mt-0.5">
            Generate photorealistic travel imagery, platform-tuned captions, and publish directly to LinkedIn, Instagram & Facebook.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* ── Left Column: Controls & Composer (7 cols) ── */}
        <div className="lg:col-span-7 space-y-5">

          {/* Platform Selector */}
          <Panel>
            <PanelHeader>
              <PanelTitle>Target Social Network</PanelTitle>
            </PanelHeader>
            <PanelBody className="flex flex-wrap gap-2 py-3">
              {PLATFORMS.map((p) => {
                const Icon = p.icon;
                const isSelected = selectedPlatform === p.id;
                return (
                  <button
                    key={p.id}
                    onClick={() => handleSelectPlatform(p.id)}
                    className={`flex items-center gap-2 px-3.5 py-2 rounded-lg border text-xs font-medium transition-all ${
                      isSelected
                        ? `bg-gradient-to-r ${p.cls} text-white border-transparent shadow-lg scale-[1.02]`
                        : 'border-ink-800 bg-ink-900/60 text-ink-400 hover:border-ink-700 hover:text-ink-200'
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {p.label}
                  </button>
                );
              })}
            </PanelBody>
          </Panel>

          {/* AI Generator Suite */}
          <Panel className="border-signal-500/30 shadow-sm">
            <PanelHeader className="bg-signal-500/5">
              <div className="flex items-center justify-between w-full">
                <PanelTitle className="flex items-center gap-2 text-signal-400">
                  <Sparkles className="h-4 w-4" />
                  AI Creative Studio (Images, Captions & Hashtags)
                </PanelTitle>
                <button
                  onClick={handleGenerateFullPost}
                  disabled={generatingAll || generatingImage || generatingCopy}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-medium rounded-md bg-signal-500 text-white hover:bg-signal-600 transition-colors disabled:opacity-50"
                  title="Generate image, captions and hashtags simultaneously"
                >
                  {generatingAll ? <Loader2 className="h-3 w-3 animate-spin" /> : <Wand2 className="h-3 w-3" />}
                  1-Click Full Post
                </button>
              </div>
            </PanelHeader>
            <PanelBody className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] uppercase tracking-widest text-ink-400 font-semibold mb-1 block">
                    Destination / Scene
                  </label>
                  <select
                    className="w-full border border-ink-700 rounded-md text-xs px-2.5 py-2 bg-ink-900 text-ink-200 focus:border-signal-500 focus:outline-none"
                    value={destination}
                    onChange={(e) => setDestination(e.target.value)}
                  >
                    {DESTINATIONS.map((d) => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[10px] uppercase tracking-widest text-ink-400 font-semibold mb-1 block">
                    Season / Mood
                  </label>
                  <select
                    className="w-full border border-ink-700 rounded-md text-xs px-2.5 py-2 bg-ink-900 text-ink-200 focus:border-signal-500 focus:outline-none"
                    value={season}
                    onChange={(e) => setSeason(e.target.value)}
                  >
                    {SEASONS.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-[10px] uppercase tracking-widest text-ink-400 font-semibold mb-1 block">
                  Image Photography Style (FLUX.1 Schnell)
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {IMAGE_STYLES.map((st) => {
                    const isStyleSelected = imageStyle === st.id;
                    return (
                      <button
                        key={st.id}
                        type="button"
                        onClick={() => setImageStyle(st.id)}
                        className={`text-left p-2 rounded-md border text-xs transition-all ${
                          isStyleSelected
                            ? 'border-signal-500 bg-signal-500/10 text-signal-300 font-medium'
                            : 'border-ink-800 bg-ink-900/40 text-ink-400 hover:border-ink-700 hover:text-ink-200'
                        }`}
                      >
                        <p className="font-medium truncate">{st.label}</p>
                        <p className="text-[10px] text-ink-500 truncate mt-0.5">{st.desc}</p>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="text-[10px] uppercase tracking-widest text-ink-400 font-semibold mb-1 block">
                  Custom Prompt or Details (Optional)
                </label>
                <Input
                  placeholder="e.g. Include 4x4 Innova Crysta, dramatic clouds, Hanle telescope observatory..."
                  value={customPrompt}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCustomPrompt(e.target.value)}
                />
              </div>

              {/* Generation Actions Row */}
              <div className="flex flex-col sm:flex-row gap-2 pt-1">
                <Button
                  className="flex-1"
                  variant="secondary"
                  onClick={handleGenerateImage}
                  disabled={generatingImage || generatingAll}
                >
                  {generatingImage ? (
                    <><Loader2 className="h-4 w-4 animate-spin text-signal-400" />Generating Photo (FLUX.1)…</>
                  ) : (
                    <><ImageIcon className="h-4 w-4 text-signal-400" />Generate Travel Image</>
                  )}
                </Button>

                <Button
                  className="flex-1"
                  variant="primary"
                  onClick={handleGenerateCopy}
                  disabled={generatingCopy || generatingAll}
                >
                  {generatingCopy ? (
                    <><Loader2 className="h-4 w-4 animate-spin" />Generating 3 Captions…</>
                  ) : (
                    <><Sparkles className="h-4 w-4" />Generate 3 Captions</>
                  )}
                </Button>
              </div>

              {/* Generated Image Result Card */}
              {generatedImage && (
                <div className="rounded-lg border border-signal-500/30 bg-ink-900/80 p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-signal-400 flex items-center gap-1.5">
                      <ImageIcon className="h-3.5 w-3.5" />
                      Generated Travel Photography
                    </span>
                    <div className="flex items-center gap-1.5">
                      <Chip className="text-[10px] bg-ink-800 text-ink-300">
                        {generatedImage.model || 'FLUX.1 Schnell'}
                      </Chip>
                      <a
                        href={generatedImage.url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-ink-400 hover:text-ink-100 p-1"
                        title="View Full Resolution"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                    </div>
                  </div>

                  <div className="relative aspect-video w-full rounded-md overflow-hidden bg-ink-950 border border-ink-800">
                    <img
                      src={generatedImage.url}
                      alt={generatedImage.prompt}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute bottom-2 left-2 right-2 px-2 py-1 rounded bg-ink-950/80 backdrop-blur-sm text-[10px] text-ink-300 truncate">
                      {generatedImage.prompt}
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs pt-1">
                    <span className="text-[11px] text-healthy-400 flex items-center gap-1">
                      <CheckCircle className="h-3.5 w-3.5" />
                      Photo attached to post composer
                    </span>
                    <button
                      type="button"
                      onClick={handleGenerateImage}
                      disabled={generatingImage}
                      className="text-signal-400 hover:text-signal-300 flex items-center gap-1 text-[11px]"
                    >
                      <RefreshCw className={`h-3 w-3 ${generatingImage ? 'animate-spin' : ''}`} />
                      Regenerate Image
                    </button>
                  </div>
                </div>
              )}

              {/* Caption Variants */}
              {variants.length > 0 && (
                <div className="space-y-3 pt-2 border-t border-ink-800">
                  <p className="text-xs font-semibold text-ink-300">Choose a platform caption variant:</p>
                  {variants.map((v: any, i: number) => (
                    <div
                      key={i}
                      className="border border-ink-800 rounded-lg p-3 hover:border-signal-500/50 bg-ink-900/40 transition-all"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <Chip className="bg-signal-500/10 text-signal-400 border-signal-500/20 text-[10px]">
                          {v.title || v.tone}
                        </Chip>
                        <Button size="sm" variant="secondary" onClick={() => applyVariant(v)}>
                          <Copy className="h-3 w-3" />
                          Apply to Post
                        </Button>
                      </div>
                      {v.hook && (
                        <p className="text-xs text-signal-300 font-medium italic mb-1.5">
                          "{v.hook}"
                        </p>
                      )}
                      <p className="text-xs text-ink-300 leading-relaxed line-clamp-3 whitespace-pre-wrap">
                        {v.caption}
                      </p>
                      {v.hashtags?.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2.5">
                          {v.hashtags.slice(0, 6).map((h: string, j: number) => (
                            <Chip key={j} className="text-[9px] bg-ink-800 text-ink-400">
                              {h}
                            </Chip>
                          ))}
                          {v.hashtags.length > 6 && (
                            <Chip className="text-[9px] bg-ink-800 text-ink-500">
                              +{v.hashtags.length - 6} more
                            </Chip>
                          )}
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
            <PanelHeader>
              <PanelTitle>Compose & Dispatch Post</PanelTitle>
            </PanelHeader>
            <PanelBody className="space-y-3.5">
              <div>
                <label className="text-[10px] uppercase tracking-widest text-ink-400 font-semibold mb-1 block">
                  Post Caption & Hashtags
                </label>
                <textarea
                  className="w-full min-h-[140px] border border-ink-700 rounded-md text-xs sm:text-sm p-3 bg-ink-900 text-ink-200 placeholder-ink-600 focus:border-signal-500 focus:outline-none resize-y leading-relaxed"
                  placeholder="Write your post caption or click 'Apply to Post' from the AI generated variants above…"
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                />
                <div className="flex justify-between items-center text-[10px] text-ink-500 mt-1">
                  <span>Formatting: Paragraphs, emojis & hashtags supported</span>
                  <span>{caption.length} characters</span>
                </div>
              </div>

              <div>
                <label className="text-[10px] uppercase tracking-widest text-ink-400 font-semibold mb-1 block">
                  Media / Photo URL
                </label>
                <div className="flex gap-2">
                  <Input
                    placeholder="https://images.unsplash.com/... or click 'Generate Travel Image'"
                    value={mediaUrl}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setMediaUrl(e.target.value)}
                  />
                  {mediaUrl && (
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => setMediaUrl('')}
                      title="Clear photo"
                    >
                      Clear
                    </Button>
                  )}
                </div>
              </div>

              <div>
                <label className="text-[10px] uppercase tracking-widest text-ink-400 font-semibold mb-1 block">
                  Schedule Date & Time (Optional)
                </label>
                <Input
                  type="datetime-local"
                  value={scheduledAt}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setScheduledAt(e.target.value)}
                />
              </div>

              {/* Safety notice */}
              <div className="flex items-start gap-2 bg-warn-500/10 border border-warn-500/25 rounded-lg p-3">
                <AlertTriangle className="h-4 w-4 text-warn-500 flex-shrink-0 mt-0.5" />
                <p className="text-[11px] text-warn-400 leading-relaxed">
                  Review claims before publishing. Ensure itineraries match Ladakh Vacation’s core altitude-first, private 4×4 and oxygen-supported offerings.
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap sm:flex-nowrap gap-2 pt-1">
                <Button
                  variant="secondary"
                  className="flex-1"
                  onClick={handleSaveDraft}
                  disabled={saving || publishing}
                >
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save Draft'}
                </Button>
                <Button
                  variant="secondary"
                  className="flex-1"
                  onClick={handleSchedule}
                  disabled={saving || publishing}
                >
                  <Clock className="h-4 w-4" />
                  Schedule
                </Button>
                <Button
                  variant="primary"
                  className="flex-1"
                  onClick={handlePublishNow}
                  disabled={saving || publishing}
                >
                  {publishing ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <><Send className="h-4 w-4" />Publish to {selectedPlatform}</>
                  )}
                </Button>
              </div>

              {saved && (
                <div className="flex items-center justify-center gap-2 text-sm text-healthy-500 py-1 font-medium">
                  <CheckCircle className="h-4 w-4" />
                  Post saved! Redirecting to Social Studio…
                </div>
              )}
            </PanelBody>
          </Panel>
        </div>

        {/* ── Right Column: Rich Live Previews (5 cols) ── */}
        <div className="lg:col-span-5 space-y-4">
          <Panel>
            <PanelHeader>
              <div className="flex items-center justify-between w-full">
                <PanelTitle className="flex items-center gap-1.5">
                  <Share2 className="h-4 w-4 text-signal-400" />
                  Live Social Preview
                </PanelTitle>
                {/* Platform tabs for preview */}
                <div className="flex gap-1 bg-ink-950 p-1 rounded-md border border-ink-800">
                  {PLATFORMS.map((p) => {
                    const isPActive = previewPlatform === p.id;
                    const Icon = p.icon;
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => setPreviewPlatform(p.id)}
                        className={`p-1.5 rounded transition-all ${
                          isPActive ? 'bg-ink-800 text-ink-100 shadow' : 'text-ink-500 hover:text-ink-300'
                        }`}
                        title={`Preview ${p.label}`}
                      >
                        <Icon className="h-3.5 w-3.5" />
                      </button>
                    );
                  })}
                </div>
              </div>
            </PanelHeader>

            <PanelBody className="flex justify-center p-3 sm:p-5 bg-ink-950/60 rounded-b-lg">

              {/* ── LINKEDIN PREVIEW ── */}
              {previewPlatform === 'LINKEDIN' && (
                <div className="w-full max-w-[340px] bg-white text-gray-900 rounded-lg shadow-xl overflow-hidden border border-gray-200 text-xs">
                  {/* LinkedIn Header */}
                  <div className="flex items-center justify-between p-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded bg-[#0077b5] flex items-center justify-center text-white font-bold text-sm shadow-sm">
                        LV
                      </div>
                      <div>
                        <div className="flex items-center gap-1">
                          <span className="font-semibold text-gray-900 text-xs">Ladakh Vacation</span>
                          <span className="text-[10px] text-gray-400">• 1st</span>
                        </div>
                        <p className="text-[10px] text-gray-500 leading-tight">
                          Curated Ladakh Journeys · Leh, Ladakh
                        </p>
                        <p className="text-[9px] text-gray-400 flex items-center gap-1 mt-0.5">
                          Just now • 🌐
                        </p>
                      </div>
                    </div>
                    <button className="text-gray-400 hover:text-gray-600 font-bold px-1 text-sm">···</button>
                  </div>

                  {/* Caption */}
                  <div className="px-3 pb-2 text-[11px] text-gray-800 leading-relaxed whitespace-pre-wrap max-h-48 overflow-y-auto">
                    {caption || (
                      <span className="text-gray-400 italic">
                        Generate captions or write your post to see how it appears on LinkedIn feed…
                      </span>
                    )}
                  </div>

                  {/* Media */}
                  {mediaUrl ? (
                    <div className="w-full bg-black/5 border-y border-gray-200 overflow-hidden">
                      <img
                        src={mediaUrl}
                        alt="LinkedIn Post"
                        className="w-full max-h-60 object-cover"
                      />
                    </div>
                  ) : (
                    <div className="w-full h-36 bg-gray-100 border-y border-gray-200 flex flex-col items-center justify-center text-gray-400 text-xs gap-1.5 p-3 text-center">
                      <ImageIcon className="h-6 w-6 text-gray-300" />
                      <span>Click 'Generate Travel Image' to attach photorealistic FLUX.1 visual</span>
                    </div>
                  )}

                  {/* LinkedIn Reactions bar */}
                  <div className="px-3 py-1.5 flex items-center justify-between text-[10px] text-gray-500 border-b border-gray-100">
                    <div className="flex items-center gap-1">
                      <span className="flex -space-x-1">
                        <span className="inline-block w-3.5 h-3.5 rounded-full bg-[#0077b5] text-white text-[8px] text-center leading-3.5">👍</span>
                        <span className="inline-block w-3.5 h-3.5 rounded-full bg-red-500 text-white text-[8px] text-center leading-3.5">❤️</span>
                        <span className="inline-block w-3.5 h-3.5 rounded-full bg-emerald-500 text-white text-[8px] text-center leading-3.5">👏</span>
                      </span>
                      <span className="ml-1 text-[10px]">48</span>
                    </div>
                    <span>14 comments • 3 reposts</span>
                  </div>

                  {/* LinkedIn Action Buttons */}
                  <div className="grid grid-cols-4 py-1 text-gray-600 font-medium text-[10px] text-center">
                    <button className="flex items-center justify-center gap-1 py-1 hover:bg-gray-100 rounded">
                      <ThumbsUp className="h-3 w-3" />
                      <span>Like</span>
                    </button>
                    <button className="flex items-center justify-center gap-1 py-1 hover:bg-gray-100 rounded">
                      <MessageCircle className="h-3 w-3" />
                      <span>Comment</span>
                    </button>
                    <button className="flex items-center justify-center gap-1 py-1 hover:bg-gray-100 rounded">
                      <Repeat2 className="h-3 w-3" />
                      <span>Repost</span>
                    </button>
                    <button className="flex items-center justify-center gap-1 py-1 hover:bg-gray-100 rounded">
                      <Send className="h-3 w-3" />
                      <span>Send</span>
                    </button>
                  </div>
                </div>
              )}

              {/* ── INSTAGRAM PREVIEW ── */}
              {previewPlatform === 'INSTAGRAM' && (
                <div className="w-full max-w-[300px] bg-white text-gray-900 rounded-xl shadow-xl overflow-hidden border border-gray-200 text-xs">
                  {/* Header */}
                  <div className="flex items-center justify-between px-3 py-2.5 border-b border-gray-100">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-yellow-400 via-rose-500 to-purple-600 p-[1.5px]">
                        <div className="w-full h-full bg-white rounded-full flex items-center justify-center font-bold text-[9px] text-gray-800">
                          LV
                        </div>
                      </div>
                      <div>
                        <p className="font-semibold text-[11px] text-gray-900 leading-tight">ladakhvacation</p>
                        <p className="text-[9px] text-gray-500">Ladakh, India</p>
                      </div>
                    </div>
                    <span className="text-gray-400 font-bold">···</span>
                  </div>

                  {/* Image */}
                  {mediaUrl ? (
                    <img src={mediaUrl} alt="" className="w-full aspect-square object-cover" />
                  ) : (
                    <div className="w-full aspect-square bg-gradient-to-br from-purple-50 to-pink-50 flex flex-col items-center justify-center text-gray-400 text-xs gap-2 p-4 text-center">
                      <ImageIcon className="h-8 w-8 text-pink-300" />
                      <span className="text-[11px]">Generate a photo to preview Instagram layout</span>
                    </div>
                  )}

                  {/* Action Icons */}
                  <div className="px-3 pt-2 pb-1 flex items-center justify-between text-gray-800">
                    <div className="flex items-center gap-3">
                      <Heart className="h-4 w-4 hover:text-red-500 cursor-pointer" />
                      <MessageCircle className="h-4 w-4 cursor-pointer" />
                      <Send className="h-4 w-4 cursor-pointer" />
                    </div>
                    <Bookmark className="h-4 w-4 cursor-pointer" />
                  </div>

                  {/* Likes & Caption */}
                  <div className="px-3 pb-3 space-y-1">
                    <p className="font-semibold text-[10px] text-gray-900">842 likes</p>
                    <div className="text-[11px] text-gray-800 leading-snug line-clamp-3 whitespace-pre-wrap">
                      <span className="font-semibold mr-1.5">ladakhvacation</span>
                      {caption || 'Your caption will appear here…'}
                    </div>
                    <p className="text-[9px] text-gray-400 uppercase pt-0.5">2 hours ago</p>
                  </div>
                </div>
              )}

              {/* ── FACEBOOK PREVIEW ── */}
              {previewPlatform === 'FACEBOOK' && (
                <div className="w-full max-w-[320px] bg-white text-gray-900 rounded-lg shadow-xl overflow-hidden border border-gray-200 text-xs">
                  <div className="flex items-center gap-2 p-3">
                    <div className="w-8 h-8 rounded-full bg-[#1877f2] flex items-center justify-center text-white text-xs font-bold">
                      LV
                    </div>
                    <div>
                      <div className="flex items-center gap-1">
                        <span className="font-semibold text-[11px] text-gray-900">Ladakh Vacation</span>
                        <span className="text-blue-500 text-[10px]">✓</span>
                      </div>
                      <p className="text-[9px] text-gray-400">Just now · 🌐</p>
                    </div>
                  </div>
                  <p className="px-3 pb-2 text-[11px] text-gray-800 leading-relaxed line-clamp-3 whitespace-pre-wrap">
                    {caption || 'Your post text will appear here…'}
                  </p>
                  {mediaUrl && <img src={mediaUrl} alt="" className="w-full h-48 object-cover" />}
                  <div className="flex justify-between px-6 py-2 border-t border-gray-100 text-[10px] text-gray-600 font-medium">
                    <span>👍 Like</span>
                    <span>💬 Comment</span>
                    <span>↗️ Share</span>
                  </div>
                </div>
              )}

              {/* ── PINTEREST PREVIEW ── */}
              {previewPlatform === 'PINTEREST' && (
                <div className="w-full max-w-[220px] bg-white text-gray-900 rounded-2xl shadow-xl overflow-hidden border border-gray-200">
                  <div className="relative">
                    {mediaUrl ? (
                      <img src={mediaUrl} alt="" className="w-full aspect-[2/3] object-cover" />
                    ) : (
                      <div className="w-full aspect-[2/3] bg-gradient-to-br from-red-50 to-rose-100 flex flex-col items-center justify-center text-gray-400 text-xs gap-2 p-3 text-center">
                        <Globe className="h-6 w-6 text-red-400" />
                        <span>Pinterest Pin</span>
                      </div>
                    )}
                    <span className="absolute top-2 right-2 bg-red-600 text-white font-semibold text-[10px] px-2.5 py-1 rounded-full shadow">
                      Save
                    </span>
                  </div>
                  <div className="p-3">
                    <p className="font-semibold text-xs text-gray-900 mb-1 line-clamp-2">
                      {caption ? caption.slice(0, 60) : 'Ladakh Travel Guide & Itinerary'}
                    </p>
                    <p className="text-[10px] text-gray-500 line-clamp-2">
                      {caption ? caption.slice(60, 150) : 'Handcrafted journeys across Ladakh high passes…'}
                    </p>
                  </div>
                </div>
              )}

            </PanelBody>
          </Panel>

          {/* Posting Recommendations */}
          <Panel>
            <PanelHeader>
              <PanelTitle className="text-xs">⚡ Publishing Recommendations</PanelTitle>
            </PanelHeader>
            <PanelBody className="space-y-2 text-xs">
              <div className="flex justify-between items-center py-1 border-b border-ink-800">
                <span className="text-ink-400">Peak B2B (LinkedIn)</span>
                <span className="font-medium text-ink-200">Tue & Thu, 9:00 AM IST</span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-ink-800">
                <span className="text-ink-400">Peak Leisure (Instagram)</span>
                <span className="font-medium text-ink-200">Wed & Fri, 7:30 PM IST</span>
              </div>
              <div className="flex justify-between items-center py-1">
                <span className="text-ink-400">Rate Limits</span>
                <span className="font-medium text-healthy-400">Protected (25/day max)</span>
              </div>
            </PanelBody>
          </Panel>
        </div>
      </div>
    </div>
  );
}
