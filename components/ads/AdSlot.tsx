"use client";

interface AdSlotProps {
  id: string;
  variant?: 'sidebar' | 'infeed' | 'banner' | 'inline' | 'footer';
  className?: string;
}

// Interim: renders nothing. The previous version drew an "Advertisement /
// Slot: {id}" placeholder for every visitor, and placeholder text must never
// reach public pages. Phase 4 renders DB-backed creatives here, with the
// "Sponsored" label and a real CTA.
export default function AdSlot(_props: AdSlotProps) {
  return null;
}