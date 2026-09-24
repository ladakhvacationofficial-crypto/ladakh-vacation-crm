'use client';

import { useState } from 'react';
import { Sparkles, Loader2, Globe, Layers, Search, AlertCircle, CheckCircle2 } from 'lucide-react';
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
  const [mode, setMode] = useState<'keyword' | 'single' | 'batch'>('keyword');
  const [keywordQuery, setKeywordQuery] = useState('');
  const [url, setUrl] = useState('');
  const [batchUrls, setBatchUrls] = useState('');
  const [city, setCity] = useState('');
  const [propertyType, setPropertyType] = useState('HOTEL');
  const [provider, setProvider] = useState('');
  const [limit, setLimit] = useState(5);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);

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
      }>('/vendors/drafts/discover', {
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
        '/vendors/drafts/extract',
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
      }>('/vendors/drafts/batch-extract', {
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
              onClick={() => setMode('keyword')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-medium transition-colors ${
                mode === 'keyword'
                  ? 'bg-signal-500/15 border border-signal-500 text-signal-500'
                  : 'text-ink-400 hover:text-ink-200'
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
                  ? 'bg-signal-500/15 border border-signal-500 text-signal-500'
                  : 'text-ink-400 hover:text-ink-200'
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
                  ? 'bg-signal-500/15 border border-signal-500 text-signal-500'
                  : 'text-ink-400 hover:text-ink-200'
              }`}
            >
              <Layers className="size-3.5" strokeWidth={1.75} />
              Batch URL Swarm
            </button>
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
            <div className="rounded-md border border-amber-500/30 bg-amber-500/10 p-3 text-[11.5px] text-amber-300 space-y-1">
              <div className="font-semibold">Discovery notices:</div>
              {warnings.slice(0, 3).map((w, idx) => (
                <div key={idx} className="truncate">· {w}</div>
              ))}
            </div>
          )}

          {mode === 'keyword' && (
            <form onSubmit={handleKeywordDiscovery} className="space-y-3">
              <div>
                <label className="block text-[11.5px] font-medium uppercase tracking-[0.08em] text-ink-400 mb-1">
                  Destination Discovery Keyword *
                </label>
                <Input
                  required
                  placeholder="e.g. Srinagar houseboats, Nubra luxury camps, Pangong tents, Leh heritage hotels"
                  value={keywordQuery}
                  onChange={(e) => setKeywordQuery(e.target.value)}
                />
                <p className="mt-1 text-[11px] text-ink-500">
                  Searches via active free-tier pool (Firecrawl / Jina Search / scrape.do), discovers property sites, and runs the swarm extractor.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11.5px] font-medium uppercase tracking-[0.08em] text-ink-400 mb-1">
                    Destination City
                  </label>
                  <Select value={city} onChange={(e) => setCity(e.target.value)}>
                    <option value="">Auto-detect</option>
                    <option value="Srinagar">Srinagar</option>
                    <option value="Leh">Leh</option>
                    <option value="Nubra">Nubra Valley</option>
                    <option value="Pangong">Pangong Lake</option>
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
                    <option value="HOUSEBOAT">Houseboat (Dal/Nigeen)</option>
                  </Select>
                </div>

                <div>
                  <label className="block text-[11.5px] font-medium uppercase tracking-[0.08em] text-ink-400 mb-1">
                    Discovery Depth
                  </label>
                  <Select value={String(limit)} onChange={(e) => setLimit(Number(e.target.value) || 5)}>
                    <option value="3">Top 3 properties</option>
                    <option value="5">Top 5 properties</option>
                    <option value="10">Top 10 properties</option>
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
                  <Select value={city} onChange={(e) => setCity(e.target.value)}>
                    <option value="">Auto-detect</option>
                    <option value="Srinagar">Srinagar</option>
                    <option value="Leh">Leh</option>
                    <option value="Nubra">Nubra Valley</option>
                    <option value="Pangong">Pangong Lake</option>
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
                    <option value="HOUSEBOAT">Houseboat (Dal/Nigeen)</option>
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
                  <Select value={city} onChange={(e) => setCity(e.target.value)}>
                    <option value="">Auto-detect</option>
                    <option value="Srinagar">Srinagar</option>
                    <option value="Leh">Leh</option>
                    <option value="Nubra">Nubra Valley</option>
                    <option value="Pangong">Pangong Lake</option>
                  </Select>
                </div>

                <div>
                  <label className="block text-[11.5px] font-medium uppercase tracking-[0.08em] text-ink-400 mb-1">
                    Property Type Hint
                  </label>
                  <Select value={propertyType} onChange={(e) => setPropertyType(e.target.value)}>
                    <option value="HOTEL">Hotel / Resort</option>
                    <option value="CAMP">Camp / Luxury Tents</option>
                    <option value="HOUSEBOAT">Houseboat</option>
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
