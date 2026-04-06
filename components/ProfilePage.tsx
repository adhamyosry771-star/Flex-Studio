
import React, { useState, useRef, useEffect } from 'react';
import { auth, db } from '../firebase';
import { signOut, updateProfile, deleteUser, updateEmail, updatePassword } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { doc, updateDoc, deleteDoc, onSnapshot, collection, addDoc, serverTimestamp, query, orderBy, setDoc, where, getDocs, getDoc, increment, deleteField } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { AdminPanel } from './AdminPanel';
import { StoreModal } from './StoreModal';

interface ProfilePageProps {
  initialUserData: any;
  forceOpenWallet?: boolean;
  onWalletOpened?: () => void;
}

export const ProfilePage: React.FC<ProfilePageProps> = ({ initialUserData, forceOpenWallet, onWalletOpened }) => {
  const [isAdminPanelOpen, setIsAdminPanelOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isWalletOpen, setIsWalletOpen] = useState(false);
  const [isStoreOpen, setIsStoreOpen] = useState(false);
  const [isCPPageOpen, setIsCPPageOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [settingsView, setSettingsView] = useState<'main' | 'email' | 'password' | 'support'>('main');
  const [isUpdating, setIsUpdating] = useState(false);
  const [isImageUploading, setIsImageUploading] = useState(false);
  const [liveUserData, setLiveUserData] = useState<any>(initialUserData);
  const [hasUnreadSupport, setHasUnreadSupport] = useState(false);
  
  // CP Feature States
  const [partnerData, setPartnerData] = useState<any>(null);
  const [showCPRequestModal, setShowCPRequestModal] = useState(false);
  const [showCPBreakupModal, setShowCPBreakupModal] = useState(false);
  const [partnerSearchId, setPartnerSearchId] = useState('');
  const [isSearchingPartner, setIsSearchingPartner] = useState(false);
  const [showCPConfirmModal, setShowCPConfirmModal] = useState<{uid: string, name: string, photo: string} | null>(null);
  const [cpConfig, setCpConfig] = useState<{backgroundUrl?: string} | null>(null);

  const [newName, setNewName] = useState(initialUserData?.displayName || '');
  const [newBio, setNewBio] = useState(initialUserData?.bio || '');

  const [newAccountEmail, setNewAccountEmail] = useState('');
  const [newAccountPassword, setNewAccountPassword] = useState('');
  
  // Support Chat States
  const [supportMsg, setSupportMsg] = useState('');
  const [supportChat, setSupportChat] = useState<any[]>([]);
  const supportChatEndRef = useRef<HTMLDivElement>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const headerInputRef = useRef<HTMLInputElement>(null);
  
  const user = auth.currentUser;
  const isOfficialAdmin = user?.email === 'admin@yalla.com';
  const isAdmin = isOfficialAdmin || liveUserData?.role === 'admin';

  useEffect(() => {
    if (!user) return;
    const unsub = onSnapshot(doc(db, "users", user.uid), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (!isImageUploading) {
          setLiveUserData(data);
          setNewName(data.displayName || '');
          setNewBio(data.bio || '');
        }
      }
    });
    return () => unsub();
  }, [user, isImageUploading]);

  // CP Background Config Listener
  useEffect(() => {
    const unsub = onSnapshot(doc(db, "settings", "cp_config"), (snap) => {
      if (snap.exists()) {
        setCpConfig(snap.data());
      }
    });
    return unsub;
  }, []);

  // Listen for partner data if partnerUid exists
  useEffect(() => {
    if (liveUserData?.partnerUid) {
      const unsubPartner = onSnapshot(doc(db, "users", liveUserData.partnerUid), (docSnap) => {
        if (docSnap.exists()) {
          setPartnerData(docSnap.data());
        } else {
          setPartnerData(null);
        }
      });
      return unsubPartner;
    } else {
      setPartnerData(null);
    }
  }, [liveUserData?.partnerUid]);

  useEffect(() => {
    if (!user) return;
    const unsub = onSnapshot(doc(db, "supportChats", user.uid), (docSnap) => {
      if (docSnap.exists()) {
        setHasUnreadSupport(!!docSnap.data().unreadByUser);
      }
    });
    return () => unsub();
  }, [user]);

  useEffect(() => {
    if (user && settingsView === 'support') {
      updateDoc(doc(db, "supportChats", user.uid), { unreadByUser: false });
      const q = query(collection(db, "supportChats", user.uid, "messages"), orderBy("createdAt", "asc"));
      const unsub = onSnapshot(q, (snap) => {
        setSupportChat(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        setTimeout(() => supportChatEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
      });
      return unsub;
    }
  }, [user, settingsView]);

  useEffect(() => {
    if (forceOpenWallet) {
      setIsWalletOpen(true);
      if (onWalletOpened) onWalletOpened();
    }
  }, [forceOpenWallet]);

  const compressImage = (base64Str: string, maxWidth = 400, maxHeight = 400): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.src = base64Str;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        if (width > height) {
          if (width > maxWidth) { height *= maxWidth / width; width = maxWidth; }
        } else {
          if (height > maxHeight) { width *= maxHeight / height; height = maxHeight; }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.7));
      };
    });
  };

  const isVideoUrl = (url: string | null) => {
    if (!url) return false;
    return url.match(/\.(mp4|webm|ogg|mov)$/) !== null || url.includes('video');
  };

  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>, field: string) => {
    const file = e.target.files?.[0];
    if (file) {
      setIsImageUploading(true);
      const reader = new FileReader();
      reader.onloadend = async () => {
        const rawBase64 = reader.result as string;
        try {
          const compressedBase64 = await compressImage(rawBase64, field === 'headerURL' ? 800 : 400, field === 'headerURL' ? 400 : 400);
          setLiveUserData((prev: any) => ({ ...prev, [field]: compressedBase64 }));
          if (user) await updateDoc(doc(db, "users", user.uid), { [field]: compressedBase64 });
          if (field === 'photoURL' && user) await updateProfile(user, { photoURL: compressedBase64 });
          setTimeout(() => setIsImageUploading(false), 1000);
          alert("تم تحديث الصورة بنجاح");
        } catch (err) {
          alert("حجم الصورة كبير جداً");
          setIsImageUploading(false);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleUpdateProfileData = async () => {
    if (!user) return;
    setIsUpdating(true);
    try {
      await updateDoc(doc(db, "users", user.uid), { displayName: newName, bio: newBio });
      await updateProfile(user, { displayName: newName });
      setIsEditModalOpen(false);
      alert("تم تحديث البيانات");
    } catch (err) { alert("حدث خطأ"); }
    finally { setIsUpdating(false); }
  };

  const handleUpdateEmail = async () => {
    if (!user || !newAccountEmail.trim()) return;
    setIsUpdating(true);
    try {
      await updateEmail(user, newAccountEmail.trim());
      alert("تم تحديث البريد الإلكتروني بنجاح. يمكنك الآن تسجيل الدخول بالبريد الجديد.");
      setNewAccountEmail('');
      setSettingsView('main');
    } catch (err: any) {
      if (err.code === 'auth/requires-recent-login') {
        alert("للأمان، يرجى تسجيل الخروج والدخول مرة أخرى قبل تغيير البريد");
      } else {
        alert("فشل تحديث البريد: " + err.message);
      }
    } finally { setIsUpdating(false); }
  };

  const handleUpdatePassword = async () => {
    if (!user || !newAccountPassword.trim()) return;
    setIsUpdating(true);
    try {
      await updatePassword(user, newAccountPassword.trim());
      alert("تم تحديث كلمة المرور بنجاح. استخدم كلمة المرور الجديدة في المرة القادمة.");
      setNewAccountPassword('');
      setSettingsView('main');
    } catch (err: any) {
      if (err.code === 'auth/requires-recent-login') {
        alert("للأمان، يرجى تسجيل الخروج والدخول مرة أخرى قبل تغيير كلمة المرور");
      } else {
        alert("فشل تحديث كلمة المرور: " + err.message);
      }
    } finally { setIsUpdating(false); }
  };

  const handleSendSupportMsg = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !supportMsg.trim()) return;
    if (supportMsg.length > 250) return alert("الرسالة يجب أن لا تتجاوز 250 حرفاً");

    try {
      const chatRef = doc(db, "supportChats", user.uid);
      const activePhoto = liveUserData?.animatedAvatar || liveUserData?.photoURL || user.photoURL || "https://picsum.photos/200";
      
      await setDoc(chatRef, {
        userId: user.uid,
        userName: liveUserData?.displayName || user.displayName || 'مستخدم',
        userPhoto: activePhoto,
        lastMessage: supportMsg.trim(),
        lastTimestamp: serverTimestamp(),
        unreadByAdmin: true,
        unreadByUser: false
      }, { merge: true });

      await addDoc(collection(db, "supportChats", user.uid, "messages"), {
        senderId: user.uid,
        text: supportMsg.trim(),
        createdAt: serverTimestamp()
      });
      setSupportMsg('');
    } catch (e) { alert("فشل الإرسال"); }
  };

  const handleSearchPartner = async () => {
    if (!partnerSearchId.trim()) return;
    setIsSearchingPartner(true);
    try {
      const q = query(collection(db, "users"), where("customId", "==", partnerSearchId.trim()));
      const snap = await getDocs(q);
      if (snap.empty) {
        alert("لم يتم العثور على مستخدم بهذا الـ ID");
      } else {
        const found = snap.docs[0];
        const data = found.data();
        if (found.id === user?.uid) return alert("لا يمكنك طلب الارتباط بنفسك!");
        if (data.partnerUid) return alert("هذا المستخدم مرتبط بالفعل!");
        
        setShowCPConfirmModal({
          uid: found.id,
          name: data.displayName,
          photo: data.photoURL || data.animatedAvatar || "https://picsum.photos/100"
        });
        setShowCPRequestModal(false);
      }
    } catch (e) { alert("خطأ في البحث"); }
    finally { setIsSearchingPartner(false); }
  };

  const handleSendCPRequest = async () => {
    if (!showCPConfirmModal || !user) return;
    if ((liveUserData?.coins || 0) < 50000000) return alert("رصيدك غير كافٍ، تحتاج إلى 50,000,000 كوينز");

    setIsUpdating(true);
    try {
      // Deduct coins first
      await updateDoc(doc(db, "users", user.uid), {
        coins: increment(-50000000)
      });

      // Send relationship request notification
      await addDoc(collection(db, "users", showCPConfirmModal.uid, "systemNotifications"), {
        title: "طلب ارتباط (CP)",
        desc: `تقدم ${liveUserData.displayName} بربط علاقة معك`,
        type: 'cp_request',
        senderUid: user.uid,
        senderName: liveUserData.displayName,
        icon: 'fa-heart',
        createdAt: serverTimestamp()
      });

      alert("تم إرسال طلب الارتباط وخصم الكوينز. في حال الرفض ستعود الكوينز لحسابك.");
      setShowCPConfirmModal(null);
      setPartnerSearchId('');
    } catch (e) {
      alert("حدث خطأ أثناء إرسال الطلب");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleConfirmBreakup = async () => {
    if (!user || !liveUserData?.partnerUid) return;
    if ((liveUserData?.coins || 0) < 100000000) return alert("رصيدك غير كافٍ لفك الارتباط، تحتاج إلى 100,000,000 كوينز لتعويض الشريك");

    setIsUpdating(true);
    try {
      const partnerId = liveUserData.partnerUid;
      
      // 1. Deduct 100M from initiator and break link
      await updateDoc(doc(db, "users", user.uid), {
        coins: increment(-100000000),
        partnerUid: deleteField()
      });

      // 2. Compensate partner and break link
      await updateDoc(doc(db, "users", partnerId), {
        coins: increment(100000000),
        partnerUid: deleteField()
      });

      // 3. Send system notification to partner
      await addDoc(collection(db, "users", partnerId, "systemNotifications"), {
        title: "انفصال وتعويض",
        desc: `الشريك الآخر قام بفك العلاقة وقام بتعويضك بمبلغ 100,000,000 عملة ذهبية`,
        icon: 'fa-heart-broken',
        createdAt: serverTimestamp()
      });

      alert("تم إنهاء العلاقة وتعويض الشريك بنجاح");
      setShowCPBreakupModal(false);
      setIsCPPageOpen(false);
    } catch (e) {
      alert("حدث خطأ أثناء فك الارتباط");
    } finally {
      setIsUpdating(false);
    }
  };

  const userDisplayName = liveUserData?.displayName || user?.displayName || 'المستخدم';
  const userCustomId = liveUserData?.customId || (isOfficialAdmin ? 'OFFICIAL' : user?.uid.substring(0, 8));
  const userCoins = liveUserData?.coins || 0;
  const userCustomIdIcon = liveUserData?.customIdIcon;
  const currentFrame = liveUserData?.currentFrame || null;
  const idX = liveUserData?.idOffsetX ?? 28;
  const idY = liveUserData?.idOffsetY ?? 0.5;

  const currentActiveAvatar = liveUserData?.animatedAvatar || liveUserData?.photoURL || user?.photoURL || "https://picsum.photos/200";
  const partnerAvatar = partnerData?.animatedAvatar || partnerData?.photoURL || "https://picsum.photos/200";

  return (
    <div className="flex-1 overflow-y-auto bg-[#1a0b2e] text-purple-50 pb-10" dir="rtl">
      <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={(e) => handleImageSelect(e, 'photoURL')} />
      <input type="file" ref={headerInputRef} className="hidden" accept="image/*" onChange={(e) => handleImageSelect(e, 'headerURL')} />

      <div className="relative">
        <div className="h-44 w-full overflow-hidden relative group cursor-pointer" onClick={() => headerInputRef.current?.click()}>
          <img src={liveUserData?.headerURL || "https://picsum.photos/600/300?random=45"} className="w-full h-full object-cover opacity-40 group-hover:opacity-60 transition-all duration-300" alt="Cover" />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#1a0b2e]/60 to-[#1a0b2e]"></div>
          {isImageUploading && <div className="absolute inset-0 flex items-center justify-center bg-black/20 z-10"><i className="fas fa-circle-notch animate-spin text-white"></i></div>}
        </div>
        <div className="absolute top-6 left-6 z-30 flex gap-2">
          <button onClick={() => setIsEditModalOpen(true)} className="w-10 h-10 rounded-2xl bg-white/5 backdrop-blur-xl flex items-center justify-center border border-white/10 shadow-lg text-white active:scale-95 transition-all">
            <i className="fas fa-user-edit"></i>
          </button>
        </div>
        <div className="absolute top-28 right-6 left-6 flex items-center gap-3 z-20">
          <div className="relative flex-shrink-0 group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
            <div className={`${currentFrame ? 'w-[84px] h-[84px]' : 'w-[96px] h-[96px]'} relative flex items-center justify-center transition-all duration-300`}>
              <div className="w-[82%] h-[82%] rounded-full border-[3px] border-[#1a0b2e] shadow-2xl overflow-hidden bg-purple-900 z-10 relative">
                {liveUserData?.animatedAvatar ? (
                  isVideoUrl(liveUserData.animatedAvatar) ? (
                    <video src={liveUserData.animatedAvatar} autoPlay loop muted playsInline className="w-full h-full object-cover bg-slate-900" />
                  ) : (
                    <img src={liveUserData.animatedAvatar} className="w-full h-full object-cover bg-slate-900" alt="Profile" />
                  )
                ) : (
                  <img src={liveUserData?.photoURL || user?.photoURL || "https://picsum.photos/200"} className={`w-full h-full object-cover group-hover:opacity-70 transition-all ${isImageUploading ? 'opacity-50' : ''}`} alt="Profile" />
                )}
                {isImageUploading && <div className="absolute inset-0 flex items-center justify-center"><i className="fas fa-circle-notch animate-spin text-white text-xs"></i></div>}
              </div>
              {currentFrame && (
                <img src={currentFrame} className="absolute inset-0 w-full h-full object-contain pointer-events-none z-20 scale-[1.25] transition-transform duration-500" alt="frame" />
              )}
            </div>
          </div>
          <div className="flex flex-col min-w-0 flex-1 justify-center translate-y-1">
            <h2 className="text-2xl font-black text-white drop-shadow-2xl leading-none mb-2 truncate">{userDisplayName}</h2>
            {userCustomIdIcon ? (
              <div className="relative w-[90px] h-[28px] flex items-center bg-contain bg-center bg-no-repeat animate-in zoom-in duration-300" style={{ backgroundImage: `url(${userCustomIdIcon})` }}>
                <span className="text-[10px] font-black text-white tracking-widest text-center w-full block drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]" style={{ paddingLeft: `${idX}px`, paddingTop: `${idY}px` }}>{userCustomId}</span>
              </div>
            ) : (
              <span className={`text-[11px] font-black w-fit ${userCustomId === 'OFFICIAL' ? 'text-blue-400 bg-blue-500/10 border-blue-500/20' : 'text-purple-300 bg-white/5 border-white/5'} px-3 py-1 rounded-xl border tracking-wider`}>ID: {userCustomId}</span>
            )}
          </div>
        </div>
      </div>

      <div className="px-6 mt-14 relative z-10">
        <div className="grid grid-cols-3 gap-2 w-full">
          {['friends', 'following', 'followers'].map((type) => (
            <button key={type} className="bg-white/5 border border-white/5 p-3 rounded-2xl flex flex-col items-center active:scale-95 transition-transform">
              <span className="text-lg font-black text-purple-400">0</span>
              <span className="text-[9px] text-purple-300/60 font-black mt-1 uppercase">{type === 'friends' ? 'أصدقاء' : type === 'following' ? 'متابعة' : 'متابعين'}</span>
            </button>
          ))}
        </div>

        <div className="mt-8 space-y-4">
          <button onClick={() => setIsWalletOpen(true)} className="w-full flex justify-between items-center p-4 bg-white/5 border border-white/5 rounded-2xl active:scale-[0.98] transition-all group hover:bg-white/10">
            <div className="flex items-center gap-4">
              <div className="w-11 h-11 rounded-2xl bg-purple-500/20 flex items-center justify-center text-purple-400"><i className="fas fa-wallet text-lg"></i></div>
              <div className="flex flex-col items-start">
                <span className="font-bold text-sm text-white tracking-wide">المحفظة الإلكترونية</span>
                <span className="text-[10px] text-purple-300/60 font-black">{userCoins.toLocaleString('ar-EG')} <i className="fas fa-coins text-[8px] text-yellow-500"></i></span>
              </div>
            </div>
            <i className="fas fa-chevron-left text-xs text-white/10"></i>
          </button>

          <button onClick={() => setIsStoreOpen(true)} className="w-full flex justify-between items-center p-4 bg-gradient-to-r from-purple-600/10 to-pink-600/10 border border-purple-500/20 rounded-2xl active:scale-[0.98] transition-all group hover:from-purple-600/20 hover:to-pink-600/20 shadow-lg">
            <div className="flex items-center gap-4">
              <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white shadow-lg"><i className="fas fa-store text-lg"></i></div>
              <div className="flex flex-col items-start">
                <span className="font-bold text-sm text-white tracking-wide">متجر التميز</span>
                <span className="text-[10px] text-pink-300/60 font-black">إطارات • دخوليات • خلفيات</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="bg-pink-500/20 text-pink-400 text-[8px] font-black px-2 py-1 rounded-lg uppercase tracking-tighter">جديد</span>
              <i className="fas fa-chevron-left text-xs text-white/10"></i>
            </div>
          </button>

          {/* New CP Button (Standard style outside) */}
          <button onClick={() => setIsCPPageOpen(true)} className="w-full flex justify-between items-center p-4 bg-gradient-to-r from-rose-600/10 to-pink-600/10 border border-rose-500/20 rounded-2xl active:scale-[0.98] transition-all group hover:from-rose-600/20 hover:to-pink-600/20 shadow-lg">
            <div className="flex items-center gap-4">
              <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-rose-500 to-pink-500 flex items-center justify-center text-white shadow-lg"><i className="fas fa-heart text-lg"></i></div>
              <div className="flex flex-col items-start">
                <span className="font-bold text-sm text-white tracking-wide">CP</span>
                <span className="text-[10px] text-rose-300/60 font-black">شريك الأحلام</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {liveUserData?.partnerUid && <div className="w-6 h-6 rounded-full border border-rose-500/50 overflow-hidden shadow-sm animate-in zoom-in"><img src={partnerAvatar} className="w-full h-full object-cover" /></div>}
              <i className="fas fa-chevron-left text-xs text-white/10"></i>
            </div>
          </button>

          <button onClick={() => { setIsSettingsOpen(true); setSettingsView('main'); }} className="w-full flex justify-between items-center p-4 bg-white/5 border border-white/5 rounded-2xl active:scale-[0.98] transition-all group hover:bg-white/10">
            <div className="flex items-center gap-4">
              <div className="w-11 h-11 rounded-2xl bg-slate-500/20 flex items-center justify-center text-slate-300"><i className="fas fa-cog text-lg"></i></div>
              <div className="flex flex-col items-start">
                <span className="font-bold text-sm text-white tracking-wide">إعدادات الحساب</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {hasUnreadSupport && (
                <span className="w-1.5 h-1.5 bg-red-800 rounded-full"></span>
              )}
              <i className="fas fa-chevron-left text-xs text-white/10"></i>
            </div>
          </button>

          {isAdmin && (
            <button onClick={() => setIsAdminPanelOpen(true)} className="w-full flex justify-between items-center p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-2xl active:scale-[0.98] transition-all hover:bg-yellow-500/20">
              <div className="flex items-center gap-4">
                <div className="w-11 h-11 rounded-2xl bg-yellow-500/20 flex items-center justify-center text-yellow-500"><i className="fas fa-user-shield text-lg"></i></div>
                <span className="font-bold text-sm text-yellow-100 tracking-wide">لوحة تحكم المسؤول</span>
              </div>
              <i className="fas fa-chevron-left text-xs text-yellow-500/30"></i>
            </button>
          )}
        </div>
      </div>

      {isWalletOpen && (
        <div className="fixed inset-0 z-[500] bg-[#0d051a]/98 backdrop-blur-2xl flex items-center justify-center p-4 animate-in fade-in">
           <div className="w-full max-w-[320px] flex flex-col gap-5">
              <div className="flex justify-between items-center px-2">
                 <h3 className="text-lg font-black text-white">محفظتي</h3>
                 <button onClick={() => setIsWalletOpen(false)} className="w-9 h-9 rounded-xl bg-white/5 text-white flex items-center justify-center border border-white/10"><i className="fas fa-times text-xs"></i></button>
              </div>
              <div className="relative w-full aspect-[1.7/1] rounded-[2rem] overflow-hidden bg-gradient-to-br from-[#cda34b] via-[#b68e41] to-[#735b2e] shadow-2xl border border-white/10 p-6 flex flex-col justify-between">
                <div className="absolute top-0 left-0 w-full h-[50%] bg-gradient-to-b from-white/5 to-transparent"></div>
                <div className="flex justify-between items-start z-10"><span className="text-[9px] font-black text-[#3d3118] uppercase tracking-[0.2em] opacity-40">Private Wallet</span><div className="text-[#3d3118] font-black text-sm italic opacity-60">COINS</div></div>
                <div className="flex flex-col items-center z-10"><div className="flex items-center gap-2.5"><i className="fas fa-coins text-[#3d3118] text-2xl opacity-60"></i><span className="text-3xl font-black text-[#2a2210]">{userCoins.toLocaleString('ar-EG')}</span></div></div>
                <div className="flex flex-col z-10"><span className="text-[12px] font-black text-[#2a2210] tracking-widest uppercase truncate">{userDisplayName}</span><span className="text-[9px] font-bold text-[#3d3118] opacity-30">ID {userCustomId}</span></div>
              </div>
           </div>
        </div>
      )}

      {/* CP Internal Page */}
      {isCPPageOpen && (
        <div className="fixed inset-0 z-[550] bg-[#1a0b2e] flex flex-col animate-in slide-in-from-bottom duration-300">
          {/* Dynamic Full Screen Background */}
          <div className="absolute inset-0 z-0">
            {cpConfig?.backgroundUrl ? (
              isVideoUrl(cpConfig.backgroundUrl) ? (
                <video src={cpConfig.backgroundUrl} autoPlay loop muted playsInline className="w-full h-full object-cover" />
              ) : (
                <img src={cpConfig.backgroundUrl} className="w-full h-full object-cover" />
              )
            ) : (
              <div className="w-full h-full bg-[#1a0b2e]"></div>
            )}
            <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-black/80"></div>
          </div>

          {/* Transparent Minimalist Controls directly over background */}
          <div className="absolute top-6 left-6 right-6 flex justify-between items-center z-20 pointer-events-none">
            <button 
              onClick={() => setIsCPPageOpen(false)} 
              className="w-11 h-11 rounded-2xl bg-black/20 backdrop-blur-xl text-white flex items-center justify-center border border-white/10 active:scale-90 transition-all shadow-2xl pointer-events-auto"
            >
              <i className="fas fa-times"></i>
            </button>
            <h3 className="text-xl font-black text-white drop-shadow-xl pointer-events-auto">شريك الأحلام (CP)</h3>
          </div>

          <div className="flex-1 flex flex-col items-center justify-center p-8 space-y-12 relative z-10">
            <div className="flex items-center justify-center gap-10">
              {/* User Photo Circle */}
              <div className="flex flex-col items-center gap-3">
                <div className="w-24 h-24 rounded-full border-4 border-rose-500 shadow-[0_0_20px_rgba(244,63,94,0.3)] overflow-hidden bg-slate-900">
                  <img src={currentActiveAvatar} className="w-full h-full object-cover" alt="Me" />
                </div>
                <span className="text-[10px] font-black text-rose-300 uppercase tracking-widest drop-shadow-lg">أنا</span>
              </div>
              
              {/* Connector Heart Icon */}
              <div className={`text-rose-500/60 text-3xl drop-shadow-[0_0_15px_rgba(244,63,94,0.5)] ${liveUserData?.partnerUid ? 'animate-pulse' : ''}`}>
                <i className="fas fa-heart"></i>
              </div>

              {/* Partner Circle or Plus */}
              <div className="flex flex-col items-center gap-3">
                {liveUserData?.partnerUid ? (
                  <div className="w-24 h-24 rounded-full border-4 border-rose-500 shadow-[0_0_20px_rgba(244,63,94,0.3)] overflow-hidden bg-slate-900 animate-in zoom-in">
                    <img src={partnerAvatar} className="w-full h-full object-cover" alt="Partner" />
                  </div>
                ) : (
                  <button onClick={() => setShowCPRequestModal(true)} className="w-24 h-24 rounded-full border-4 border-dashed border-white/20 bg-white/5 backdrop-blur-sm flex items-center justify-center text-white/40 active:scale-95 transition-all hover:bg-white/10 hover:border-white/30 group shadow-2xl">
                    <i className="fas fa-plus text-2xl group-hover:text-rose-500 transition-colors"></i>
                  </button>
                )}
                <span className="text-[10px] font-black text-white/40 uppercase tracking-widest drop-shadow-lg">
                  {liveUserData?.partnerUid ? partnerData?.displayName : 'إضافة شريك'}
                </span>
              </div>
            </div>

            {!liveUserData?.partnerUid ? (
              <div className="text-center max-w-[280px] space-y-6">
                <div className="space-y-2">
                  <h4 className="text-white font-black text-base drop-shadow-lg">لم يتم العثور على شريك بعد</h4>
                  <p className="text-[11px] text-white/60 leading-relaxed font-bold drop-shadow-md">
                    قم بدعوة صديقك المفضل ليصبح شريك الأحلام الخاص بك وتظهر علاقتكما المميزة في ملفاتكما الشخصية.
                  </p>
                </div>
                <button onClick={() => setShowCPRequestModal(true)} className="px-10 py-4 bg-rose-500/5 backdrop-blur-md border border-rose-500/20 rounded-2xl text-rose-500 font-black text-xs shadow-2xl active:scale-95 transition-all">
                  بحث عن صديق بالـ ID
                </button>
              </div>
            ) : (
              <div className="text-center space-y-4 animate-in fade-in">
                 <p className="text-[11px] text-rose-300 font-black uppercase tracking-widest drop-shadow-lg">لقد وجدت شريك أحلامك!</p>
                 <button onClick={() => setShowCPBreakupModal(true)} className="bg-black/30 backdrop-blur-md px-6 py-2 rounded-full text-white/60 hover:text-red-400 transition-colors text-[9px] font-black uppercase border border-white/5">إنهاء العلاقة</button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* CP Request ID Modal */}
      {showCPRequestModal && (
        <div className="fixed inset-0 z-[700] bg-black/80 backdrop-blur-md flex items-center justify-center p-6 animate-in fade-in">
           <div className="bg-[#1a0b2e] w-full max-w-[300px] rounded-[2rem] border border-white/10 p-6 shadow-2xl flex flex-col gap-6">
              <div className="text-center space-y-1">
                <h4 className="text-white font-black text-sm">ارتباط جديد</h4>
                <p className="text-[10px] text-white/40 font-bold">ادخل ID صديقك المفضل</p>
              </div>
              <input 
                type="text" 
                value={partnerSearchId} 
                onChange={e => setPartnerSearchId(e.target.value)} 
                placeholder="ID الصديق..." 
                className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-xs text-white outline-none text-center font-black"
              />
              <div className="flex gap-2">
                <button 
                  onClick={handleSearchPartner} 
                  disabled={isSearchingPartner || !partnerSearchId.trim()}
                  className="flex-1 bg-rose-500/5 backdrop-blur-md border border-rose-500/20 py-3.5 rounded-xl text-[11px] font-black text-rose-500 shadow-lg active:scale-95 transition-all disabled:opacity-50"
                >
                  {isSearchingPartner ? <i className="fas fa-spinner animate-spin"></i> : 'بحث وإرسال'}
                </button>
                <button onClick={() => setShowCPRequestModal(false)} className="flex-1 bg-white/5 py-3.5 rounded-xl text-[11px] font-black text-white border border-white/10 active:scale-95">إلغاء</button>
              </div>
           </div>
        </div>
      )}

      {/* CP Confirmation Modal (50M Coins) */}
      {showCPConfirmModal && (
        <div className="fixed inset-0 z-[750] bg-black/90 backdrop-blur-xl flex items-center justify-center p-6 animate-in zoom-in">
           <div className="bg-[#1a0b2e] w-full max-w-[320px] rounded-[2.5rem] border border-white/10 p-8 shadow-2xl flex flex-col items-center gap-6 text-center">
              <div className="w-16 h-16 rounded-full border-2 border-rose-500 p-1">
                <img src={showCPConfirmModal.photo} className="w-full h-full rounded-full object-cover" />
              </div>
              <div className="space-y-2">
                <h4 className="text-white font-black text-sm">تأكيد طلب الارتباط</h4>
                <p className="text-[11px] text-rose-300 font-bold">هل أنت متأكد من طلب الارتباط بـ {showCPConfirmModal.name}؟</p>
              </div>
              <div className="bg-rose-500/10 border border-rose-500/20 rounded-2xl p-4 w-full">
                 <p className="text-[10px] text-white/60 font-bold mb-1">تكلفة الطلب:</p>
                 <div className="flex items-center justify-center gap-2">
                    <span className="text-xl font-black text-yellow-500">50,000,000</span>
                    <i className="fas fa-coins text-yellow-500 text-sm"></i>
                 </div>
              </div>
              <div className="flex flex-col gap-2 w-full">
                <button 
                  onClick={handleSendCPRequest}
                  disabled={isUpdating}
                  className="w-full bg-rose-600 py-4 rounded-2xl text-[12px] font-black text-white shadow-xl active:scale-95 transition-all border border-white/10"
                >
                  {isUpdating ? <i className="fas fa-spinner animate-spin"></i> : 'نعم، أرسل الطلب'}
                </button>
                <button onClick={() => setShowCPConfirmModal(null)} className="w-full py-3 text-[11px] font-black text-white/40 hover:text-white transition-colors">تراجع</button>
              </div>
           </div>
        </div>
      )}

      {/* CP Breakup Confirmation Modal (100M Coins Compensation) */}
      {showCPBreakupModal && (
        <div className="fixed inset-0 z-[750] bg-black/90 backdrop-blur-xl flex items-center justify-center p-6 animate-in zoom-in">
           <div className="bg-[#1a0b2e] w-full max-w-[320px] rounded-[2.5rem] border border-white/10 p-8 shadow-2xl flex flex-col items-center gap-6 text-center">
              <div className="w-16 h-16 rounded-full border-2 border-red-500 p-1">
                <i className="fas fa-heart-broken text-red-500 text-3xl flex items-center justify-center h-full"></i>
              </div>
              <div className="space-y-2">
                <h4 className="text-white font-black text-sm">تأكيد إنهاء العلاقة</h4>
                <p className="text-[11px] text-red-300 font-bold leading-relaxed">سيتم تعويض شريكك بـ 100,000,000 عملة ذهبية مقابل فك الارتباط. هل أنت متأكد؟</p>
              </div>
              <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-4 w-full">
                 <p className="text-[10px] text-white/60 font-bold mb-1">رسوم التعويض:</p>
                 <div className="flex items-center justify-center gap-2">
                    <span className="text-xl font-black text-yellow-500">100,000,000</span>
                    <i className="fas fa-coins text-yellow-500 text-sm"></i>
                 </div>
              </div>
              <div className="flex flex-col gap-2 w-full">
                <button 
                  onClick={handleConfirmBreakup}
                  disabled={isUpdating}
                  className="w-full bg-red-600 py-4 rounded-2xl text-[12px] font-black text-white shadow-xl active:scale-95 transition-all border border-white/10"
                >
                  {isUpdating ? <i className="fas fa-spinner animate-spin"></i> : 'نعم، فك الارتباط'}
                </button>
                <button onClick={() => setShowCPBreakupModal(false)} className="w-full py-3 text-[11px] font-black text-white/40 hover:text-white transition-colors">تراجع</button>
              </div>
           </div>
        </div>
      )}

      <StoreModal isOpen={isStoreOpen} onClose={() => setIsStoreOpen(false)} user={user} userCoins={userCoins} userPhoto={currentActiveAvatar} currentFrame={liveUserData?.currentFrame || null} currentEntry={liveUserData?.currentEntry || null} onOpenWallet={() => { setIsStoreOpen(false); setIsWalletOpen(true); }} />

      <AdminPanel isOpen={isAdminPanelOpen} onClose={() => setIsAdminPanelOpen(false)} isOfficialAdmin={isOfficialAdmin} />

      {isSettingsOpen && (
        <div className="fixed inset-0 z-[550] bg-[#1a0b2e] flex flex-col animate-in slide-in-from-bottom duration-300">
          <header className="p-5 flex justify-between items-center border-b border-white/5 bg-[#0d051a]">
            {settingsView !== 'main' ? (
              <button onClick={() => setSettingsView('main')} className="w-10 h-10 rounded-xl bg-white/5 text-white flex items-center justify-center border border-white/10 active:scale-95 transition-all">
                <i className="fas fa-arrow-right"></i>
              </button>
            ) : <div className="w-10"></div>}
            
            <h3 className="text-lg font-black text-white">
              {settingsView === 'main' ? 'إعدادات الحساب' : settingsView === 'email' ? 'تغيير بريد الحساب' : settingsView === 'password' ? 'تغيير كلمة المرور' : 'الدعم الفني'}
            </h3>
            
            <button onClick={() => { setIsSettingsOpen(false); setSettingsView('main'); }} className="w-10 h-10 rounded-xl bg-white/5 text-white flex items-center justify-center border border-white/10 active:scale-95 transition-all"><i className="fas fa-times"></i></button>
          </header>

          <div className="flex-1 overflow-y-auto p-6 scrollbar-hide flex flex-col">
            {settingsView === 'main' && (
              <div className="space-y-4 animate-in fade-in duration-300">
                <button 
                  onClick={() => setSettingsView('email')}
                  className="w-full flex justify-between items-center p-5 bg-white/5 border border-white/5 rounded-[2rem] active:scale-[0.98] transition-all hover:bg-white/10 shadow-lg"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-[1.2rem] bg-blue-600/20 flex items-center justify-center text-blue-400">
                      <i className="fas fa-envelope text-xl"></i>
                    </div>
                    <div className="flex flex-col items-start">
                      <span className="font-black text-sm text-white tracking-wide">تغيير بريد الحساب</span>
                      <span className="text-[10px] text-white/30 font-bold">تحديث البريد الإلكتروني الخاص بدخولك</span>
                    </div>
                  </div>
                  <i className="fas fa-chevron-left text-xs text-white/10"></i>
                </button>

                <button 
                  onClick={() => setSettingsView('password')}
                  className="w-full flex justify-between items-center p-5 bg-white/5 border border-white/5 rounded-[2rem] active:scale-[0.98] transition-all hover:bg-white/10 shadow-lg"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-[1.2rem] bg-purple-600/20 flex items-center justify-center text-purple-400">
                      <i className="fas fa-key text-xl"></i>
                    </div>
                    <div className="flex flex-col items-start">
                      <span className="font-black text-sm text-white tracking-wide">تغيير كلمة المرور</span>
                      <span className="text-[10px] text-white/30 font-bold">تحديث مفتاح الأمان الخاص بحسابك</span>
                    </div>
                  </div>
                  <i className="fas fa-chevron-left text-xs text-white/10"></i>
                </button>

                <button 
                  onClick={() => setSettingsView('support')}
                  className="w-full flex justify-between items-center p-5 bg-emerald-600/10 border border-emerald-500/20 rounded-[2rem] active:scale-[0.98] transition-all hover:bg-emerald-600/20 shadow-lg"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-[1.2rem] bg-emerald-600/20 flex items-center justify-center text-emerald-400">
                      <i className="fas fa-headset text-xl"></i>
                    </div>
                    <div className="flex flex-col items-start">
                      <span className="font-black text-sm text-white tracking-wide">الدعم الفني</span>
                      <span className="text-[10px] text-emerald-300/60 font-bold">تواصل مباشر مع فريق الدعم</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {hasUnreadSupport && (
                      <span className="w-1.5 h-1.5 bg-red-800 rounded-full"></span>
                    )}
                    <i className="fas fa-chevron-left text-xs text-white/10"></i>
                  </div>
                </button>

                <div className="pt-8 mt-8 border-t border-white/5">
                  <button 
                    onClick={() => { signOut(auth); setIsSettingsOpen(false); }} 
                    className="w-full py-5 bg-red-500/10 text-red-400 font-black rounded-[2rem] border border-red-500/20 active:bg-red-500 active:text-white transition-all flex items-center justify-center gap-3 shadow-xl"
                  >
                    <i className="fas fa-sign-out-alt"></i>
                    <span>تسجيل الخروج من الحساب</span>
                  </button>
                </div>
              </div>
            )}

            {settingsView === 'email' && (
              <div className="space-y-6 animate-in slide-in-from-left duration-300">
                <div className="bg-blue-600/10 p-6 rounded-[2rem] border border-blue-500/20">
                  <p className="text-[11px] text-blue-200/70 leading-relaxed font-bold">
                    * ملاحظة: عند تغيير البريد الإلكتروني، ستحتاج لاستخدامه في المرة القادمة لتسجيل الدخول. تأكد من أن البريد الجديد صالح وتستطيع الوصول إليه.
                  </p>
                </div>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-purple-400 uppercase tracking-widest mr-2">البريد الإلكتروني الجديد</label>
                    <input 
                      type="email" 
                      value={newAccountEmail} 
                      onChange={e => setNewAccountEmail(e.target.value)} 
                      placeholder="mail@example.com" 
                      className="w-full bg-white/5 border border-white/10 rounded-[1.5rem] py-5 px-6 text-sm text-white outline-none focus:border-purple-500 transition-all shadow-inner"
                    />
                  </div>
                  <button 
                    onClick={handleUpdateEmail}
                    disabled={isUpdating}
                    className="w-full py-5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-[1.5rem] text-sm font-black shadow-xl active:scale-95 transition-all border border-white/10 disabled:opacity-50"
                  >
                    {isUpdating ? <i className="fas fa-spinner animate-spin"></i> : 'تأكيد وحفظ البريد الجديد'}
                  </button>
                </div>
              </div>
            )}

            {settingsView === 'password' && (
              <div className="space-y-6 animate-in slide-in-from-left duration-300">
                <div className="bg-purple-600/10 p-6 rounded-[2rem] border border-blue-500/20">
                  <p className="text-[11px] text-purple-200/70 leading-relaxed font-bold">
                    * ملاحظة: يجب أن تكون كلمة المرور قوية (6 أحرف على الأقل). سيتم تطبيق التغيير فوراً على حسابك.
                  </p>
                </div>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-purple-400 uppercase tracking-widest mr-2">كلمة المرور الجديدة</label>
                    <input 
                      type="password" 
                      value={newAccountPassword} 
                      onChange={e => setNewAccountPassword(e.target.value)} 
                      placeholder="••••••••" 
                      className="w-full bg-white/5 border border-white/10 rounded-[1.5rem] py-5 px-6 text-sm text-white outline-none focus:border-purple-500 transition-all shadow-inner"
                    />
                  </div>
                  <button 
                    onClick={handleUpdatePassword}
                    disabled={isUpdating}
                    className="w-full py-5 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-[1.5rem] text-sm font-black shadow-xl active:scale-95 transition-all border border-white/10 disabled:opacity-50"
                  >
                    {isUpdating ? <i className="fas fa-spinner animate-spin"></i> : 'تأكيد وحفظ كلمة المرور'}
                  </button>
                </div>
              </div>
            )}

            {settingsView === 'support' && (
              <div className="flex-1 flex flex-col h-full animate-in slide-in-from-left duration-300">
                <div className="flex-1 overflow-y-auto space-y-4 px-1 py-4 scrollbar-hide min-h-[300px]">
                  {supportChat.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center opacity-30 gap-4 mt-20">
                       <i className="fas fa-comments text-5xl"></i>
                       <p className="text-xs font-black text-center max-w-[200px]">أهلاً بك في الدعم الفني، اكتب رسالتك وسنقوم بالرد عليك في أقرب وقت.</p>
                    </div>
                  ) : supportChat.map((msg, i) => {
                    const isFromMe = msg.senderId === user?.uid;
                    return (
                      <div key={msg.id || i} className={`flex items-start gap-3 ${isFromMe ? 'flex-row-reverse' : ''} animate-in fade-in`}>
                        <div className="w-10 h-10 rounded-2xl overflow-hidden flex-shrink-0 border border-white/10 shadow-lg bg-slate-900">
                          {isFromMe ? (
                             liveUserData?.animatedAvatar ? (
                               isVideoUrl(liveUserData.animatedAvatar) ? (
                                 <video src={liveUserData.animatedAvatar} autoPlay loop muted playsInline className="w-full h-full object-cover" />
                               ) : <img src={liveUserData.animatedAvatar} className="w-full h-full object-cover" />
                             ) : <img src={liveUserData?.photoURL || user?.photoURL || "https://picsum.photos/100"} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full bg-emerald-600 flex items-center justify-center text-white"><i className="fas fa-headset text-lg"></i></div>
                          )}
                        </div>
                        <div className={`flex flex-col ${isFromMe ? 'items-end' : 'items-start'} max-w-[75%]`}>
                          <span className="text-[9px] font-black text-white/30 mb-1">{isFromMe ? 'أنا' : 'خدمة العملاء'}</span>
                          <div className={`px-4 py-3 rounded-2xl text-[12px] font-bold shadow-xl break-words whitespace-pre-wrap ${isFromMe ? 'bg-purple-600 text-white rounded-tr-none' : 'bg-white/10 text-white rounded-tl-none border border-white/5'}`}>
                            {msg.text}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  <div ref={supportChatEndRef} />
                </div>
                
                <form onSubmit={handleSendSupportMsg} className="mt-4 pb-4">
                  <div className="relative flex items-center gap-3">
                    <div className="relative flex-1">
                      <textarea 
                        value={supportMsg} 
                        onChange={e => { if(e.target.value.length <= 250) setSupportMsg(e.target.value) }}
                        placeholder="اكتب رسالتك للدعم هنا..." 
                        className="w-full bg-white/5 border border-white/10 rounded-[1.8rem] py-4 pr-6 pl-14 text-xs text-white outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/20 transition-all shadow-inner h-14 resize-none"
                      />
                      <div className="absolute left-4 bottom-2.5">
                        <span className={`text-[8px] font-black ${supportMsg.length > 240 ? 'text-red-500' : 'text-white/20'}`}>{supportMsg.length}/250</span>
                      </div>
                    </div>
                    <button 
                      type="submit"
                      disabled={!supportMsg.trim()}
                      className="w-11 h-11 rounded-full bg-purple-600/30 backdrop-blur-md border border-purple-500/20 text-white flex items-center justify-center shadow-lg active:scale-90 transition-all disabled:opacity-30 flex-shrink-0"
                    >
                      <i className="fas fa-paper-plane text-xs"></i>
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>
        </div>
      )}

      {isEditModalOpen && (
        <div className="fixed inset-0 z-[600] bg-[#0d051a]/95 backdrop-blur-xl flex flex-col animate-in fade-in">
          <header className="p-5 flex justify-between items-center border-b border-white/5 bg-[#1a0b2e]">
            <h3 className="text-lg font-black text-white">تعديل الملف الشخصي</h3>
            <button onClick={() => setIsEditModalOpen(false)} className="w-8 h-8 rounded-lg bg-white/5 text-white flex items-center justify-center active:scale-95 transition-transform"><i className="fas fa-times"></i></button>
          </header>
          <div className="p-6 space-y-6 overflow-y-auto flex-1 scrollbar-hide">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-purple-400 uppercase tracking-widest mr-2">الاسم المستعار</label>
              <input type="text" value={newName} onChange={e => setNewName(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-5 text-sm text-white outline-none" />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-purple-400 uppercase tracking-widest mr-2">السيرة الذاتية (Bio)</label>
              <textarea value={newBio} onChange={e => setNewBio(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-5 text-sm text-white outline-none h-32" />
            </div>
            <button onClick={handleUpdateProfileData} disabled={isUpdating} className="w-full bg-gradient-to-r from-purple-600 to-pink-600 py-4 rounded-2xl font-black text-white shadow-lg active:scale-95 transition-transform">
              {isUpdating ? <i className="fas fa-spinner animate-spin"></i> : <span>حفظ التغييرات</span>}
            </button>
            <div className="pt-6 mt-6 border-t border-white/5">
              <button onClick={async () => { if (!confirm("حذف الحساب؟")) return; try { await deleteDoc(doc(db, "users", user!.uid)); await deleteUser(user!); alert("تم الحذف"); } catch (e) { alert("يجب إعادة تسجيل الدخول للإجراء الأمني"); signOut(auth); } }} disabled={isUpdating} className="w-full py-4 rounded-2xl font-black text-[10px] text-red-500 border border-red-500/20 bg-red-500/5 uppercase tracking-widest active:scale-95 transition-transform">حذف الحساب نهائياً</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
