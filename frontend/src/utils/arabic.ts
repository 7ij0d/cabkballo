// Arabic localization and translation helpers

// Format currency to Libyan Dinar (د.ل)
export function formatCurrency(amount: number | string): string {
  const value = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (isNaN(value)) return '0.00 د.ل';
  return `${value.toFixed(2)} د.ل`;
}

// Format date in Arabic locale
export function formatDate(dateString: string | Date | null | undefined): string {
  if (!dateString) return '---';
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return '---';
  
  // Format as YYYY/MM/DD
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}/${m}/${d}`;
}

// Order Status Translation
export function translateStatus(status: string): string {
  const map: Record<string, string> = {
    'Pending': 'قيد الانتظار',
    'Preparing': 'جاري التجهيز',
    'Ready': 'جاهز للاستلام',
    'Delivered': 'تم التوصيل',
    'Completed': 'مكتمل',
    'Cancelled': 'ملغي'
  };
  return map[status] || status;
}

// Payment Status Translation
export function translatePaymentStatus(status: string): string {
  const map: Record<string, string> = {
    'Unpaid': 'غير مدفوع',
    'DepositPaid': 'تم دفع العربون',
    'PartiallyPaid': 'مدفوع جزئياً',
    'FullyPaid': 'مدفوع بالكامل'
  };
  return map[status] || status;
}

// Order Item (Delivery) Status Translation
export function translateDeliveryStatus(status: string): string {
  const map: Record<string, string> = {
    'Waiting': 'في الانتظار',
    'Ready': 'جاهز للتسليم',
    'Delivered': 'تم التسليم',
    'Returned': 'تم الإرجاع'
  };
  return map[status] || status;
}

// Product Category Translation
export function translateCategory(cat: string, custom?: string | null): string {
  const map: Record<string, string> = {
    'Graduation Cap': 'قبعة تخرج',
    'Graduation Hat': 'كاب تخرج',
    'Graduation Sash': 'وشاح تخرج',
    'Graduation Brooch': 'بروش تخرج',
    'Graduation Accessories': 'إكسسوارات تخرج',
    'Other': 'أخرى'
  };
  if (cat === 'Other' && custom) return custom;
  return map[cat] || cat;
}

// Payment Method Translation
export function translatePaymentMethod(method: string, custom?: string | null): string {
  const map: Record<string, string> = {
    'Cash': 'نقداً',
    'Bank Transfer': 'تحويل مصرفي',
    'Card': 'بطاقة مصرفية',
    'Other': 'أخرى'
  };
  if (method === 'Other' && custom) return custom;
  return map[method] || method;
}

// Condition Translation
export function translateCondition(cond: string, custom?: string | null): string {
  const map: Record<string, string> = {
    'Excellent': 'ممتازة',
    'Good': 'جيدة',
    'Damaged': 'تالفة',
    'Other': 'أخرى'
  };
  if (cond === 'Other' && custom) return custom;
  return map[cond] || cond;
}
