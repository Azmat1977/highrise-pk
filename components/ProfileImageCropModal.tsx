// /components/ProfileImageCropModal.tsx
// WhatsApp-Style Profile Picture Crop Modal

import Cropper from "react-easy-crop";
import { useState, useCallback, useEffect } from "react";
import { X, ZoomIn, ZoomOut, RotateCcw, Check } from "lucide-react";

interface Props {
  file: File;
  isOpen: boolean;
  onClose: () => void;
  onComplete: (croppedFile: File) => void;
}

// Helper function to create cropped image
const getCroppedImg = async (
  imageSrc: string,
  pixelCrop: { x: number; y: number; width: number; height: number }
): Promise<Blob | null> => {
  const image = new Image();
  image.src = imageSrc;
  image.crossOrigin = "anonymous";

  await new Promise((resolve) => {
    image.onload = resolve;
  });

  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");

  if (!ctx) return null;

  const outputSize = 400;
  canvas.width = outputSize;
  canvas.height = outputSize;

  ctx.drawImage(
    image,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    outputSize,
    outputSize
  );

  return new Promise((resolve) => {
    canvas.toBlob(
      (blob) => {
        resolve(blob);
      },
      "image/jpeg",
      0.92
    );
  });
};

export default function ProfileImageCropModal({
  file,
  isOpen,
  onClose,
  onComplete,
}: Props) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [imageUrl, setImageUrl] = useState<string>("");
  const [imageLoaded, setImageLoaded] = useState(false);

  // Convert File to URL when file changes
  useEffect(() => {
    if (file) {
      const url = URL.createObjectURL(file);
      setImageUrl(url);
      setImageLoaded(false);
      setCrop({ x: 0, y: 0 });
      setZoom(1);

      return () => {
        URL.revokeObjectURL(url);
      };
    }
  }, [file]);

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [isOpen, onClose]);

  const onCropCompleteHandler = useCallback(
    (_croppedArea: any, croppedAreaPixels: any) => {
      setCroppedAreaPixels(croppedAreaPixels);
    },
    []
  );

  const onMediaLoaded = useCallback(() => {
    setImageLoaded(true);
  }, []);

  const handleSave = async () => {
    if (!croppedAreaPixels || !imageUrl) return;

    setIsProcessing(true);
    try {
      const croppedBlob = await getCroppedImg(imageUrl, croppedAreaPixels);
      if (croppedBlob) {
        const croppedFile = new File([croppedBlob], "profile-picture.jpg", {
          type: "image/jpeg",
        });
        onComplete(croppedFile);
      }
    } catch (error) {
      console.error("Error cropping image:", error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCancel = () => {
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setCroppedAreaPixels(null);
    setImageLoaded(false);
    onClose();
  };

  // Don't render if not open or no image
  if (!isOpen || !imageUrl) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80">
      {/* Modal Container */}
      <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
        
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 bg-gray-50">
          <div>
            <h2 className="text-xl font-bold text-gray-800">Crop Photo</h2>
            <p className="text-sm text-gray-500">Drag to reposition</p>
          </div>
          <button
            onClick={handleCancel}
            className="p-2 hover:bg-gray-200 rounded-full transition-colors"
          >
            <X className="w-6 h-6 text-gray-600" />
          </button>
        </div>

        {/* Cropper Area */}
        <div className="relative w-full h-80 bg-gray-900">
          {/* Loading indicator */}
          {!imageLoaded && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-900 z-10">
              <div className="w-10 h-10 border-4 border-[#029bba] border-t-transparent rounded-full animate-spin"></div>
            </div>
          )}
          
          <Cropper
            image={imageUrl}
            crop={crop}
            zoom={zoom}
            aspect={1}
            cropShape="round"
            showGrid={false}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={onCropCompleteHandler}
            onMediaLoaded={onMediaLoaded}
          />
        </div>

        {/* Zoom Controls */}
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-100">
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => setZoom((prev) => Math.max(prev - 0.2, 1))}
              disabled={zoom <= 1}
              className="p-2 hover:bg-gray-200 rounded-full transition-colors disabled:opacity-40"
            >
              <ZoomOut className="w-5 h-5 text-gray-600" />
            </button>

            <input
              type="range"
              min={1}
              max={3}
              step={0.1}
              value={zoom}
              onChange={(e) => setZoom(Number(e.target.value))}
              className="flex-1 h-2 bg-gray-300 rounded-full appearance-none cursor-pointer accent-[#029bba]"
            />

            <button
              type="button"
              onClick={() => setZoom((prev) => Math.min(prev + 0.2, 3))}
              disabled={zoom >= 3}
              className="p-2 hover:bg-gray-200 rounded-full transition-colors disabled:opacity-40"
            >
              <ZoomIn className="w-5 h-5 text-gray-600" />
            </button>
          </div>
          
          <p className="text-center text-sm text-gray-400 mt-2">
            Zoom: {Math.round(zoom * 100)}%
          </p>
        </div>

        {/* Action Buttons */}
        <div className="px-6 py-4 border-t border-gray-100 flex gap-4">
          <button
            type="button"
            onClick={handleCancel}
            disabled={isProcessing}
            className="flex-1 px-4 py-3 border-2 border-gray-200 text-gray-700 font-semibold rounded-xl hover:bg-gray-50 transition-all disabled:opacity-50"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleSave}
            disabled={isProcessing || !croppedAreaPixels}
            className="flex-1 px-4 py-3 bg-[#029bba] hover:bg-[#027a94] text-white font-semibold rounded-xl transition-all disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isProcessing ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Check className="w-5 h-5" />
                Save Photo
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
