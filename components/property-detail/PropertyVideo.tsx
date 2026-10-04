// File: components/property-detail/PropertyVideo.tsx
// Responsive video embed card (YouTube & Vimeo)

import React from "react";
import { Eye } from "lucide-react";

interface PropertyVideoProps {
  videoInfo: { type: "youtube" | "vimeo"; id: string } | null;
}

export default function PropertyVideo({
  videoInfo,
}: PropertyVideoProps): React.ReactElement | null {
  if (!videoInfo) return null;

  return (
    <div
      id="video-section"
      className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6"
    >
      <h2 className="text-lg font-semibold text-[#004063] mb-3 flex items-center gap-2">
        <Eye className="w-5 h-5 text-[#029bba]" />
        Property Video
      </h2>
      <div className="relative aspect-video rounded-xl overflow-hidden bg-gray-100">
        {videoInfo.type === "youtube" ? (
          <iframe
            src={`https://www.youtube.com/embed/${videoInfo.id}`}
            title="Property Video"
            className="w-full h-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        ) : (
          <iframe
            src={`https://player.vimeo.com/video/${videoInfo.id}`}
            title="Property Video"
            className="w-full h-full"
            allow="autoplay; fullscreen; picture-in-picture"
            allowFullScreen
          />
        )}
      </div>
    </div>
  );
}