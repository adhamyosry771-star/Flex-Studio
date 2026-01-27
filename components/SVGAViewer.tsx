
import React, { useEffect, useRef, useState } from 'react';
import { 
  Play, 
  Pause, 
  Layers,
  Download,
  FileArchive
} from 'lucide-react';
import { SVGAFileInfo, PlayerStatus } from '../types';

interface SVGAViewerProps {
  file: SVGAFileInfo;
  onClear: () => void;
  originalFile?: File; 
}

export const SVGAViewer: React.FC<SVGAViewerProps> = ({ file, onClear, originalFile }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<any>(null);
  const videoItemRef = useRef<any>(null);
  const [status, setStatus] = useState<PlayerStatus>(PlayerStatus.LOADING);
  const [isLoop] = useState(true);
  const [bgColor, setBgColor] = useState('#0f172a');
  const [progress, setProgress] = useState(0);
  const [currentFrame, setCurrentFrame] = useState(0);
  const [totalFrames, setTotalFrames] = useState(0);
  const [assets, setAssets] = useState<{id: string, data: string}[]>([]);
  const [exporting, setExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [exportStatus, setExportStatus] = useState('');

  const bgOptions = [
    { label: 'داكن', value: '#0f172a' },
    { label: 'أخضر', value: '#14532d' },
    { label: 'أبيض', value: '#ffffff' },
    { label: 'شفاف', value: 'transparent' },
  ];

  useEffect(() => {
    let isMounted = true;
    let player: any = null;

    const init = async () => {
      try {
        setStatus(PlayerStatus.LOADING);
        const SVGA: any = await new Promise((resolve) => {
          const check = () => (window as any).SVGA ? resolve((window as any).SVGA) : setTimeout(check, 100);
          check();
        });

        if (containerRef.current) containerRef.current.innerHTML = '';
        player = new SVGA.Player(containerRef.current);
        const parser = new SVGA.Parser();
        
        player.setContentMode('AspectFit'); 
        player.loops = isLoop ? 0 : 1;
        player.clearsAfterStop = false;

        player.onFrame((frame: number) => {
          if (isMounted) {
            setCurrentFrame(frame);
            if (totalFrames > 0) setProgress((frame / totalFrames) * 100);
          }
        });

        let source: string = file.url;
        if (originalFile) {
          source = await new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.readAsDataURL(originalFile);
          });
        }

        parser.load(source, (videoItem: any) => {
          if (!isMounted) return;
          if (videoItem.images) {
            const extracted = Object.keys(videoItem.images).map(key => ({
              id: key,
              data: typeof videoItem.images[key] === 'string' 
                ? (videoItem.images[key].startsWith('data') ? videoItem.images[key] : `data:image/png;base64,${videoItem.images[key]}`)
                : videoItem.images[key].src
            }));
            setAssets(extracted);
          }
          videoItemRef.current = videoItem;
          setTotalFrames(videoItem.frames);
          player.setVideoItem(videoItem);
          player.startAnimation();
          playerRef.current = player;
          setStatus(PlayerStatus.PLAYING);
        }, () => {
          if (isMounted) setStatus(PlayerStatus.ERROR);
        });
      } catch (err) {
        if (isMounted) setStatus(PlayerStatus.ERROR);
      }
    };
    init();
    return () => { isMounted = false; player?.stopAnimation(); };
  }, [file.url, originalFile, isLoop]);

  const togglePlay = () => {
    if (!playerRef.current) return;
    status === PlayerStatus.PLAYING ? playerRef.current.pauseAnimation() : playerRef.current.resumeAnimation();
    setStatus(status === PlayerStatus.PLAYING ? PlayerStatus.PAUSED : PlayerStatus.PLAYING);
  };

  const exportAsZip = async () => {
    if (!playerRef.current || !videoItemRef.current || exporting) return;
    const JSZip = (window as any).JSZip;
    if (!JSZip) return alert("يرجى الانتظار لتحميل المكتبات اللازمة.");

    try {
      setExporting(true);
      setExportProgress(0);
      setExportStatus('جاري تهيئة محرك الاستخراج...');
      
      playerRef.current.pauseAnimation();
      setStatus(PlayerStatus.PAUSED);

      const { width, height } = videoItemRef.current.videoSize;
      const zip = new JSZip();

      const exportContainer = document.createElement('div');
      exportContainer.style.position = 'fixed';
      exportContainer.style.left = '-9999px';
      exportContainer.style.top = '-9999px';
      exportContainer.style.width = `${width}px`;
      exportContainer.style.height = `${height}px`;
      exportContainer.style.backgroundColor = bgColor;
      document.body.appendChild(exportContainer);

      const SVGA = (window as any).SVGA;
      const exportPlayer = new SVGA.Player(exportContainer);
      exportPlayer.setContentMode('Fill'); 
      exportPlayer.setVideoItem(videoItemRef.current);

      await new Promise(r => setTimeout(r, 800));

      for (let i = 0; i < totalFrames; i++) {
        setExportStatus(`جاري التقاط الإطار ${i + 1} من ${totalFrames}...`);
        exportPlayer.stepToFrame(i, false);
        await new Promise(r => setTimeout(r, 100));
        
        const canvas = exportContainer.querySelector('canvas');
        if (canvas) {
          const dataUrl = canvas.toDataURL('image/png', 1.0);
          const base64Data = dataUrl.replace(/^data:image\/(png|jpg);base64,/, "");
          zip.file(`frame_${i.toString().padStart(5, '0')}.png`, base64Data, {base64: true});
        }
        setExportProgress(Math.round(((i + 1) / totalFrames) * 100));
      }

      setExportStatus('جاري ضغط الملف وتحضير التحميل...');
      const content = await zip.generateAsync({type: "blob"});
      const link = document.createElement('a');
      link.href = URL.createObjectURL(content);
      link.download = `${file.name.replace('.svga', '')}_Sequence.zip`;
      link.click();

      document.body.removeChild(exportContainer);
      exportPlayer.clear();
      
      setExporting(false);
      playerRef.current.resumeAnimation();
      setStatus(PlayerStatus.PLAYING);
    } catch (err) {
      console.error("Export Error:", err);
      setExporting(false);
      alert("حدث خطأ أثناء التصدير.");
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-slate-950">
      {exporting && (
        <div className="fixed inset-0 z-[100] bg-slate-950/98 backdrop-blur-3xl flex items-center justify-center p-6 text-right" dir="rtl">
          <div className="max-w-md w-full bg-slate-900 p-10 rounded-[2.5rem] border border-blue-500/20 shadow-2xl">
            <div className="flex items-center justify-between mb-10">
                <div className="w-16 h-16 border-4 border-blue-500/10 border-t-blue-500 rounded-full animate-spin flex items-center justify-center">
                    <FileArchive size={20} className="text-blue-500" />
                </div>
                <div className="text-right">
                    <h3 className="text-2xl font-black text-white">تصدير PNG</h3>
                    <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest mt-1">
                        {exportStatus}
                    </p>
                </div>
            </div>
            
            <div className="space-y-6">
                <div className="relative h-3 bg-slate-800 rounded-full overflow-hidden">
                  <div 
                    className="absolute inset-y-0 right-0 transition-all duration-300 bg-gradient-to-l from-blue-600 to-indigo-500"
                    style={{ width: `${exportProgress}%` }}
                  ></div>
                </div>

                <div className="flex justify-between items-end">
                    <div className="flex flex-col">
                        <span className="text-3xl font-black text-white">{exportProgress}%</span>
                        <span className="text-[10px] text-slate-500 font-bold">نسبة المعالجة</span>
                    </div>
                </div>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-col h-[500px] md:h-[600px] bg-slate-900 overflow-hidden shadow-2xl relative">
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/95 z-30">
          <div className="flex items-center gap-3">
            <h4 className="text-sm font-semibold text-white truncate max-w-[200px]">{file.name}</h4>
          </div>
          <div className="flex items-center gap-2">
             <button 
                onClick={exportAsZip}
                disabled={status !== PlayerStatus.PLAYING && status !== PlayerStatus.PAUSED || exporting}
                className="group flex items-center gap-2 px-5 py-2.5 bg-blue-600/10 border border-blue-500/50 text-blue-400 rounded-xl text-xs font-bold hover:bg-blue-600/20 transition-all disabled:opacity-30 active:scale-95 shadow-[0_0_15px_rgba(59,130,246,0.05)]"
             >
                <FileArchive size={16} />
                تصدير لـ PNG
             </button>
             <button onClick={onClear} className="p-2 text-slate-500 hover:text-white transition-colors">
                <Download size={18} className="rotate-180" />
             </button>
          </div>
        </div>

        <div className="flex-1 relative transition-colors duration-500" style={{ backgroundColor: bgColor }}>
          {status === PlayerStatus.LOADING && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 z-10 bg-slate-900/50">
              <div className="w-12 h-12 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin"></div>
              <p className="text-[10px] text-slate-400 font-bold tracking-widest uppercase">جاري تهيئة العرض...</p>
            </div>
          )}
          <div id="svga-player-container" ref={containerRef} className="w-full h-full pointer-events-none" />
        </div>

        <div className="p-5 bg-slate-950/95 border-t border-slate-800/50 z-30">
          <div className="max-w-4xl mx-auto flex flex-col gap-4">
            <div className="flex items-center gap-4">
              <span className="text-[10px] font-mono text-slate-500 w-12 text-center">{currentFrame} / {totalFrames}</span>
              <div className="flex-1 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                <div className="h-full bg-blue-500 transition-all duration-100" style={{ width: `${progress}%` }}></div>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <button onClick={togglePlay} className="w-10 h-10 flex items-center justify-center rounded-xl bg-blue-600 text-white hover:bg-blue-500 transition-all active:scale-90 shadow-lg shadow-blue-600/20">
                  {status === PlayerStatus.PLAYING ? <Pause size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" className="ml-0.5" />}
                </button>
              </div>
              
              <div className="flex gap-1 bg-slate-900 p-1 rounded-lg">
                {bgOptions.map(opt => (
                  <button key={opt.value} onClick={() => setBgColor(opt.value)} className={`px-3 py-1.5 rounded-md text-[10px] font-bold transition-all ${bgColor === opt.value ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-500 hover:text-slate-300'}`}>
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 p-8">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center gap-3 mb-10 border-b border-slate-800 pb-5">
            <div className="p-2 bg-indigo-500/10 rounded-lg">
              <Layers className="text-indigo-400" size={20} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white text-right">مكتبة العناصر</h3>
              <p className="text-xs text-slate-500 text-right">العناصر الصورية المكتشفة داخل ملف الـ SVGA</p>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-5">
            {assets.map((asset, idx) => (
              <div key={asset.id + idx} className="group relative bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden hover:border-indigo-500/50 transition-all duration-300">
                <div className="aspect-square relative bg-slate-800/30 p-4 flex items-center justify-center overflow-hidden">
                  <div className="absolute inset-0 opacity-20 bg-[url('https://www.transparenttextures.com/patterns/checkerboard.png')]"></div>
                  <img src={asset.data} alt={asset.id} className="relative max-w-full max-h-full object-contain drop-shadow-xl group-hover:scale-110 transition-transform duration-500" />
                  <div className="absolute inset-0 bg-slate-950/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                     <button onClick={() => { const l=document.createElement('a'); l.href=asset.data; l.download=`${asset.id}.png`; l.click(); }} className="p-3 bg-white/10 hover:bg-white/20 rounded-full text-white backdrop-blur-md transition-all active:scale-90">
                      <Download size={18} />
                     </button>
                  </div>
                </div>
                <div className="p-3 bg-slate-900/80 text-center border-t border-slate-800/50">
                  <span className="text-[10px] font-mono text-slate-400 truncate block px-2">ID: {asset.id}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
