'use client';
import { useEffect } from 'react';
import { trackVisit } from '@/lib/attribution';
export function VisitTracker() { useEffect(() => { void trackVisit(); }, []); return null; }
