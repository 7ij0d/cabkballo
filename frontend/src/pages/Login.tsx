import React, { useState } from 'react';
import { User, Lock, AlertCircle, GraduationCap } from 'lucide-react';
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
        err.response?.data?.error || 'فشل الاتصال بالخادم. يرجى التحقق من صحة الإدخال'
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-[#F8FAFC] dark:bg-[#0B0F17] p-4 text-slate-900 dark:text-white">
      
      <div className="w-full max-w-md bg-white dark:bg-[#111622] border border-slate-200/80 dark:border-slate-800/80 rounded-3xl p-8 shadow-sm space-y-6">
        
        <div className="text-center space-y-3">
          <div className="mx-auto w-16 h-16 bg-brand-600 text-white rounded-2xl flex items-center justify-center shadow-md shadow-brand-600/20">
            <GraduationCap className="w-9 h-9" />
          </div>
          <div>
            <h2 className="text-2xl font-black font-cairo">
              تسجيل دخول الموظفين
            </h2>
            <p className="text-xs font-semibold text-slate-500 font-tajawal mt-1">
              نظام إدارة المعرض والمبيعات الإيجارية
            </p>
          </div>
        </div>

        {error && (
          <div className="bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/40 p-4 rounded-xl flex items-start gap-2.5">
            <AlertCircle className="w-5 h-5 text-rose-500 flex-shrink-0 mt-0.5" />
            <div className="text-xs text-rose-600 dark:text-rose-400 font-bold leading-relaxed">
              {error}
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="اسم المستخدم"
            placeholder="anas أو taha"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
            disabled={isLoading}
          />

          <Input
            label="كلمة المرور"
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            disabled={isLoading}
          />

          <Button
            type="submit"
            className="w-full justify-center text-sm font-bold py-3 mt-2"
            isLoading={isLoading}
          >
            دخول لوحة التحكم
          </Button>
        </form>

        <div className="text-center pt-3 border-t border-slate-100 dark:border-slate-800/80">
          <span className="text-xs text-slate-400 font-bold font-tajawal">
            الحسابات المصرح بها: طه، أنس
          </span>
        </div>
      </div>
    </div>
  );
};

export default Login;
