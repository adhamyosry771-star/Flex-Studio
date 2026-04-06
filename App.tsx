
import React, { useState, useCallback } from 'react';
import { Header } from './components/Header';
import { SVGAViewer } from './components/SVGAViewer';
import { DropZone } from './components/DropZone';
import { VideoToSVGA } from './components/VideoToSVGA';
import { ImageMatcher } from './components/ImageMatcher';
import { SVGAFileInfo } from './types';
import { FolderUp, History, Info } from 'lucide-react';

interface SVGAFileExtended extends SVGAFileInfo {
  rawFile?: File;
}

const App: React.FC = () => {
  const [currentFile, setCurrentFile] = useState<SVGAFileExtended | null>(null);
  const [history, setHistory] = useState<SVGAFileExtended[]>([]);
  const [currentView, setCurrentView] = useState<'viewer' | 'converter' | 'matcher'>('viewer');

  const handleFileUpload = useCallback((file: File) => {
    const url = URL.createObjectURL(file);
    const fileInfo: SVGAFileExtended = {
      name: file.name,
      size: file.size,
      type: file.type,
      lastModified: file.lastModified,
      url: url,
      rawFile: file
    };
    
    setCurrentFile(fileInfo);
    setHistory(prev => {
      const filtered = prev.filter(p => p.name !== fileInfo.name);
      return [fileInfo, ...filtered.slice(0, 9)];
    });
  }, []);

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-950 text-right" dir="rtl">
      <Header currentView={currentView} setCurrentView={setCurrentView} />
      
      <main className="flex-1 container mx-auto px-4 py-8">
        {currentView === 'converter' ? (
          <VideoToSVGA />
        ) : currentView === 'matcher' ? (
          <ImageMatcher />
        ) : !currentFile ? (
          <div className="flex flex-col lg:flex-row gap-8">
            <div className="flex-1">
              <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl">
                <DropZone onFileSelect={handleFileUpload} />
              </div>
            </div>

            <div className="w-full lg:w-80">
              <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6 h-full min-h-[400px]">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-2 text-blue-400">
                    <History size={20} />
                    <h2 className="font-bold text-lg">السجل</h2>
                  </div>
                </div>

                {history.length > 0 ? (
                  <div className="flex flex-col gap-3">
                    {history.map((item, idx) => (
                      <button
                        key={`${item.name}-${idx}`}
                        onClick={() => setCurrentFile(item)}
                        className="flex items-center gap-3 p-3 rounded-xl border border-transparent bg-slate-800/40 hover:border-slate-700 text-slate-300 transition-all text-right group"
                      >
                        <div className="bg-slate-800 p-2 rounded-lg group-hover:bg-slate-700">
                          <FolderUp size={16} className="text-blue-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{item.name}</p>
                          <p className="text-[10px] text-slate-500">{formatSize(item.size)}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center text-slate-500 py-20">
                    <History size={40} className="mb-4 opacity-20" />
                    <p className="text-xs">السجل فارغ</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-8">
            <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl">
              <SVGAViewer 
                file={currentFile} 
                onClear={() => setCurrentFile(null)} 
                originalFile={currentFile.rawFile}
              />
            </div>

            <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6 backdrop-blur-sm">
              <div className="flex items-center gap-3 mb-4 text-slate-400">
                <Info size={18} />
                <h3 className="font-semibold text-xs uppercase tracking-wider">خصائص ملف الرسوم</h3>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                <div>
                  <p className="text-[10px] text-slate-500 mb-1 uppercase">اسم الملف</p>
                  <p className="text-sm font-bold truncate text-white">{currentFile.name}</p>
                </div>
                <div>
                  <p className="text-[10px] text-slate-500 mb-1 uppercase">حجم البيانات</p>
                  <p className="text-sm font-bold text-white">{formatSize(currentFile.size)}</p>
                </div>
                <div>
                  <p className="text-[10px] text-slate-500 mb-1 uppercase">التنسيق</p>
                  <p className="text-sm font-bold text-blue-400">Flex Engine v2.0</p>
                </div>
                <div>
                  <p className="text-[10px] text-slate-500 mb-1 uppercase">آخر تحديث</p>
                  <p className="text-sm font-bold text-white">
                    {new Date(currentFile.lastModified).toLocaleDateString('ar-EG', { day: 'numeric', month: 'long' })}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      <footer className="py-8 border-t border-slate-900 text-center">
         <p className="text-xs text-slate-600 font-medium">تم التطوير بواسطة فليكس - Flex Studio Pro 2026</p>
      </footer>
    </div>
  );
};

export default App;
