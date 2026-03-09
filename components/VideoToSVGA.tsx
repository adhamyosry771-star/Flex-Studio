import React, { useState, useRef, useEffect } from 'react';
import { FileVideo, Settings, Download, Loader2, Music, X } from 'lucide-react';
import pako from 'pako';
import { parse } from 'protobufjs';
import { svgaSchema } from '../svga-proto';

export const VideoToSVGA: React.FC = () => {
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoUrl, setVideoUrl] = useState<string>('');
  const [featherX, setFeatherX] = useState<number>(0);
  const [featherY, setFeatherY] = useState<number>(0);
  const [resolutionScale, setResolutionScale] = useState<number>(50);
  const [fps, setFps] = useState<number>(15);
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [isConverting, setIsConverting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [statusText, setStatusText] = useState('');

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith('video/')) {
      setVideoFile(file);
      setVideoUrl(URL.createObjectURL(file));
    } else {
      alert('يرجى اختيار ملف فيديو صالح.');
    }
  };

  const handleAudioSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith('audio/')) {
      setAudioFile(file);
    } else {
      alert('يرجى اختيار ملف صوتي صالح.');
    }
  };

  const drawFrame = (video: HTMLVideoElement, canvas: HTMLCanvasElement, fX: number, fY: number) => {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const w = canvas.width;
    const h = canvas.height;

    ctx.clearRect(0, 0, w, h);
    ctx.drawImage(video, 0, 0, w, h);

    if (fX > 0 || fY > 0) {
      const maskCanvas = document.createElement('canvas');
      maskCanvas.width = w;
      maskCanvas.height = h;
      const mctx = maskCanvas.getContext('2d');
      if (!mctx) return;

      mctx.fillStyle = 'black';
      mctx.fillRect(0, 0, w, h);
      mctx.globalCompositeOperation = 'destination-out';

      const fx = w * (fX / 100);
      const fy = h * (fY / 100);

      if (fX > 0) {
        let grad = mctx.createLinearGradient(0, 0, fx, 0);
        grad.addColorStop(0, 'rgba(0,0,0,1)');
        grad.addColorStop(1, 'rgba(0,0,0,0)');
        mctx.fillStyle = grad;
        mctx.fillRect(0, 0, fx, h);

        grad = mctx.createLinearGradient(w, 0, w - fx, 0);
        grad.addColorStop(0, 'rgba(0,0,0,1)');
        grad.addColorStop(1, 'rgba(0,0,0,0)');
        mctx.fillStyle = grad;
        mctx.fillRect(w - fx, 0, fx, h);
      }

      if (fY > 0) {
        let grad = mctx.createLinearGradient(0, 0, 0, fy);
        grad.addColorStop(0, 'rgba(0,0,0,1)');
        grad.addColorStop(1, 'rgba(0,0,0,0)');
        mctx.fillStyle = grad;
        mctx.fillRect(0, 0, w, fy);

        grad = mctx.createLinearGradient(0, h, 0, h - fy);
        grad.addColorStop(0, 'rgba(0,0,0,1)');
        grad.addColorStop(1, 'rgba(0,0,0,0)');
        mctx.fillStyle = grad;
        mctx.fillRect(0, h - fy, w, fy);
      }

      ctx.globalCompositeOperation = 'destination-in';
      ctx.drawImage(maskCanvas, 0, 0);
      ctx.globalCompositeOperation = 'source-over';
    }
  };

  const updatePreview = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (video.readyState >= 2) {
        if (canvas.width !== video.videoWidth) canvas.width = video.videoWidth;
        if (canvas.height !== video.videoHeight) canvas.height = video.videoHeight;
        drawFrame(video, canvas, featherX, featherY);
      }
    }
    animationRef.current = requestAnimationFrame(updatePreview);
  };

  useEffect(() => {
    if (videoUrl) {
      animationRef.current = requestAnimationFrame(updatePreview);
    }
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [videoUrl, featherX, featherY]);

  const convertToSVGA = async () => {
    if (!videoRef.current || !videoFile || !canvasRef.current) return;
    setIsConverting(true);
    setProgress(0);
    setStatusText('جاري استخراج الإطارات...');

    try {
      const video = videoRef.current;
      const duration = video.duration;
      
      if (duration > 15) {
         alert("الفيديو طويل جداً. يرجى استخدام فيديو لا يتجاوز 15 ثانية لتجنب حجم الملف الكبير جداً.");
         setIsConverting(false);
         return;
      }
      
      const totalFrames = Math.floor(duration * fps);
      const scale = resolutionScale / 100;
      const w = Math.round(video.videoWidth * scale);
      const h = Math.round(video.videoHeight * scale);

      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;

      const framePngs: Uint8Array[] = [];

      const wasPlaying = !video.paused;
      video.pause();

      for (let i = 0; i < totalFrames; i++) {
        const time = i / fps;
        video.currentTime = time;
        await new Promise(r => {
          const onSeeked = () => {
            video.removeEventListener('seeked', onSeeked);
            r(null);
          };
          video.addEventListener('seeked', onSeeked);
        });

        drawFrame(video, canvas, featherX, featherY);
        
        const hasAlpha = featherX > 0 || featherY > 0;
        const mimeType = hasAlpha ? 'image/png' : 'image/jpeg';
        const quality = hasAlpha ? undefined : 0.8;

        const imgBuffer = await new Promise<Uint8Array>(resolve => {
          canvas.toBlob(blob => {
            const reader = new FileReader();
            reader.onload = () => resolve(new Uint8Array(reader.result as ArrayBuffer));
            reader.readAsArrayBuffer(blob!);
          }, mimeType, quality);
        });
        framePngs.push(imgBuffer);
        setProgress(Math.round((i / totalFrames) * 50));
      }

      if (wasPlaying) video.play();

      setStatusText('جاري بناء ملف SVGA...');
      
      const root = parse(svgaSchema).root;
      const MovieEntity = root.lookupType("com.opensource.svga.MovieEntity");

      const images: Record<string, Uint8Array> = {};
      const sprites: any[] = [];
      const audios: any[] = [];

      if (audioFile) {
        setStatusText('جاري معالجة الصوت...');
        const audioBuffer = await audioFile.arrayBuffer();
        images['audio_0'] = new Uint8Array(audioBuffer);
        audios.push({
          audioKey: 'audio_0',
          startFrame: 0,
          endFrame: totalFrames,
          startTime: 0,
          totalTime: Math.floor(duration * 1000)
        });
      }

      for (let i = 0; i < totalFrames; i++) {
        const imageKey = `frame_${i}`;
        images[imageKey] = framePngs[i];

        const frames = [];
        for (let j = 0; j < totalFrames; j++) {
          frames.push({
            alpha: i === j ? 1.0 : 0.0,
            layout: { x: 0, y: 0, width: w, height: h },
            transform: { a: 1, b: 0, c: 0, d: 1, tx: 0, ty: 0 }
          });
        }

        sprites.push({
          imageKey: imageKey,
          frames: frames
        });
        setProgress(50 + Math.round((i / totalFrames) * 20));
      }

      const movie = {
        version: "2.0",
        params: { viewBoxWidth: w, viewBoxHeight: h, fps: fps, frames: totalFrames },
        images: images,
        sprites: sprites,
        audios: audios
      };

      setStatusText('جاري ضغط الملف...');
      const message = MovieEntity.create(movie);
      const buffer = MovieEntity.encode(message).finish();
      const deflated = pako.deflate(buffer);
      
      setProgress(100);
      setStatusText('تم الانتهاء!');

      const blob = new Blob([deflated], { type: 'application/octet-stream' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${videoFile.name.split('.')[0]}_converted.svga`;
      a.click();
      URL.revokeObjectURL(url);

    } catch (err) {
      console.error("Conversion Error:", err);
      alert("حدث خطأ أثناء التحويل.");
    } finally {
      setIsConverting(false);
    }
  };

  return (
    <div className="flex flex-col gap-8">
      {!videoFile ? (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl p-12 flex flex-col items-center justify-center min-h-[400px]">
          <input type="file" id="video-upload" accept="video/*" className="hidden" onChange={handleFileSelect} />
          <label htmlFor="video-upload" className="cursor-pointer flex flex-col items-center group">
            <div className="bg-indigo-600/20 p-6 rounded-full mb-6 group-hover:scale-110 transition-transform">
              <FileVideo size={48} className="text-indigo-500" />
            </div>
            <h2 className="text-2xl font-bold mb-2 text-white text-center">قم برفع فيديو للتحويل</h2>
            <p className="text-slate-400 text-center max-w-sm mt-2">اختر ملف فيديو لتحويله إلى صيغة SVGA مع إمكانية إضافة تأثير الشفافية للحواف.</p>
          </label>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl p-6 flex flex-col items-center">
            <h3 className="text-lg font-bold text-white mb-4 w-full text-right">المعاينة المباشرة</h3>
            <div className="relative w-full bg-slate-950 rounded-xl overflow-hidden flex items-center justify-center aspect-video border border-slate-800 bg-[url('https://www.transparenttextures.com/patterns/checkerboard.png')]">
              <video ref={videoRef} src={videoUrl} className="hidden" loop autoPlay muted playsInline />
              <canvas ref={canvasRef} className="max-w-full max-h-full object-contain drop-shadow-2xl" />
            </div>
          </div>
          
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 flex flex-col gap-6">
            <div className="flex items-center gap-3 text-indigo-400 border-b border-slate-800 pb-4">
              <Settings size={20} />
              <h3 className="font-bold text-lg">إعدادات التحويل</h3>
            </div>
            
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <label className="text-sm font-semibold text-slate-300 flex justify-between">
                  <span>جودة الفيديو (الدقة)</span>
                  <span className="text-indigo-400">{resolutionScale}%</span>
                </label>
                <input 
                  type="range" 
                  min="10" 
                  max="100" 
                  step="10"
                  value={resolutionScale} 
                  onChange={(e) => setResolutionScale(Number(e.target.value))}
                  className="w-full accent-indigo-500"
                />
                <p className="text-xs text-slate-500 mt-1">تقليل الجودة يقلل من حجم الملف بشكل كبير جداً.</p>
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-sm font-semibold text-slate-300 flex justify-between">
                  <span>معدل الإطارات (FPS)</span>
                  <span className="text-indigo-400">{fps}</span>
                </label>
                <input 
                  type="range" 
                  min="5" 
                  max="30" 
                  step="1"
                  value={fps} 
                  onChange={(e) => setFps(Number(e.target.value))}
                  className="w-full accent-indigo-500"
                />
              </div>

              <div className="w-full h-px bg-slate-800 my-2"></div>

              <div className="flex flex-col gap-2">
                <label className="text-sm font-semibold text-slate-300 flex justify-between">
                  <span>شفافية العرض (أفقي)</span>
                  <span className="text-indigo-400">{featherX}%</span>
                </label>
                <input 
                  type="range" 
                  min="0" 
                  max="50" 
                  value={featherX} 
                  onChange={(e) => setFeatherX(Number(e.target.value))}
                  className="w-full accent-indigo-500"
                />
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-sm font-semibold text-slate-300 flex justify-between">
                  <span>شفافية الطول (رأسي)</span>
                  <span className="text-indigo-400">{featherY}%</span>
                </label>
                <input 
                  type="range" 
                  min="0" 
                  max="50" 
                  value={featherY} 
                  onChange={(e) => setFeatherY(Number(e.target.value))}
                  className="w-full accent-indigo-500"
                />
              </div>
              <p className="text-xs text-slate-500 mt-1">يقوم بتنعيم حواف الفيديو وجعلها شفافة تدريجياً لدمجها مع أي خلفية.</p>
              
              <div className="flex flex-col gap-2 mt-4 border-t border-slate-800 pt-4">
                <label className="text-sm font-semibold text-slate-300 flex items-center gap-2">
                  <Music size={16} className="text-indigo-400" />
                  إضافة ملف صوتي (اختياري)
                </label>
                <div className="flex items-center gap-3">
                  <input 
                    type="file" 
                    id="audio-upload" 
                    accept="audio/*" 
                    className="hidden" 
                    onChange={handleAudioSelect} 
                  />
                  <label 
                    htmlFor="audio-upload" 
                    className="flex-1 cursor-pointer py-3 px-4 bg-slate-800/50 hover:bg-slate-800 border border-slate-700 rounded-xl text-sm text-center text-slate-300 transition-colors truncate"
                  >
                    {audioFile ? audioFile.name : 'اختر ملف صوتي'}
                  </label>
                  {audioFile && (
                    <button 
                      onClick={() => setAudioFile(null)}
                      className="p-3 text-red-400 hover:bg-red-500/10 rounded-xl transition-colors"
                      title="إزالة الصوت"
                    >
                      <X size={18} />
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div className="mt-auto pt-6">
              <button 
                onClick={convertToSVGA}
                disabled={isConverting}
                className="w-full py-4 bg-indigo-500/20 hover:bg-indigo-500/30 backdrop-blur-md border border-indigo-500/30 text-indigo-300 rounded-xl font-bold text-lg transition-all active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50 disabled:active:scale-100 shadow-[0_0_20px_rgba(99,102,241,0.1)]"
              >
                {isConverting ? (
                  <>
                    <Loader2 className="animate-spin" size={24} />
                    {statusText} ({progress}%)
                  </>
                ) : (
                  <>
                    <Download size={24} />
                    تحويل وتحميل SVGA
                  </>
                )}
              </button>
              
              <button 
                onClick={() => { setVideoFile(null); setVideoUrl(''); }}
                disabled={isConverting}
                className="w-full mt-3 py-3 bg-slate-700/30 hover:bg-slate-700/50 backdrop-blur-md border border-slate-700/50 text-slate-300 rounded-xl font-semibold transition-all disabled:opacity-50"
              >
                إلغاء واختيار فيديو آخر
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
