
import React from 'react';
import { useAuth } from './AuthContext';
import { User as UserIcon, Mail, Shield, Calendar, LogOut, ArrowRight, Zap } from 'lucide-react';
import { motion } from 'motion/react';

interface ProfilePageProps {
  onBack: () => void;
}

export const ProfilePage: React.FC<ProfilePageProps> = ({ onBack }) => {
  const { userData, logout } = useAuth();

  const formatDate = (date: any) => {
    if (!date) return 'غير معروف';
    const d = date.toDate ? date.toDate() : new Date(date);
    return d.toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' });
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center p-4" dir="rtl">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-2xl w-full"
      >
        {/* Back Button */}
        <button 
          onClick={onBack}
          className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors mb-6 group"
        >
          <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
          <span className="text-sm font-bold">العودة للرئيسية</span>
        </button>

        {/* Profile Card */}
        <div className="relative">
          <div className="relative bg-slate-900/30 border border-slate-800/50 rounded-[3rem] overflow-hidden shadow-2xl">
            {/* Profile Info */}
            <div className="px-8 py-10">
              <div className="flex flex-col md:flex-row items-center md:items-end gap-6 mb-8">
                <div className="relative">
                  <div className="w-32 h-32 rounded-full bg-slate-800 border border-slate-700 overflow-hidden shadow-2xl relative z-10 flex items-center justify-center transition-all">
                    {userData?.photoURL ? (
                      <img src={userData.photoURL} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-slate-500">
                        <UserIcon size={48} />
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex-1 text-center md:text-right md:mb-4">
                  <h1 className="text-3xl font-black text-white tracking-tight mb-1">
                    {userData?.displayName || 'مستخدم فليكس'}
                  </h1>
                  <div className="flex items-center gap-2 text-blue-400 font-bold text-xs uppercase tracking-widest">
                    <Shield size={14} />
                    <span>{userData?.role === 'admin' ? 'مسؤول النظام' : 'عضو مميز'}</span>
                  </div>
                </div>
              </div>

              {/* Details Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-10">
                <div className="bg-slate-800/30 border border-slate-800/50 rounded-2xl p-5 flex items-center gap-4 group transition-all">
                  <div className="p-3 bg-blue-500/10 rounded-xl text-blue-400">
                    <Mail size={20} />
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest mb-1">البريد الإلكتروني</p>
                    <p className="text-sm text-white font-medium">{userData?.email}</p>
                  </div>
                </div>

                <div className="bg-slate-800/30 border border-slate-800/50 rounded-2xl p-5 flex items-center gap-4 group transition-all">
                  <div className="p-3 bg-blue-500/10 rounded-xl text-blue-400">
                    <Calendar size={20} />
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest mb-1">تاريخ الانضمام</p>
                    <p className="text-sm text-white font-medium">{formatDate(userData?.createdAt)}</p>
                  </div>
                </div>

                <div className="bg-slate-800/30 border border-slate-800/50 rounded-2xl p-5 flex items-center gap-4 group transition-all">
                  <div className="p-3 bg-blue-500/10 rounded-xl text-blue-400">
                    <Zap size={20} />
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest mb-1">حالة الاشتراك</p>
                    {userData?.role === 'admin' ? (
                      <p className="text-sm text-amber-400 font-bold">اشتراك مسؤول (دائم)</p>
                    ) : userData?.subscriptionActive ? (
                      <div className="flex flex-col">
                        <p className="text-sm text-emerald-400 font-bold">مشترك نشط</p>
                        <p className="text-[9px] text-slate-500 mt-0.5">ينتهي في: {formatDate(userData.subscriptionExpires)}</p>
                      </div>
                    ) : (
                      <p className="text-sm text-red-400 font-bold">غير مشترك</p>
                    )}
                  </div>
                </div>

                <div className="bg-slate-800/30 border border-slate-800/50 rounded-2xl p-5 flex items-center gap-4 group transition-all">
                  <div className="p-3 bg-blue-500/10 rounded-xl text-blue-400">
                    <Shield size={20} />
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest mb-1">معرف المستخدم</p>
                    <p className="text-[10px] text-slate-400 font-mono truncate max-w-[150px]">{userData?.uid}</p>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex flex-col sm:flex-row gap-4">
                <button 
                  onClick={logout}
                  className="flex-1 flex items-center justify-center gap-3 py-4 bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/20 rounded-2xl font-black transition-all active:scale-[0.98]"
                >
                  <LogOut size={20} />
                  تسجيل الخروج من الحساب
                </button>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
