
import React, { useState } from 'react';
import { UploadCloud, FileType } from 'lucide-react';

interface DropZoneProps {
  onFileSelect: (file: File) => void;
}

export const DropZone: React.FC<DropZoneProps> = ({ onFileSelect }) => {
  const [isDragging, setIsDragging] = useState(false);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    if (files.length > 0 && files[0].name.toLowerCase().endsWith('.svga')) {
      onFileSelect(files[0]);
    } else {
      alert('يرجى اختيار ملف SVGA صالح (.svga)');
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      onFileSelect(files[0]);
    }
  };

  return (
    <div 
      className={`relative min-h-[400px] flex flex-col items-center justify-center p-8 transition-all duration-300 border-2 border-dashed rounded-3xl cursor-pointer
        ${isDragging 
          ? 'bg-blue-600/10 border-blue-500 scale-[0.99]' 
          : 'bg-slate-900 border-slate-800 hover:border-slate-700 hover:bg-slate-800/50'
        }`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={() => document.getElementById('file-input')?.click()}
    >
      <input 
        id="file-input" 
        type="file" 
        className="hidden" 
        accept=".svga"
        onChange={handleFileInput}
      />
      
      <div className="bg-slate-800 p-6 rounded-full mb-6 group-hover:scale-110 transition-transform shadow-xl">
        <UploadCloud size={48} className="text-blue-500" />
      </div>
      
      <h2 className="text-2xl font-bold mb-2 text-white text-center">قم بسحب ملف SVGA هنا</h2>
      <p className="text-slate-400 text-center mb-8 max-w-sm">
        أو انقر لاختيار ملف من جهازك. يدعم العارض ملفات SVGA ذات الرسوم المتحركة المتجهة.
      </p>

      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 bg-slate-800/50 px-4 py-2 rounded-xl text-xs text-slate-400">
          <FileType size={14} />
          <span>تنسيق مدعوم: .svga</span>
        </div>
      </div>

      <div className="absolute inset-0 -z-10 opacity-10 overflow-hidden pointer-events-none">
        <div className="absolute top-10 left-10 w-32 h-32 bg-blue-500 rounded-full blur-3xl"></div>
        <div className="absolute bottom-10 right-10 w-32 h-32 bg-indigo-500 rounded-full blur-3xl"></div>
      </div>
    </div>
  );
};
