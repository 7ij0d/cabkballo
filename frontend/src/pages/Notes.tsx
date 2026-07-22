import React, { useState, useEffect } from 'react';
import { 
  NotebookPen, Plus, Search, Filter, Pin, PinOff, Edit, Trash2, 
  Copy, Printer, Tag, Calendar, User, AlertTriangle, CheckCircle2, 
  X, RefreshCw, Layers, ShieldAlert, FileText, Clock
} from 'lucide-react';
import { noteService, type InternalNoteItem } from '../services/api';
import Button from '../components/Button';
import Modal from '../components/Modal';

interface NotesProps {
  activeEmployee?: { id: string; username: string; name: string } | null;
}

export const Notes: React.FC<NotesProps> = ({ activeEmployee }) => {
  const [notes, setNotes] = useState<InternalNoteItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Search & Filters
  const [search, setSearch] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [pinnedFilter, setPinnedFilter] = useState('all');
  const [employeeFilter, setEmployeeFilter] = useState('all');
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest' | 'priority'>('newest');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  // Modals & UI State
  const [isAddEditModalOpen, setIsAddEditModalOpen] = useState(false);
  const [editingNote, setEditingNote] = useState<InternalNoteItem | null>(null);
  
  // Form fields
  const [formTitle, setFormTitle] = useState('');
  const [formContent, setFormContent] = useState('');
  const [formPriority, setFormPriority] = useState<'Normal' | 'Info' | 'Important' | 'Urgent' | 'Critical'>('Normal');
  const [formIsPinned, setFormIsPinned] = useState(false);
  const [formTags, setFormTags] = useState('');
  const [formError, setFormError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Delete modal
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [noteToDelete, setNoteToDelete] = useState<InternalNoteItem | null>(null);

  // Print modal
  const [printModalOpen, setPrintModalOpen] = useState(false);
  const [noteToPrint, setNoteToPrint] = useState<InternalNoteItem | null>(null);

  // Toast feedback
  const [toastMessage, setToastMessage] = useState('');

  const fetchNotes = async () => {
    setIsLoading(true);
    try {
      const data = await noteService.getAll();
      setNotes(data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchNotes();
  }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage('');
    }, 3000);
  };

  // Unique employees list for filtering
  const employeesList = Array.from(new Set(notes.map((n) => n.employeeName))).filter(Boolean);

  // Filtering and Sorting
  const filteredNotes = notes.filter((n) => {
    // Search
    if (search) {
      const term = search.toLowerCase();
      const matchTitle = n.title.toLowerCase().includes(term);
      const matchContent = n.content.toLowerCase().includes(term);
      const matchEmp = n.employeeName.toLowerCase().includes(term);
      const matchTags = n.tags.some((t) => t.toLowerCase().includes(term));
      if (!matchTitle && !matchContent && !matchEmp && !matchTags) return false;
    }

    // Priority
    if (priorityFilter !== 'all' && n.priority !== priorityFilter) return false;

    // Pinned
    if (pinnedFilter === 'pinned' && !n.isPinned) return false;

    // Employee
    if (employeeFilter !== 'all' && n.employeeName !== employeeFilter) return false;

    // Date From
    if (dateFrom) {
      const nDate = n.createdAt.split('T')[0];
      if (nDate < dateFrom) return false;
    }

    // Date To
    if (dateTo) {
      const nDate = n.createdAt.split('T')[0];
      if (nDate > dateTo) return false;
    }

    return true;
  }).sort((a, b) => {
    // Pinned notes ALWAYS appear at the top
    if (a.isPinned && !b.isPinned) return -1;
    if (!a.isPinned && b.isPinned) return 1;

    if (sortOrder === 'priority') {
      const priorityRank = { Critical: 5, Urgent: 4, Important: 3, Info: 2, Normal: 1 };
      return priorityRank[b.priority] - priorityRank[a.priority];
    }
    if (sortOrder === 'oldest') {
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    }
    // Default: newest
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  // Calculate Summary Stats
  const todayStr = new Date().toISOString().split('T')[0];
  const stats = {
    total: notes.length,
    today: notes.filter((n) => n.createdAt.startsWith(todayStr)).length,
    pinned: notes.filter((n) => n.isPinned).length,
    highPriority: notes.filter((n) => n.priority === 'Urgent' || n.priority === 'Critical' || n.priority === 'Important').length,
  };

  const openAddModal = () => {
    setEditingNote(null);
    setFormTitle('');
    setFormContent('');
    setFormPriority('Normal');
    setFormIsPinned(false);
    setFormTags('');
    setFormError('');
    setIsAddEditModalOpen(true);
  };

  const openEditModal = (note: InternalNoteItem) => {
    setEditingNote(note);
    setFormTitle(note.title);
    setFormContent(note.content);
    setFormPriority(note.priority);
    setFormIsPinned(note.isPinned);
    setFormTags(note.tags ? note.tags.join(', ') : '');
    setFormError('');
    setIsAddEditModalOpen(true);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formContent.trim()) {
      setFormError('يرجى كتابة نص الملاحظة.');
      return;
    }

    setIsSubmitting(true);
    setFormError('');

    const parsedTags = formTags
      .split(/[,،\s]+/)
      .map((t) => t.trim().replace(/^#/, ''))
      .filter(Boolean);

    const empId = activeEmployee?.id || 'emp-1';
    const empName = activeEmployee?.name || 'طه';

    try {
      if (editingNote) {
        await noteService.update(editingNote.id, {
          title: formTitle.trim() || 'ملاحظة إدارية',
          content: formContent.trim(),
          priority: formPriority,
          isPinned: formIsPinned,
          tags: parsedTags,
          editedBy: empName,
        });
        showToast('تم تحديث الملاحظة بنجاح!');
      } else {
        await noteService.create({
          title: formTitle.trim() || 'ملاحظة إدارية',
          content: formContent.trim(),
          priority: formPriority,
          isPinned: formIsPinned,
          tags: parsedTags,
          employeeId: empId,
          employeeName: empName,
        });
        showToast('تمت إضافة الملاحظة بنجاح!');
      }

      setIsAddEditModalOpen(false);
      fetchNotes();
    } catch (err: any) {
      setFormError(err.message || 'حدث خطأ أثناء حفظ الملاحظة.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleTogglePin = async (note: InternalNoteItem) => {
    const empName = activeEmployee?.name || 'طه';
    try {
      const newStatus = await noteService.togglePin(note.id, note.isPinned, empName);
      showToast(newStatus ? 'تم تثبيت الملاحظة في الأعلى 📌' : 'تم إلغاء تثبيت الملاحظة');
      fetchNotes();
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!noteToDelete) return;
    try {
      await noteService.delete(noteToDelete.id);
      showToast('تم حذف الملاحظة بنجاح.');
      setDeleteModalOpen(false);
      setNoteToDelete(null);
      fetchNotes();
    } catch (e) {
      console.error(e);
    }
  };

  const handleCopyNote = (note: InternalNoteItem) => {
    const textToCopy = `${note.title}\n---------------------\n${note.content}\n\nبواسطة: ${note.employeeName} | ${formatDate(note.createdAt)}`;
    navigator.clipboard.writeText(textToCopy);
    showToast('تم نسخ نص الملاحظة إلى الحافظة بنجاح! 📋');
  };

  const handleOpenPrint = (note: InternalNoteItem) => {
    setNoteToPrint(note);
    setPrintModalOpen(true);
  };

  const formatDate = (isoStr: string) => {
    if (!isoStr) return '';
    const date = new Date(isoStr);
    return date.toLocaleDateString('ar-LY', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const formatTime = (isoStr: string) => {
    if (!isoStr) return '';
    const date = new Date(isoStr);
    return date.toLocaleTimeString('ar-LY', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getPriorityBadge = (priority: InternalNoteItem['priority']) => {
    switch (priority) {
      case 'Critical':
        return (
          <span className="px-2.5 py-1 rounded-lg text-xs font-black bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-300 border border-red-200 dark:border-red-800 flex items-center gap-1">
            <ShieldAlert className="w-3.5 h-3.5" />
            حرج للغاية
          </span>
        );
      case 'Urgent':
        return (
          <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400 border border-rose-200 dark:border-rose-800/60 flex items-center gap-1">
            <AlertTriangle className="w-3.5 h-3.5" />
            عاجل
          </span>
        );
      case 'Important':
        return (
          <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 border border-amber-200 dark:border-amber-800/60 flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" />
            هام
          </span>
        );
      case 'Info':
        return (
          <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-sky-50 text-sky-700 dark:bg-sky-950/40 dark:text-sky-400 border border-sky-200 dark:border-sky-800/60 flex items-center gap-1">
            <FileText className="w-3.5 h-3.5" />
            معلومات
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700 flex items-center gap-1">
            عادي
          </span>
        );
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 left-6 z-50 bg-slate-900 text-white dark:bg-white dark:text-slate-900 px-4 py-3 rounded-2xl shadow-2xl flex items-center gap-2.5 text-sm font-bold animate-bounce font-cairo">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 dark:text-emerald-600" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 rounded-xl">
              <NotebookPen className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-slate-900 dark:text-white font-cairo">الملاحظات الداخلية</h1>
              <p className="text-xs text-slate-500 font-bold font-tajawal mt-0.5">
                المفكرة الإدارية اليومية وتوثيق التنبيهات، الاتفاقات، والعمليات الداخلية للمحل
              </p>
            </div>
          </div>
        </div>

        <Button
          onClick={openAddModal}
          icon={<Plus className="w-5 h-5" />}
          className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-600/20 font-bold self-start sm:self-auto cursor-pointer"
        >
          إضافة ملاحظة جديدة
        </Button>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="ui-panel p-4 flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-slate-500 font-tajawal block">إجمالي الملاحظات</span>
            <span className="text-2xl font-black text-slate-900 dark:text-white font-cairo mt-1 block">{stats.total}</span>
          </div>
          <div className="p-3 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-2xl">
            <Layers className="w-6 h-6" />
          </div>
        </div>

        <div className="ui-panel p-4 flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-slate-500 font-tajawal block">ملاحظات اليوم</span>
            <span className="text-2xl font-black text-emerald-600 font-cairo mt-1 block">{stats.today}</span>
          </div>
          <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 rounded-2xl">
            <Calendar className="w-6 h-6" />
          </div>
        </div>

        <div className="ui-panel p-4 flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-slate-500 font-tajawal block">المثبتة بالأعلى</span>
            <span className="text-2xl font-black text-amber-600 font-cairo mt-1 block">{stats.pinned}</span>
          </div>
          <div className="p-3 bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 rounded-2xl">
            <Pin className="w-6 h-6" />
          </div>
        </div>

        <div className="ui-panel p-4 flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-slate-500 font-tajawal block">عالية الأهمية</span>
            <span className="text-2xl font-black text-rose-600 font-cairo mt-1 block">{stats.highPriority}</span>
          </div>
          <div className="p-3 bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 rounded-2xl">
            <AlertTriangle className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Main Interactive Toolbar */}
      <div className="ui-panel p-4 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {/* Search Input */}
          <div className="lg:col-span-2 relative">
            <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="ابحث في عنوان الملاحظة، المحتوى، الكلمات المفتاحية، أو اسم الموظف..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="ui-input pr-10 text-sm font-semibold"
            />
          </div>

          {/* Priority Filter */}
          <div>
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="ui-input text-xs font-bold font-tajawal"
            >
              <option value="all">كل الأولويات</option>
              <option value="Normal">عادي</option>
              <option value="Info">معلومات</option>
              <option value="Important">هام</option>
              <option value="Urgent">عاجل</option>
              <option value="Critical">حرج للغاية</option>
            </select>
          </div>

          {/* Employee Filter */}
          <div>
            <select
              value={employeeFilter}
              onChange={(e) => setEmployeeFilter(e.target.value)}
              className="ui-input text-xs font-bold font-tajawal"
            >
              <option value="all">كل الموظفين</option>
              {employeesList.map((emp) => (
                <option key={emp} value={emp}>{emp}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100 dark:border-slate-800/80">
          {/* Secondary Filters: Pinned, Sort, Date range */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setPinnedFilter(pinnedFilter === 'pinned' ? 'all' : 'pinned')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold font-tajawal transition-all flex items-center gap-1.5 cursor-pointer ${
                pinnedFilter === 'pinned'
                  ? 'bg-amber-500 text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
              }`}
            >
              <Pin className="w-3.5 h-3.5" />
              <span>المثبتة فقط</span>
            </button>

            <select
              value={sortOrder}
              onChange={(e: any) => setSortOrder(e.target.value)}
              className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 border-none outline-none"
            >
              <option value="newest">الترتيب: الأحدث أولاً</option>
              <option value="oldest">الترتيب: الأقدم أولاً</option>
              <option value="priority">الترتيب: حسب الأهمية</option>
            </select>

            <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-xl text-xs">
              <span className="text-slate-400 font-tajawal font-bold">من:</span>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="bg-transparent border-none outline-none font-bold text-slate-700 dark:text-slate-300 text-xs"
              />
            </div>

            <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-xl text-xs">
              <span className="text-slate-400 font-tajawal font-bold">إلى:</span>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="bg-transparent border-none outline-none font-bold text-slate-700 dark:text-slate-300 text-xs"
              />
            </div>
          </div>

          {/* Reset Filters */}
          {(search || priorityFilter !== 'all' || pinnedFilter !== 'all' || employeeFilter !== 'all' || dateFrom || dateTo) && (
            <button
              onClick={() => {
                setSearch('');
                setPriorityFilter('all');
                setPinnedFilter('all');
                setEmployeeFilter('all');
                setDateFrom('');
                setDateTo('');
                setSortOrder('newest');
              }}
              className="text-xs font-bold text-rose-500 hover:text-rose-600 flex items-center gap-1 transition-colors cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>إعادة ضبط الفلاتر</span>
            </button>
          )}
        </div>
      </div>

      {/* Notes Cards Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-48 bg-slate-100 dark:bg-slate-800/60 rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : filteredNotes.length === 0 ? (
        /* Empty State */
        <div className="ui-panel py-16 text-center">
          <div className="flex flex-col items-center justify-center space-y-4 max-w-md mx-auto">
            <div className="w-16 h-16 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 rounded-3xl flex items-center justify-center shadow-inner">
              <NotebookPen className="w-8 h-8" />
            </div>
            <div>
              <h3 className="text-lg font-black text-slate-900 dark:text-white font-cairo">
                {search || priorityFilter !== 'all' || pinnedFilter !== 'all' ? 'لا توجد ملاحظات تطابق خيارات البحث' : 'لا توجد ملاحظات داخلية حتى الآن'}
              </h3>
              <p className="text-xs text-slate-500 font-medium font-tajawal mt-1 leading-relaxed">
                {search || priorityFilter !== 'all' || pinnedFilter !== 'all'
                  ? 'جرب إعادة ضبط الفلاتر أو تنظيف نص البحث لعرض بقية الملاحظات.'
                  : 'استخدم المفكرة الداخلية لتدوين الملاحظات اليومية والتنبيهات الهامة والاتفاقات الخاصة.'}
              </p>
            </div>

            {!(search || priorityFilter !== 'all' || pinnedFilter !== 'all') ? (
              <Button onClick={openAddModal} icon={<Plus className="w-4 h-4" />}>
                إضافة أول ملاحظة
              </Button>
            ) : (
              <button
                onClick={() => {
                  setSearch('');
                  setPriorityFilter('all');
                  setPinnedFilter('all');
                  setEmployeeFilter('all');
                }}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold rounded-xl transition-all cursor-pointer font-tajawal"
              >
                تنظيف البحث وعرض الكل
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredNotes.map((note) => (
            <div
              key={note.id}
              className={`ui-panel p-5 flex flex-col justify-between space-y-4 transition-all duration-200 hover:shadow-lg relative overflow-hidden ${
                note.isPinned
                  ? 'border-2 border-amber-400/70 dark:border-amber-500/50 bg-amber-50/20 dark:bg-amber-950/10'
                  : ''
              }`}
            >
              {/* Top Card Header */}
              <div className="space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    {getPriorityBadge(note.priority)}
                    {note.isPinned && (
                      <span className="px-2 py-0.5 rounded-lg text-[10px] font-black bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300 flex items-center gap-1">
                        <Pin className="w-3 h-3" />
                        مثبتة
                      </span>
                    )}
                  </div>

                  <button
                    onClick={() => handleTogglePin(note)}
                    className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                      note.isPinned
                        ? 'text-amber-500 bg-amber-100 dark:bg-amber-950/60 hover:bg-amber-200'
                        : 'text-slate-400 hover:text-amber-500 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                    title={note.isPinned ? 'إلغاء التثبيت' : 'تثبيت بأعلى الصفحة'}
                  >
                    {note.isPinned ? <PinOff className="w-4 h-4" /> : <Pin className="w-4 h-4" />}
                  </button>
                </div>

                <h3 className="text-base font-black text-slate-900 dark:text-white font-cairo pt-1 leading-snug">
                  {note.title}
                </h3>
              </div>

              {/* Note Body Content */}
              <div className="flex-1 text-xs text-slate-700 dark:text-slate-300 leading-relaxed font-tajawal whitespace-pre-wrap">
                {note.content}
              </div>

              {/* Tags Badges */}
              {note.tags && note.tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-2">
                  {note.tags.map((t, idx) => (
                    <span
                      key={idx}
                      className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-md text-[11px] font-bold font-tajawal flex items-center gap-1"
                    >
                      <Tag className="w-3 h-3 text-slate-400" />
                      #{t}
                    </span>
                  ))}
                </div>
              )}

              {/* Bottom Metadata & Employee Info */}
              <div className="pt-3 border-t border-slate-100 dark:border-slate-800/80 space-y-3">
                <div className="flex items-center justify-between text-xs text-slate-500 font-tajawal">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 bg-brand-600 text-white rounded-full flex items-center justify-center text-xs font-black font-cairo shadow-xs">
                      {note.employeeName ? note.employeeName.charAt(0) : 'م'}
                    </div>
                    <div>
                      <span className="font-bold text-slate-900 dark:text-slate-200 block leading-none font-cairo">
                        {note.employeeName}
                      </span>
                      <span className="text-[10px] text-slate-400 block mt-0.5">موظف مسجل</span>
                    </div>
                  </div>

                  <div className="text-left font-semibold text-[11px]">
                    <div className="flex items-center gap-1 text-slate-500">
                      <Calendar className="w-3 h-3" />
                      <span>{formatDate(note.createdAt)}</span>
                    </div>
                    <div className="flex items-center gap-1 text-slate-400 text-[10px] mt-0.5">
                      <Clock className="w-3 h-3" />
                      <span>{formatTime(note.createdAt)}</span>
                    </div>
                  </div>
                </div>

                {note.updatedAt && (
                  <div className="text-[10px] text-amber-600 dark:text-amber-400 bg-amber-50/50 dark:bg-amber-950/30 p-1.5 rounded-lg text-center font-bold font-tajawal">
                    تعديل بواسطة {note.editedBy || note.employeeName} بتاريخ ({formatDate(note.updatedAt)})
                  </div>
                )}

                {/* Card Actions Bar */}
                <div className="flex items-center justify-between gap-1 pt-1 border-t border-slate-100/60 dark:border-slate-800/50">
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => openEditModal(note)}
                      className="p-1.5 text-slate-500 hover:text-brand-600 hover:bg-brand-50 dark:hover:bg-brand-950/40 rounded-lg transition-colors text-xs font-bold flex items-center gap-1 cursor-pointer"
                      title="تعديل الملاحظة"
                    >
                      <Edit className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">تعديل</span>
                    </button>

                    <button
                      onClick={() => handleCopyNote(note)}
                      className="p-1.5 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 rounded-lg transition-colors text-xs font-bold flex items-center gap-1 cursor-pointer"
                      title="نسخ نص الملاحظة"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">نسخ</span>
                    </button>

                    <button
                      onClick={() => handleOpenPrint(note)}
                      className="p-1.5 text-slate-500 hover:text-sky-600 hover:bg-sky-50 dark:hover:bg-sky-950/40 rounded-lg transition-colors text-xs font-bold flex items-center gap-1 cursor-pointer"
                      title="طباعة الملاحظة"
                    >
                      <Printer className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">طباعة</span>
                    </button>
                  </div>

                  <button
                    onClick={() => {
                      setNoteToDelete(note);
                      setDeleteModalOpen(true);
                    }}
                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors cursor-pointer"
                    title="حذف الملاحظة"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add / Edit Note Modal */}
      <Modal
        isOpen={isAddEditModalOpen}
        onClose={() => setIsAddEditModalOpen(false)}
        title={editingNote ? 'تعديل الملاحظة الداخلية' : 'إضافة ملاحظة جديدة'}
      >
        <form onSubmit={handleFormSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 font-tajawal mb-1 block">
              عنوان الملاحظة (اختياري)
            </label>
            <input
              type="text"
              placeholder="مثال: تنبيه بخصوص موعد الإرجاع / طلب جديد..."
              value={formTitle}
              onChange={(e) => setFormTitle(e.target.value)}
              className="ui-input font-bold"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 font-tajawal mb-1 block">
              نص الملاحظة بالتفصيل <span className="text-rose-500">*</span>
            </label>
            <textarea
              rows={4}
              placeholder="اكتب هنا كافة تفاصيل الملاحظة أو التنبيه الداخلي..."
              value={formContent}
              onChange={(e) => setFormContent(e.target.value)}
              className="ui-input font-semibold leading-relaxed"
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 font-tajawal mb-1 block">
                مستوى الأهمية / الأولوية
              </label>
              <select
                value={formPriority}
                onChange={(e: any) => setFormPriority(e.target.value)}
                className="ui-input font-bold"
              >
                <option value="Normal">عادي (رمادي)</option>
                <option value="Info">معلومات (أزرق)</option>
                <option value="Important">هام (برتقالي)</option>
                <option value="Urgent">عاجل (أحمر)</option>
                <option value="Critical">حرج للغاية (أحمر داكن)</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 font-tajawal mb-1 block">
                الكلمات المفتاحية / التاقات (مفصولة بفواصل)
              </label>
              <input
                type="text"
                placeholder="مثال: زبون, إيجار, تأكيد, صيانة"
                value={formTags}
                onChange={(e) => setFormTags(e.target.value)}
                className="ui-input"
              />
            </div>
          </div>

          <div className="flex items-center gap-2 pt-2">
            <input
              type="checkbox"
              id="formIsPinned"
              checked={formIsPinned}
              onChange={(e) => setFormIsPinned(e.target.checked)}
              className="w-4 h-4 text-emerald-600 rounded cursor-pointer"
            />
            <label htmlFor="formIsPinned" className="text-xs font-bold text-slate-800 dark:text-slate-200 cursor-pointer font-tajawal">
              تثبيت الملاحظة في أعلى القائمة 📌
            </label>
          </div>

          {formError && (
            <p className="text-xs font-bold text-rose-500 font-tajawal">{formError}</p>
          )}

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setIsAddEditModalOpen(false)}
              disabled={isSubmitting}
            >
              إلغاء
            </Button>

            <Button
              type="submit"
              isLoading={isSubmitting}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
            >
              {editingNote ? 'حفظ التعديلات' : 'إضافة الملاحظة'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        title="تأكيد حذف الملاحظة"
      >
        <div className="space-y-4 text-right">
          <div className="p-4 bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 rounded-2xl flex items-center gap-3 border border-rose-200 dark:border-rose-800">
            <AlertTriangle className="w-6 h-6 shrink-0" />
            <p className="text-xs font-bold font-tajawal leading-relaxed">
              هل أنت تأكد من رغبتك في حذف الملاحظة ({noteToDelete?.title})؟ هذا الإجراء لا يمكن التراجع عنه.
            </p>
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <Button variant="secondary" onClick={() => setDeleteModalOpen(false)}>
              إلغاء
            </Button>
            <Button onClick={handleDeleteConfirm} className="bg-rose-600 hover:bg-rose-700 text-white font-bold">
              تأكيد الحذف
            </Button>
          </div>
        </div>
      </Modal>

      {/* Print Note Modal */}
      <Modal
        isOpen={printModalOpen}
        onClose={() => setPrintModalOpen(false)}
        title="معاينة طباعة الملاحظة"
      >
        {noteToPrint && (
          <div className="space-y-6 text-right">
            <div id="print-note-container" className="p-6 bg-white text-slate-900 rounded-2xl border border-slate-200 space-y-4">
              <div className="flex items-center justify-between border-b pb-4">
                <div>
                  <h2 className="text-lg font-black font-cairo">{noteToPrint.title}</h2>
                  <span className="text-xs text-slate-500 font-tajawal">متجر التخرج | مفكرة الملاحظات الداخلية</span>
                </div>
                <div className="text-left text-xs font-bold text-slate-600">
                  <div>{formatDate(noteToPrint.createdAt)}</div>
                  <div>{formatTime(noteToPrint.createdAt)}</div>
                </div>
              </div>

              <div className="text-sm font-tajawal leading-relaxed whitespace-pre-wrap py-3">
                {noteToPrint.content}
              </div>

              <div className="pt-4 border-t flex justify-between items-center text-xs font-bold text-slate-600 font-tajawal">
                <span>الموظف المسجل: {noteToPrint.employeeName}</span>
                <span>الأولوية: {noteToPrint.priority}</span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 no-print">
              <Button variant="secondary" onClick={() => setPrintModalOpen(false)}>
                إغلاق
              </Button>
              <Button
                onClick={() => window.print()}
                icon={<Printer className="w-4 h-4" />}
                className="bg-brand-600 text-white font-bold"
              >
                طباعة الملاحظة
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default Notes;
