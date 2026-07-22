import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, Users, FileText, RotateCcw, TrendingUp, 
  ClipboardList, LogOut, Sun, Moon, GraduationCap, Menu, X, ChevronLeft
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

  if (!employee) {
    return <Login onLoginSuccess={handleLoginSuccess} />;
  }

  const navItems = [
    { id: 'dashboard', label: 'لوحة الإحصائيات', icon: <LayoutDashboard className="w-5 h-5" /> },
    { id: 'customers', label: 'إدارة الزبائن', icon: <Users className="w-5 h-5" /> },
    { id: 'orders', label: 'الطلبات والفواتير', icon: <FileText className="w-5 h-5" /> },
    { id: 'returns', label: 'سجل المرتجعات', icon: <RotateCcw className="w-5 h-5" /> },
    { id: 'reports', label: 'التقارير المكتملة', icon: <TrendingUp className="w-5 h-5" /> },
    { id: 'audit', label: 'سجل النظام', icon: <ClipboardList className="w-5 h-5" /> },
  ];

  return (
    <div className="min-h-screen flex bg-[#F8FAFC] dark:bg-[#0B0F17] text-slate-900 dark:text-slate-100 transition-colors duration-200">
      
      {/* SIDEBAR */}
      <aside className={`
        fixed inset-y-0 right-0 z-50 w-72 bg-white dark:bg-[#111622] text-slate-900 dark:text-slate-100 border-l border-slate-200/80 dark:border-slate-800/80 shadow-xl flex flex-col justify-between transition-transform duration-300 no-print
        lg:translate-x-0 lg:static
        ${mobileMenuOpen ? 'translate-x-0' : 'translate-x-full lg:translate-x-0'}
      `}>
        <div>
          {/* Header Logo */}
          <div className="p-6 border-b border-slate-100 dark:border-slate-800/80 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-brand-600 text-white rounded-xl flex items-center justify-center shadow-md shadow-brand-600/20">
                <GraduationCap className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-base font-black font-cairo text-slate-900 dark:text-white tracking-wide">متجر التخرج</h2>
                <span className="text-xs text-slate-500 font-bold block font-tajawal">نظام المبيعات والإيجار</span>
              </div>
            </div>
            <button 
              onClick={() => setMobileMenuOpen(false)}
              className="p-2 lg:hidden text-slate-400 hover:text-slate-700 dark:hover:text-white rounded-xl"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation Items */}
          <nav className="p-4 space-y-1.5">
            {navItems.map((item) => {
              const isActive = page === item.id || (item.id === 'orders' && page === 'order-details');
              return (
                <button
                  key={item.id}
                  onClick={() => navigateTo(item.id)}
                  className={`
                    w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-bold font-cairo transition-all duration-150
                    ${isActive 
                      ? 'bg-brand-600 text-white shadow-md shadow-brand-600/20' 
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-white'
                    }
                  `}
                >
                  <div className="flex items-center gap-3">
                    <span className={isActive ? 'text-white' : 'text-slate-400 dark:text-slate-500'}>
                      {item.icon}
                    </span>
                    <span>{item.label}</span>
                  </div>
                  {isActive && <ChevronLeft className="w-4 h-4 opacity-70 rotate-180" />}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Footer User Info */}
        <div className="p-4 border-t border-slate-100 dark:border-slate-800/80 space-y-3">
          <div className="bg-slate-50 dark:bg-[#0B0F17] p-3.5 rounded-xl flex items-center justify-between border border-slate-200/60 dark:border-slate-800/60">
            <div className="flex items-center gap-2.5">
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <div className="text-right">
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block font-cairo">
                  {employee.name}
                </span>
                <span className="text-[10px] text-slate-400 font-semibold font-tajawal">موظف معتمد</span>
              </div>
            </div>
            
            <button
              onClick={() => setDarkMode(!darkMode)}
              className="p-2 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-all border border-slate-200 dark:border-slate-700"
              title="تغيير المظهر"
            >
              {darkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-600" />}
            </button>
          </div>
          
          <button
            onClick={handleLogout}
            className="w-full py-2.5 bg-slate-100 hover:bg-red-50 dark:bg-slate-800/60 dark:hover:bg-red-950/30 text-slate-600 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-400 text-xs font-bold rounded-xl transition-all border border-slate-200/60 dark:border-slate-800/60 flex items-center justify-center gap-2"
          >
            <LogOut className="w-4 h-4" />
            تسجيل الخروج
          </button>
        </div>

      </aside>

      {/* MAIN CONTAINER */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        
        {/* Mobile Navbar */}
        <header className="bg-white dark:bg-[#111622] border-b border-slate-200/80 dark:border-slate-800/80 p-4 flex items-center justify-between lg:hidden no-print">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-brand-600 text-white rounded-lg flex items-center justify-center">
              <GraduationCap className="w-5 h-5" />
            </div>
            <h1 className="text-sm font-black text-slate-900 dark:text-white font-cairo">متجر التخرج</h1>
          </div>
          
          <button 
            onClick={() => setMobileMenuOpen(true)}
            className="p-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl"
          >
            <Menu className="w-6 h-6" />
          </button>
        </header>

        {/* Content View */}
        <main className="flex-1 p-4 md:p-6 lg:p-8 overflow-y-auto w-full max-w-[1600px] mx-auto print:p-0">
          {page === 'dashboard' && <Dashboard onNavigate={navigateTo} />}
          {page === 'customers' && <Customers onNavigate={navigateTo} />}
          {page === 'customer-profile' && <Customers onNavigate={navigateTo} selectedId={pageParams.id} />}
          {page === 'orders' && <Orders onNavigate={navigateTo} activeEmployee={employee} pageParams={pageParams} />}
          {page === 'order-details' && (
            <OrderDetails 
              orderId={pageParams.id} 
              onBack={() => navigateTo('orders')} 
              onNavigate={navigateTo}
              activeEmployee={employee}
            />
          )}
          {page === 'returns' && <Returns />}
          {page === 'reports' && <Reports />}
          {page === 'audit' && <AuditLogs />}
        </main>

      </div>

    </div>
  );
};

export default App;
