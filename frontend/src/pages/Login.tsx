import React, { useState } from 'react';
import { LogIn, User, Lock, AlertCircle } from 'lucide-react';
import { authService } from '../services/api';
import Button from '../components/Button';
import Input from '../components/Input';

interface LoginProps {
  onLoginSuccess: (employee: { id: string; username: string; name: string }) => void;
}

export const Login: React.FC<LoginProps> = ({ onLoginSuccess }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) {
      setError('يرجى كتابة اسم المستخدم وكلمة المرور');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const data = await authService.login({
        username: username.toLowerCase().trim(),
        password: password,
      });

      localStorage.setItem('token', data.token);
      localStorage.setItem('employee', JSON.stringify(data.employee));
      onLoginSuccess(data.employee);
    } catch (err: any) {
      console.error(err);
      setError(
        err.response?.data?.error || 'فشل الاتصال بالخادم. يرجى التحقق من تشغيل Backend'
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 p-4 transition-colors duration-200">
      <div className="absolute top-4 right-4 text-xs font-bold text-slate-400 dark:text-slate-600 font-tajawal select-none">
        متجر التخرج لطلب المستلزمات v1.0.0
      </div>

      <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 rounded-3xl shadow-2xl p-8 md:p-10 space-y-6 relative overflow-hidden transition-all duration-200">
        {/* Top Gold Accent Bar */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-l from-luxury-gold to-brand-500" />

        <div className="text-center space-y-2.5">
          <div className="mx-auto w-16 h-16 bg-brand-50 dark:bg-brand-950/40 rounded-2xl flex items-center justify-center border border-brand-100 dark:border-brand-900 text-brand-600 dark:text-brand-400 shadow-inner">
            <LogIn className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-black text-slate-850 dark:text-slate-100 font-cairo">
            تسجيل دخول الموظفين
          </h2>
          <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 font-tajawal">
            نظام إدارة متجر التخرج لبيع وتأجير مستلزمات الحفلات
          </p>
        </div>

        {error && (
          <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/40 p-4 rounded-xl flex items-start gap-3 animate-slide-down">
            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
            <div className="text-xs text-red-700 dark:text-red-400 font-semibold leading-relaxed font-cairo">
              {error}
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="relative">
            <Input
              label="اسم المستخدم"
              placeholder="مثال: anas أو taha"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              disabled={isLoading}
              className="pr-10"
            />
            <User className="absolute left-3.5 bottom-3.5 w-5 h-5 text-slate-400 dark:text-slate-600" />
          </div>

          <div className="relative">
            <Input
              label="كلمة المرور"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={isLoading}
            />
            <Lock className="absolute left-3.5 bottom-3.5 w-5 h-5 text-slate-400 dark:text-slate-600" />
          </div>

          <Button
            type="submit"
            className="w-full mt-4 justify-center"
            isLoading={isLoading}
          >
            دخول للنظام
          </Button>
        </form>

        <div className="text-center pt-2">
          <span className="text-[11px] font-bold text-slate-400 dark:text-slate-600 font-tajawal">
            الموظفون المعتمدون: أنس، طه. يتم تسجيل كافة الإجراءات برمجياً.
          </span>
        </div>
      </div>
    </div>
  );
};

export default Login;
