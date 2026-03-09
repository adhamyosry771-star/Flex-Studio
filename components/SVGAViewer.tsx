
import React, { useEffect, useRef, useState } from 'react';
import { 
  Play, 
  Pause, 
  Layers,
  Download,
  FileArchive,
  Video,
  Eye,
  EyeOff,
  ImagePlus
} from 'lucide-react';
import pako from 'pako';
import { parse } from 'protobufjs';
import { svgaSchema } from '../svga-proto';
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
  const [hiddenAssets, setHiddenAssets] = useState<Set<string>>(new Set());
  const [replacedAssets, setReplacedAssets] = useState<Record<string, File>>({});
  const [replacedAssetsUrls, setReplacedAssetsUrls] = useState<Record<string, string>>({});

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

  const toggleAssetVisibility = (assetId: string) => {
    if (!playerRef.current || !videoItemRef.current) return;
    
    setHiddenAssets(prev => {
      const newHidden = new Set(prev);
      if (newHidden.has(assetId)) {
        newHidden.delete(assetId);
      } else {
        newHidden.add(assetId);
      }
      
      const videoItem = videoItemRef.current;
      if (videoItem && videoItem.sprites) {
        if (newHidden.has(assetId)) {
          playerRef.current.setImage('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=', assetId);
        } else {
          const restoredUrl = replacedAssetsUrls[assetId] || assets.find(a => a.id === assetId)?.data;
          if (restoredUrl) {
            playerRef.current.setImage(restoredUrl, assetId);
          }
        }
      }
      
      return newHidden;
    });
  };

  const handleReplaceAsset = (assetId: string, file: File) => {
    const url = URL.createObjectURL(file);
    setReplacedAssets(prev => ({ ...prev, [assetId]: file }));
    setReplacedAssetsUrls(prev => ({ ...prev, [assetId]: url }));
    
    if (hiddenAssets.has(assetId)) {
      setHiddenAssets(prev => {
        const newHidden = new Set(prev);
        newHidden.delete(assetId);
        return newHidden;
      });
    }
    
    if (playerRef.current) {
      playerRef.current.setImage(url, assetId);
    }
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

      // Apply hidden assets to export player
      hiddenAssets.forEach(assetId => {
         exportPlayer.setImage('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=', assetId);
      });

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

  const exportAsAEProject = async () => {
    if (!playerRef.current || !videoItemRef.current || exporting) return;
    const JSZip = (window as any).JSZip;
    if (!JSZip) return alert("يرجى الانتظار لتحميل المكتبات اللازمة.");

    try {
      setExporting(true);
      setExportProgress(0);
      setExportStatus('جاري تحضير ملفات After Effects...');
      
      const zip = new JSZip();
      const assetsFolder = zip.folder("assets");
      const videoItem = videoItemRef.current;
      
      const imageKeys = Object.keys(videoItem.images);
      
      for (let i = 0; i < imageKeys.length; i++) {
        const key = imageKeys[i];
        let data = videoItem.images[key];
        let base64Data = "";
        if (typeof data === 'string') {
           base64Data = data.replace(/^data:image\/(png|jpg);base64,/, "");
        } else if (data.src) {
           base64Data = data.src.replace(/^data:image\/(png|jpg);base64,/, "");
        }
        
        if (base64Data) {
           assetsFolder?.file(`${key}.png`, base64Data, {base64: true});
        }
      }

      setExportProgress(30);
      setExportStatus('جاري توليد بيانات التحريك...');

      const width = videoItem.videoSize.width;
      const height = videoItem.videoSize.height;
      const fps = videoItem.FPS || 30;
      const totalFrames = videoItem.frames;
      const duration = totalFrames / fps;

      const spritesData = videoItem.sprites.map((sprite: any) => {
          return {
              imageKey: sprite.imageKey,
              frames: sprite.frames.map((f: any) => ({
                  alpha: f.alpha,
                  transform: f.transform ? {
                      a: f.transform.a,
                      b: f.transform.b,
                      c: f.transform.c,
                      d: f.transform.d,
                      tx: f.transform.tx,
                      ty: f.transform.ty
                  } : null
              }))
          };
      });

      zip.file("data.json", JSON.stringify(spritesData));

      setExportProgress(60);
      setExportStatus('جاري توليد سكربت JSX...');

      const fileNameWithoutExt = file.name.replace('.svga', '').replace(/"/g, '\\"');
      const jsxContent = `// Auto-generated After Effects Script from Flex Studio Pro
(function() {
    app.beginUndoGroup("Import SVGA");

    var compName = "${fileNameWithoutExt}";
    var compWidth = ${width};
    var compHeight = ${height};
    var compPixelAspect = 1;
    var compDuration = ${duration};
    var compFPS = ${fps};

    // Prompt user to select the assets folder
    var assetsFolder = Folder.selectDialog("Please select the 'assets' folder for " + compName);
    if (!assetsFolder) {
        alert("Operation cancelled. You must select the assets folder.");
        return;
    }

    // Look for data.json in the parent directory of the selected assets folder
    var dataFile = new File(assetsFolder.parent.fsName + "/data.json");
    if (!dataFile.exists) {
        // Fallback: look inside the assets folder just in case
        dataFile = new File(assetsFolder.fsName + "/data.json");
        if (!dataFile.exists) {
            alert("Could not find data.json! Please make sure it's in the same folder as the assets folder.");
            return;
        }
    }

    var myItemCollection = app.project.items;
    var myComp = myItemCollection.addComp(compName, compWidth, compHeight, compPixelAspect, compDuration, compFPS);
    myComp.openInViewer();

    var importedAssets = {};

    if (assetsFolder.exists) {
        var files = assetsFolder.getFiles("*.png");
        for (var i = 0; i < files.length; i++) {
            var importOptions = new ImportOptions(files[i]);
            if (importOptions.canImportAs(ImportAsType.FOOTAGE)) {
                var importedItem = app.project.importFile(importOptions);
                var keyName = decodeURIComponent(files[i].name).replace(".png", "");
                importedAssets[keyName] = importedItem;
            }
        }
    }

    dataFile.open("r");
    var jsonString = dataFile.read();
    dataFile.close();

    var sprites = eval("(" + jsonString + ")");

    for (var s = 0; s < sprites.length; s++) {
        var sprite = sprites[s];
        if (!sprite.imageKey || !importedAssets[sprite.imageKey]) continue;
        
        var assetItem = importedAssets[sprite.imageKey];
        var layer = myComp.layers.add(assetItem);
        layer.name = sprite.imageKey + "_" + s;
        
        layer.property("Anchor Point").setValue([0, 0]);
        
        var opacityProp = layer.property("Opacity");
        var positionProp = layer.property("Position");
        var scaleProp = layer.property("Scale");
        var rotationProp = layer.property("Rotation");

        for (var f = 0; f < sprite.frames.length; f++) {
            var frameData = sprite.frames[f];
            var time = f / compFPS;
            
            var alpha = frameData.alpha !== undefined ? frameData.alpha * 100 : 100;
            opacityProp.setValueAtTime(time, alpha);
            
            if (frameData.transform) {
                var t = frameData.transform;
                var scaleX = Math.sqrt(t.a * t.a + t.b * t.b);
                var scaleY = Math.sqrt(t.c * t.c + t.d * t.d);
                
                var det = t.a * t.d - t.b * t.c;
                if (det < 0) {
                    scaleY = -scaleY;
                }
                
                var rotation = 0;
                if (scaleX !== 0) {
                    rotation = Math.atan2(t.b, t.a) * (180 / Math.PI);
                } else if (scaleY !== 0) {
                    rotation = Math.atan2(-t.c, t.d) * (180 / Math.PI);
                }
                
                positionProp.setValueAtTime(time, [t.tx, t.ty]);
                scaleProp.setValueAtTime(time, [scaleX * 100, scaleY * 100]);
                rotationProp.setValueAtTime(time, rotation);
            }
        }
    }

    app.endUndoGroup();
    alert("تم استيراد مشروع SVGA بنجاح!");
})();`;

      zip.file(`${fileNameWithoutExt}.jsx`, jsxContent);

      setExportProgress(80);
      setExportStatus('جاري ضغط الملف وتحضير التحميل...');
      const content = await zip.generateAsync({type: "blob"});
      const link = document.createElement('a');
      link.href = URL.createObjectURL(content);
      link.download = `${file.name.replace('.svga', '')}_AE_Project.zip`;
      link.click();
      
      setExporting(false);
      setExportProgress(100);
    } catch (err) {
      console.error("AE Export Error:", err);
      setExporting(false);
      alert("حدث خطأ أثناء التصدير إلى After Effects.");
    }
  };

  const downloadModifiedSVGA = async () => {
    if (hiddenAssets.size === 0 && Object.keys(replacedAssets).length === 0) {
      const a = document.createElement('a');
      a.href = file.url;
      a.download = file.name;
      a.click();
      return;
    }

    try {
      setExporting(true);
      setExportStatus('جاري تعديل ملف SVGA...');
      setExportProgress(10);

      let buffer: ArrayBuffer;
      if (originalFile) {
        buffer = await originalFile.arrayBuffer();
      } else {
        const res = await fetch(file.url);
        buffer = await res.arrayBuffer();
      }

      setExportProgress(30);

      const uint8Array = new Uint8Array(buffer);
      const isZip = uint8Array[0] === 0x50 && uint8Array[1] === 0x4B && uint8Array[2] === 0x03 && uint8Array[3] === 0x04;

      const transparentPngBytes = new Uint8Array([
        137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 13, 73, 72, 68, 82, 
        0, 0, 0, 1, 0, 0, 0, 1, 8, 6, 0, 0, 0, 31, 21, 196, 137, 0, 
        0, 0, 11, 73, 68, 65, 84, 8, 215, 99, 96, 0, 2, 0, 0, 5, 0, 
        1, 226, 38, 5, 155, 0, 0, 0, 0, 73, 69, 78, 68, 174, 66, 96, 130
      ]);

      let finalBlob: Blob;

      if (isZip) {
        // SVGA 1.0 (ZIP)
        const JSZip = (window as any).JSZip;
        if (!JSZip) throw new Error("JSZip not loaded");
        
        const zip = await JSZip.loadAsync(buffer);
        setExportProgress(60);

        hiddenAssets.forEach(assetId => {
          const possibleNames = [assetId, `${assetId}.png`, `${assetId}.jpg`, `${assetId}.jpeg`];
          let found = false;
          for (const name of possibleNames) {
            if (zip.file(name)) {
              zip.file(name, transparentPngBytes);
              found = true;
            }
          }
          if (!found) {
            zip.file(assetId, transparentPngBytes);
            zip.file(`${assetId}.png`, transparentPngBytes);
          }
        });

        for (const [assetId, replaceFile] of Object.entries(replacedAssets)) {
          const replaceBuffer = await replaceFile.arrayBuffer();
          const replaceBytes = new Uint8Array(replaceBuffer);
          const possibleNames = [assetId, `${assetId}.png`, `${assetId}.jpg`, `${assetId}.jpeg`];
          let found = false;
          for (const name of possibleNames) {
            if (zip.file(name)) {
              zip.file(name, replaceBytes);
              found = true;
            }
          }
          if (!found) {
            zip.file(assetId, replaceBytes);
            zip.file(`${assetId}.png`, replaceBytes);
          }
        }

        setExportProgress(80);
        const content = await zip.generateAsync({type: "blob"});
        finalBlob = content;
      } else {
        // SVGA 2.0 (zlib + protobuf)
        setExportStatus('جاري فك ضغط الملف...');
        const inflated = pako.inflate(uint8Array);
        
        setExportProgress(50);
        setExportStatus('جاري تحليل البيانات...');
        
        const root = parse(svgaSchema).root;
        const MovieEntity = root.lookupType("com.opensource.svga.MovieEntity");
        
        const message = MovieEntity.decode(inflated) as any;
        
        setExportProgress(70);
        setExportStatus('جاري تطبيق التعديلات...');

        if (message.images) {
          hiddenAssets.forEach(assetId => {
            if (message.images[assetId]) {
              message.images[assetId] = transparentPngBytes;
            }
          });
          
          for (const [assetId, replaceFile] of Object.entries(replacedAssets)) {
            if (message.images[assetId]) {
              const replaceBuffer = await replaceFile.arrayBuffer();
              message.images[assetId] = new Uint8Array(replaceBuffer);
            }
          }
        }

        setExportProgress(80);
        setExportStatus('جاري إعادة ضغط الملف...');

        const encoded = MovieEntity.encode(message).finish();
        const deflated = pako.deflate(encoded);
        
        finalBlob = new Blob([deflated], { type: 'application/octet-stream' });
      }

      setExportProgress(90);
      setExportStatus('جاري حفظ الملف...');
      
      const url = URL.createObjectURL(finalBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${file.name.replace('.svga', '')}_modified.svga`;
      a.click();
      URL.revokeObjectURL(url);

      setExportProgress(100);
      setExporting(false);
    } catch (err) {
      console.error("SVGA Modify Error:", err);
      setExporting(false);
      alert("حدث خطأ أثناء تعديل وحفظ ملف SVGA. يرجى التأكد من صحة الملف.");
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
          <div className="flex items-center gap-2 flex-wrap justify-end">
             <button 
                onClick={exportAsAEProject}
                disabled={status !== PlayerStatus.PLAYING && status !== PlayerStatus.PAUSED || exporting}
                className="group flex items-center gap-2 px-4 py-2 bg-indigo-600/10 border border-indigo-500/50 text-indigo-400 rounded-xl text-xs font-bold hover:bg-indigo-600/20 transition-all disabled:opacity-30 active:scale-95 shadow-[0_0_15px_rgba(99,102,241,0.05)]"
             >
                <Video size={16} />
                تصدير لـ AE
             </button>
             <button 
                onClick={exportAsZip}
                disabled={status !== PlayerStatus.PLAYING && status !== PlayerStatus.PAUSED || exporting}
                className="group flex items-center gap-2 px-4 py-2 bg-blue-600/10 border border-blue-500/50 text-blue-400 rounded-xl text-xs font-bold hover:bg-blue-600/20 transition-all disabled:opacity-30 active:scale-95 shadow-[0_0_15px_rgba(59,130,246,0.05)]"
             >
                <FileArchive size={16} />
                تصدير لـ PNG
             </button>
             <div className="w-px h-6 bg-slate-800 mx-1"></div>
             <button 
                onClick={downloadModifiedSVGA} 
                className="group flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold transition-all active:scale-95"
                title="تحميل ملف SVGA (يتضمن التعديلات)"
             >
                <Download size={16} />
                تحميل SVGA
             </button>
             <button onClick={onClear} className="p-2 text-slate-500 hover:text-white transition-colors ml-2" title="إغلاق الملف">
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
            {assets.map((asset, idx) => {
              const isHidden = hiddenAssets.has(asset.id);
              const displaySrc = replacedAssetsUrls[asset.id] || asset.data;
              return (
              <div key={asset.id + idx} className={`group relative bg-slate-900 rounded-2xl border ${isHidden ? 'border-red-500/50 opacity-50' : 'border-slate-800 hover:border-indigo-500/50'} overflow-hidden transition-all duration-300`}>
                <div className="aspect-square relative bg-slate-800/30 p-4 flex items-center justify-center overflow-hidden">
                  <div className="absolute inset-0 opacity-20 bg-[url('https://www.transparenttextures.com/patterns/checkerboard.png')]"></div>
                  <img src={displaySrc} alt={asset.id} className={`relative max-w-full max-h-full object-contain drop-shadow-xl transition-transform duration-500 ${isHidden ? 'grayscale' : 'group-hover:scale-110'}`} />
                  <div className="absolute inset-0 bg-slate-950/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                     <button 
                       onClick={() => toggleAssetVisibility(asset.id)} 
                       className={`p-2 rounded-full text-white backdrop-blur-md transition-all active:scale-90 ${isHidden ? 'bg-green-500/20 hover:bg-green-500/40' : 'bg-red-500/20 hover:bg-red-500/40'}`}
                       title={isHidden ? "استرجاع القطعة" : "إخفاء القطعة"}
                     >
                      {isHidden ? <Eye size={16} /> : <EyeOff size={16} />}
                     </button>
                     <label 
                       className="p-2 bg-blue-500/20 hover:bg-blue-500/40 rounded-full text-white backdrop-blur-md transition-all active:scale-90 cursor-pointer"
                       title="استبدال القطعة"
                     >
                       <ImagePlus size={16} />
                       <input 
                         type="file" 
                         accept="image/*" 
                         className="hidden" 
                         onChange={(e) => {
                           if (e.target.files && e.target.files[0]) {
                             handleReplaceAsset(asset.id, e.target.files[0]);
                           }
                         }}
                       />
                     </label>
                     <button 
                       onClick={() => { const l=document.createElement('a'); l.href=displaySrc; l.download=`${asset.id}.png`; l.click(); }} 
                       className="p-2 bg-white/10 hover:bg-white/20 rounded-full text-white backdrop-blur-md transition-all active:scale-90"
                       title="تحميل القطعة"
                     >
                      <Download size={16} />
                     </button>
                  </div>
                </div>
                <div className="p-3 bg-slate-900/80 text-center border-t border-slate-800/50 flex flex-col gap-1">
                  <span className="text-[10px] font-mono text-slate-400 truncate block px-2">ID: {asset.id}</span>
                  {replacedAssetsUrls[asset.id] && <span className="text-[10px] text-blue-400 font-bold">مستبدلة</span>}
                </div>
              </div>
            )})}
          </div>
        </div>
      </div>
    </div>
  );
};
