
import React, { useState } from 'react';
import { ImagePlus, Download, FileArchive, X, FileImage, Settings2 } from 'lucide-react';

interface ImageCompressorProps {}

export const ImageCompressor: React.FC<ImageCompressorProps> = () => {
  const [files, setFiles] = useState<File[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [compressing, setCompressing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState('');
  const [compressedZipUrl, setCompressedZipUrl] = useState<string | null>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files).filter((f: File) => f.type.startsWith('image/')) as File[];
      setFiles(prev => [...prev, ...newFiles]);
      setCompressedZipUrl(null);
    }
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const droppedFiles = Array.from(e.dataTransfer.files).filter((f: File) => f.type.startsWith('image/')) as File[];
    setFiles(prev => [...prev, ...droppedFiles]);
    setCompressedZipUrl(null);
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
    setCompressedZipUrl(null);
  };

  const compressAndZip = async () => {
    if (files.length === 0 || compressing) return;

    const JSZip = (window as any).JSZip;
    if (!JSZip) {
      alert("جاري تحميل المكتبات، يرجى المحاولة بعد قليل.");
      return;
    }

    setCompressing(true);
    setProgress(0);
    setStatus('جاري معالجة الملفات...');

    const zip = new JSZip();
    
    // جودة مرتفعة جداً (90%) لضمان عدم ملاحظة أي تغيير في الجودة
    const quality = 0.9; 

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        setStatus(`جاري تحسين: ${file.name}`);
        
        const compressedBlob = await new Promise<Blob>((resolve, reject) => {
          const reader = new FileReader();
          reader.readAsDataURL(file);
          reader.onload = (event) => {
            const img = new Image();
            img.src = event.target?.result as string;
            img.onload = () => {
              const canvas = document.createElement('canvas');
              const ctx = canvas.getContext('2d');
              
              if (!ctx) {
                reject(new Error('Failed to get canvas context'));
                return;
              }

              canvas.width = img.width;
              canvas.height = img.height;

              // تنظيف الكانفاس للحفاظ على الشفافية
              ctx.clearRect(0, 0, canvas.width, canvas.height);
              ctx.drawImage(img, 0, 0);
              
              // استخدام نفس صيغة الملف الأصلية (PNG أو JPEG)
              const originalMimeType = file.type;
              
              canvas.toBlob(
                (blob) => {
                  if (blob) {
                    // إذا كان الحجم الناتج أكبر من الأصلي (يحدث أحياناً مع PNG المحسنة)، نستخدم الملف الأصلي
                    if (blob.size > file.size) resolve(file);
                    else resolve(blob);
                  } else {
                    reject(new Error('Canvas toBlob failed'));
                  }
                },
                originalMimeType,
                originalMimeType === 'image/jpeg' ? quality : undefined
              );
            };
          };
          reader.onerror = reject;
        });

        // تصدير بنفس الاسم والامتداد الأصلي
        zip.file(file.name, compressedBlob);
        
        const currentProgress = Math.round(((i + 1) / files.length) * 100);
        setProgress(currentProgress);
      }

      setStatus('جاري تجميع الملفات في أرشيف ZIP...');
      const content = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(content);
      setCompressedZipUrl(url);
      setStatus('اكتملت المعالجة بنجاح!');
    } catch (err) {
      console.error(err);
      setStatus('حدث خطأ أثناء المعالجة.');
    } finally {
      setCompressing(false);
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl flex flex-col md:flex-row min-h-[400px]">
      {/* Left Side: Upload Area */}
      <div 
        className={`flex-1 p-8 flex flex-col items-center justify-center border-l border-slate-800 transition-all duration-300
          ${isDragging ? 'bg-slate-800/50' : 'bg-slate-900'}`}
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={onDrop}
      >
        <input 
          id="image-input" 
          type="file" 
          multiple 
          accept="image/*" 
          className="hidden" 
          onChange={handleFileSelect} 
        />
        
        <div 
          onClick={() => document.getElementById('image-input')?.click()}
          className="bg-slate-800 p-6 rounded-3xl mb-6 cursor-pointer hover:scale-105 transition-transform shadow-xl border border-slate-700 relative group"
        >
          <FileImage size={48} className="text-slate-400 group-hover:text-blue-500 transition-colors" />
        </div>
        
        <h2 className="text-xl font-bold mb-2 text-white">أداة معالجة الصور الاحترافية</h2>
        <p className="text-slate-400 text-center text-xs mb-4 max-w-[320px]">
          تحسين حجم الملفات مع الحفاظ على <span className="text-white font-bold">الأبعاد الأصلية</span> و <span className="text-white font-bold">الخلفية الشفافة</span> دون أي فقدان في الجودة.
        </p>
        
        <div className="flex gap-2 mb-8">
           <div className="flex items-center gap-1.5 px-3 py-1 bg-slate-800 rounded-full border border-slate-700 text-[10px] text-slate-400 font-bold">
              تنسيقات أصلية (PNG/JPG)
           </div>
           <div className="flex items-center gap-1.5 px-3 py-1 bg-slate-800 rounded-full border border-slate-700 text-[10px] text-slate-400 font-bold">
              جودة احترافية 90%
           </div>
        </div>

        {files.length > 0 && !compressing && !compressedZipUrl && (
          <button 
            onClick={compressAndZip}
            className="flex items-center gap-2 px-10 py-4 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white rounded-2xl font-bold text-sm transition-all active:scale-95 shadow-lg"
          >
            <Settings2 size={20} />
            معالجة {files.length} صورة
          </button>
        )}

        {compressing && (
          <div className="w-full max-w-[280px] space-y-4">
             <div className="flex justify-between items-end">
                <span className="text-[10px] text-slate-500 font-bold uppercase truncate max-w-[200px]">{status}</span>
                <span className="text-xl font-black text-white">{progress}%</span>
             </div>
             <div className="h-2.5 bg-slate-800 rounded-full overflow-hidden p-0.5 border border-slate-700">
                <div 
                  className="h-full bg-blue-600 rounded-full transition-all duration-300" 
                  style={{ width: `${progress}%` }}
                ></div>
             </div>
          </div>
        )}

        {compressedZipUrl && (
          <div className="flex flex-col items-center gap-4 animate-in fade-in zoom-in duration-500">
            <div className="bg-slate-800 border border-slate-700 px-4 py-2 rounded-xl text-slate-300 text-[11px] font-bold">
              تمت معالجة الصور بنجاح مع الحفاظ على التنسيق والشفافية.
            </div>
            <a 
              href={compressedZipUrl}
              download="FlexStudio_Processed_Images.zip"
              className="flex items-center gap-3 px-10 py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl font-black text-sm transition-all active:scale-95 shadow-xl shadow-blue-600/20"
            >
              <Download size={20} />
              تحميل الملف (ZIP)
            </a>
            <button 
               onClick={() => { setFiles([]); setCompressedZipUrl(null); }} 
               className="text-[10px] text-slate-500 hover:text-white transition-colors uppercase tracking-widest font-bold"
            >
              إلغاء والبدء من جديد
            </button>
          </div>
        )}
      </div>

      {/* Right Side: Files List */}
      <div className="w-full md:w-80 bg-slate-950/50 p-6 flex flex-col">
        <div className="flex items-center justify-between mb-4 border-b border-slate-800 pb-3">
           <h3 className="text-xs font-black text-slate-500 flex items-center gap-2 uppercase tracking-tighter">
             <FileArchive size={14} className="text-slate-400" />
             الملفات المختارة ({files.length})
           </h3>
           {files.length > 0 && (
             <button 
               onClick={() => { setFiles([]); setCompressedZipUrl(null); }} 
               className="text-[10px] text-red-500/70 hover:text-red-400 font-bold"
             >
               حذف الكل
             </button>
           )}
        </div>

        <div className="flex-1 overflow-y-auto max-h-[300px] md:max-h-none space-y-2 custom-scrollbar pr-1">
          {files.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center opacity-10 py-10">
               <FileArchive size={48} />
               <p className="text-[10px] mt-4 font-bold uppercase tracking-widest">لا توجد صور</p>
            </div>
          ) : (
            files.map((file, idx) => (
              <div key={idx} className="flex items-center gap-3 p-2.5 bg-slate-900/60 rounded-xl border border-slate-800 hover:border-slate-700 transition-all group">
                <div className="w-10 h-10 rounded-lg bg-slate-800 flex items-center justify-center text-[8px] font-bold overflow-hidden relative border border-white/5">
                  <div className="absolute inset-0 opacity-20 bg-[url('https://www.transparenttextures.com/patterns/checkerboard.png')] scale-50"></div>
                  <img src={URL.createObjectURL(file)} className="w-full h-full object-contain relative z-10" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-bold text-slate-200 truncate">{file.name}</p>
                  <p className="text-[8px] text-slate-500 font-mono mt-0.5 uppercase">{file.type.split('/')[1]} • {(file.size / (1024 * 1024)).toFixed(2)} MB</p>
                </div>
                <button onClick={() => removeFile(idx)} className="opacity-0 group-hover:opacity-100 p-1.5 text-slate-600 hover:text-red-400 transition-all">
                  <X size={14} />
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
