'use client';

import { useState } from 'react';
import { Sparkles, Loader2, Globe, Layers, Search, AlertCircle, CheckCircle2, ShieldCheck, Zap } from 'lucide-react';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { api, ApiError, type VendorDraftRow } from '@/lib/api';

interface ExtractVendorDialogProps {
  onExtracted?: (draft: VendorDraftRow) => void;
  trigger?: React.ReactNode;
}

export function ExtractVendorDialog({ onExtracted, trigger }: ExtractVendorDialogProps) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<'seed' | 'keyword' | 'single' | 'batch'>('seed');
  const [seedDestination, setSeedDestination] = useState('all');
  const [keywordQuery, setKeywordQuery] = useState('');
  const [url, setUrl] = useState('');
  const [batchUrls, setBatchUrls] = useState('');
  const [city, setCity] = useState('');
  const [propertyType, setPropertyType] = useState('HOTEL');
  const [provider, setProvider] = useState('');
  const [limit, setLimit] = useState(20);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);

  const isLadakhCity = ['Leh', 'Nubra', 'Pangong', 'Kargil', 'Zanskar'].includes(city);

  const inferFromQuery = (q: string) => {
    const val = q.toLowerCase();
    let detectedCity = city;
    let detectedType = propertyType;

    if (/nubra|hunder|hundar|diskit|deskit|turtuk|sumur|panamik|kyagar|tegar/i.test(val)) {
      detectedCity = 'Nubra';
    } else if (/pangong|spangmik|lukung|tangtse|merak|man village/i.test(val)) {
      detectedCity = 'Pangong';
    } else if (/leh|sheynam|choglamsar|stok|thiksey|saboo|changspa/i.test(val)) {
      detectedCity = 'Leh';
    } else if (/srinagar|dal lake|nigeen/i.test(val)) {
      detectedCity = 'Srinagar';
    } else if (/zanskar|padum|rangdum/i.test(val)) {
      detectedCity = 'Zanskar';
    } else if (/kargil|drass/i.test(val)) {
      detectedCity = 'Kargil';
    }

    if (/camp|tent|glamping|resort & camp/i.test(val)) {
      detectedType = 'CAMP';
    } else if (/houseboat|shikara/i.test(val)) {
      detectedType = 'HOUSEBOAT';
      detectedCity = 'Srinagar';
    } else if (/hotel|resort|heritage/i.test(val)) {
      detectedType = 'HOTEL';
    }

    if (['Leh', 'Nubra', 'Pangong', 'Kargil', 'Zanskar'].includes(detectedCity) && detectedType === 'HOUSEBOAT') {
      detectedType = 'CAMP';
    }

    setCity(detectedCity);
    setPropertyType(detectedType);
  };

  const applyPreset = (presetQuery: string, presetCity: string, presetType: string) => {
    setKeywordQuery(presetQuery);
    setCity(presetCity);
    setPropertyType(presetType);
  };

  const handleSeedDestination = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccessMsg(null);
    setWarnings([]);

    try {
      const res = await api.post<{
        destination: string;
        totalAvailable: number;
        seeded: number;
        drafts: VendorDraftRow[];
      }>('/vendor-drafts/seed-destination', {
        destination: seedDestination,
      });

      const destLabel =
        seedDestination === 'all'
          ? 'All Destinations (Ladakh & Kashmir)'
          : seedDestination.toUpperCase();

      setSuccessMsg(
        `⚡ Successfully staged all ${res.seeded} verified operational properties for ${destLabel} into review drafts!`,
      );
      if (onExtracted && res.drafts[0]) {
        onExtracted(res.drafts[0]);
      }
      setTimeout(() => {
        setOpen(false);
        setSuccessMsg(null);
      }, 2000);
    } catch (err: any) {
      setError(err instanceof ApiError ? err.message : (err?.message || 'Failed to seed destination.'));
    } finally {
      setLoading(false);
    }
  };

  const handleKeywordDiscovery = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!keywordQuery.trim()) return;

    setLoading(true);
    setError(null);
    setSuccessMsg(null);
    setWarnings([]);

    try {
      const res = await api.post<{
        query: string;
        totalDiscovered: number;
        succeeded: number;
        failed: number;
        drafts: VendorDraftRow[];
        errors: Array<{ url: string; error: string }>;
      }>('/vendor-drafts/discover', {
        query: keywordQuery.trim(),
        city: city || undefined,
        propertyType: propertyType || undefined,
        limit,
      });

      setSuccessMsg(
        `Discovered & extracted ${res.succeeded} of ${res.totalDiscovered} properties matching "${res.query}" into staging drafts.`,
      );
      if (res.errors && res.errors.length > 0) {
        setWarnings(res.errors.map((e) => `${e.url}: ${e.error}`));
      }
      if (onExtracted && res.drafts[0]) {
        onExtracted(res.drafts[0]);
      }
      setTimeout(() => {
        setOpen(false);
        setKeywordQuery('');
        setSuccessMsg(null);
      }, 2000);
    } catch (err: any) {
      setError(err instanceof ApiError ? err.message : (err?.message || 'Keyword discovery failed.'));
    } finally {
      setLoading(false);
    }
  };

  const handleExtractSingle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) return;

    setLoading(true);
    setError(null);
    setSuccessMsg(null);
    setWarnings([]);

    try {
      const res = await api.post<{ draft: VendorDraftRow; warnings?: string[] }>(
        '/vendor-drafts/extract',
        {
          url: url.trim(),
          preferredProvider: provider || undefined,
          city: city || undefined,
          propertyType: propertyType || undefined,
        },
      );

      setSuccessMsg(`Extracted "${res.draft.name}" successfully into drafts.`);
      if (res.warnings && res.warnings.length > 0) {
        setWarnings(res.warnings);
      }
      if (onExtracted) onExtracted(res.draft);
      setTimeout(() => {
        setOpen(false);
        setUrl('');
        setSuccessMsg(null);
      }, 1500);
    } catch (err: any) {
      setError(err instanceof ApiError ? err.message : (err?.message || 'Extraction failed.'));
    } finally {
      setLoading(false);
    }
  };

  const handleExtractBatch = async (e: React.FormEvent) => {
    e.preventDefault();
    const urls = batchUrls
      .split('\n')
      .map((u) => u.trim())
      .filter((u) => u.length > 0);

    if (urls.length === 0) return;

    setLoading(true);
    setError(null);
    setSuccessMsg(null);
    setWarnings([]);

    try {
      const res = await api.post<{
        total: number;
        succeeded: number;
        failed: number;
        drafts: VendorDraftRow[];
        errors: Array<{ url: string; error: string }>;
      }>('/vendor-drafts/batch-extract', {
        urls,
        city: city || undefined,
        propertyType: propertyType || undefined,
      });

      setSuccessMsg(
        `Batch swarm finished: ${res.succeeded} of ${res.total} properties extracted successfully.`,
      );
      if (res.errors.length > 0) {
        setWarnings(res.errors.map((e) => `${e.url}: ${e.error}`));
      }
      if (onExtracted && res.drafts[0]) {
        onExtracted(res.drafts[0]);
      }
      setTimeout(() => {
        setOpen(false);
        setBatchUrls('');
        setSuccessMsg(null);
      }, 2000);
    } catch (err: any) {
      setError(err instanceof ApiError ? err.message : (err?.message || 'Batch extraction failed.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button variant="primary" size="sm">
            <Sparkles className="size-3.5" strokeWidth={1.75} />
            Scrape Property Intelligence
          </Button>
        )}
      </DialogTrigger>
      <DialogContent
        title="Web Scraping & Property Intelligence Swarm"
        description="Discover and extract room categories, bed-wise specs, seasonal dates and amenities into staging review."
      >
        <div className="min-h-0 flex-1 overflow-y-auto p-5 space-y-4">
          {/* Mode Switcher */}
          <div className="flex flex-wrap items-center gap-2 border-b border-ink-800 pb-3">
            <button
              type="button"
              onClick={() => setMode('seed')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-medium transition-colors ${
                mode === 'seed'
                  ? 'bg-amber-50 border border-amber-300 text-amber-900 font-bold shadow-xs'
                  : 'text-ink-400 hover:text-ink-100'
              }`}
            >
              <Zap className="size-3.5 text-amber-600 fill-amber-500" strokeWidth={1.75} />
              ⚡ Seed Destination Directory (All Hotels)
            </button>
            <button
              type="button"
              onClick={() => setMode('keyword')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-medium transition-colors ${
                mode === 'keyword'
                  ? 'bg-signal-50 border border-signal-300 text-signal-700 font-semibold shadow-xs'
                  : 'text-ink-400 hover:text-ink-100'
              }`}
            >
              <Search className="size-3.5" strokeWidth={1.75} />
              Destination Keyword Discovery
            </button>
            <button
              type="button"
              onClick={() => setMode('single')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-medium transition-colors ${
                mode === 'single'
                  ? 'bg-signal-50 border border-signal-300 text-signal-700 font-semibold shadow-xs'
                  : 'text-ink-400 hover:text-ink-100'
              }`}
            >
              <Globe className="size-3.5" strokeWidth={1.75} />
              Single Property URL
            </button>
            <button
              type="button"
              onClick={() => setMode('batch')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-medium transition-colors ${
                mode === 'batch'
                  ? 'bg-signal-50 border border-signal-300 text-signal-700 font-semibold shadow-xs'
                  : 'text-ink-400 hover:text-ink-100'
              }`}
            >
              <Layers className="size-3.5" strokeWidth={1.75} />
              Batch URL Swarm
            </button>
          </div>

          <div className="rounded-md border border-ink-800 bg-white p-2.5 text-[11.5px] text-ink-300 flex items-start gap-2 shadow-xs">
            <ShieldCheck className="size-4 shrink-0 text-signal-600 mt-0.5" strokeWidth={1.75} />
            <span>
              <strong className="text-ink-100">Quality Filter Active:</strong> Targets direct hotel websites & deep reviews in Ladakh/Kashmir. Generic aggregator homepages (Hotels.com, Expedia) and foreign listings are auto-blocked to prevent database pollution.
            </span>
          </div>

          {error && (
            <div className="rounded-md border border-loss-500/40 bg-loss-500/10 p-3 text-[12.5px] text-loss-500 flex items-start gap-2">
              <AlertCircle className="size-4 shrink-0 mt-0.5" strokeWidth={1.75} />
              <div>{error}</div>
            </div>
          )}

          {successMsg && (
            <div className="rounded-md border border-profit-500/40 bg-profit-500/10 p-3 text-[12.5px] text-profit-500 flex items-start gap-2">
              <CheckCircle2 className="size-4 shrink-0 mt-0.5" strokeWidth={1.75} />
              <div>{successMsg}</div>
            </div>
          )}

          {warnings.length > 0 && (
            <div className="rounded-md border border-amber-300 bg-amber-50 p-3 text-[11.5px] text-amber-900 space-y-1">
              <div className="font-semibold">Discovery notices:</div>
              {warnings.slice(0, 3).map((w, idx) => (
                <div key={idx} className="truncate">· {w}</div>
              ))}
            </div>
          )}

          {/* Mode: Seed Master Directory */}
          {mode === 'seed' && (
            <form onSubmit={handleSeedDestination} className="space-y-4">
              <div className="rounded-lg border border-amber-200 bg-amber-50/90 p-4 space-y-2">
                <div className="flex items-center gap-2">
                  <div className="grid size-6 place-items-center rounded bg-amber-600 text-white shadow-xs">
                    <Zap className="size-3.5 fill-white" />
                  </div>
                  <span className="text-[14px] font-bold text-ink-100">
                    Comprehensive Destination Inventory (Zero Omission)
                  </span>
                </div>
                <p className="text-[12.5px] text-ink-400 leading-relaxed">
                  Instead of partial or limited web searches, instantly stage <strong>all verified hotels, heritage palaces, luxury camps, and houseboats</strong> for your chosen destination. Every property is fully loaded with accurate room categories (AP, MAP, CP, EP), contact numbers, exact altitudes, and seasonal operational dates.
                </p>
              </div>

              <div>
                <label className="block text-[11.5px] font-medium uppercase tracking-[0.08em] text-ink-400 mb-1.5">
                  Select Destination / Valley to Seed *
                </label>
                <Select
                  value={seedDestination}
                  onChange={(e) => setSeedDestination(e.target.value)}
                  className="w-full text-[13px] border-ink-700 bg-white text-ink-100 font-medium shadow-xs"
                >
                  <option value="all">🌟 All Destinations (All 73 Verified Properties across Ladakh & Kashmir)</option>
                  <option value="leh">🏰 Leh & Sham Valley (18 Hotels & Heritage Palaces — Grand Dragon, Indus Valley, Stok, Saboo...)</option>
                  <option value="nubra">🏔️ Nubra Valley (15 Luxury Camps & Ecolodges — Lharimo North, Stone Hedge, Nubra Ecolodge...)</option>
                  <option value="pangong">🌊 Pangong Lake (12 Lakefront Camps & Cottages — Pangong Sarai, Redstart, Wonderland...)</option>
                  <option value="hanle">🔭 Hanle & Changthang (8 Dark Sky Camps & Homestays — Observatory Camp, Milky Way...)</option>
                  <option value="zanskar">⛰️ Zanskar & Kargil (8 Mountain Resorts & Camps — Highland Mountain, Zanskar River...)</option>
                  <option value="srinagar">🛶 Srinagar & Kashmir (12 Heritage Houseboats & Resorts — Sukhoon Houseboat, Vivanta, Khyber...)</option>
                </Select>
              </div>

              <div className="rounded-md border border-ink-800 bg-white p-3 text-[12px] text-ink-400 space-y-1 shadow-xs">
                <div className="font-semibold text-ink-100">What gets seeded:</div>
                <div>· Complete room inventory (Deluxe, Suites, Luxury Tents, Cottage variants)</div>
                <div>· Real meal plan tariffs (EP, CP, MAP, AP) & extra bed/child pricing references</div>
                <div>· Geographic accuracy: Exact settlement, valley classification, and altitude meters</div>
                <div>· Check-in/out schedules & operational summer season windows</div>
              </div>

              <div className="pt-2 flex justify-end">
                <Button type="submit" variant="primary" disabled={loading} className="bg-amber-700 hover:bg-amber-800 text-white font-semibold shadow-xs">
                  {loading ? (
                    <>
                      <Loader2 className="size-4 animate-spin" strokeWidth={1.75} />
                      Seeding All Properties into Drafts...
                    </>
                  ) : (
                    <>
                      <Zap className="size-4 fill-white" strokeWidth={1.75} />
                      Seed All {seedDestination === 'all' ? '73 Properties' : 'Destination Properties'}
                    </>
                  )}
                </Button>
              </div>
            </form>
          )}

          {mode === 'keyword' && (
            <form onSubmit={handleKeywordDiscovery} className="space-y-3">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-[11.5px] font-medium uppercase tracking-[0.08em] text-ink-400">
                    Destination Discovery Keyword *
                  </label>
                  <span className="text-[11px] text-ink-500">Auto-infers destination valley & type</span>
                </div>
                <Input
                  required
                  placeholder="e.g. Nubra luxury camps, Pangong tents, Leh heritage hotels, Srinagar houseboats"
                  value={keywordQuery}
                  onChange={(e) => {
                    const val = e.target.value;
                    setKeywordQuery(val);
                    inferFromQuery(val);
                  }}
                />
                
                {/* Quick Presets */}
                <div className="mt-2 flex flex-wrap items-center gap-1.5">
                  <span className="text-[11px] text-ink-500 font-medium">Quick Presets:</span>
                  <button
                    type="button"
                    onClick={() => applyPreset('Nubra luxury camps', 'Nubra', 'CAMP')}
                    className="rounded-full border border-ink-700 bg-white px-2.5 py-0.5 text-[11px] font-medium text-ink-300 hover:border-signal-500 hover:text-signal-600 hover:bg-signal-50/50 transition-colors shadow-xs"
                  >
                    🏔️ Nubra Camps
                  </button>
                  <button
                    type="button"
                    onClick={() => applyPreset('Pangong lake camps', 'Pangong', 'CAMP')}
                    className="rounded-full border border-ink-700 bg-white px-2.5 py-0.5 text-[11px] font-medium text-ink-300 hover:border-signal-500 hover:text-signal-600 hover:bg-signal-50/50 transition-colors shadow-xs"
                  >
                    🌊 Pangong Tents
                  </button>
                  <button
                    type="button"
                    onClick={() => applyPreset('Leh heritage hotels', 'Leh', 'HOTEL')}
                    className="rounded-full border border-ink-700 bg-white px-2.5 py-0.5 text-[11px] font-medium text-ink-300 hover:border-signal-500 hover:text-signal-600 hover:bg-signal-50/50 transition-colors shadow-xs"
                  >
                    🏰 Leh Hotels
                  </button>
                  <button
                    type="button"
                    onClick={() => applyPreset('Dal Lake luxury houseboats', 'Srinagar', 'HOUSEBOAT')}
                    className="rounded-full border border-ink-700 bg-white px-2.5 py-0.5 text-[11px] font-medium text-ink-300 hover:border-signal-500 hover:text-signal-600 hover:bg-signal-50/50 transition-colors shadow-xs"
                  >
                    🛶 Srinagar Houseboats
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11.5px] font-medium uppercase tracking-[0.08em] text-ink-400 mb-1">
                    Destination City
                  </label>
                  <Select
                    value={city}
                    onChange={(e) => {
                      const newCity = e.target.value;
                      setCity(newCity);
                      if (['Leh', 'Nubra', 'Pangong', 'Kargil', 'Zanskar'].includes(newCity) && propertyType === 'HOUSEBOAT') {
                        setPropertyType('CAMP');
                      }
                    }}
                  >
                    <option value="">Auto-detect</option>
                    <option value="Nubra">Nubra Valley</option>
                    <option value="Pangong">Pangong Lake</option>
                    <option value="Leh">Leh</option>
                    <option value="Srinagar">Srinagar</option>
                    <option value="Kargil">Kargil</option>
                    <option value="Zanskar">Zanskar</option>
                    <option value="Gulmarg">Gulmarg</option>
                    <option value="Pahalgam">Pahalgam</option>
                    <option value="Sonamarg">Sonamarg</option>
                  </Select>
                </div>

                <div>
                  <label className="block text-[11.5px] font-medium uppercase tracking-[0.08em] text-ink-400 mb-1">
                    Property Type
                  </label>
                  <Select value={propertyType} onChange={(e) => setPropertyType(e.target.value)}>
                    <option value="HOTEL">Hotel / Resort</option>
                    <option value="CAMP">Camp / Luxury Tents</option>
                    <option value="HOUSEBOAT" disabled={isLadakhCity}>
                      {isLadakhCity ? 'Houseboat (Srinagar only)' : 'Houseboat (Dal/Nigeen)'}
                    </option>
                  </Select>
                </div>

                <div>
                  <label className="block text-[11.5px] font-medium uppercase tracking-[0.08em] text-ink-400 mb-1">
                    Discovery Depth
                  </label>
                  <Select value={String(limit)} onChange={(e) => setLimit(Number(e.target.value) || 20)}>
                    <option value="20">All Discovered Properties (Max Scrape - 20)</option>
                    <option value="15">Extended Scan (15 properties)</option>
                    <option value="10">Deep Scan (10 properties)</option>
                    <option value="5">Quick Scan (5 properties)</option>
                  </Select>
                </div>
              </div>

              <div className="pt-3 flex justify-end">
                <Button type="submit" variant="primary" disabled={loading || !keywordQuery.trim()}>
                  {loading ? (
                    <>
                      <Loader2 className="size-4 animate-spin" strokeWidth={1.75} />
                      Discovering & Swarm Extracting...
                    </>
                  ) : (
                    <>
                      <Search className="size-4" strokeWidth={1.75} />
                      Discover & Extract to Drafts
                    </>
                  )}
                </Button>
              </div>
            </form>
          )}

          {mode === 'single' && (
            <form onSubmit={handleExtractSingle} className="space-y-3">
              <div>
                <label className="block text-[11.5px] font-medium uppercase tracking-[0.08em] text-ink-400 mb-1">
                  Property or Booking Webpage URL *
                </label>
                <Input
                  required
                  type="url"
                  placeholder="https://example-hotel-leh.com or OTA listing URL"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11.5px] font-medium uppercase tracking-[0.08em] text-ink-400 mb-1">
                    Destination City
                  </label>
                  <Select
                    value={city}
                    onChange={(e) => {
                      const newCity = e.target.value;
                      setCity(newCity);
                      if (['Leh', 'Nubra', 'Pangong', 'Kargil', 'Zanskar'].includes(newCity) && propertyType === 'HOUSEBOAT') {
                        setPropertyType('CAMP');
                      }
                    }}
                  >
                    <option value="">Auto-detect</option>
                    <option value="Nubra">Nubra Valley</option>
                    <option value="Pangong">Pangong Lake</option>
                    <option value="Leh">Leh</option>
                    <option value="Srinagar">Srinagar</option>
                    <option value="Kargil">Kargil</option>
                    <option value="Zanskar">Zanskar</option>
                    <option value="Gulmarg">Gulmarg</option>
                    <option value="Pahalgam">Pahalgam</option>
                    <option value="Sonamarg">Sonamarg</option>
                  </Select>
                </div>

                <div>
                  <label className="block text-[11.5px] font-medium uppercase tracking-[0.08em] text-ink-400 mb-1">
                    Property Type
                  </label>
                  <Select value={propertyType} onChange={(e) => setPropertyType(e.target.value)}>
                    <option value="HOTEL">Hotel / Resort</option>
                    <option value="CAMP">Camp / Luxury Tents</option>
                    <option value="HOUSEBOAT" disabled={isLadakhCity}>
                      {isLadakhCity ? 'Houseboat (Srinagar only)' : 'Houseboat (Dal/Nigeen)'}
                    </option>
                  </Select>
                </div>

                <div>
                  <label className="block text-[11.5px] font-medium uppercase tracking-[0.08em] text-ink-400 mb-1">
                    Scraping Engine
                  </label>
                  <Select value={provider} onChange={(e) => setProvider(e.target.value)}>
                    <option value="">Auto Failover Pool</option>
                    <option value="firecrawl">Firecrawl (JSON Extract)</option>
                    <option value="jina">Jina Reader (Markdown + AI)</option>
                    <option value="scrape_do">scrape.do (Proxy Bypass)</option>
                    <option value="crawl4ai">Crawl4AI (Self-Hosted)</option>
                    <option value="tinyfish">TinyFish (Browser Agent)</option>
                  </Select>
                </div>
              </div>

              <div className="pt-3 flex justify-end">
                <Button type="submit" variant="primary" disabled={loading || !url.trim()}>
                  {loading ? (
                    <>
                      <Loader2 className="size-4 animate-spin" strokeWidth={1.75} />
                      Scraping & Extracting...
                    </>
                  ) : (
                    <>
                      <Sparkles className="size-4" strokeWidth={1.75} />
                      Extract to Staging Draft
                    </>
                  )}
                </Button>
              </div>
            </form>
          )}

          {mode === 'batch' && (
            <form onSubmit={handleExtractBatch} className="space-y-3">
              <div>
                <label className="block text-[11.5px] font-medium uppercase tracking-[0.08em] text-ink-400 mb-1">
                  URLs to Scrape (One per line) *
                </label>
                <textarea
                  required
                  rows={4}
                  className="w-full rounded-md border border-ink-700 bg-ink-950 px-3 py-2 text-[13px] text-ink-100 placeholder:text-ink-500 focus:border-signal-500 focus:outline-none"
                  placeholder={`https://hotel-one-srinagar.com\nhttps://hotel-two-leh.com\nhttps://nubra-luxury-camps.com`}
                  value={batchUrls}
                  onChange={(e) => setBatchUrls(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11.5px] font-medium uppercase tracking-[0.08em] text-ink-400 mb-1">
                    Destination City Hint
                  </label>
                  <Select
                    value={city}
                    onChange={(e) => {
                      const newCity = e.target.value;
                      setCity(newCity);
                      if (['Leh', 'Nubra', 'Pangong', 'Kargil', 'Zanskar'].includes(newCity) && propertyType === 'HOUSEBOAT') {
                        setPropertyType('CAMP');
                      }
                    }}
                  >
                    <option value="">Auto-detect</option>
                    <option value="Nubra">Nubra Valley</option>
                    <option value="Pangong">Pangong Lake</option>
                    <option value="Leh">Leh</option>
                    <option value="Srinagar">Srinagar</option>
                  </Select>
                </div>

                <div>
                  <label className="block text-[11.5px] font-medium uppercase tracking-[0.08em] text-ink-400 mb-1">
                    Property Type Hint
                  </label>
                  <Select value={propertyType} onChange={(e) => setPropertyType(e.target.value)}>
                    <option value="HOTEL">Hotel / Resort</option>
                    <option value="CAMP">Camp / Luxury Tents</option>
                    <option value="HOUSEBOAT" disabled={isLadakhCity}>
                      {isLadakhCity ? 'Houseboat (Srinagar only)' : 'Houseboat'}
                    </option>
                  </Select>
                </div>
              </div>

              <div className="pt-3 flex justify-end">
                <Button type="submit" variant="primary" disabled={loading || !batchUrls.trim()}>
                  {loading ? (
                    <>
                      <Loader2 className="size-4 animate-spin" strokeWidth={1.75} />
                      Running Swarm Extraction...
                    </>
                  ) : (
                    <>
                      <Layers className="size-4" strokeWidth={1.75} />
                      Launch Swarm Extract
                    </>
                  )}
                </Button>
              </div>
            </form>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
