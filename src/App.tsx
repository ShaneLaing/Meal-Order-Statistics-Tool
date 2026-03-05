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
  const [orderSearchKeyword, setOrderSearchKeyword] = useState('');
  const [isExportVisible, setIsExportVisible] = useState(false);

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

  const filteredOrders = useMemo(() => {
    const keyword = orderSearchKeyword.trim().toLowerCase();
    if (!keyword) return allUsersOrders;
    return allUsersOrders.filter(order => order.filler_name.toLowerCase().includes(keyword));
  }, [allUsersOrders, orderSearchKeyword]);

  const lineExportText = useMemo(() => {
    const lines = ['名字/餐點/價格'];

    filteredOrders.forEach(order => {
      if (order.items && order.items.length > 0) {
        order.items.forEach(item => {
          lines.push(`${order.filler_name}/${item.meal.name} × ${item.quantity}/${item.subtotal}`);
        });
      } else {
        lines.push(`${order.filler_name}/無餐點明細/${order.total_price}`);
      }
    });

    return lines.join('\n');
  }, [filteredOrders]);

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
    <div className="min-h-screen bg-[#f4f7fe] text-[#1e293b]">
      <main className="min-h-screen overflow-y-auto">
        <header className="h-20 px-4 md:px-10 flex items-center justify-between sticky top-0 z-10 bg-[#f4f7fe]/90 backdrop-blur">
          <h1 className="text-xl md:text-2xl font-bold">訂餐統計系統</h1>
        </header>

        <div className="px-4 md:px-10 pb-10 pt-4 md:pt-6 space-y-6">
          <section className="rounded-[20px] p-5 md:p-8 bg-[linear-gradient(135deg,#f0f3ff_0%,#e0e8ff_100%)] shadow-[0_4px_15px_rgba(91,88,255,0.05)] flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-sm md:text-base text-[#64748b] font-medium mb-1">今日訂餐總計 (Sales Distribution)</h2>
              <div className="text-3xl md:text-4xl font-bold text-[#1e293b]">${grandTotalPrice.toFixed(2)}</div>
            </div>
            <div className="flex gap-3 items-stretch">
              <div className="bg-white/80 backdrop-blur rounded-2xl px-4 py-3 min-w-[120px]">
                <span className="text-xs text-[#64748b]">總訂單數</span>
                <h3 className="text-xl font-bold text-[#1e293b] mt-1">{allUsersOrders.length} 筆</h3>
              </div>
              <button
                onClick={() => setIsExportVisible(v => !v)}
                className="rounded-2xl px-4 py-3 min-w-[120px] bg-[#5b58ff] text-white font-semibold text-sm shadow-[0_4px_12px_rgba(91,88,255,0.3)] hover:brightness-110 transition-all"
              >
                匯出訂單
              </button>
            </div>
          </section>

          {isExportVisible && (
            <section className="bg-white rounded-[20px] p-5 md:p-6 shadow-[0_4px_20px_rgba(0,0,0,0.03)] border border-[#e2e8f0]">
              <h3 className="text-base font-semibold mb-3 text-[#1e293b]">LINE text block</h3>
              <textarea
                readOnly
                value={lineExportText}
                className="w-full min-h-[180px] rounded-xl border border-[#e2e8f0] bg-[#f8fafc] p-3 text-sm text-[#334155] outline-none"
              />
            </section>
          )}

          <div className="grid grid-cols-1 xl:grid-cols-[1.2fr_1fr] gap-6 items-start">
            <section className="bg-white rounded-[20px] p-5 md:p-6 shadow-[0_4px_20px_rgba(0,0,0,0.03)]">
              <div className="flex justify-between items-center mb-5">
                <h2 className="text-lg font-semibold">所有人的訂單們</h2>
                <button
                  className="p-2 rounded-full text-[#64748b] hover:bg-[#eef2ff] hover:text-[#5b58ff] transition-colors"
                  onClick={() => setIsGlobalListExpanded(!isGlobalListExpanded)}
                >
                  {isGlobalListExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                </button>
              </div>

              <div className="w-full mb-5 bg-[#f8fafc] px-4 py-2.5 rounded-full border border-[#e2e8f0] flex items-center gap-2">
                <ChevronDown size={16} className="text-[#64748b] -rotate-90" />
                <input
                  type="text"
                  value={orderSearchKeyword}
                  onChange={(e) => setOrderSearchKeyword(e.target.value)}
                  placeholder="搜尋訂單或姓名..."
                  className="w-full bg-transparent outline-none text-sm text-[#1e293b] placeholder:text-[#94a3b8]"
                />
              </div>

              {isGlobalListExpanded && (
                <div className="space-y-4 max-h-[640px] overflow-y-auto pr-1">
                  {isLoadingMenu ? (
                    <div className="p-5 text-center rounded-2xl border border-[#e2e8f0] bg-[#f8fafc] text-[#64748b] flex flex-col items-center gap-2">
                      <LoadingSpinner size={20} className="text-[#5b58ff]" />
                      <span>正在同步雲端資料...</span>
                    </div>
                  ) : filteredOrders.length === 0 ? (
                    <div className="p-5 text-center rounded-2xl border border-[#e2e8f0] bg-[#f8fafc] text-[#64748b] italic">
                      {orderSearchKeyword.trim() ? '找不到符合的姓名' : '目前還沒有人點餐喔！'}
                    </div>
                  ) : (
                    filteredOrders.map(order => (
                      <div key={order.id} className={`relative rounded-2xl border border-[#e2e8f0] p-4 transition-all hover:border-[#5b58ff] hover:shadow-[0_4px_12px_rgba(91,88,255,0.08)] ${deletingId === order.id ? 'opacity-50 pointer-events-none' : ''}`}>
                        {deletingId === order.id && (
                          <div className="absolute inset-0 flex items-center justify-center rounded-2xl bg-white/70 z-20">
                            <div className="flex flex-col items-center gap-2">
                              <LoadingSpinner size={22} className="text-[#5b58ff]" />
                              <span className="text-xs font-medium text-[#5b58ff]">同步刪除中...</span>
                            </div>
                          </div>
                        )}

                        <div className="flex justify-between items-start mb-3 pb-3 border-b border-dashed border-[#e2e8f0]">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-[#eef2ff] text-[#5b58ff] flex items-center justify-center text-sm font-semibold">
                              {order.filler_name?.slice(0, 1) || '人'}
                            </div>
                            <span className="font-semibold text-[#1e293b]">{order.filler_name}</span>
                            <span className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-[#d1fae5] text-[#10b981]">${order.total_price}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => setEditingOrder(order)}
                              className="p-2 rounded-full text-[#64748b] hover:bg-[#eef2ff] hover:text-[#5b58ff] transition-colors"
                              aria-label="編輯訂單"
                            >
                              <Edit size={16} />
                            </button>
                            <button
                              onClick={() => handleDeleteOrder(order.id)}
                              className="p-2 rounded-full text-[#64748b] hover:bg-[#fee2e2] hover:text-[#dc2626] transition-colors"
                              aria-label="刪除訂單"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </div>

                        <div className="space-y-1">
                          {order.items.length > 0 ? (
                            order.items.map(item => (
                              <div key={item.id} className="text-sm text-[#64748b] flex justify-between">
                                <span>{item.meal.name} × {item.quantity}</span>
                                <span>${item.subtotal}</span>
                              </div>
                            ))
                          ) : (
                            <div className="text-sm text-[#64748b] whitespace-pre-wrap">
                              {/* @ts-ignore */}
                              {order._summary || '無餐點明細'}
                            </div>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </section>

            <section className="bg-white rounded-[20px] p-5 md:p-6 shadow-[0_4px_20px_rgba(0,0,0,0.03)]">
              <div className="mb-5">
                <h2 className="text-lg font-semibold">新增個人訂單</h2>
              </div>

              <div className="space-y-5">
                <div>
                  <label htmlFor="filler_name" className="block text-sm font-medium text-[#64748b] mb-2">您的姓名</label>
                  <input
                    type="text"
                    id="filler_name"
                    value={fillerName}
                    onChange={(e) => {
                      setFillerName(e.target.value);
                      if (e.target.value.trim()) setFillerNameError(false);
                    }}
                    className={`w-full px-4 py-3.5 rounded-xl border text-sm bg-[#f8fafc] outline-none transition-all ${fillerNameError ? 'border-[#dc2626] focus:ring-4 focus:ring-[#fee2e2]' : 'border-[#e2e8f0] focus:border-[#5b58ff] focus:ring-4 focus:ring-[#eef2ff]'}`}
                    placeholder="請輸入姓名"
                  />
                  {fillerNameError && <span className="text-xs text-[#dc2626] mt-1 block">請填寫姓名</span>}
                </div>

                <div>
                  <label htmlFor="meal_selector" className="block text-sm font-medium text-[#64748b] mb-2">選擇餐點</label>
                  <div className="relative">
                    <select
                      id="meal_selector"
                      value={selectedMealId}
                      onChange={(e) => {
                        setSelectedMealId(e.target.value);
                        if (e.target.value) setSelectedMealError(false);
                      }}
                      disabled={isLoadingMenu}
                      className={`w-full px-4 py-3.5 rounded-xl border text-sm bg-[#f8fafc] outline-none transition-all appearance-none font-mono disabled:opacity-60 ${selectedMealError ? 'border-[#dc2626] focus:ring-4 focus:ring-[#fee2e2]' : 'border-[#e2e8f0] focus:border-[#5b58ff] focus:ring-4 focus:ring-[#eef2ff]'}`}
                    >
                      {isLoadingMenu ? (
                        <option className="font-sans">正在同步餐點清單...</option>
                      ) : (
                        <>
                          <option value="" disabled className="font-sans">請選擇餐點...</option>
                          {globalMeals.map(meal => (
                            <option key={meal.id} value={meal.id}>
                              {padMealName(meal.name)} ${String(meal.price).padStart(3, '\u00A0')}
                            </option>
                          ))}
                        </>
                      )}
                    </select>
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 text-[#64748b] pointer-events-none">
                      <ChevronDown size={18} />
                    </div>
                  </div>
                  {selectedMealError && <span className="text-xs text-[#dc2626] mt-1 block">請選擇餐點</span>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-[#64748b] mb-2">數量</label>
                  <div className="inline-flex items-center bg-[#f8fafc] border border-[#e2e8f0] rounded-xl p-1">
                    <button
                      onClick={() => currentQuantity > 1 && setCurrentQuantity(q => q - 1)}
                      disabled={currentQuantity <= 1}
                      className="w-8 h-8 rounded-lg bg-white flex items-center justify-center text-[#1e293b] disabled:opacity-50"
                    >
                      <Minus size={16} />
                    </button>
                    <span className="w-10 text-center font-semibold">{currentQuantity}</span>
                    <button
                      onClick={() => setCurrentQuantity(q => q + 1)}
                      className="w-8 h-8 rounded-lg bg-white flex items-center justify-center text-[#1e293b]"
                    >
                      <Plus size={16} />
                    </button>
                  </div>
                </div>

                <button
                  onClick={handleAddToDraft}
                  disabled={!selectedMeal || currentQuantity <= 0}
                  className="w-full px-4 py-3 rounded-xl font-semibold flex items-center justify-center gap-2 bg-[#eef2ff] text-[#5b58ff] hover:bg-[#e0e7ff] transition-colors disabled:opacity-50"
                >
                  <Plus size={18} />
                  加入個人清單
                </button>

                <div className="pt-5 border-t border-[#e2e8f0]">
                  <label className="block text-sm font-medium text-[#64748b] mb-3">目前已選餐點：</label>
                  <div className="space-y-2 mb-4 max-h-52 overflow-y-auto">
                    {fillerDraftList.length === 0 ? (
                      <div className="text-[#64748b] text-sm italic text-center py-4">尚未加入任何餐點</div>
                    ) : (
                      fillerDraftList.map(item => (
                        <div key={item.id} className="flex items-center justify-between p-3 rounded-xl border border-[#e2e8f0] bg-[#f8fafc]">
                          <div className="flex flex-col">
                            <span className="text-sm font-medium text-[#1e293b]">{item.meal.name}</span>
                            <span className="text-xs text-[#64748b]">${item.meal.price} × {item.quantity}</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-sm font-semibold text-[#1e293b]">${item.subtotal}</span>
                            <button
                              onClick={() => handleRemoveFromDraft(item.id)}
                              className="p-1.5 rounded-full text-[#dc2626] hover:bg-[#fee2e2] transition-colors"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  <div className="flex justify-between items-center mb-5 text-lg font-bold">
                    <span>您的總價</span>
                    <span className="text-[#5b58ff] text-2xl">${fillerTotalPrice}</span>
                  </div>

                  <button
                    onClick={handleSubmitOrder}
                    disabled={isSubmitting}
                    className="w-full bg-[#5b58ff] text-white rounded-xl px-4 py-3.5 font-semibold flex items-center justify-center gap-2 shadow-[0_4px_15px_rgba(91,88,255,0.3)] hover:-translate-y-0.5 hover:shadow-[0_6px_20px_rgba(91,88,255,0.4)] transition-all disabled:bg-gray-300 disabled:shadow-none disabled:translate-y-0"
                  >
                    {isSubmitting ? (
                      <>
                        <LoadingSpinner size={18} />
                        正在送出...
                      </>
                    ) : (
                      <>
                        <CloudUpload size={18} />
                        送出訂單
                      </>
                    )}
                  </button>
                </div>
              </div>
            </section>
          </div>
        </div>
      </main>

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
      <div className="bg-white rounded-[20px] w-full max-w-md flex flex-col max-h-[90vh] shadow-[0_12px_40px_rgba(15,23,42,0.2)]">
        <div className="p-6 pb-4 border-b border-[#e2e8f0]">
          <h2 className="text-2xl font-semibold text-[#1e293b]">編輯訂單</h2>
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
                className={`w-full px-4 py-3.5 text-sm bg-[#f8fafc] border rounded-xl outline-none ${nameError ? 'border-[#dc2626] focus:ring-4 focus:ring-[#fee2e2]' : 'border-[#e2e8f0] focus:border-[#5b58ff] focus:ring-4 focus:ring-[#eef2ff]'}`}
                placeholder=" "
              />
              <label htmlFor="edit_filler_name" className="absolute left-3 -top-2 px-1 text-xs bg-white text-[#64748b]">您的姓名</label>
            </div>
            {nameError && (
              <span className="text-xs text-[#dc2626] ml-1 block">請填寫姓名</span>
            )}
          </div>

          {/* Add Meal */}
          <div className="bg-[#f8fafc] p-4 rounded-2xl space-y-4 border border-[#e2e8f0]">
            <h3 className="text-sm font-medium text-[#64748b]">新增餐點</h3>
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
                  className={`w-full px-4 py-3 text-sm bg-white border rounded-xl outline-none appearance-none disabled:opacity-50 font-mono ${mealError ? 'border-[#dc2626] focus:ring-4 focus:ring-[#fee2e2]' : 'border-[#e2e8f0] focus:border-[#5b58ff] focus:ring-4 focus:ring-[#eef2ff]'}`}
                >
                  {meals.length === 0 ? (
                    <option className="font-sans">載入選單中...</option>
                  ) : (
                    <>
                      <option value="" disabled className="font-sans">請選擇餐點</option>
                      {meals.map(meal => (
                        <option key={meal.id} value={meal.id}>
                          {padMealName(meal.name)} ${String(meal.price).padStart(3, '\u00A0')}
                        </option>
                      ))}
                    </>
                  )}
                </select>
                <label
                  htmlFor="edit_meal_sel"
                  className={`absolute left-3 -top-2 px-1 text-xs bg-[#f8fafc] pointer-events-none ${mealError ? 'text-[#dc2626]' : 'text-[#64748b]'}`}
                >
                  選擇餐點
                </label>
                <div className="absolute inset-y-0 right-0 flex items-center px-4 pointer-events-none text-[#64748b]">
                  <ChevronDown size={20} />
                </div>
              </div>
              {mealError && (
                <span className="text-xs text-[#dc2626] ml-1 block">請選擇餐點</span>
              )}
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center bg-white border border-[#e2e8f0] rounded-xl p-1">
                <button
                  onClick={() => currentQuantity > 1 && setCurrentQuantity(q => q - 1)}
                  disabled={currentQuantity <= 1}
                  className="w-8 h-8 rounded-lg text-[#1e293b] hover:bg-[#f1f5f9] disabled:opacity-50 transition-colors"
                >
                  <Minus size={18} />
                </button>
                <span className="text-lg w-10 text-center font-semibold text-[#1e293b]">{currentQuantity}</span>
                <button
                  onClick={() => setCurrentQuantity(q => q + 1)}
                  className="w-8 h-8 rounded-lg text-[#1e293b] hover:bg-[#f1f5f9] transition-colors"
                >
                  <Plus size={18} />
                </button>
              </div>
              <button
                onClick={handleAdd}
                disabled={isSaving}
                className="relative z-10 bg-[#eef2ff] text-[#5b58ff] rounded-xl px-5 py-2 text-sm font-semibold hover:bg-[#e0e7ff] transition-all disabled:opacity-50"
              >
                加入
              </button>
            </div>
          </div>

          {/* Draft List */}
          <div>
            <h3 className="text-sm font-medium text-[#64748b] mb-3">已選餐點：</h3>
            <div className="space-y-2">
              {draftList.map(item => (
                <div key={item.id} className="flex justify-between items-center bg-[#f8fafc] p-3 rounded-xl border border-[#e2e8f0]">
                  <div className="flex flex-col">
                    <span className="text-sm font-medium text-[#1e293b]">{item.meal.name}</span>
                    <span className="text-xs text-[#64748b]">${item.meal.price} × {item.quantity}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium text-[#1e293b]">${item.subtotal}</span>
                    <button
                      onClick={() => handleRemove(item.id)}
                      className="p-1.5 rounded-full text-[#dc2626] hover:bg-[#fee2e2] transition-colors"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="p-6 pt-4 border-t border-[#e2e8f0] flex justify-between items-center bg-white rounded-b-[20px]">
          <span className="text-base font-medium text-[#1e293b]">總計: <span className="text-[#5b58ff] font-bold">${totalPrice}</span></span>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-6 py-2.5 rounded-xl text-[#5b58ff] font-semibold hover:bg-[#eef2ff] transition-colors"
            >
              取消
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="relative z-10 px-6 py-2.5 rounded-xl bg-[#5b58ff] text-white font-semibold hover:brightness-110 transition-all disabled:bg-gray-300 disabled:text-gray-500 flex items-center gap-2"
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
