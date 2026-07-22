import React from 'react';

interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'onChange'> {
  label?: string;
  options: (string | SelectOption)[];
  value: string;
  onChange: (value: string) => void;
  customValue?: string;
  onCustomChange?: (custom: string) => void;
  customPlaceholder?: string;
  error?: string;
}

export const Select: React.FC<SelectProps> = ({
  label,
  options,
  value,
  onChange,
  customValue,
  onCustomChange,
  customPlaceholder = 'يرجى كتابة القيمة المخصصة...',
  error,
  required,
  className = '',
  ...props
}) => {
  // Normalize options list
  const normalizedOptions: SelectOption[] = options.map((opt) => {
    if (typeof opt === 'string') {
      return { value: opt, label: opt };
    }
    return opt;
  });

  const finalOptions = normalizedOptions;

  const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    onChange(val);
    if (val !== 'Other') {
      onCustomChange?.('');
    }
  };

  return (
    <div className={`flex flex-col gap-1.5 w-full ${className}`}>
      {label && (
        <label className="text-xs font-bold text-slate-700 dark:text-slate-300 font-tajawal">
          {label}
          {required && <span className="text-rose-500 mr-1">*</span>}
        </label>
      )}
      
      <select
        value={value}
        onChange={handleSelectChange}
        className={`w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0B0F17] text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 text-sm font-semibold transition-all shadow-sm ${
          error ? 'border-rose-500 focus:ring-rose-500/10' : ''
        }`}
        required={required}
        {...props}
      >
        <option value="" disabled>--- اختر من القائمة ---</option>
        {finalOptions.map((opt) => (
          <option 
            key={opt.value} 
            value={opt.value}
          >
            {opt.label}
          </option>
        ))}
      </select>

      {/* Slide-open text input for "Other" option */}
      {value === 'Other' && (
        <div className="animate-slide-down">
          <input
            type="text"
            value={customValue || ''}
            onChange={(e) => onCustomChange?.(e.target.value)}
            placeholder={customPlaceholder}
            className={`w-full mt-2 px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 text-sm font-semibold transition-all shadow-inner ${
              required && !customValue ? 'border-rose-400 focus:ring-rose-500/10' : ''
            }`}
            required={required}
          />
          {required && !customValue && (
            <p className="text-xs text-red-500 mt-1">يرجى ملء القيمة المخصصة</p>
          )}
        </div>
      )}

      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </div>
  );
};

export default Select;
