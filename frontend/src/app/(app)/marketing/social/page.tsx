'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { Panel, PanelBody, PanelHeader, PanelTitle } from '@/components/ui/panel';
import { Button } from '@/components/ui/button';
import { Chip } from '@/components/ui/badge';
import {
  Plus,
  BarChart2,
  Calendar,
  Link2,
  TrendingUp,
  Send,
  Trash2,
  Edit2,
  AlertCircle,
  Loader2,
  Instagram,
  Facebook,
  Globe,
  Eye,
} from 'lucide-react';

const PLATFORM_STYLE: Record<string, { label: string; cls: string }> = {
  INSTAGRAM: { label: 'Instagram', cls: 'from-purple-600 to-pink-500' },
  FACEBOOK: { label: 'Facebook', cls: 'from-blue-600 to-blue-800' },
  PINTEREST: { label: 'Pinterest', cls: 'from-red-600 to-red-700' },
  LINKEDIN: { label: 'LinkedIn', cls: 'from-blue-700 to-blue-900' },
  X: { label: 'X / Twitter', cls: 'from-zinc-800 to-black' },
};

const STATUS_STYLE: Record<string, string> = {
  DRAFT: 'text-ink-400 border-ink-700',
  SCHEDULED: 'text-signal-400 border-signal-700 bg-signal-950/40',
  PUBLISHING: 'text-amber-400 border-amber-700 animate-pulse',
  PUBLISHED: 'text-green-400 border-green-700 bg-green-950/30',
  FAILED: 'text-loss-400 border-loss-700 bg-loss-950/30',
};

const TABS = [
  { id: 'posts', label: 'Posts', icon: Eye },
  { id: 'calendar', label: 'Calendar', icon: Calendar },
  { id: 'analytics', label: 'Analytics', icon: BarChart2 },
  { id: 'accounts', label: 'Accounts', icon: Link2 },
  { id: 'trends', label: 'Trends', icon: TrendingUp },
] as const;

type TabId = typeof TABS[number]['id'];

export default function SocialStudioPage() {
  const [tab, setTab] = useState<TabId>('posts');
  const [posts, setPosts] = useState<any[]>([]);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [analytics, setAnalytics] = useState<any>(null);
  const [trends, setTrends] = useState<any>(null);
  const [calendar, setCalendar] = useState<Record<string, any[]>>({});
  const [loading, setLoading] = useState(true);
  const [publishingId, setPublishingId] = useState<string | null>(null);

  const now = new Date();
  const [calMonth, setCalMonth] = useState(now.getMonth() + 1);
  const [calYear, setCalYear] = useState(now.getFullYear());

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [p, a, an, t, cal] = await Promise.all([
        api.get<any>('/social/posts?limit=50'),
        api.get<any[]>('/social/accounts'),
        api.get<any>('/social/analytics'),
        api.get<any>('/social/trends'),
        api.get<any>(`/social/calendar?month=${calMonth}&year=${calYear}`),
      ]);
      setPosts(p?.items ?? []);
      setAccounts(a ?? []);
      setAnalytics(an);
      setTrends(t);
      setCalendar(cal ?? {});
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [calMonth, calYear]);

  useEffect(() => { load(); }, [load]);

  const handlePublishNow = async (postId: string) => {
    if (!confirm('Publish this post now? This action cannot be undone.')) return;
    setPublishingId(postId);
    try {
      const result = await api.post<any>(`/social/posts/${postId}/publish`, {});
      if (result?.simulated) {
        alert('✅ Published (simulated) — connect a live account to publish for real.');
      } else if (result?.ok) {
        alert(`✅ Published! External ID: ${result.externalPostId}`);
      } else {
        alert(`❌ Failed: ${result?.errorMessage}`);
      }
      load();
    } catch (e: any) {
      alert(`Failed: ${e.message}`);
    } finally {
      setPublishingId(null);
    }
  };

  const handleDelete = async (postId: string) => {
    if (!confirm('Delete this post?')) return;
    await api.del(`/social/posts/${postId}`);
    load();
  };

  const daysInMonth = new Date(calYear, calMonth, 0).getDate();
  const firstDayOfMonth = new Date(calYear, calMonth - 1, 1).getDay();
  const monthName = new Date(calYear, calMonth - 1).toLocaleString('default', { month: 'long' });

  return (
    <div className="mx-auto max-w-[1180px] px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-ink-100">Social Media Studio</h1>
          <p className="text-xs text-ink-500 mt-0.5">AI-powered content, scheduling & multi-platform publishing</p>
        </div>
        <Link href="/marketing/social/new">
          <Button variant="primary" size="sm">
            <Plus className="h-4 w-4" />
            New Post
          </Button>
        </Link>
      </div>

      {/* KPI strip */}
      {analytics && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: 'Total Posts', value: analytics.totalPosts ?? 0 },
            { label: 'Total Reach', value: (analytics.totalReach ?? 0).toLocaleString() },
            { label: 'Active Accounts', value: accounts.filter((a: any) => a.isActive).length },
            { label: 'Scheduled Queue', value: posts.filter((p: any) => p.status === 'SCHEDULED').length },
          ].map(({ label, value }) => (
            <Panel key={label}>
              <PanelBody className="py-3">
                <p className="text-[10px] uppercase tracking-widest text-ink-500">{label}</p>
                <p className="text-2xl font-bold text-ink-100 mt-0.5">{value}</p>
              </PanelBody>
            </Panel>
          ))}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 border-b border-ink-800">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium transition-colors border-b-2 -mb-px ${
              tab === id
                ? 'border-signal-500 text-signal-400'
                : 'border-transparent text-ink-500 hover:text-ink-300'
            }`}
          >
            <Icon className="h-3.5 w-3.5" />
            {label}
          </button>
        ))}
      </div>

      {/* ── Posts ─────────────────────────────────────────────────────── */}
      {tab === 'posts' && (
        loading ? (
          <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-ink-600" /></div>
        ) : posts.length === 0 ? (
          <div className="text-center py-16 text-ink-500">
            <p className="mb-4">No posts yet. Generate your first AI travel caption!</p>
            <Link href="/marketing/social/new">
              <Button variant="primary" size="sm"><Plus className="h-4 w-4" />Create Post</Button>
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {posts.map((post: any) => {
              const plat = PLATFORM_STYLE[post.platform] ?? PLATFORM_STYLE.INSTAGRAM;
              const statusCls = STATUS_STYLE[post.status] ?? STATUS_STYLE.DRAFT;
              return (
                <Panel key={post.id} interactive>
                  <PanelBody className="flex items-start gap-4 py-3">
                    {/* Platform dot */}
                    <div className={`w-9 h-9 rounded-full bg-gradient-to-br ${plat.cls} flex items-center justify-center text-white flex-shrink-0 text-xs font-bold`}>
                      {plat.label[0]}
                    </div>
                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-semibold text-ink-200">{plat.label}</span>
                        <span className={`text-[10px] px-2 py-0.5 rounded border ${statusCls}`}>{post.status}</span>
                        {post.account?.handle && (
                          <span className="text-[10px] text-ink-500">{post.account.handle}</span>
                        )}
                      </div>
                      <p className="text-sm text-ink-300 line-clamp-2">{post.caption}</p>
                      {post.scheduledAt && post.status === 'SCHEDULED' && (
                        <p className="text-[10px] text-ink-500 mt-1">
                          Scheduled: {new Date(post.scheduledAt).toLocaleString()}
                        </p>
                      )}
                      {post.status === 'FAILED' && post.errorMessage && (
                        <p className="text-[10px] text-loss-400 mt-1 flex items-center gap-1">
                          <AlertCircle className="h-3 w-3" />{post.errorMessage}
                        </p>
                      )}
                    </div>
                    {/* Actions */}
                    <div className="flex items-center gap-1 flex-shrink-0">
                      {post.status !== 'PUBLISHED' && (
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => handlePublishNow(post.id)}
                          disabled={publishingId === post.id}
                        >
                          {publishingId === post.id
                            ? <Loader2 className="h-3 w-3 animate-spin" />
                            : <Send className="h-3 w-3" />}
                        </Button>
                      )}
                      {post.status !== 'PUBLISHED' && (
                        <Button size="sm" variant="ghost" onClick={() => handleDelete(post.id)}>
                          <Trash2 className="h-3 w-3 text-loss-500" />
                        </Button>
                      )}
                    </div>
                  </PanelBody>
                </Panel>
              );
            })}
          </div>
        )
      )}

      {/* ── Calendar ──────────────────────────────────────────────────── */}
      {tab === 'calendar' && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-ink-200">{monthName} {calYear}</h2>
            <div className="flex gap-2">
              <Button variant="secondary" size="sm" onClick={() => {
                if (calMonth === 1) { setCalMonth(12); setCalYear(y => y - 1); }
                else setCalMonth(m => m - 1);
              }}>←</Button>
              <Button variant="secondary" size="sm" onClick={() => {
                if (calMonth === 12) { setCalMonth(1); setCalYear(y => y + 1); }
                else setCalMonth(m => m + 1);
              }}>→</Button>
            </div>
          </div>
          <div className="grid grid-cols-7 gap-1 text-[10px] text-ink-500 mb-2">
            {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(d => (
              <div key={d} className="text-center py-1">{d}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {Array.from({ length: firstDayOfMonth }).map((_, i) => <div key={`e${i}`} />)}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const key = `${calYear}-${String(calMonth).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
              const dayPosts = calendar[key] ?? [];
              const isToday = day === now.getDate() && calMonth === now.getMonth() + 1 && calYear === now.getFullYear();
              return (
                <div key={day} className={`min-h-[72px] rounded border p-1 text-[10px] ${isToday ? 'border-signal-600 bg-signal-950/20' : 'border-ink-800 hover:border-ink-700'}`}>
                  <span className={`font-medium ${isToday ? 'text-signal-400' : 'text-ink-400'}`}>{day}</span>
                  {dayPosts.map((p: any) => {
                    const cfg = PLATFORM_STYLE[p.platform];
                    return (
                      <div key={p.id} className={`mt-0.5 bg-gradient-to-r ${cfg?.cls || 'from-gray-700 to-gray-800'} text-white rounded px-1 py-0.5 truncate text-[9px]`}>
                        {p.caption.slice(0, 18)}…
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Analytics ─────────────────────────────────────────────────── */}
      {tab === 'analytics' && analytics && (
        <div className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            {Object.entries(analytics.byPlatform ?? {}).map(([platform, stats]: [string, any]) => {
              const plat = PLATFORM_STYLE[platform] ?? { label: platform, cls: '' };
              return (
                <Panel key={platform}>
                  <PanelHeader>
                    <PanelTitle>
                      <span className={`inline-block w-2 h-2 rounded-full bg-gradient-to-r ${plat.cls} mr-2`} />
                      {plat.label}
                    </PanelTitle>
                  </PanelHeader>
                  <PanelBody className="space-y-2 text-sm">
                    <div className="flex justify-between"><span className="text-ink-500">Posts</span><span className="text-ink-200">{stats.posts}</span></div>
                    <div className="flex justify-between"><span className="text-ink-500">Reach</span><span className="text-ink-200">{(stats.totalReach ?? 0).toLocaleString()}</span></div>
                    <div className="flex justify-between"><span className="text-ink-500">Likes</span><span className="text-ink-200">{(stats.totalLikes ?? 0).toLocaleString()}</span></div>
                    <div className="flex justify-between"><span className="text-ink-500">Comments</span><span className="text-ink-200">{(stats.totalComments ?? 0).toLocaleString()}</span></div>
                  </PanelBody>
                </Panel>
              );
            })}
          </div>
          {analytics.topPosts?.length > 0 && (
            <Panel>
              <PanelHeader><PanelTitle>Top Performing Posts</PanelTitle></PanelHeader>
              <PanelBody className="space-y-3">
                {analytics.topPosts.map((p: any) => (
                  <div key={p.id} className="flex items-center gap-3 text-sm">
                    <span className={`w-2 h-2 rounded-full bg-gradient-to-r ${PLATFORM_STYLE[p.platform]?.cls}`} />
                    <span className="flex-1 truncate text-ink-400 text-xs">{p.caption.slice(0, 60)}…</span>
                    <span className="text-xs font-medium text-ink-200">{((p.metrics as any)?.reach ?? 0).toLocaleString()} reach</span>
                  </div>
                ))}
              </PanelBody>
            </Panel>
          )}
        </div>
      )}

      {/* ── Accounts ──────────────────────────────────────────────────── */}
      {tab === 'accounts' && (
        <div className="space-y-4">
          <p className="text-xs text-ink-500">Connect social accounts to enable live publishing. Posts simulate publishing until a live account is connected.</p>
          {accounts.length === 0 ? (
            <Panel>
              <PanelBody className="py-12 text-center text-ink-500">
                <Link2 className="h-8 w-8 mx-auto mb-3 opacity-30" />
                <p className="text-sm">No accounts connected yet.</p>
                <p className="text-xs mt-1">Posts publish in simulation mode until you connect a live account.</p>
              </PanelBody>
            </Panel>
          ) : (
            <div className="space-y-3">
              {accounts.map((acc: any) => {
                const plat = PLATFORM_STYLE[acc.platform] ?? { label: acc.platform, cls: '' };
                return (
                  <Panel key={acc.id} interactive>
                    <PanelBody className="flex items-center gap-4 py-3">
                      <div className={`w-9 h-9 rounded-full bg-gradient-to-br ${plat.cls} flex items-center justify-center text-white text-xs font-bold flex-shrink-0`}>
                        {plat.label[0]}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-ink-200">{acc.accountName}</p>
                        <p className="text-xs text-ink-500">{acc.handle} · {plat.label}</p>
                      </div>
                      <Chip className={acc.isActive ? 'text-green-400 border-green-700' : ''}>{acc.isActive ? 'Connected' : 'Inactive'}</Chip>
                    </PanelBody>
                  </Panel>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── Trends ────────────────────────────────────────────────────── */}
      {tab === 'trends' && trends && (
        <div className="grid gap-4 md:grid-cols-2">
          <Panel>
            <PanelHeader><PanelTitle>Seasonal Ladakh Keywords</PanelTitle></PanelHeader>
            <PanelBody className="space-y-3">
              {trends.risingKeywords?.map((kw: any, i: number) => (
                <div key={i} className="flex items-center gap-3">
                  <span className="w-5 text-[10px] text-ink-600">#{i + 1}</span>
                  <span className="flex-1 text-sm text-ink-300">{kw.keyword}</span>
                  <span className="text-[10px] text-green-400 bg-green-950/40 border border-green-800 px-1.5 py-0.5 rounded">{kw.trend}</span>
                  {kw.volume && <span className="text-[10px] text-ink-500">{kw.volume}</span>}
                </div>
              ))}
            </PanelBody>
          </Panel>
          <div className="space-y-4">
            <Panel>
              <PanelHeader><PanelTitle>Best Posting Times</PanelTitle></PanelHeader>
              <PanelBody className="space-y-2">
                {trends.bestTimeToPost?.map((t: any, i: number) => (
                  <div key={i} className="flex items-center gap-3 text-xs">
                    <span className={`w-2 h-2 rounded-full bg-gradient-to-r ${PLATFORM_STYLE[t.platform]?.cls}`} />
                    <span className="w-20 text-ink-500">{PLATFORM_STYLE[t.platform]?.label ?? t.platform}</span>
                    <span className="text-ink-400">{t.days}</span>
                    <span className="ml-auto font-medium text-ink-200">{t.time}</span>
                  </div>
                ))}
              </PanelBody>
            </Panel>
            <Panel>
              <PanelHeader><PanelTitle>Top Hashtags</PanelTitle></PanelHeader>
              <PanelBody className="space-y-3">
                {Object.entries(trends.bestHashtagsByPlatform ?? {}).map(([platform, tags]: [string, any]) => (
                  <div key={platform}>
                    <p className="text-[10px] text-ink-500 capitalize mb-1">{platform}</p>
                    <div className="flex flex-wrap gap-1">
                      {tags.map((tag: string, i: number) => (
                        <Chip key={i}>{tag}</Chip>
                      ))}
                    </div>
                  </div>
                ))}
              </PanelBody>
            </Panel>
          </div>
        </div>
      )}
    </div>
  );
}
