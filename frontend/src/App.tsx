import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, Users, FileText, RotateCcw, TrendingUp, 
  ClipboardList, LogOut, Sun, Moon, GraduationCap, Menu, X, Check 
} from 'lucide-react';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Customers from './pages/Customers';
import Orders from './pages/Orders';
import OrderDetails from './pages/OrderDetails';
import Returns from './pages/Returns';
import Reports from './pages/Reports';
import AuditLogs from './pages/AuditLogs';

export const App: React.FC = () => {
  const [employee, setEmployee] = useState<{ id: string; username: string; name: string } | null>(null);
  const [page, setPage] = useState<string>('dashboard');
  const [pageParams, setPageParams] = useState<any>({});
  
  const [darkMode, setDarkMode] = useState<boolean>(
    localStorage.getItem('theme') === 'dark'
  );

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Verify login status on load
  useEffect(() => {
    const token = localStorage.getItem('token');
    const storedEmp = localStorage.getItem('employee');
    if (token && storedEmp) {
      setEmployee(JSON.parse(storedEmp));
    }
    // Force light theme by default if no theme is set
    if (!localStorage.getItem('theme')) {
      localStorage.setItem('theme', 'light');
      setDarkMode(false);
    }
  }, []);

  // Sync dark mode class
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [darkMode]);

  const handleLoginSuccess = (emp: { id: string; username: string; name: string }) => {
    setEmployee(emp);
    setPage('dashboard');
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('employee');
    setEmployee(null);
    setPage('dashboard');
  };

  const navigateTo = (targetPage: string, params: any = {}) => {
    setPage(targetPage);
    setPageParams(params);
    setMobileMenuOpen(false);
    window.scrollTo(0, 0);
  };

  // If not logged in, render Login
  if (!employee) {
    return <Login onLoginSuccess={handleLoginSuccess} />;
  }

  // Sidebar navigation items
  const navItems = [
    { id: 'dashboard', label: 'لوحة التحكم', icon: <LayoutDashboard className="w-5 h-5" /> },
    { id: 'customers', label: 'الزبائن', icon: <Users className="w-5 h-5" /> },
    { id: 'orders', label: 'الطلبات والفواتير', icon: <FileText className="w-5 h-5" /> },
    { id: 'returns', label: 'عمليات الإرجاع', icon: <RotateCcw className="w-5 h-5" /> },
    { id: 'reports', label: 'التقارير المالية', icon: <TrendingUp className="w-5 h-5" /> },
    { id: 'audit', label: 'سجل العمليات', icon: <ClipboardList className="w-5 h-5" /> },
  ];

  return (
    <div className="min-h-screen flex bg-slate-50 dark:bg-slate-950 transition-colors duration-200">
      
      {/* 1. SIDEBAR PANEL (RTL - Right Side) */}
      <aside className={`
        fixed inset-y-0 right-0 z-40 w-64 bg-slate-950/95 dark:bg-slate-900/95 backdrop-blur-md text-slate-100 border-l border-slate-800/80 shadow-2xl flex flex-col justify-between transition-transform duration-300 no-print
        lg:translate-x-0 lg:static
        ${mobileMenuOpen ? 'translate-x-0' : 'translate-x-full lg:translate-x-0'}
      `}>
        {/* Sidebar Brand Header */}
        <div className="p-6 border-b border-slate-850/80 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 bg-gradient-to-tr from-brand-600 to-brand-500 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-brand-500/25 transform hover:rotate-6 transition-all duration-300">
              <GraduationCap className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-base font-black font-cairo text-white tracking-wide">متجر التخرج</h2>
              <span className="text-xs text-slate-500 font-bold block font-tajawal">لوحة إدارة المعرض</span>
            </div>
          </div>
          <button 
            onClick={() => setMobileMenuOpen(false)}
            className="p-2 lg:hidden text-slate-400 hover:text-white rounded-xl hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation items list */}
        <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = page === item.id || (item.id === 'orders' && page === 'order-details');
            return (
              <button
                key={item.id}
                onClick={() => navigateTo(item.id)}
                className={`
                  w-full flex items-center gap-3.5 px-4.5 py-3 rounded-2xl text-sm font-bold font-cairo transition-all duration-200 transform
                  ${isActive 
                    ? 'bg-gradient-to-l from-brand-600 to-brand-500 text-white shadow-lg shadow-brand-600/20 scale-[1.02]' 
                    : 'text-slate-400 hover:bg-slate-850 hover:text-white hover:translate-x-[-4px]'
                  }
                `}
              >
                <span className={`transition-transform duration-200 ${isActive ? 'scale-110' : 'text-slate-400'}`}>
                  {item.icon}
                </span>
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Sidebar Footer Controls */}
        <div className="p-4 border-t border-slate-850/80 space-y-4">
          
          {/* Theme & Profile Panel */}
          <div className="bg-slate-950/40 p-3.5 rounded-2xl space-y-4 border border-slate-850/50">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="font-bold text-slate-200 font-cairo">الموظف: {employee.name}</span>
              </div>
              
              <button
                onClick={() => setDarkMode(!darkMode)}
                className="p-2 bg-slate-850 hover:bg-slate-850 text-slate-400 hover:text-white rounded-xl transition-all border border-slate-800"
                title="تبديل المظهر"
              >
                {darkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
              </button>
            </div>
            
            <button
              onClick={handleLogout}
              className="w-full py-2.5 bg-slate-850 hover:bg-red-950/40 hover:text-red-400 text-slate-400 text-xs font-bold rounded-xl transition-all border border-slate-800 flex items-center justify-center gap-2"
            >
              <LogOut className="w-4 h-4" />
              تسجيل الخروج
            </button>
          </div>

          <div className="text-center">
            <span className="text-[10px] text-slate-655 font-bold block font-tajawal select-none">
              المطور: طه | نظام تجاري معتمد © 2026
            </span>
          </div>
        </div>

      </aside>

      {/* 2. MAIN LAYOUT CONTAINER (Left Side) */}
      <div className="flex-1 flex flex-col overflow-hidden w-full">
        
        {/* Mobile Header Bar */}
        <header className="bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-850 p-4 flex items-center justify-between lg:hidden no-print">
          <div className="flex items-center gap-2">
            <GraduationCap className="w-6 h-6 text-brand-600" />
            <h1 className="text-sm font-black text-slate-800 dark:text-white">إدارة متجر التخرج</h1>
          </div>
          
          <button 
            onClick={() => setMobileMenuOpen(true)}
            className="p-1.5 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
          >
            <Menu className="w-6 h-6" />
          </button>
        </header>

        {/* Dynamic Page Render Area */}
        <main className="flex-1 p-4 md:p-6 lg:p-8 overflow-y-auto w-full max-w-[1600px] mx-auto print:p-0">
          {page === 'dashboard' && (
            <Dashboard onNavigate={navigateTo} />
          )}
          {page === 'customers' && (
            <Customers onNavigate={navigateTo} />
          )}
          {page === 'customer-profile' && (
            <Customers onNavigate={navigateTo} selectedId={pageParams.id} />
          )}
          {page === 'orders' && (
            <Orders onNavigate={navigateTo} activeEmployee={employee} pageParams={pageParams} />
          )}
          {page === 'order-details' && (
            <OrderDetails 
              orderId={pageParams.id} 
              onBack={() => navigateTo('orders')} 
              onNavigate={navigateTo}
              activeEmployee={employee}
            />
          )}
          {page === 'returns' && (
            <Returns />
          )}
          {page === 'reports' && (
            <Reports />
          )}
          {page === 'audit' && (
            <AuditLogs />
          )}
        </main>

      </div>

    </div>
  );
};

export default App;
