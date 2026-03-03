import React, { useState, useMemo } from 'react';
import { Edit, Plus, Minus, CloudUpload, Trash2, ChevronDown, ChevronUp } from 'lucide-react';

// --- Types ---
type Meal = {
  id: string;
  name: string;
  price: number;
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
const MEALS: Meal[] = [
  { id: 'm1', name: '排骨飯', price: 100 },
  { id: 'm2', name: '雞腿飯', price: 120 },
  { id: 'm3', name: '控肉飯', price: 90 },
  { id: 'm4', name: '素食便當', price: 80 },
  { id: 'm5', name: '牛肉麵', price: 150 },
];

export default function App() {
  // --- Global State (Section A) ---
  const [allUsersOrders, setAllUsersOrders] = useState<UserOrder[]>([]);

  const grandTotalPrice = useMemo(() => {
    return allUsersOrders.reduce((sum, order) => sum + order.total_price, 0);
  }, [allUsersOrders]);

  // --- Draft State (Section B) ---
  const [fillerName, setFillerName] = useState('');
  const [selectedMealId, setSelectedMealId] = useState<string>('');
  const [currentQuantity, setCurrentQuantity] = useState(1);
  const [fillerDraftList, setFillerDraftList] = useState<DraftItem[]>([]);

  const selectedMeal = useMemo(() => MEALS.find(m => m.id === selectedMealId) || null, [selectedMealId]);

  const fillerTotalPrice = useMemo(() => {
    return fillerDraftList.reduce((sum, item) => sum + item.subtotal, 0);
  }, [fillerDraftList]);

  // --- Edit State ---
  const [editingOrder, setEditingOrder] = useState<UserOrder | null>(null);
  const [isGlobalListExpanded, setIsGlobalListExpanded] = useState(true);

  // --- Actions ---
  const handleAddToDraft = () => {
    if (!selectedMeal || currentQuantity <= 0) return;

    const newItem: DraftItem = {
      id: crypto.randomUUID(),
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

  const handleSubmitOrder = () => {
    if (!fillerName.trim() || fillerDraftList.length === 0) return;

    const newOrder: UserOrder = {
      id: crypto.randomUUID(),
      filler_name: fillerName.trim(),
      items: fillerDraftList,
      total_price: fillerTotalPrice,
    };

    setAllUsersOrders(prev => [...prev, newOrder]);
    
    // Reset Draft State
    setFillerName('');
    setFillerDraftList([]);
    setSelectedMealId('');
    setCurrentQuantity(1);
  };

  const handleDeleteOrder = (id: string) => {
    setAllUsersOrders(prev => prev.filter(o => o.id !== id));
  };

  // --- Edit Actions ---
  const handleSaveEdit = (updatedOrder: UserOrder) => {
    setAllUsersOrders(prev => prev.map(o => o.id === updatedOrder.id ? updatedOrder : o));
    setEditingOrder(null);
  };

  return (
    <div className="min-h-screen bg-[#FEF7FF] text-[#1D1B20] p-4 md:p-8 font-sans">
      <div className="max-w-7xl mx-auto">
        <header className="mb-8">
          <h1 className="text-3xl md:text-4xl font-normal tracking-tight text-[#1D1B20]">訂餐統計系統</h1>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-start">
          
          {/* Section A: Global Summary (Primary Color Scheme) */}
          <section className="bg-[#F3EDF7] rounded-[28px] p-6 md:p-8 shadow-sm h-fit border border-[#6750A4]/10">
            <div 
              className="flex justify-between items-center mb-6 cursor-pointer select-none"
              onClick={() => setIsGlobalListExpanded(!isGlobalListExpanded)}
            >
              <div className="flex items-center gap-3">
                <h2 className="text-xl font-medium text-[#1D1B20]">大家的總列表</h2>
                <span className="text-sm font-medium text-[#21005D] bg-[#EADDFF] px-2 py-1 rounded-lg border border-[#6750A4]/20">
                  總計: ${grandTotalPrice}
                </span>
              </div>
              <button className="p-1 rounded-full text-[#49454F] hover:bg-[#6750A4]/10 transition-colors">
                {isGlobalListExpanded ? <ChevronUp size={24} /> : <ChevronDown size={24} />}
              </button>
            </div>
            
            {isGlobalListExpanded && (
              <div className="flex flex-col animate-in fade-in slide-in-from-top-2 duration-200">
                <div className="overflow-y-auto pr-2 space-y-4 max-h-[600px]">
                  {allUsersOrders.length === 0 ? (
                    <div className="text-[#49454F] italic p-4 text-center bg-[#FEF7FF] rounded-2xl border border-[#6750A4]/10">
                      目前還沒有人點餐喔！
                    </div>
                  ) : (
                    allUsersOrders.map(order => (
                      <div key={order.id} className="bg-[#FEF7FF] rounded-2xl p-4 shadow-sm border border-[#6750A4]/20">
                        <div className="flex justify-between items-start mb-3">
                          <div className="flex items-center gap-3">
                            <h3 className="text-base font-medium text-[#1D1B20]">{order.filler_name}</h3>
                            <span className="text-sm font-medium text-[#21005D] bg-[#EADDFF] px-2 py-0.5 rounded-md">
                              ${order.total_price}
                            </span>
                          </div>
                          <div className="flex gap-1 -mt-1 -mr-1">
                            <button 
                              onClick={() => setEditingOrder(order)}
                              className="p-2 rounded-full hover:bg-[#EADDFF] text-[#49454F] hover:text-[#21005D] transition-colors"
                              aria-label="編輯訂單"
                            >
                              <Edit size={18} />
                            </button>
                            <button 
                              onClick={() => handleDeleteOrder(order.id)}
                              className="p-2 rounded-full hover:bg-[#FFDAD6] text-[#BA1A1A] transition-colors"
                              aria-label="刪除訂單"
                            >
                              <Trash2 size={18} />
                            </button>
                          </div>
                        </div>
                        
                        <div className="flex flex-col gap-1">
                          {order.items.map(item => (
                            <div key={item.id} className="text-sm text-[#49454F] flex justify-between">
                              <span>{item.meal.name} <span className="text-[#79747E]">x {item.quantity}</span></span>
                              <span>${item.subtotal}</span>
                            </div>
                          ))}
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

          {/* Section B: Filler Input (Secondary Color Scheme) */}
          <section className="bg-[#F0FDF4] rounded-[28px] p-6 md:p-8 shadow-sm h-fit border border-[#166534]/10">
            <h2 className="text-xl font-medium mb-6 text-[#1D1B20]">新增個人訂單</h2>
            
            <div className="space-y-6">
              {/* Name Input */}
              <div className="relative">
                <input
                  type="text"
                  id="filler_name"
                  value={fillerName}
                  onChange={(e) => setFillerName(e.target.value)}
                  className="block w-full px-4 py-3.5 text-base text-[#1D1B20] bg-transparent border border-[#79747E] rounded-[4px] appearance-none focus:outline-none focus:ring-2 focus:ring-[#166534] focus:border-transparent peer"
                  placeholder=" "
                />
                <label
                  htmlFor="filler_name"
                  className="absolute text-sm text-[#49454F] duration-300 transform -translate-y-4 scale-75 top-2 z-10 origin-[0] bg-[#F0FDF4] px-2 peer-focus:px-2 peer-focus:text-[#166534] peer-placeholder-shown:scale-100 peer-placeholder-shown:-translate-y-1/2 peer-placeholder-shown:top-1/2 peer-focus:top-2 peer-focus:scale-75 peer-focus:-translate-y-4 left-3"
                >
                  您的姓名
                </label>
              </div>

              {/* Meal Selector */}
              <div className="relative">
                <select
                  id="meal_selector"
                  value={selectedMealId}
                  onChange={(e) => setSelectedMealId(e.target.value)}
                  className="block w-full px-4 py-3.5 text-base text-[#1D1B20] bg-transparent border border-[#79747E] rounded-[4px] appearance-none focus:outline-none focus:ring-2 focus:ring-[#166534] focus:border-transparent peer"
                >
                  <option value="" disabled>請選擇餐點</option>
                  {MEALS.map(meal => (
                    <option key={meal.id} value={meal.id}>
                      {meal.name} - ${meal.price}
                    </option>
                  ))}
                </select>
                <label
                  htmlFor="meal_selector"
                  className="absolute text-sm text-[#166534] duration-300 transform -translate-y-4 scale-75 top-2 z-10 origin-[0] bg-[#F0FDF4] px-2 left-3"
                >
                  選擇餐點
                </label>
                <div className="absolute inset-y-0 right-0 flex items-center px-4 pointer-events-none text-[#49454F]">
                  <ChevronDown size={20} />
                </div>
              </div>

              {/* Quantity Stepper */}
              <div className="flex items-center gap-4">
                <span className="text-sm font-medium text-[#49454F]">數量</span>
                <div className="flex items-center bg-[#DCFCE7] rounded-full">
                  <button
                    onClick={() => currentQuantity > 1 && setCurrentQuantity(q => q - 1)}
                    disabled={currentQuantity <= 1}
                    className="p-2 rounded-full text-[#1D1B20] hover:bg-[#BBF7D0] disabled:opacity-50 disabled:hover:bg-transparent transition-colors"
                  >
                    <Minus size={20} />
                  </button>
                  <span className="text-xl w-12 text-center font-normal text-[#1D1B20]">{currentQuantity}</span>
                  <button
                    onClick={() => setCurrentQuantity(q => q + 1)}
                    className="p-2 rounded-full text-[#1D1B20] hover:bg-[#BBF7D0] transition-colors"
                  >
                    <Plus size={20} />
                  </button>
                </div>
              </div>

              {/* Add to Draft Button */}
              <button
                onClick={handleAddToDraft}
                disabled={!selectedMeal || currentQuantity <= 0}
                className="w-full bg-[#BBF7D0] text-[#14532D] rounded-full px-6 py-2.5 font-medium flex items-center justify-center gap-2 hover:bg-[#86EFAC] transition-colors disabled:opacity-50 disabled:hover:bg-[#BBF7D0]"
              >
                <Plus size={20} />
                加入個人清單
              </button>

              {/* Draft Summary */}
              <div className="mt-8 pt-6 border-t border-[#CAC4D0]">
                <h3 className="text-sm font-medium text-[#49454F] mb-3">目前已選餐點：</h3>
                
                <div className="space-y-2 mb-4 max-h-48 overflow-y-auto">
                  {fillerDraftList.length === 0 ? (
                    <p className="text-sm text-[#79747E] italic">尚未加入任何餐點</p>
                  ) : (
                    fillerDraftList.map(item => (
                      <div key={item.id} className="flex justify-between items-center bg-white p-3 rounded-xl border border-[#CAC4D0]/50">
                        <div className="flex flex-col">
                          <span className="text-sm font-medium text-[#1D1B20]">{item.meal.name}</span>
                          <span className="text-xs text-[#49454F]">${item.meal.price} x {item.quantity}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-medium text-[#1D1B20]">${item.subtotal}</span>
                          <button 
                            onClick={() => handleRemoveFromDraft(item.id)}
                            className="p-1.5 rounded-full text-[#BA1A1A] hover:bg-[#FFDAD6] transition-colors"
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
                    您的總價：<span className="text-[#166534]">${fillerTotalPrice}</span>
                  </h4>
                </div>

                {/* Submit Button */}
                <button
                  onClick={handleSubmitOrder}
                  disabled={!fillerName.trim() || fillerDraftList.length === 0}
                  className="w-full bg-[#166534] text-white rounded-full px-6 py-3 font-medium flex items-center justify-center gap-2 hover:bg-[#14532D] transition-colors disabled:bg-[#1D1B20]/12 disabled:text-[#1D1B20]/38"
                >
                  <CloudUpload size={20} />
                  送出訂單
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
          onClose={() => setEditingOrder(null)} 
          onSave={handleSaveEdit} 
        />
      )}
    </div>
  );
}

// --- Edit Dialog Component ---
function EditDialog({ order, onClose, onSave }: { order: UserOrder, onClose: () => void, onSave: (o: UserOrder) => void }) {
  const [name, setName] = useState(order.filler_name);
  const [draftList, setDraftList] = useState<DraftItem[]>(order.items);
  
  const [selectedMealId, setSelectedMealId] = useState<string>('');
  const [currentQuantity, setCurrentQuantity] = useState(1);

  const selectedMeal = useMemo(() => MEALS.find(m => m.id === selectedMealId) || null, [selectedMealId]);

  const totalPrice = useMemo(() => {
    return draftList.reduce((sum, item) => sum + item.subtotal, 0);
  }, [draftList]);

  const handleAdd = () => {
    if (!selectedMeal || currentQuantity <= 0) return;
    const newItem: DraftItem = {
      id: crypto.randomUUID(),
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
    if (!name.trim() || draftList.length === 0) return;
    onSave({
      ...order,
      filler_name: name.trim(),
      items: draftList,
      total_price: totalPrice,
    });
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-[#FEF7FF] rounded-[28px] w-full max-w-md flex flex-col max-h-[90vh] shadow-xl">
        <div className="p-6 pb-4 border-b border-[#CAC4D0]/50">
          <h2 className="text-2xl font-normal text-[#1D1B20]">編輯訂單</h2>
        </div>
        
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {/* Name Input */}
          <div className="relative">
            <input
              type="text"
              id="edit_filler_name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="block w-full px-4 py-3.5 text-base text-[#1D1B20] bg-transparent border border-[#79747E] rounded-[4px] appearance-none focus:outline-none focus:ring-2 focus:ring-[#6750A4] focus:border-transparent peer"
              placeholder=" "
            />
            <label
              htmlFor="edit_filler_name"
              className="absolute text-sm text-[#49454F] duration-300 transform -translate-y-4 scale-75 top-2 z-10 origin-[0] bg-[#FEF7FF] px-2 peer-focus:px-2 peer-focus:text-[#6750A4] peer-placeholder-shown:scale-100 peer-placeholder-shown:-translate-y-1/2 peer-placeholder-shown:top-1/2 peer-focus:top-2 peer-focus:scale-75 peer-focus:-translate-y-4 left-3"
            >
              您的姓名
            </label>
          </div>

          {/* Add Meal */}
          <div className="bg-[#F3EDF7] p-4 rounded-2xl space-y-4">
            <h3 className="text-sm font-medium text-[#49454F]">新增餐點</h3>
            <div className="relative">
              <select
                value={selectedMealId}
                onChange={(e) => setSelectedMealId(e.target.value)}
                className="block w-full px-4 py-3 text-base text-[#1D1B20] bg-transparent border border-[#79747E] rounded-[4px] appearance-none focus:outline-none focus:ring-2 focus:ring-[#6750A4] focus:border-transparent"
              >
                <option value="" disabled>請選擇餐點</option>
                {MEALS.map(meal => (
                  <option key={meal.id} value={meal.id}>
                    {meal.name} - ${meal.price}
                  </option>
                ))}
              </select>
              <div className="absolute inset-y-0 right-0 flex items-center px-4 pointer-events-none text-[#49454F]">
                <ChevronDown size={20} />
              </div>
            </div>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center bg-[#ECE6F0] rounded-full">
                <button
                  onClick={() => currentQuantity > 1 && setCurrentQuantity(q => q - 1)}
                  disabled={currentQuantity <= 1}
                  className="p-1.5 rounded-full text-[#1D1B20] hover:bg-[#EADDFF] disabled:opacity-50 transition-colors"
                >
                  <Minus size={18} />
                </button>
                <span className="text-lg w-10 text-center font-normal text-[#1D1B20]">{currentQuantity}</span>
                <button
                  onClick={() => setCurrentQuantity(q => q + 1)}
                  className="p-1.5 rounded-full text-[#1D1B20] hover:bg-[#EADDFF] transition-colors"
                >
                  <Plus size={18} />
                </button>
              </div>
              <button
                onClick={handleAdd}
                disabled={!selectedMeal || currentQuantity <= 0}
                className="bg-[#E8DEF8] text-[#1D192B] rounded-full px-4 py-2 text-sm font-medium hover:bg-[#EADDFF] transition-colors disabled:opacity-50"
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
                <div key={item.id} className="flex justify-between items-center bg-[#F7F2FA] p-3 rounded-xl border border-[#CAC4D0]/50">
                  <div className="flex flex-col">
                    <span className="text-sm font-medium text-[#1D1B20]">{item.meal.name}</span>
                    <span className="text-xs text-[#49454F]">${item.meal.price} x {item.quantity}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium text-[#1D1B20]">${item.subtotal}</span>
                    <button 
                      onClick={() => handleRemove(item.id)}
                      className="p-1.5 rounded-full text-[#BA1A1A] hover:bg-[#FFDAD6] transition-colors"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
        
        <div className="p-6 pt-4 border-t border-[#CAC4D0]/50 flex justify-between items-center bg-[#FEF7FF] rounded-b-[28px]">
          <span className="text-base font-medium text-[#1D1B20]">總計: <span className="text-[#6750A4]">${totalPrice}</span></span>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-6 py-2.5 rounded-full text-[#6750A4] font-medium hover:bg-[#6750A4]/10 transition-colors"
            >
              取消
            </button>
            <button
              onClick={handleSave}
              disabled={!name.trim() || draftList.length === 0}
              className="px-6 py-2.5 rounded-full bg-[#6750A4] text-white font-medium hover:bg-[#553F8D] transition-colors disabled:bg-[#1D1B20]/12 disabled:text-[#1D1B20]/38"
            >
              儲存
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
