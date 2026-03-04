import React, { useState, useMemo, useEffect } from 'react';
import { Edit, Plus, Minus, CloudUpload, Trash2, ChevronDown, ChevronUp, Loader2 } from 'lucide-react';

// --- API Configurations ---
// 請在這裡貼上您部署 Google Apps Script 後獲得的 Web App URL
const APP_SCRIPT_WEB_APP_URL = 'https://script.google.com/macros/s/AKfycbzTStfxOcWPH_fgSdBrSLqBizCzaFw8UOvENgOem9x4AtRzW9k7OVdx7Mw3hILrM7_ZnQ/exec';

// --- Types ---
type Meal = {
  id: string;
  name: string;
  price: number;
};

// --- Utils ---
const generateId = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).substring(2, 9) + Date.now().toString(36);
};

const LoadingSpinner = ({ size = 20, className = "" }: { size?: number, className?: string }) => (
  <Loader2 size={size} className={`animate-spin ${className}`} />
);

const padMealName = (name: string, targetLen = 22) => {
  let len = 0;
  for (let i = 0; i < name.length; i++) {
    // 粗略計算佔位：ASCII 算 1，中文等全型字元算 2
    len += name.charCodeAt(i) > 255 ? 2 : 1;
  }
  const diff = targetLen - len;
  if (diff <= 0) return name + '\u00A0';

  // 使用全型空格 \u3000 (佔 2 單位) 與半型空格 \u00A0 (佔 1 單位) 
  // 這是解決網頁原生下拉選單中英混排對齊的最佳方案
  const fullSpaces = Math.floor(diff / 2);
  const halfSpaces = diff % 2;
  return name + '\u3000'.repeat(fullSpaces) + '\u00A0'.repeat(halfSpaces);
};

type DraftItem = {
  id: string;
  meal: Meal;
  quantity: number;
  subtotal: number;
};

type UserOrder = {
  id: string;
  filler_name: string;
  items: DraftItem[];
  total_price: number;
};

// --- Mock Data ---
// 預設留空，等待從雲端同步
const MEALS: Meal[] = [];

export default function App() {
  const [globalMeals, setGlobalMeals] = useState<Meal[]>([]);
  const [isLoadingMenu, setIsLoadingMenu] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // --- Validation State ---
  const [fillerNameError, setFillerNameError] = useState(false);
  const [selectedMealError, setSelectedMealError] = useState(false);

  // --- Global State (Section A) ---
  const [allUsersOrders, setAllUsersOrders] = useState<UserOrder[]>([]);

  // --- Fetch Menu & Orders ---
  useEffect(() => {
    if (!APP_SCRIPT_WEB_APP_URL || APP_SCRIPT_WEB_APP_URL.includes('YOUR_APP_SCRIPT')) {
      // 若尚未設定 URL，清空資料並跳過載入
      setGlobalMeals([]);
      setIsLoadingMenu(false);
      return;
    }

    const loadData = async () => {
      try {
        // 使用整合後的 action=init 一次取得所有資料，減少連線次數與補償 Google Cold Start
        const res = await fetch(`${APP_SCRIPT_WEB_APP_URL}?action=init`);
        const data = await res.json();

        if (data.success) {
          // 1. 設定餐點清單
          if (data.items) setGlobalMeals(data.items);

          // 2. 設定現有訂單
          if (data.orders) {
            const mappedOrders: UserOrder[] = (data.orders).map((o: any) => ({
              id: o.id,
              filler_name: o.filler_name,
              total_price: o.total_price,
              items: o.items || [],
              _summary: o.items_summary || '無餐點明細'
            }));
            setAllUsersOrders(mappedOrders);
          }
        }
      } catch (err) {
        console.error('Initial Load Error:', err);
      } finally {
        setIsLoadingMenu(false);
      }
    };

    loadData();
  }, []);

  const grandTotalPrice = useMemo(() => {
    return allUsersOrders.reduce((sum, order) => sum + order.total_price, 0);
  }, [allUsersOrders]);

  // --- Draft State (Section B) ---
  const [fillerName, setFillerName] = useState('');
  const [selectedMealId, setSelectedMealId] = useState<string>('');
  const [currentQuantity, setCurrentQuantity] = useState(1);
  const [fillerDraftList, setFillerDraftList] = useState<DraftItem[]>([]);

  const selectedMeal = useMemo(() => globalMeals.find(m => m.id === selectedMealId) || null, [selectedMealId, globalMeals]);

  const fillerTotalPrice = useMemo(() => {
    return fillerDraftList.reduce((sum, item) => sum + item.subtotal, 0);
  }, [fillerDraftList]);

  // --- Edit State ---
  const [editingOrder, setEditingOrder] = useState<UserOrder | null>(null);
  const [isGlobalListExpanded, setIsGlobalListExpanded] = useState(true);

  // --- Actions ---
  const handleAddToDraft = () => {
    if (!selectedMeal) {
      setSelectedMealError(true);
      return;
    }
    if (currentQuantity <= 0) return;

    setSelectedMealError(false);
    const newItem: DraftItem = {
      id: generateId(),
      meal: selectedMeal,
      quantity: currentQuantity,
      subtotal: selectedMeal.price * currentQuantity,
    };

    setFillerDraftList(prev => [...prev, newItem]);
    setSelectedMealId('');
    setCurrentQuantity(1);
  };

  const handleRemoveFromDraft = (id: string) => {
    setFillerDraftList(prev => prev.filter(item => item.id !== id));
  };

  const handleSubmitOrder = async () => {
    const isNameEmpty = !fillerName.trim();
    const isDraftEmpty = fillerDraftList.length === 0;

    if (isNameEmpty) setFillerNameError(true);
    if (isDraftEmpty) {
      // 這裡可以選擇是否要有全域提示，但通常姓名沒填會最先被注意到
    }

    if (isNameEmpty || isDraftEmpty) return;

    setFillerNameError(false);
    const newOrder: UserOrder = {
      id: generateId(),
      filler_name: fillerName.trim(),
      items: fillerDraftList,
      total_price: fillerTotalPrice,
    };

    if (!APP_SCRIPT_WEB_APP_URL || APP_SCRIPT_WEB_APP_URL.includes('YOUR_APP_SCRIPT')) {
      // 靜態模擬
      setAllUsersOrders(prev => [...prev, newOrder]);
      resetForm();
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch(APP_SCRIPT_WEB_APP_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(newOrder),
      });
      const data = await response.json();
      if (data.success) {
        setAllUsersOrders(prev => [...prev, newOrder]);
        resetForm();
      } else {
        alert('提交失敗: ' + (data.error || '未知錯誤'));
      }
    } catch (error) {
      console.error('Submit Error:', error);
      alert('發生網路錯誤，請稍後再試。');
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setFillerName('');
    setFillerDraftList([]);
    setSelectedMealId('');
    setCurrentQuantity(1);
    setFillerNameError(false);
    setSelectedMealError(false);
  };

  const handleDeleteOrder = async (id: string) => {
    if (!window.confirm('確定要刪除這筆訂單嗎？')) return;

    if (!APP_SCRIPT_WEB_APP_URL || APP_SCRIPT_WEB_APP_URL.includes('YOUR_APP_SCRIPT')) {
      setAllUsersOrders(prev => prev.filter(o => o.id !== id));
      return;
    }

    setDeletingId(id);
    try {
      const response = await fetch(APP_SCRIPT_WEB_APP_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ id, delete: true }),
      });
      const data = await response.json();
      if (data.success) {
        setAllUsersOrders(prev => prev.filter(o => o.id !== id));
      } else {
        alert('刪除失敗: ' + (data.error || '未知錯誤'));
      }
    } catch (error) {
      console.error('Delete Error:', error);
      alert('網路錯誤，無法從雲端刪除。');
    } finally {
      setDeletingId(null);
    }
  };

  // --- Edit Actions ---
  const handleSaveEdit = async (updatedOrder: UserOrder) => {
    if (!APP_SCRIPT_WEB_APP_URL || APP_SCRIPT_WEB_APP_URL.includes('YOUR_APP_SCRIPT')) {
      setAllUsersOrders(prev => prev.map(o => o.id === updatedOrder.id ? updatedOrder : o));
      setEditingOrder(null);
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch(APP_SCRIPT_WEB_APP_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(updatedOrder),
      });
      const data = await response.json();
      if (data.success) {
        setAllUsersOrders(prev => prev.map(o => o.id === updatedOrder.id ? updatedOrder : o));
        setEditingOrder(null);
      } else {
        alert('更新失敗: ' + (data.error || '未知錯誤'));
      }
    } catch (error) {
      console.error('Update Error:', error);
      alert('網路錯誤，無法同步至雲端。');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FEF7FF] text-[#1D1B20] p-4 md:p-8 font-sans">
      <div className="max-w-7xl mx-auto">
        <header className="mb-8">
          <h1 className="text-3xl md:text-4xl font-normal tracking-tight text-[#1D1B20]">訂餐統計系統</h1>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-start">

          {/* Section A: Global Summary (Secondary Color Scheme - M3 Green) */}
          <section className="bg-secondary-container rounded-[28px] p-6 md:p-8 shadow-sm h-fit border border-secondary/10">
            <div
              className="flex justify-between items-center mb-6 cursor-pointer select-none"
              onClick={() => setIsGlobalListExpanded(!isGlobalListExpanded)}
            >
              <div className="flex items-center gap-3">
                <h2 className="text-xl font-medium text-[#1D1B20]">所有人的訂單們</h2>
                <span className="text-sm font-medium text-white bg-secondary px-3 py-1 rounded-full shadow-sm">
                  總計: ${grandTotalPrice}
                </span>
              </div>
              <button className="p-1 rounded-full text-[#49454F] hover:bg-[#1D1B20]/8 transition-colors">
                {isGlobalListExpanded ? <ChevronUp size={24} /> : <ChevronDown size={24} />}
              </button>
            </div>

            {isGlobalListExpanded && (
              <div className="flex flex-col animate-in fade-in slide-in-from-top-2 duration-200">
                <div className="overflow-y-auto pr-2 space-y-4 max-h-[600px]">
                  {isLoadingMenu ? (
                    <div className="text-[#49454F] p-4 text-center bg-secondary-surface rounded-2xl border border-secondary/10 flex flex-col items-center gap-2">
                      <div className="w-5 h-5 border-2 border-secondary border-t-transparent rounded-full animate-spin"></div>
                      <span>正在同步雲端資料...</span>
                    </div>
                  ) : allUsersOrders.length === 0 ? (
                    <div className="text-[#49454F] italic p-4 text-center bg-secondary-surface rounded-2xl border border-secondary/10">
                      目前還沒有人點餐喔！
                    </div>
                  ) : (
                    allUsersOrders.map(order => (
                      <div key={order.id} className={`bg-secondary-surface rounded-2xl p-4 shadow-sm border border-outline-variant relative transition-opacity ${deletingId === order.id ? 'opacity-50 pointer-events-none' : ''}`}>
                        {deletingId === order.id && (
                          <div className="absolute inset-0 flex items-center justify-center bg-white/20 rounded-2xl z-20">
                            <div className="flex flex-col items-center gap-2">
                              <LoadingSpinner size={24} className="text-secondary" />
                              <span className="text-xs font-medium text-secondary">同步刪除中...</span>
                            </div>
                          </div>
                        )}
                        <div className="flex justify-between items-start mb-3">
                          <div className="flex items-center gap-3">
                            <h3 className="text-base font-medium text-[#1D1B20]">{order.filler_name}</h3>
                            <span className="text-sm font-medium text-secondary bg-secondary-stepper px-2 py-0.5 rounded-md">
                              ${order.total_price}
                            </span>
                          </div>
                          <div className="flex gap-1 -mt-1 -mr-1">
                            <button
                              onClick={() => setEditingOrder(order)}
                              className="p-2 rounded-full hover:bg-black/5 text-[#49454F] hover:text-secondary transition-colors"
                              aria-label="編輯訂單"
                            >
                              <Edit size={18} />
                            </button>
                            <button
                              onClick={() => handleDeleteOrder(order.id)}
                              className="p-2 rounded-full hover:bg-[#BA1A1A]/8 text-[#49454F] hover:text-[#BA1A1A] transition-colors"
                              aria-label="刪除訂單"
                            >
                              <Trash2 size={18} />
                            </button>
                          </div>
                        </div>

                        <div className="flex flex-col gap-1">
                          {order.items.length > 0 ? (
                            order.items.map(item => (
                              <div key={item.id} className="text-sm text-[#49454F] flex justify-between">
                                <span>{item.meal.name} <span className="text-[#79747E]">× {item.quantity}</span></span>
                                <span>${item.subtotal}</span>
                              </div>
                            ))
                          ) : (
                            <div className="text-sm text-[#49454F] whitespace-pre-wrap">
                              {/* @ts-ignore */}
                              {order._summary || '無餐點明細'}
                            </div>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </section>

          {/* Divider for mobile */}
          <div className="hidden max-lg:block h-[2px] bg-[#CAC4D0] my-2 w-full"></div>

          {/* Section B: Filler Input (Primary Color Scheme - M3 Purple) */}
          <section className="bg-primary-container rounded-[28px] p-6 md:p-8 shadow-sm h-fit border border-primary/10">
            <h2 className="text-xl font-medium mb-6 text-[#1D1B20]">新增個人訂單</h2>

            <div className="space-y-6">
              {/* Name Input */}
              <div className="space-y-1">
                <div className="relative">
                  <input
                    type="text"
                    id="filler_name"
                    value={fillerName}
                    onChange={(e) => {
                      setFillerName(e.target.value);
                      if (e.target.value.trim()) setFillerNameError(false);
                    }}
                    className={`block w-full px-4 py-3.5 text-base text-[#1D1B20] bg-transparent border ${fillerNameError ? 'border-[#BA1A1A] focus:ring-[#BA1A1A]' : 'border-primary-border focus:ring-primary'} rounded-[4px] appearance-none focus:outline-none focus:ring-2 focus:border-transparent peer`}
                    placeholder=" "
                  />
                  <label
                    htmlFor="filler_name"
                    className={`absolute text-sm duration-300 transform -translate-y-4 scale-75 top-2 z-10 origin-[0] bg-primary-container px-2 peer-focus:px-2 peer-placeholder-shown:scale-100 peer-placeholder-shown:-translate-y-1/2 peer-placeholder-shown:top-1/2 peer-focus:top-2 peer-focus:scale-75 peer-focus:-translate-y-4 left-3 pointer-events-none 
                      ${fillerNameError ? 'text-[#BA1A1A] peer-focus:text-[#BA1A1A]' : 'text-[#49454F] peer-focus:text-primary'}`}
                  >
                    您的姓名
                  </label>
                </div>
                {fillerNameError && (
                  <span className="text-xs text-[#BA1A1A] ml-1 block">請填寫姓名</span>
                )}
              </div>

              {/* Meal Selector */}
              <div className="space-y-1">
                <div className="relative">
                  <select
                    id="meal_selector"
                    value={selectedMealId}
                    onChange={(e) => {
                      setSelectedMealId(e.target.value);
                      if (e.target.value) setSelectedMealError(false);
                    }}
                    disabled={isLoadingMenu}
                    className={`block w-full px-4 py-3.5 text-base text-[#1D1B20] bg-transparent border ${selectedMealError ? 'border-[#BA1A1A] focus:ring-[#BA1A1A]' : 'border-primary-border focus:ring-primary'} rounded-[4px] appearance-none focus:outline-none focus:ring-2 focus:border-transparent peer disabled:opacity-50 disabled:bg-gray-50 font-mono`}
                  >
                    {isLoadingMenu ? (
                      <option className="bg-primary-surface font-sans">正在同步餐點清單...</option>
                    ) : (
                      <>
                        <option value="" disabled className="bg-primary-surface font-sans">請選擇餐點</option>
                        {globalMeals.map(meal => (
                          <option key={meal.id} value={meal.id} className="bg-primary-surface">
                            {padMealName(meal.name)} ${String(meal.price).padStart(3, '\u00A0')}
                          </option>
                        ))}
                      </>
                    )}
                  </select>
                  <label
                    htmlFor="meal_selector"
                    className={`absolute text-sm duration-300 transform -translate-y-4 scale-75 top-2 z-10 origin-[0] bg-primary-container px-2 peer-focus:px-2 peer-placeholder-shown:scale-100 peer-placeholder-shown:-translate-y-1/2 peer-placeholder-shown:top-1/2 peer-focus:top-2 peer-focus:scale-75 peer-focus:-translate-y-4 left-3 pointer-events-none
                      ${selectedMealError ? 'text-[#BA1A1A] peer-focus:text-[#BA1A1A]' : 'text-[#49454F] peer-focus:text-primary'}`}
                  >
                    選擇餐點
                  </label>
                  <div className="absolute inset-y-0 right-0 flex items-center px-4 pointer-events-none text-[#49454F]">
                    <ChevronDown size={20} />
                  </div>
                </div>
                {selectedMealError && (
                  <span className="text-xs text-[#BA1A1A] ml-1 block">請選擇餐點</span>
                )}
              </div>

              {/* Quantity Stepper */}
              <div className="flex items-center gap-4">
                <span className="text-sm font-medium text-[#49454F]">數量</span>
                <div className="flex items-center bg-primary-stepper rounded-full">
                  <button
                    onClick={() => currentQuantity > 1 && setCurrentQuantity(q => q - 1)}
                    disabled={currentQuantity <= 1}
                    className="p-2 rounded-full text-[#1D1B20] hover:bg-black/5 disabled:opacity-50 disabled:hover:bg-transparent transition-colors"
                  >
                    <Minus size={20} />
                  </button>
                  <span className="text-xl w-12 text-center font-normal text-[#1D1B20]">{currentQuantity}</span>
                  <button
                    onClick={() => setCurrentQuantity(q => q + 1)}
                    className="p-2 rounded-full text-[#1D1B20] hover:bg-black/5 transition-colors"
                  >
                    <Plus size={20} />
                  </button>
                </div>
              </div>

              {/* Add to Draft Button */}
              <button
                onClick={handleAddToDraft}
                disabled={!selectedMeal || currentQuantity <= 0}
                className="relative z-10 w-full bg-primary-variant text-white rounded-full px-6 py-2.5 font-medium flex items-center justify-center gap-2 hover:brightness-110 active:scale-95 active:opacity-80 transition-all disabled:opacity-50"
              >
                <Plus size={20} />
                加入個人清單
              </button>

              {/* Draft Summary */}
              <div className="mt-8 pt-6 border-t border-outline-variant">
                <h3 className="text-sm font-medium text-[#49454F] mb-3">目前已選餐點：</h3>

                <div className="space-y-2 mb-4 max-h-48 overflow-y-auto">
                  {fillerDraftList.length === 0 ? (
                    <p className="text-sm text-[#79747E] italic">尚未加入任何餐點</p>
                  ) : (
                    fillerDraftList.map(item => (
                      <div key={item.id} className="flex justify-between items-center bg-primary-container-low p-3 rounded-xl border border-outline-variant">
                        <div className="flex flex-col">
                          <span className="text-sm font-medium text-[#1D1B20]">{item.meal.name}</span>
                          <span className="text-xs text-[#49454F]">${item.meal.price} × {item.quantity}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-medium text-[#1D1B20]">${item.subtotal}</span>
                          <button
                            onClick={() => handleRemoveFromDraft(item.id)}
                            className="p-1.5 rounded-full text-[#BA1A1A] hover:bg-[#BA1A1A]/8 transition-colors"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                <div className="flex justify-end mb-6">
                  <h4 className="text-base font-medium text-[#1D1B20]">
                    您的總價：<span className="text-primary font-bold">${fillerTotalPrice}</span>
                  </h4>
                </div>

                {/* Submit Button */}
                <button
                  onClick={handleSubmitOrder}
                  disabled={isSubmitting}
                  className="relative z-10 w-full bg-primary text-white rounded-full px-6 py-3 font-medium flex items-center justify-center gap-2 hover:brightness-110 active:scale-95 active:opacity-80 disabled:bg-gray-300 disabled:cursor-not-allowed transition-all"
                >
                  {isSubmitting ? (
                    <>
                      <LoadingSpinner size={20} />
                      正在送出...
                    </>
                  ) : (
                    <>
                      <CloudUpload size={20} />
                      送出訂單
                    </>
                  )}
                </button>
              </div>
            </div>
          </section>
        </div>
      </div>

      {/* Edit Dialog */}
      {editingOrder && (
        <EditDialog
          order={editingOrder}
          meals={globalMeals}
          onClose={() => setEditingOrder(null)}
          onSave={handleSaveEdit}
          isSaving={isSubmitting}
        />
      )}
    </div>
  );
}

// --- Edit Dialog Component ---
function EditDialog({ order, meals, onClose, onSave, isSaving }: { order: UserOrder, meals: Meal[], onClose: () => void, onSave: (o: UserOrder) => void, isSaving: boolean }) {
  const [name, setName] = useState(order.filler_name);
  const [draftList, setDraftList] = useState<DraftItem[]>(order.items);

  const [selectedMealId, setSelectedMealId] = useState<string>('');
  const [currentQuantity, setCurrentQuantity] = useState(1);

  // --- Validation State ---
  const [nameError, setNameError] = useState(false);
  const [mealError, setMealError] = useState(false);

  const selectedMeal = useMemo(() => meals.find(m => m.id === selectedMealId) || null, [selectedMealId, meals]);

  const totalPrice = useMemo(() => {
    return draftList.reduce((sum, item) => sum + item.subtotal, 0);
  }, [draftList]);

  const handleAdd = () => {
    if (!selectedMeal) {
      setMealError(true);
      return;
    }
    if (currentQuantity <= 0) return;

    setMealError(false);
    const newItem: DraftItem = {
      id: generateId(),
      meal: selectedMeal,
      quantity: currentQuantity,
      subtotal: selectedMeal.price * currentQuantity,
    };
    setDraftList(prev => [...prev, newItem]);
    setSelectedMealId('');
    setCurrentQuantity(1);
  };

  const handleRemove = (id: string) => {
    setDraftList(prev => prev.filter(item => item.id !== id));
  };

  const handleSave = () => {
    const isNameEmpty = !name.trim();
    const isDraftEmpty = draftList.length === 0;

    if (isNameEmpty) setNameError(true);
    if (isNameEmpty || isDraftEmpty) return;

    setNameError(false);
    onSave({
      ...order,
      filler_name: name.trim(),
      items: draftList,
      total_price: totalPrice,
    });
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-primary-surface rounded-[28px] w-full max-w-md flex flex-col max-h-[90vh] shadow-xl">
        <div className="p-6 pb-4 border-b border-outline-variant">
          <h2 className="text-2xl font-normal text-[#1D1B20]">編輯訂單</h2>
        </div>

        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {/* Name Input */}
          <div className="space-y-1">
            <div className="relative">
              <input
                type="text"
                id="edit_filler_name"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  if (e.target.value.trim()) setNameError(false);
                }}
                className={`block w-full px-4 py-3.5 text-base text-[#1D1B20] bg-transparent border ${nameError ? 'border-[#BA1A1A] focus:ring-[#BA1A1A]' : 'border-primary-border focus:ring-primary'} rounded-[4px] appearance-none focus:outline-none focus:ring-2 focus:border-transparent peer`}
                placeholder=" "
              />
              <label
                htmlFor="edit_filler_name"
                className={`absolute text-sm duration-300 transform -translate-y-4 scale-75 top-2 z-10 origin-[0] bg-primary-surface px-2 peer-focus:px-2 peer-placeholder-shown:scale-100 peer-placeholder-shown:-translate-y-1/2 peer-placeholder-shown:top-1/2 peer-focus:top-2 peer-focus:scale-75 peer-focus:-translate-y-4 left-3 pointer-events-none
                  ${nameError ? 'text-[#BA1A1A] peer-focus:text-[#BA1A1A]' : 'text-[#49454F] peer-focus:text-primary'}`}
              >
                您的姓名
              </label>
            </div>
            {nameError && (
              <span className="text-xs text-[#BA1A1A] ml-1 block">請填寫姓名</span>
            )}
          </div>

          {/* Add Meal */}
          <div className="bg-primary-container p-4 rounded-2xl space-y-4">
            <h3 className="text-sm font-medium text-[#49454F]">新增餐點</h3>
            <div className="space-y-1">
              <div className="relative">
                <select
                  id="edit_meal_sel"
                  value={selectedMealId}
                  onChange={(e) => {
                    setSelectedMealId(e.target.value);
                    if (e.target.value) setMealError(false);
                  }}
                  disabled={meals.length === 0}
                  className={`block w-full px-4 py-3 text-base text-[#1D1B20] bg-transparent border ${mealError ? 'border-[#BA1A1A] focus:ring-[#BA1A1A]' : 'border-primary-border focus:ring-primary'} rounded-[4px] appearance-none focus:outline-none focus:ring-2 focus:border-transparent disabled:opacity-50 font-mono`}
                >
                  {meals.length === 0 ? (
                    <option className="bg-primary-surface font-sans">載入選單中...</option>
                  ) : (
                    <>
                      <option value="" disabled className="bg-primary-surface font-sans">請選擇餐點</option>
                      {meals.map(meal => (
                        <option key={meal.id} value={meal.id} className="bg-primary-surface">
                          {padMealName(meal.name)} ${String(meal.price).padStart(3, '\u00A0')}
                        </option>
                      ))}
                    </>
                  )}
                </select>
                <label
                  htmlFor="edit_meal_sel"
                  className={`absolute text-sm duration-300 transform -translate-y-4 scale-75 top-2 z-10 origin-[0] bg-primary-surface px-2 left-3 pointer-events-none
                    ${mealError ? 'text-[#BA1A1A]' : 'text-primary'}`}
                >
                  選擇餐點
                </label>
                <div className="absolute inset-y-0 right-0 flex items-center px-4 pointer-events-none text-[#49454F]">
                  <ChevronDown size={20} />
                </div>
              </div>
              {mealError && (
                <span className="text-xs text-[#BA1A1A] ml-1 block">請選擇餐點</span>
              )}
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center bg-primary-stepper rounded-full">
                <button
                  onClick={() => currentQuantity > 1 && setCurrentQuantity(q => q - 1)}
                  disabled={currentQuantity <= 1}
                  className="p-1.5 rounded-full text-[#1D1B20] hover:bg-black/5 disabled:opacity-50 transition-colors"
                >
                  <Minus size={18} />
                </button>
                <span className="text-lg w-10 text-center font-normal text-[#1D1B20]">{currentQuantity}</span>
                <button
                  onClick={() => setCurrentQuantity(q => q + 1)}
                  className="p-1.5 rounded-full text-[#1D1B20] hover:bg-black/5 transition-colors"
                >
                  <Plus size={18} />
                </button>
              </div>
              <button
                onClick={handleAdd}
                disabled={isSaving}
                className="relative z-10 bg-primary-variant text-white rounded-full px-5 py-2 text-sm font-medium hover:brightness-110 active:scale-95 active:opacity-80 transition-all disabled:opacity-50"
              >
                加入
              </button>
            </div>
          </div>

          {/* Draft List */}
          <div>
            <h3 className="text-sm font-medium text-[#49454F] mb-3">已選餐點：</h3>
            <div className="space-y-2">
              {draftList.map(item => (
                <div key={item.id} className="flex justify-between items-center bg-primary-container-low p-3 rounded-xl border border-outline-variant">
                  <div className="flex flex-col">
                    <span className="text-sm font-medium text-[#1D1B20]">{item.meal.name}</span>
                    <span className="text-xs text-[#49454F]">${item.meal.price} × {item.quantity}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium text-[#1D1B20]">${item.subtotal}</span>
                    <button
                      onClick={() => handleRemove(item.id)}
                      className="p-1.5 rounded-full text-[#BA1A1A] hover:bg-[#BA1A1A]/8 transition-colors"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="p-6 pt-4 border-t border-outline-variant flex justify-between items-center bg-primary-surface rounded-b-[28px]">
          <span className="text-base font-medium text-[#1D1B20]">總計: <span className="text-primary font-bold">${totalPrice}</span></span>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-6 py-2.5 rounded-full text-primary font-medium hover:bg-primary/8 transition-colors"
            >
              取消
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="relative z-10 px-6 py-2.5 rounded-full bg-primary text-white font-medium hover:brightness-110 active:scale-95 active:opacity-80 transition-all disabled:bg-gray-300 disabled:text-gray-500 flex items-center gap-2"
            >
              {isSaving ? (
                <>
                  <LoadingSpinner size={18} />
                  正在儲存...
                </>
              ) : '儲存'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
