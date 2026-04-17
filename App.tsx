
import React, { useState, useCallback } from 'react';
import { Header } from './components/Header';
import { SVGAViewer } from './components/SVGAViewer';
import { DropZone } from './components/DropZone';
import { VideoToSVGA } from './components/VideoToSVGA';
import { ImageMatcher } from './components/ImageMatcher';
import { ImageEditor } from './components/ImageEditor';
import { AuthProvider, useAuth } from './components/AuthContext';
import { Login } from './components/Login';
import { AdminDashboard } from './components/AdminDashboard';
import { ProfilePage } from './components/ProfilePage';
import { DynamicBackground } from './components/DynamicBackground';
import { SVGAFileInfo, SVGAFileExtended } from './types';
import { FolderUp, History, Info, Loader2, ShieldAlert, LogOut, Ticket, MessageCircle, X, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

const SubscriptionModal: React.FC<{ isOpen: boolean; onClose: () => void; mode?: 'activate' | 'extend' }> = ({ isOpen, onClose, mode = 'activate' }) => {
  const { activateCode } = useAuth();
  const [code, setCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleActivate = async () => {
    if (!code.trim()) return;
    setIsLoading(true);
    setError('');
    try {
      await activateCode(code);
      setSuccess(true);
      setTimeout(() => {
        onClose();
        setSuccess(false);
        setCode('');
      }, 2000);
    } catch (err: any) {
      setError(err.message || 'فشل تفعيل الكود');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  const isExtend = mode === 'extend';

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-slate-950/80"
      ></motion.div>
      
      <motion.div 
        initial={{ scale: 0.9, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        className="relative max-w-md w-full bg-slate-900/60 border border-slate-800 rounded-[2.5rem] p-8 shadow-2xl overflow-hidden"
        dir="rtl"
      >
        <div className="absolute top-0 right-0 w-32 h-32 bg-blue-600/10 blur-3xl rounded-full -translate-y-1/2 translate-x-1/2"></div>
        
        <button onClick={onClose} className="absolute top-6 left-6 text-slate-500 hover:text-white transition-colors">
          <X size={20} />
        </button>

        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-blue-600/10 rounded-2xl flex items-center justify-center text-blue-500 mx-auto mb-4 border border-blue-500/20">
            <Ticket size={32} />
          </div>
          <h2 className="text-2xl font-black text-white mb-2">
            {isExtend ? 'تمديد الاشتراك' : 'تفعيل الاشتراك'}
          </h2>
          <p className="text-slate-400 text-xs">
            {isExtend 
              ? 'يمكنك تمديد الاشتراك الخاص بك للحصول على فترة استخدام أكبر.' 
              : 'لا يمكنك استخدام خدمات الموقع بدون اشتراك نشط.'}
          </p>
        </div>

        {success ? (
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="py-10 text-center"
          >
            <CheckCircle2 size={48} className="text-emerald-400 mx-auto mb-4" />
            <p className="text-emerald-400 font-black">تم {isExtend ? 'تمديد' : 'تفعيل'} الاشتراك بنجاح!</p>
          </motion.div>
        ) : (
          <div className="space-y-6">
            <div className="relative flex items-center group">
              <Ticket className="absolute right-4 text-slate-500 group-focus-within:text-blue-400 transition-colors pointer-events-none z-10" size={18} />
              <input 
                type="text" 
                placeholder="أدخل كود التفعيل هنا" 
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="w-full bg-slate-800/30 border border-slate-700/50 rounded-2xl py-4 pr-12 pl-4 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500/50 transition-all text-sm font-mono uppercase tracking-widest"
              />
            </div>

            {error && (
              <p className="text-red-400 text-[10px] font-bold text-center bg-red-500/10 py-2 rounded-lg border border-red-500/10">{error}</p>
            )}

            <button 
              onClick={handleActivate}
              disabled={isLoading || !code.trim()}
              className="w-full py-4 bg-blue-600/10 hover:bg-blue-600/20 text-blue-400 border border-blue-500/30 rounded-full font-black text-sm transition-all flex items-center justify-center gap-2 active:scale-[0.98] disabled:opacity-50"
            >
              {isLoading ? <Loader2 className="animate-spin" size={18} /> : <Ticket size={18} />}
              {isExtend ? 'تمديد الاشتراك الآن' : 'تفعيل الكود الآن'}
            </button>

            <div className="pt-6 border-t border-slate-800">
              <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest text-center mb-4">أو تواصل معنا للاشتراك</p>
              <a 
                href="https://wa.me/201027833873" 
                target="_blank" 
                rel="noopener noreferrer"
                className="w-full py-4 bg-emerald-600/10 hover:bg-emerald-600/20 text-emerald-500 border border-emerald-500/20 rounded-2xl font-black text-sm transition-all flex items-center justify-center gap-3 group"
              >
                <MessageCircle size={20} className="group-hover:rotate-12 transition-transform" />
                تواصل عبر واتساب
              </a>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
};

const AppContent: React.FC = () => {
  const { user, loading, isBanned, isAdmin, isSubscribed, logout, userData, appSettings } = useAuth();
  const [currentFiles, setCurrentFiles] = useState<SVGAFileExtended[]>([]);
  const [history, setHistory] = useState<SVGAFileExtended[]>([]);
  const [currentView, setCurrentView] = useState<'viewer' | 'converter' | 'image-editor' | 'matcher' | 'admin' | 'profile'>('viewer');
  const [showSubModal, setShowSubModal] = useState(false);
  const [subModalMode, setSubModalMode] = useState<'activate' | 'extend'>('activate');

  const handleViewChange = (view: any) => {
    if (view === 'profile' || view === 'admin') {
      setCurrentView(view);
      return;
    }

    if (!isSubscribed && !isAdmin) {
      setSubModalMode('activate');
      setShowSubModal(true);
      return;
    }
    setCurrentView(view);
  };

  const handleFilesUpload = useCallback((files: File[]) => {
    if (!isSubscribed && !isAdmin) {
      setSubModalMode('activate');
      setShowSubModal(true);
      return;
    }
    const newFilesInfo: SVGAFileExtended[] = files.map(file => ({
      name: file.name,
      size: file.size,
      type: file.type,
      lastModified: file.lastModified,
      url: URL.createObjectURL(file),
      rawFile: file
    }));
    
    setCurrentFiles(prev => [...prev, ...newFilesInfo]);
    setHistory(prev => {
      const newNames = newFilesInfo.map(f => f.name);
      const filtered = prev.filter(p => !newNames.includes(p.name));
      return [...newFilesInfo, ...filtered].slice(0, 20);
    });
  }, [isSubscribed, isAdmin]);

  const handleHistoryClick = (item: SVGAFileExtended) => {
    setCurrentFiles(prev => {
      if (prev.find(p => p.name === item.name)) return prev;
      return [...prev, item];
    });
  };

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center gap-4">
        <Loader2 className="text-blue-500 animate-spin" size={40} />
        <p className="text-slate-500 text-sm font-bold tracking-widest uppercase">جاري التحميل...</p>
      </div>
    );
  }

  if (!user) {
    return <Login />;
  }

  if (isBanned) {
    return <Login banInfo={userData} />;
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-950 text-right relative" dir="rtl">
      {/* Dynamic Background */}
      <DynamicBackground url={appSettings?.mainBgURL} overlayOpacity={0.8} />

      <div className="relative z-10 flex flex-col min-h-screen">
        <Header currentView={currentView} setCurrentView={handleViewChange} />
        
        <main className="flex-1 container mx-auto px-4 py-8">
          <AnimatePresence mode="wait">
            {currentView === 'profile' ? (
              <motion.div key="profile" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}>
                <ProfilePage onBack={() => setCurrentView('viewer')} onActivateClick={() => {
                  setSubModalMode('extend');
                  setShowSubModal(true);
                }} />
              </motion.div>
            ) : currentView === 'admin' ? (
              <motion.div key="admin" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}>
                <AdminDashboard />
              </motion.div>
            ) : currentView === 'converter' ? (
              <motion.div key="converter" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                <VideoToSVGA />
              </motion.div>
            ) : currentView === 'image-editor' ? (
              <motion.div key="image-editor" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                <ImageEditor />
              </motion.div>
            ) : currentView === 'matcher' ? (
              <motion.div key="matcher" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                <ImageMatcher />
              </motion.div>
            ) : currentFiles.length === 0 ? (
              <motion.div key="viewer-empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col lg:flex-row gap-8">
                <div className="flex-1">
                  <div 
                    className="bg-slate-900/50 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl relative"
                    onClickCapture={(e) => {
                      if (!isSubscribed && !isAdmin) {
                        e.stopPropagation();
                        setShowSubModal(true);
                      }
                    }}
                  >
                    <DropZone onFilesSelect={handleFilesUpload} />
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
                            onClick={() => handleHistoryClick(item)}
                            className="flex items-center gap-3 p-3 rounded-full border border-transparent bg-slate-800/40 hover:border-slate-700 text-slate-300 transition-all text-right group"
                          >
                            <div className="bg-slate-800 p-2 rounded-full group-hover:bg-slate-700">
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
              </motion.div>
            ) : (
              <motion.div key="viewer-files" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col gap-8">
                <div className="flex justify-between items-center bg-slate-900/50 p-4 rounded-2xl border border-slate-800">
                  <h2 className="text-white font-bold">الملفات المفتوحة ({currentFiles.length})</h2>
                  <button 
                    onClick={() => document.getElementById('add-more-files')?.click()} 
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-full text-sm font-bold transition-all"
                  >
                    إضافة ملفات أخرى
                  </button>
                  <input 
                    id="add-more-files" 
                    type="file" 
                    className="hidden" 
                    accept=".svga"
                    multiple
                    onChange={(e) => {
                      const files = (Array.from(e.target.files || []) as File[]).filter(f => f.name.toLowerCase().endsWith('.svga'));
                      if (files.length > 0) handleFilesUpload(files);
                      e.target.value = '';
                    }}
                  />
                </div>
  
                <div className={`grid gap-8 ${currentFiles.length === 1 ? 'grid-cols-1' : currentFiles.length === 2 ? 'grid-cols-1 xl:grid-cols-2' : 'grid-cols-1 lg:grid-cols-2 xl:grid-cols-3'}`}>
                  {currentFiles.map((file, idx) => (
                    <div key={`${file.name}-${idx}`} className="flex flex-col gap-4">
                      <SVGAViewer 
                        file={file} 
                        onClear={() => setCurrentFiles(prev => prev.filter(f => f !== file))} 
                        originalFile={file.rawFile}
                      />
  
                      <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <p className="text-[10px] text-slate-500 mb-1 uppercase">اسم الملف</p>
                            <p className="text-xs font-bold truncate text-white" title={file.name}>{file.name}</p>
                          </div>
                          <div>
                            <p className="text-[10px] text-slate-500 mb-1 uppercase">حجم البيانات</p>
                            <p className="text-xs font-bold text-white">{formatSize(file.size)}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </main>
  
        <SubscriptionModal isOpen={showSubModal} onClose={() => setShowSubModal(false)} mode={subModalMode} />
  
        <footer className="py-8 text-center">
           <p className="text-xs text-slate-600 font-medium">تم التطوير بواسطة فليكس - Flex Studio Pro 2026</p>
        </footer>
      </div>
    </div>
  );
};

const App: React.FC = () => {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
};

export default App;
