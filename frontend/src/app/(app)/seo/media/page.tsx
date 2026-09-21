'use client';

import React, { useCallback, useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import {
  ImageIcon,
  UploadCloud,
  Copy,
  Check,
  ArrowLeft,
  Search,
  ExternalLink,
} from 'lucide-react';
import {
  api,
  ApiError,
  type MediaAssetRow,
  type PageManifestItem,
} from '@/lib/api';
import { Panel, PanelBody } from '@/components/ui/panel';
import { Button } from '@/components/ui/button';
import { Input, Label } from '@/components/ui/input';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogTrigger,
} from '@/components/ui/dialog';

export default function SeoMediaPage() {
  const [assets, setAssets] = useState<MediaAssetRow[]>([]);
  const [pages, setPages] = useState<PageManifestItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Upload dialog state
  const [uploadOpen, setUploadOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [altText, setAltText] = useState('');
  const [caption, setCaption] = useState('');
  const [pageSlug, setPageSlug] = useState('');
  const [tags, setTags] = useState('');
  const [uploading, setUploading] = useState(false);
  const [filterPage, setFilterPage] = useState('all');
  const [searchTag, setSearchTag] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [mediaList, pageList] = await Promise.all([
        api.get<MediaAssetRow[]>('/media'),
        api.get<PageManifestItem[]>('/media/pages'),
      ]);
      setAssets(mediaList);
      setPages(pageList);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not load media library.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const notifySuccess = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(null), 4000);
  };

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault();
    if (!file) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('altText', altText.trim());
      formData.append('caption', caption.trim());
      formData.append('pageSlug', pageSlug);
      formData.append('tags', tags);

      await api.upload<MediaAssetRow>('/media', formData);
      setUploadOpen(false);
      setFile(null);
      setAltText('');
      setCaption('');
      setPageSlug('');
      setTags('');
      loadData();
      notifySuccess('Original image uploaded and registered for website page!');
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  }

  const copyUrl = (id: string, url: string) => {
    navigator.clipboard.writeText(url);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2500);
    notifySuccess('Image URL copied to clipboard!');
  };

  const filteredAssets = useMemo(() => {
    return assets.filter((a) => {
      if (filterPage !== 'all' && a.pageSlug !== filterPage) return false;
      if (
        searchTag.trim() &&
        !a.tags?.some((t) => t.toLowerCase().includes(searchTag.toLowerCase())) &&
        !a.filename.toLowerCase().includes(searchTag.toLowerCase())
      ) {
        return false;
      }
      return true;
    });
  }, [assets, filterPage, searchTag]);

  return (
    <div className="mx-auto max-w-[1280px] px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
      <div className="mb-4">
        <Link
          href="/seo"
          className="inline-flex items-center gap-1 text-[12.5px] font-medium text-ink-400 hover:text-signal-500 transition-colors"
        >
          <ArrowLeft className="size-3.5" />
          Back to SEO Command Center
        </Link>
      </div>

      <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="display text-[26px] font-semibold tracking-tight text-ink-100">
            Website Media Library
          </h1>
          <p className="mt-1 text-[13px] text-ink-400 max-w-2xl">
            Upload genuine Ladakh photos to boost Information Gain and Google E-E-A-T scores across the site.
          </p>
        </div>

        <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-2">
              <UploadCloud className="size-4" />
              Upload Website Photo
            </Button>
          </DialogTrigger>
          <DialogContent
            title="Upload Website Photography"
            description="Upload authentic photos taken by the Leh team. Assign to a destination or package page."
          >
            <form onSubmit={handleUpload} className="p-5 space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="photoFile">Photo File *</Label>
                <input
                  id="photoFile"
                  type="file"
                  accept="image/*"
                  required
                  onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                  className="w-full rounded-md border border-ink-700 bg-ink-950 px-3 py-2 text-sm text-ink-200 file:mr-3 file:rounded file:border-0 file:bg-signal-500/20 file:px-2.5 file:py-1 file:text-xs file:font-medium file:text-signal-400"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="pageTarget">Assign to Website Page</Label>
                <select
                  id="pageTarget"
                  value={pageSlug}
                  onChange={(e) => setPageSlug(e.target.value)}
                  className="w-full rounded-md border border-ink-700 bg-ink-950 px-3 py-2 text-sm text-ink-100 focus:border-signal-500 focus:outline-none"
                >
                  <option value="">-- General Website Asset --</option>
                  {pages.map((p) => (
                    <option key={p.url} value={p.url}>
                      {p.url} ({p.title.slice(0, 45)})
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="altText">Descriptive Alt Text (For SEO & Screen Readers) *</Label>
                <Input
                  id="altText"
                  required
                  value={altText}
                  onChange={(e) => setAltText(e.target.value)}
                  placeholder="e.g. Sunrise over Pangong Tso from the Spangmik camps"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="caption">Caption (Optional)</Label>
                <Input
                  id="caption"
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  placeholder="e.g. Photographed by the Ladakh Vacation team, Leh"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="tags">Tags (comma-separated)</Label>
                <Input
                  id="tags"
                  value={tags}
                  onChange={(e) => setTags(e.target.value)}
                  placeholder="pangong, summer, camp, hero-image"
                />
              </div>

              <div className="flex justify-end gap-2 border-t border-ink-800 pt-4">
                <DialogClose asChild>
                  <Button type="button" variant="ghost" size="sm">Cancel</Button>
                </DialogClose>
                <Button type="submit" disabled={uploading || !file || !altText.trim()}>
                  {uploading ? 'Uploading…' : 'Upload to S3 CDN'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </header>

      {error && (
        <div role="alert" className="mb-4 rounded-lg border border-loss-500/40 bg-loss-500/10 px-4 py-3 text-[13px] text-loss-500">
          {error}
        </div>
      )}

      {successMsg && (
        <div role="status" className="mb-4 rounded-lg border border-healthy-500/40 bg-healthy-500/10 px-4 py-3 text-[13px] text-healthy-500">
          {successMsg}
        </div>
      )}

      {/* Filter bar */}
      <div className="mb-6 flex flex-wrap items-center gap-3 rounded-xl border border-ink-800 bg-ink-900/70 p-3">
        <select
          value={filterPage}
          onChange={(e) => setFilterPage(e.target.value)}
          className="rounded-lg border border-ink-700 bg-ink-950 px-3 py-1.5 text-[12.5px] text-ink-200 focus:border-signal-500 focus:outline-none max-w-xs"
        >
          <option value="all">All Assigned Pages ({assets.length})</option>
          {pages.map((p) => (
            <option key={p.url} value={p.url}>
              {p.url}
            </option>
          ))}
        </select>

        <div className="flex items-center gap-2 flex-1 max-w-sm">
          <Input
            value={searchTag}
            onChange={(e) => setSearchTag(e.target.value)}
            placeholder="Search by tag or filename..."
            className="h-8 text-[12.5px]"
          />
        </div>
      </div>

      {/* Media Grid */}
      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <div key={i} className="h-56 rounded-xl shimmer bg-ink-900" />
          ))}
        </div>
      ) : filteredAssets.length === 0 ? (
        <Panel>
          <PanelBody className="py-14 text-center">
            <ImageIcon className="mx-auto size-8 text-ink-500" />
            <p className="mt-3 text-[14px] font-medium text-ink-200">No photos found</p>
            <p className="mt-1 text-[12px] text-ink-500">
              Upload photography or clear filters.
            </p>
          </PanelBody>
        </Panel>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filteredAssets.map((asset) => (
            <div
              key={asset.id}
              className="group overflow-hidden rounded-xl border border-ink-800 bg-ink-950 flex flex-col justify-between hover:border-ink-700 transition-all"
            >
              <div className="relative aspect-video bg-ink-900 overflow-hidden">
                <img
                  src={asset.url}
                  alt={asset.altText}
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                  loading="lazy"
                />
                {asset.pageSlug && (
                  <span className="absolute top-2 left-2 rounded bg-ink-950/80 backdrop-blur px-2 py-0.5 text-[10px] font-mono text-signal-400 border border-ink-800">
                    {asset.pageSlug}
                  </span>
                )}
              </div>

              <div className="p-3.5 flex-1 flex flex-col justify-between space-y-2">
                <div>
                  <p className="text-[12.5px] font-medium text-ink-100 truncate" title={asset.filename}>
                    {asset.filename}
                  </p>
                  <p className="mt-1 text-[11.5px] text-ink-400 line-clamp-2 leading-relaxed" title={asset.altText}>
                    Alt: {asset.altText || <span className="text-loss-500 italic">No alt text</span>}
                  </p>
                </div>

                {asset.tags && asset.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {asset.tags.map((t, idx) => (
                      <span key={idx} className="rounded bg-ink-900 px-1.5 py-0.5 text-[10px] text-ink-400">
                        #{t}
                      </span>
                    ))}
                  </div>
                )}

                <div className="pt-2 border-t border-ink-800/80 flex items-center justify-between">
                  <span className="text-[10px] text-ink-500 font-mono">
                    {(asset.sizeBytes / 1024).toFixed(0)} KB
                  </span>
                  <Button
                    size="sm"
                    variant="secondary"
                    className="h-7 text-[11px] px-2 gap-1"
                    onClick={() => copyUrl(asset.id, asset.url)}
                  >
                    {copiedId === asset.id ? (
                      <>
                        <Check className="size-3 text-healthy-500" />
                        Copied!
                      </>
                    ) : (
                      <>
                        <Copy className="size-3" />
                        Copy URL
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
