import React, { useState, useRef, useEffect } from 'react';
import { Upload, Download, Image as ImageIcon, Maximize, RefreshCw } from 'lucide-react';

export const ImageMatcher: React.FC = () => {
  const [originalImage, setOriginalImage] = useState<string | null>(null);
  const [newImage, setNewImage] = useState<string | null>(null);
  const [resultImage, setResultImage] = useState<string | null>(null);
  const [originalSize, setOriginalSize] = useState<{w: number, h: number} | null>(null);
  const [boundingBox, setBoundingBox] = useState<{x: number, y: number, w: number, h: number} | null>(null);
  
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const handleOriginalUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setOriginalImage(url);
      analyzeOriginalImage(url);
    }
  };

  const handleNewUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setNewImage(url);
    }
  };

  const analyzeOriginalImage = (url: string) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.drawImage(img, 0, 0);
      
      setOriginalSize({ w: img.width, h: img.height });

      const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imgData.data;
      let minX = canvas.width, minY = canvas.height, maxX = 0, maxY = 0;
      let hasPixels = false;

      for (let y = 0; y < canvas.height; y++) {
        for (let x = 0; x < canvas.width; x++) {
          const alpha = data[(y * canvas.width + x) * 4 + 3];
          if (alpha > 10) { // non-transparent
            hasPixels = true;
            if (x < minX) minX = x;
            if (x > maxX) maxX = x;
            if (y < minY) minY = y;
            if (y > maxY) maxY = y;
          }
        }
      }

      if (hasPixels) {
        setBoundingBox({ x: minX, y: minY, w: maxX - minX + 1, h: maxY - minY + 1 });
      } else {
        // Empty image, just use full size
        setBoundingBox({ x: 0, y: 0, w: img.width, h: img.height });
      }
    };
    img.src = url;
  };

  useEffect(() => {
    if (originalSize && boundingBox && newImage) {
      generateResult();
    }
  }, [originalSize, boundingBox, newImage]);

  const generateResult = () => {
    if (!originalSize || !boundingBox || !newImage || !canvasRef.current) return;

    const img = new Image();
    img.onload = () => {
      const canvas = canvasRef.current!;
      canvas.width = originalSize.w;
      canvas.height = originalSize.h;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Calculate scaling to fit the new image inside the bounding box
      const scale = Math.min(boundingBox.w / img.width, boundingBox.h / img.height);
      const drawW = img.width * scale;
      const drawH = img.height * scale;
      
      // Center it within the bounding box
      const drawX = boundingBox.x + (boundingBox.w - drawW) / 2;
      const drawY = boundingBox.y + (boundingBox.h - drawH) / 2;

      ctx.drawImage(img, drawX, drawY, drawW, drawH);
      
      setResultImage(canvas.toDataURL('image/png'));
    };
    img.src = newImage;
  };

  const downloadResult = () => {
    if (resultImage) {
      const a = document.createElement('a');
      a.href = resultImage;
      a.download = 'matched_image.png';
      a.click();
    }
  };

  return (
    <div className="flex flex-col gap-8">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl p-8">
        <div className="flex items-center gap-3 text-pink-400 border-b border-slate-800 pb-4 mb-6">
          <Maximize size={24} />
          <h2 className="font-bold text-xl text-white">تطابق الصور</h2>
        </div>
        
        <p className="text-slate-400 mb-8 text-sm leading-relaxed">
          هذه الأداة تتيح لك استبدال صورة (مثل اسم الإطار) بصورة أخرى مع الاحتفاظ بنفس الأبعاد والمكان الدقيق للصورة الأصلية. 
          مفيدة جداً عند تعديل ملفات SVGA لضمان عدم تغير مكان أو حجم العناصر.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Original Image */}
          <div className="flex flex-col gap-4">
            <h3 className="text-white font-bold flex items-center gap-2">
              <span className="bg-slate-800 w-6 h-6 rounded-full flex items-center justify-center text-xs">1</span>
              الصورة الأصلية
            </h3>
            <label className="cursor-pointer flex flex-col items-center justify-center h-48 bg-slate-800/50 border-2 border-dashed border-slate-700 rounded-2xl hover:bg-slate-800 transition-all relative overflow-hidden group">
              <input type="file" accept="image/png, image/jpeg" className="hidden" onChange={handleOriginalUpload} />
              {originalImage ? (
                <>
                  <img src={originalImage} className="max-w-full max-h-full object-contain p-4 drop-shadow-2xl" alt="Original" />
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                    <RefreshCw className="text-white" size={24} />
                  </div>
                </>
              ) : (
                <div className="flex flex-col items-center text-slate-500">
                  <Upload size={32} className="mb-2" />
                  <span className="text-sm">ارفع الصورة الأصلية</span>
                </div>
              )}
            </label>
            {originalSize && (
              <div className="text-xs text-slate-500 text-center">
                الأبعاد الأصلية: {originalSize.w}x{originalSize.h} بكسل
              </div>
            )}
          </div>

          {/* New Image */}
          <div className="flex flex-col gap-4">
            <h3 className="text-white font-bold flex items-center gap-2">
              <span className="bg-slate-800 w-6 h-6 rounded-full flex items-center justify-center text-xs">2</span>
              الصورة الجديدة
            </h3>
            <label className={`cursor-pointer flex flex-col items-center justify-center h-48 bg-slate-800/50 border-2 border-dashed border-slate-700 rounded-2xl transition-all relative overflow-hidden group ${!originalImage ? 'opacity-50 pointer-events-none' : 'hover:bg-slate-800'}`}>
              <input type="file" accept="image/png, image/jpeg" className="hidden" onChange={handleNewUpload} disabled={!originalImage} />
              {newImage ? (
                <>
                  <img src={newImage} className="max-w-full max-h-full object-contain p-4 drop-shadow-2xl" alt="New" />
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                    <RefreshCw className="text-white" size={24} />
                  </div>
                </>
              ) : (
                <div className="flex flex-col items-center text-slate-500">
                  <ImageIcon size={32} className="mb-2" />
                  <span className="text-sm">ارفع الصورة الجديدة</span>
                </div>
              )}
            </label>
          </div>
        </div>

        {/* Result */}
        {resultImage && (
          <div className="mt-10 border-t border-slate-800 pt-8 animate-in fade-in slide-in-from-bottom-4">
            <h3 className="text-white font-bold flex items-center gap-2 mb-6">
              <span className="bg-pink-500/20 text-pink-400 w-6 h-6 rounded-full flex items-center justify-center text-xs">3</span>
              النتيجة النهائية
            </h3>
            
            <div className="flex flex-col items-center gap-6">
              <div className="relative w-full max-w-md aspect-square bg-[url('https://www.transparenttextures.com/patterns/checkerboard.png')] bg-slate-950 border border-slate-700 rounded-2xl overflow-hidden flex items-center justify-center p-4">
                <img src={resultImage} className="max-w-full max-h-full object-contain drop-shadow-2xl" alt="Result" />
              </div>

              <button 
                onClick={downloadResult}
                className="flex items-center gap-2 px-8 py-4 bg-pink-600 hover:bg-pink-500 text-white rounded-xl font-bold transition-all active:scale-95 shadow-[0_0_20px_rgba(236,72,153,0.3)]"
              >
                <Download size={20} />
                تحميل الصورة المتطابقة
              </button>
            </div>
          </div>
        )}

        <canvas ref={canvasRef} className="hidden" />
      </div>
    </div>
  );
};
