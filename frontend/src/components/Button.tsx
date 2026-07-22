import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'warning' | 'success';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  icon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  icon,
  className = '',
  disabled,
  ...props
}) => {
  const baseStyle = 'inline-flex items-center justify-center font-bold rounded-2xl transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-offset-2 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none gap-2 font-cairo cursor-pointer';
  
  const variants = {
    primary: 'bg-[#16A34A] hover:bg-[#15803D] text-white focus:ring-[#16A34A] shadow-[0_2px_10px_rgba(22,163,74,0.2)]',
    secondary: 'bg-white dark:bg-[#111622] hover:bg-[#F9FAFB] dark:hover:bg-slate-800 text-[#374151] dark:text-slate-200 border border-[#E5E7EB] dark:border-slate-800 focus:ring-slate-300 shadow-sm',
    danger: 'bg-[#FEF2F2] hover:bg-[#FEE2E2] dark:bg-rose-950/30 dark:hover:bg-rose-950/50 text-[#EF4444] border border-[#FCA5A5]/60 dark:border-rose-900/50 focus:ring-rose-400',
    warning: 'bg-[#FFFBEB] hover:bg-[#FEF3C7] dark:bg-amber-950/30 text-[#D97706] border border-[#FDE68A] focus:ring-amber-400',
    success: 'bg-[#16A34A] hover:bg-[#15803D] text-white focus:ring-[#16A34A]',
  };

  const sizes = {
    sm: 'h-9 px-3.5 text-xs',
    md: 'h-12 px-5 text-sm', // 48px height minimum standard
    lg: 'h-14 px-6 text-base',
  };

  return (
    <button
      className={`${baseStyle} ${variants[variant]} ${sizes[size]} ${className}`}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? (
        <svg className="animate-spin h-4 w-4 text-current" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      ) : (
        icon && <span className="flex-shrink-0">{icon}</span>
      )}
      <span>{children}</span>
    </button>
  );
};

export default Button;
