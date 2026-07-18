import React, { useState } from 'react';
import { LogIn, User, Lock, AlertCircle, GraduationCap } from 'lucide-react';
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
    <div className="min-h-screen w-full relative flex items-center justify-center bg-slate-50 dark:bg-slate-950 p-4 md:p-6 overflow-hidden transition-colors duration-200">
      
      {/* Background Orbs */}
      <div className="glow-orb glow-orb-primary w-[350px] h-[350px] top-[-50px] right-[-50px]" />
      <div className="glow-orb glow-orb-secondary w-[400px] h-[400px] bottom-[-100px] left-[-100px]" />
      <div className="glow-orb bg-blue-500/10 w-[300px] h-[300px] top-[40%] left-[20%]" />

      <div className="absolute top-6 right-6 text-sm font-bold text-slate-400 dark:text-slate-655 font-tajawal select-none">
        نظام إدارة متجر التخرج v2.0
      </div>

      <div className="w-full max-w-md glass-panel-heavy rounded-3xl shadow-2xl p-8 md:p-10 space-y-6 relative overflow-hidden transition-all duration-300 hover:shadow-brand-500/10 border-t-4 border-t-brand-500">
        
        {/* Decorative elements */}
        <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-luxury-gold/10 to-transparent rounded-bl-full" />
        
        <div className="text-center space-y-3 relative z-10">
          <div className="mx-auto w-20 h-20 bg-gradient-to-tr from-brand-600 to-brand-500 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-brand-500/20 transform hover:scale-105 transition-all duration-300">
            <GraduationCap className="w-10 h-10" />
          </div>
          <div>
            <h2 className="text-2xl font-black text-slate-850 dark:text-slate-100 font-cairo">
              تسجيل دخول الموظفين
            </h2>
            <p className="text-sm font-semibold text-slate-500 dark:text-slate-400 font-tajawal mt-1 leading-relaxed">
              بوابة الدخول الآمنة لمعرض ومبيعات مستلزمات التخرج
            </p>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/40 p-4.5 rounded-2xl flex items-start gap-3 animate-slide-down">
            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-red-750 dark:text-red-400 font-bold leading-relaxed font-cairo">
              {error}
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5 relative z-10">
          <div className="relative">
            <Input
              label="اسم المستخدم"
              placeholder="مثال: anas أو taha"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              disabled={isLoading}
              className="pr-12 text-sm"
            />
            <User className="absolute left-4 bottom-3.5 w-5 h-5 text-slate-400 dark:text-slate-500" />
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
              className="text-sm"
            />
            <Lock className="absolute left-4 bottom-3.5 w-5 h-5 text-slate-400 dark:text-slate-500" />
          </div>

          <Button
            type="submit"
            className="w-full mt-6 py-3 justify-center text-sm font-black bg-gradient-to-r from-brand-600 to-brand-500 hover:from-brand-700 hover:to-brand-600 text-white rounded-xl shadow-lg shadow-brand-500/25 active:scale-95 transition-all duration-150"
            isLoading={isLoading}
          >
            دخول لوحة التحكم
          </Button>
        </form>

        <div className="text-center pt-2 relative z-10 border-t border-slate-100 dark:border-slate-800/60">
          <span className="text-xs font-bold text-slate-450 dark:text-slate-500 font-tajawal leading-relaxed">
            الموظفون المعتمدون: طه، أنس. يتم مراقبة العمليات آلياً.
          </span>
        </div>
      </div>
    </div>
  );
};

export default Login;
