
import React, { useState, useMemo } from 'react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Legend } from 'recharts';
import { Shelf, DailySale, StoreMode, FloorStyle, WallStyle, Achievement, Employee, GameEvent, Freezer, EmployeeRole, Chiller, RivalStore, Ranking } from '../types';
import { PRODUCTS, ATM_COST, COFFEE_MACHINE_COST, STOCKER_HIRE_COST, STOCKER_SALARY, CLEANING_COST, EXPANSION_COST, EXPANDED_GRID_WIDTH, HOT_FOOD_CORNER_COST, TABLE_COST, LOTTERY_STAND_COST, FREEZER_COST, FROZEN_PRODUCTS, CASHIER_HIRE_COST, CASHIER_SALARY, SERVICE_STAFF_HIRE_COST, SERVICE_STAFF_SALARY, TRAINING_COSTS, MAX_EMPLOYEE_LEVEL, CHILLER_COST, FRESH_PRODUCTS } from '../constants';
import SalesChart from './SalesChart';

interface ManagementPanelProps {
  shelves: Shelf[];
  freezers: Freezer[];
  chillers: Chiller[];
  unlockedProducts: string[];
  dailySales: DailySale[];
  money: number;
  productSales: { [productId: string]: { count: number; revenue: number } };
  missedSales: { [productId: string]: number };
  satisfaction: number;
  regulars: number;
  hourlySales: number[];
  hourlyVisitors: number[];
  onStockItem: (facilityId: string, productId: string, amount: number) => void;
  onUnlockProduct: (productId: string) => void;
  onSetMode: (mode: StoreMode) => void;
  floorStyle: FloorStyle;
  wallStyle: WallStyle;
  onChangeInterior: (type: 'floor' | 'wall', style: FloorStyle | WallStyle) => void;
  achievements: Achievement[];
  hasAtm: boolean;
  hasCoffeeMachine: boolean;
  onPurchaseFacility: (facilityType: 'atm' | 'coffee_machine') => void;
  employees: Employee[];
  onHireEmployee: (role: EmployeeRole) => void;
  onTrainEmployee: (role: EmployeeRole, cost: number) => void;
  onCleanStore: () => void;
  currentEvent: GameEvent | null;
  width: number;
  onExpandStore: () => void;
  isPaused: boolean;
  onTogglePause: () => void;
  complaintCounts: { [key: string]: number };
  cleanliness: number;
  rivals: RivalStore[];
  dailyRankings: Ranking[];
}

type Tab = '재고' | '상품' | '관리' | '보고서' | '업적' | '경쟁';
type SortKey = 'revenue' | 'count' | 'missed';

const INTERIOR_COST = 500;

const floorOptions: { id: FloorStyle; name: string; className: string }[] = [
    { id: 'default', name: '기본 타일', className: 'bg-yellow-100' },
    { id: 'wood', name: '나무 바닥', className: 'bg-[#a16207]' },
    { id: 'checkered', name: '체크 바닥', className: 'bg-slate-400' },
];

const wallOptions: { id: WallStyle; name: string; className: string }[] = [
    { id: 'default', name: '기본 카운터', className: 'bg-gray-400' },
    { id: 'brick', name: '벽돌 카운터', className: 'bg-[#991b1b]' },
    { id: 'blue-panel', name: '파란 패널', className: 'bg-[#0369a1]' },
];

interface TabButtonProps {
    tabName: Tab;
    activeTab: Tab;
    onClick: (tabName: Tab) => void;
}

const TabButton: React.FC<TabButtonProps> = ({ tabName, activeTab, onClick }) => (
    <button
      onClick={() => onClick(tabName)}
      className={`px-3 py-2 rounded-t-md border-b-0 border-2 border-black -mb-px transition-colors ${activeTab === tabName ? 'bg-yellow-300 text-red-700' : 'bg-yellow-100 hover:bg-yellow-200'}`}
    >
      {tabName}
    </button>
);

const ManagementPanel: React.FC<ManagementPanelProps> = ({
  shelves, freezers, chillers, unlockedProducts, dailySales, money, onStockItem, onUnlockProduct, onSetMode, floorStyle, wallStyle, onChangeInterior, achievements, hasAtm, hasCoffeeMachine, onPurchaseFacility, employees, onHireEmployee, onTrainEmployee, onCleanStore, currentEvent, width, onExpandStore, productSales, missedSales, satisfaction, regulars, hourlySales, hourlyVisitors, isPaused, onTogglePause, complaintCounts, cleanliness, rivals, dailyRankings
}) => {
  const [activeTab, setActiveTab] = useState<Tab>('재고');
  const [stockAmount, setStockAmount] = useState<number>(1);
  const [sortKey, setSortKey] = useState<SortKey>('revenue');
  
  const isChristmas = currentEvent?.type === 'CHRISTMAS';

  const stockableFacilities = useMemo(() => {
    const shelfItems = shelves.map((s, i) => ({ id: s.id, name: `선반 ${i + 1}`, type: 'shelf', ...s }));
    const freezerItems = freezers.map((f, i) => ({ id: f.id, name: `냉동고 ${i + 1}`, type: 'freezer', ...f }));
    const chillerItems = chillers.map((c, i) => ({ id: c.id, name: `신선 매대 ${i + 1}`, type: 'chiller', ...c }));
    return [...shelfItems, ...freezerItems, ...chillerItems];
  }, [shelves, freezers, chillers]);

  const [selectedFacilityId, setSelectedFacilityId] = useState<string>(stockableFacilities.length > 0 ? stockableFacilities[0].id : '');
  const [selectedProduct, setSelectedProduct] = useState<string>('');

  const selectedFacility = useMemo(() => stockableFacilities.find(f => f.id === selectedFacilityId), [selectedFacilityId, stockableFacilities]);
  
  const availableProductsForStocking = useMemo(() => {
    if (!selectedFacility) return [];
    
    const allAvailableProducts = [...unlockedProducts];
    if (isChristmas) {
      allAvailableProducts.push('christmas_cake');
    }
    
    return allAvailableProducts.filter(prodId => {
        const product = PRODUCTS.find(p => p.id === prodId);
        if (!product) return false;
        const isFrozen = FROZEN_PRODUCTS.includes(prodId);
        const isFresh = FRESH_PRODUCTS.includes(prodId);
        
        if (selectedFacility.type === 'freezer') return isFrozen;
        if (selectedFacility.type === 'chiller') return isFresh;
        return !isFrozen && !isFresh;
    });
  }, [selectedFacility, unlockedProducts, isChristmas]);
  
  React.useEffect(() => {
    if (stockableFacilities.length > 0 && !stockableFacilities.some(f => f.id === selectedFacilityId)) {
        setSelectedFacilityId(stockableFacilities[0].id);
    } else if (stockableFacilities.length === 0) {
        setSelectedFacilityId('');
    }
  }, [stockableFacilities, selectedFacilityId]);
  
  React.useEffect(() => {
    if (selectedFacility) {
      const productOnShelf = selectedFacility.productId;
      if (productOnShelf && availableProductsForStocking.includes(productOnShelf)) {
        setSelectedProduct(productOnShelf);
      } else {
        setSelectedProduct(availableProductsForStocking[0] || '');
      }
    } else {
      setSelectedProduct('');
    }
  }, [selectedFacilityId, availableProductsForStocking]);

  const handleStock = () => {
    if(selectedFacilityId && selectedProduct && stockAmount > 0) {
      onStockItem(selectedFacilityId, selectedProduct, stockAmount);
    }
  };

  const handleTabSwitch = (tabName: Tab) => {
    if (!isPaused) {
      onTogglePause();
    }
    setActiveTab(tabName);
  };


  const reportData = useMemo(() => {
    const data: Array<{id: string, icon: string, name: string, count: number, revenue: number, missed: number}> = [];

    PRODUCTS.forEach(p => {
        const isAvailable = unlockedProducts.includes(p.id) || (p.seasonal === 'CHRISTMAS' && isChristmas);
        if (isAvailable) {
            const sales = productSales[p.id] || { count: 0, revenue: 0 };
            const missed = missedSales[p.id] || 0;
            if (sales.count > 0 || missed > 0) {
              data.push({ id: p.id, icon: p.icon, name: p.name, ...sales, missed });
            }
        }
    });

    if (hasAtm) {
        const sales = productSales['atm'] || { count: 0, revenue: 0 };
        data.push({ id: 'atm', icon: '🏧', name: 'ATM 수수료', ...sales, missed: 0 });
    }
    if (hasCoffeeMachine) {
        const sales = productSales['coffee'] || { count: 0, revenue: 0 };
        data.push({ id: 'coffee', icon: '☕', name: '커피', ...sales, missed: 0 });
    }
    if (productSales['hot_food']) {
        const sales = productSales['hot_food'];
        data.push({ id: 'hot_food', icon: '♨️', name: '즉석 조리', ...sales, missed: 0 });
    }
    if (productSales['lottery']) {
        const sales = productSales['lottery'];
        data.push({ id: 'lottery', icon: '🎟️', name: '복권 판매', ...sales, missed: 0 });
    }
    
    data.sort((a, b) => (b[sortKey] ?? 0) - (a[sortKey] ?? 0));
    return data;
  }, [productSales, missedSales, unlockedProducts, hasAtm, hasCoffeeMachine, sortKey, isChristmas]);
  
  const currentProductInfo = PRODUCTS.find(p => p.id === selectedProduct);
  const cost = currentProductInfo ? currentProductInfo.cost * stockAmount : 0;
  
  const stocker = employees.find(e => e.role === 'STOCKER');
  const cashier = employees.find(e => e.role === 'CASHIER');
  const serviceStaff = employees.find(e => e.role === 'SERVICE');

  const hourlyChartData = useMemo(() => {
    const salesData = hourlySales.map((sales, hour) => ({ hour: `${hour}시`, '매출': sales }));
    const visitorsData = hourlyVisitors.map((visitors, hour) => ({ hour: `${hour}시`, '방문객': visitors }));
    return { salesData, visitorsData };
  }, [hourlySales, hourlyVisitors]);

  const employeeStateText: { [key in Employee['state']]: string } = {
    IDLE: '대기 중',
    MOVING_TO_STOCK: '창고로 이동 중',
    RESTOCKING: '재고 채우는 중',
    MOVING_TO_SHELF: '선반으로 이동 중',
    CHECKING_OUT: '계산 중',
    MOVING_TO_CLEAN_SPOT: '청소하러 가는 중',
    CLEANING: '청소 중',
    MOVING_TO_CUSTOMER: '손님에게 가는 중',
    APPEASING: '손님 응대 중'
  };

  const { stockAvailability } = useMemo(() => {
    const facilities = [...shelves, ...freezers, ...chillers];
    const totalCapacity = facilities.reduce((sum, facility) => {
        const product = PRODUCTS.find(p => p.id === facility.productId);
        return sum + (product ? product.capacity : 0);
    }, 0);
    const totalStock = facilities.reduce((sum, facility) => sum + facility.stock, 0);
    const stockAvailability = totalCapacity > 0 ? (totalStock / totalCapacity) * 100 : 100;
    return { stockAvailability };
  }, [shelves, freezers, chillers]);

  const queueComplaintCount = complaintCounts?.['queue_too_long'] || 0;
  const stockOutComplaintCount = complaintCounts?.['stock_out'] || 0;
  const totalComplaints = queueComplaintCount + stockOutComplaintCount;

  const EmployeeCard: React.FC<{
    employee: Employee | undefined;
    role: EmployeeRole;
    name: string;
    hireCost: number;
    hireColor: string;
  }> = ({ employee, role, name, hireCost, hireColor }) => {
    const trainingCost = employee ? TRAINING_COSTS[role][employee.level] : 0;
    const canTrain = employee && employee.level < MAX_EMPLOYEE_LEVEL && money >= trainingCost;

    return (
      <div className="bg-white/50 p-2 rounded border-2 border-black flex flex-col justify-between">
        <h4 className="font-bold text-center mb-1">{name}</h4>
        {employee ? (
          <div className="text-center text-xs space-y-1 flex-grow flex flex-col justify-center">
            <p>고용됨 (Lv.{employee.level})</p>
            <p className="truncate" title={employeeStateText[employee.state]}>
              상태: {employeeStateText[employee.state]}
            </p>
            {employee.level < MAX_EMPLOYEE_LEVEL ? (
              <button
                onClick={() => onTrainEmployee(role, trainingCost)}
                disabled={!canTrain}
                className="w-full text-[10px] bg-yellow-400 hover:bg-yellow-500 disabled:bg-gray-400 disabled:cursor-not-allowed text-black p-1 mt-1 rounded border-2 border-black"
              >
                훈련 (₩{trainingCost.toLocaleString()})
              </button>
            ) : (
              <p className="text-[10px] font-bold text-green-600 mt-1">훈련 완료!</p>
            )}
          </div>
        ) : (
          <button
            onClick={() => onHireEmployee(role)}
            disabled={money < hireCost}
            className={`w-full ${hireColor} hover:brightness-110 disabled:bg-gray-400 text-white p-2 rounded border-2 border-black`}
          >
            채용 (₩{hireCost.toLocaleString()})
          </button>
        )}
      </div>
    );
  };

  return (
    <div className="bg-blue-200 p-2 rounded-md border-2 border-black shadow-inner flex flex-col min-h-[300px]">
      <div className="flex border-b-2 border-black">
        <TabButton tabName="재고" activeTab={activeTab} onClick={handleTabSwitch} />
        <TabButton tabName="상품" activeTab={activeTab} onClick={handleTabSwitch} />
        <TabButton tabName="관리" activeTab={activeTab} onClick={handleTabSwitch} />
        <TabButton tabName="보고서" activeTab={activeTab} onClick={handleTabSwitch} />
        <TabButton tabName="업적" activeTab={activeTab} onClick={handleTabSwitch} />
        <TabButton tabName="경쟁" activeTab={activeTab} onClick={handleTabSwitch} />
      </div>
      <div className="bg-white/70 p-4 rounded-b-md flex-grow overflow-y-auto">
        {activeTab === '재고' && (
          <div className="space-y-4">
            <h3 className="text-lg font-bold">재고 채우기</h3>
            {stockableFacilities.length > 0 ? (
                <>
                <div>
                    <label className="block mb-1">진열대 선택:</label>
                    <select value={selectedFacilityId} onChange={e => setSelectedFacilityId(e.target.value)} className="w-full p-2 border-2 border-black rounded">
                        {stockableFacilities.map((facility) => {
                            const p = PRODUCTS.find(p => p.id === facility.productId);
                            return <option key={facility.id} value={facility.id}>{facility.name} ({p ? p.name : '비어있음'} - {facility.stock})</option>
                        })}
                    </select>
                </div>
                <div>
                    <label className="block mb-1">상품 선택:</label>
                    <select value={selectedProduct} onChange={e => setSelectedProduct(e.target.value)} className="w-full p-2 border-2 border-black rounded" disabled={!selectedFacility || availableProductsForStocking.length === 0}>
                        {availableProductsForStocking.map(prodId => {
                            const p = PRODUCTS.find(p => p.id === prodId);
                            return p ? <option key={p.id} value={p.id}>{p.icon} {p.name}</option> : null
                        })}
                    </select>
                    {selectedFacility && availableProductsForStocking.length === 0 && <p className="text-xs text-red-600 mt-1">이 진열대에 맞는 잠금 해제된 상품이 없습니다.</p>}
                </div>
                <div>
                    <label className="block mb-1">수량:</label>
                    <input type="number" min="1" value={stockAmount} onChange={e => setStockAmount(Math.max(1, parseInt(e.target.value) || 1))} className="w-full p-2 border-2 border-black rounded"/>
                </div>
                <button onClick={handleStock} disabled={money < cost || !selectedFacilityId || !selectedProduct} className="w-full bg-green-500 hover:bg-green-600 disabled:bg-gray-400 text-white p-2 rounded border-2 border-black">
                    채우기 (₩{cost.toLocaleString()})
                </button>
                </>
            ) : <p>먼저 선반이나 냉동고를 설치하세요!</p>}
          </div>
        )}
        {activeTab === '상품' && (
           <div className="space-y-2">
            <h3 className="text-lg font-bold">상품 목록</h3>
            <div className="grid grid-cols-2 gap-2 text-center">
                {PRODUCTS.map(p => {
                    const isAvailable = unlockedProducts.includes(p.id) || (p.seasonal === 'CHRISTMAS' && isChristmas);
                    if (p.seasonal && !isChristmas) return null;

                    const isUnlocked = unlockedProducts.includes(p.id) || !!p.seasonal;
                    const isOnSale = currentEvent?.type === 'SALE' && p.id === currentEvent.productId;
                    let priceText;
                    if (isOnSale) {
                        priceText = <>
                            <span className="line-through opacity-70">₩{p.price.toLocaleString()}</span>
                            <span className="text-red-600"> ₩{Math.round(p.price * (1 - currentEvent.discount)).toLocaleString()}</span>
                        </>;
                    } else {
                        priceText = `₩${p.price.toLocaleString()}`;
                    }

                    return (
                        <div key={p.id} className={`relative p-2 rounded border-2 border-black ${isAvailable ? (isOnSale ? 'bg-pink-200 ring-2 ring-pink-500' : (p.seasonal ? 'bg-green-300' : 'bg-green-200')) : 'bg-gray-200'}`}>
                            {isOnSale && <div className="absolute top-1 right-1 text-xs font-bold text-white bg-red-600 px-1.5 rounded-full animate-pulse">SALE</div>}
                            {p.seasonal === 'CHRISTMAS' && <div className="absolute top-1 right-1 text-xs font-bold text-white bg-red-600 px-1.5 rounded-full animate-pulse">XMAS</div>}
                            <p className="text-2xl">{p.icon} {FROZEN_PRODUCTS.includes(p.id) && <span className="text-base">❄️</span>} {FRESH_PRODUCTS.includes(p.id) && <span className="text-base">🥬</span>}</p>
                            <p>{p.name}</p>
                            <p className="text-[10px] h-4">{priceText}</p>
                            {!isUnlocked && (
                                <button onClick={() => onUnlockProduct(p.id)} disabled={money < p.unlockCost} className="text-[10px] mt-1 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 text-white px-2 py-1 rounded">
                                    잠금 해제 (₩{p.unlockCost.toLocaleString()})
                                </button>
                            )}
                        </div>
                    );
                })}
            </div>
           </div>
        )}
        {activeTab === '관리' && (
            <div className="space-y-4">
                <div>
                    <h3 className="text-lg font-bold">가게 설비</h3>
                    <div className="grid grid-cols-2 gap-2 mt-2">
                      <button onClick={() => onSetMode('PLACE_SHELF')} disabled={money < 100} className="w-full bg-orange-400 hover:bg-orange-500 disabled:bg-gray-400 text-white p-2 rounded border-2 border-black">
                          선반 설치 (₩100)
                      </button>
                       <button onClick={() => onSetMode('PLACE_FREEZER')} disabled={money < FREEZER_COST} className="w-full bg-sky-400 hover:bg-sky-500 disabled:bg-gray-400 text-white p-2 rounded border-2 border-black">
                          🧊 냉동고 (₩{FREEZER_COST.toLocaleString()})
                      </button>
                      <button onClick={() => onSetMode('PLACE_CHILLER')} disabled={money < CHILLER_COST} className="w-full bg-lime-400 hover:bg-lime-500 disabled:bg-gray-400 text-white p-2 rounded border-2 border-black">
                          🥬 신선 매대 (₩{CHILLER_COST.toLocaleString()})
                      </button>
                      <button onClick={() => onSetMode('PLACE_TABLE')} disabled={money < TABLE_COST} className="w-full bg-yellow-600 hover:bg-yellow-700 disabled:bg-gray-400 text-white p-2 rounded border-2 border-black">
                          테이블 설치 (₩{TABLE_COST.toLocaleString()})
                      </button>
                       <button
                        onClick={() => onSetMode('PLACE_HOT_FOOD_CORNER')}
                        disabled={money < HOT_FOOD_CORNER_COST}
                        className="w-full bg-red-500 hover:bg-red-600 disabled:bg-gray-400 text-white p-2 rounded border-2 border-black"
                      >
                         ♨️ 조리 코너 (₩{HOT_FOOD_CORNER_COST.toLocaleString()})
                      </button>
                      <button
                        onClick={() => onSetMode('PLACE_LOTTERY_STAND')}
                        disabled={money < LOTTERY_STAND_COST}
                        className="w-full bg-purple-500 hover:bg-purple-600 disabled:bg-gray-400 text-white p-2 rounded border-2 border-black"
                      >
                         🎟️ 복권 판매대 (₩{LOTTERY_STAND_COST.toLocaleString()})
                      </button>
                       <button 
                        onClick={onExpandStore}
                        disabled={width >= EXPANDED_GRID_WIDTH || money < EXPANSION_COST}
                        className="w-full bg-indigo-500 hover:bg-indigo-600 disabled:bg-gray-400 text-white p-2 rounded border-2 border-black"
                      >
                         {width >= EXPANDED_GRID_WIDTH ? '확장 완료' : `가게 확장 (₩${EXPANSION_COST.toLocaleString()})`}
                      </button>
                       <button onClick={onCleanStore} disabled={money < CLEANING_COST} className="w-full bg-cyan-500 hover:bg-cyan-600 disabled:bg-gray-400 text-white p-2 rounded border-2 border-black">
                          가게 청소 (₩{CLEANING_COST.toLocaleString()})
                      </button>
                    </div>
                </div>
                
                 <div className="pt-4 mt-4 border-t-2 border-black/20">
                    <div className="flex items-baseline gap-2">
                        <h3 className="text-lg font-bold">직원 관리</h3>
                        <span className="text-red-600 text-[10px]">(직원 관리는 정지상태에서 동작합니다.)</span>
                    </div>
                     <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mt-2">
                        <EmployeeCard employee={cashier} role="CASHIER" name="💁 계산원" hireCost={CASHIER_HIRE_COST} hireColor="bg-pink-500" />
                        <EmployeeCard employee={stocker} role="STOCKER" name="🧑‍💼 재고 관리원" hireCost={STOCKER_HIRE_COST} hireColor="bg-teal-500" />
                        <EmployeeCard employee={serviceStaff} role="SERVICE" name="🧹 서비스 직원" hireCost={SERVICE_STAFF_HIRE_COST} hireColor="bg-blue-500" />
                     </div>
                </div>

                <div className="pt-4 mt-4 border-t-2 border-black/20">
                    <h3 className="text-lg font-bold">특수 시설</h3>
                     <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
                        <button
                            onClick={() => onPurchaseFacility('coffee_machine')}
                            disabled={hasCoffeeMachine || money < COFFEE_MACHINE_COST}
                            className="w-full bg-stone-500 hover:bg-stone-600 disabled:bg-gray-400 disabled:cursor-not-allowed text-white p-2 rounded border-2 border-black"
                        >
                            {hasCoffeeMachine ? '☕ 커피 머신 설치 완료' : `커피 머신 (₩${COFFEE_MACHINE_COST.toLocaleString()})`}
                        </button>
                         <button
                            onClick={() => onPurchaseFacility('atm')}
                            disabled={hasAtm || money < ATM_COST}
                            className="w-full bg-green-500 hover:bg-green-600 disabled:bg-gray-400 disabled:cursor-not-allowed text-white p-2 rounded border-2 border-black"
                        >
                            {hasAtm ? '🏧 ATM 설치 완료' : `ATM (₩${ATM_COST.toLocaleString()})`}
                        </button>
                    </div>
                </div>
                
                <div className="pt-4 mt-4 border-t-2 border-black/20">
                    <h3 className="text-lg font-bold">인테리어 변경</h3>
                    <div className="mt-2">
                        <h4 className="font-semibold mb-2">바닥 스타일</h4>
                        <div className="grid grid-cols-3 gap-2">
                            {floorOptions.map(opt => (
                                <button 
                                    key={opt.id}
                                    onClick={() => onChangeInterior('floor', opt.id)}
                                    disabled={floorStyle === opt.id || money < INTERIOR_COST}
                                    className={`p-2 rounded border-2 border-black text-center disabled:opacity-50 disabled:cursor-not-allowed ${floorStyle === opt.id ? 'ring-2 ring-offset-2 ring-green-500' : 'hover:bg-yellow-100/50'}`}
                                >
                                    <div className={`w-full h-8 rounded-sm mb-1 border border-black/20 ${opt.className}`}></div>
                                    <span className="text-[10px]">{opt.name}</span>
                                    {floorStyle !== opt.id && <p className="text-[9px]">(₩{INTERIOR_COST.toLocaleString()})</p>}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        )}
        {activeTab === '보고서' && (
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-bold mb-2">가게 만족도</h3>
              <div className="w-full bg-gray-300 rounded-full h-4 border-2 border-black">
                  <div 
                      className="bg-pink-500 h-full rounded-full transition-all duration-500"
                      style={{ width: `${satisfaction}%`}}
                  ></div>
              </div>
              <div className="flex justify-between text-xs mt-1">
                  <span>불만족</span>
                  <span className="font-bold">{Math.round(satisfaction)}%</span>
                  <span>매우 만족</span>
              </div>
              <p className="text-center text-xs mt-2">청결도와 재고 상태에 따라 결정됩니다. 만족도가 높으면 단골 손님이 늘어납니다!</p>
              <p className="text-center font-bold mt-1">현재 단골 손님: {regulars}명 💖</p>
            </div>
            
            <div className="pt-4 border-t-2 border-black/20">
                <h3 className="text-lg font-bold mb-2">손님 피드백 (오늘)</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                    <div className="bg-green-100 p-3 rounded border-2 border-green-600">
                        <h4 className="font-bold text-green-800 mb-2">👍 칭찬해요</h4>
                        <ul className="space-y-1">
                            {cleanliness > 80 ? (
                                <li className="flex items-center gap-2">✨ 가게가 깨끗해요!</li>
                            ) : (
                                <li className="flex items-center gap-2 text-gray-500">✨ (가게가 더 깨끗하면 손님들이 좋아합니다)</li>
                            )}
                            {stockAvailability > 80 ? (
                                <li className="flex items-center gap-2">🛒 진열대가 가득 차 있어요!</li>
                            ) : (
                                <li className="flex items-center gap-2 text-gray-500">🛒 (물건을 채우면 손님들이 좋아합니다)</li>
                            )}
                        </ul>
                    </div>
                    <div className="bg-red-100 p-3 rounded border-2 border-red-500">
                        <h4 className="font-bold text-red-800 mb-2">👎 개선해주세요</h4>
                        {totalComplaints > 0 ? (
                            <ul className="space-y-1">
                                {queueComplaintCount > 0 && (
                                <li className="flex items-center gap-2">⏳ 계산 대기시간이 길어요 ({queueComplaintCount}건)</li>
                                )}
                                {stockOutComplaintCount > 0 && (
                                <li className="flex items-center gap-2">🤷 찾는 물건이 없어요 ({stockOutComplaintCount}건)</li>
                                )}
                            </ul>
                        ) : (
                            <p className="text-gray-600">접수된 불만사항이 없습니다. 잘하고 있어요!</p>
                        )}
                    </div>
                </div>
            </div>

            <div className="pt-4 border-t-2 border-black/20">
              <h3 className="text-lg font-bold mb-2">일일 매출 보고서</h3>
              <div className="h-40 md:h-48">
                  <SalesChart data={dailySales} />
              </div>
            </div>

            <div className="pt-4 border-t-2 border-black/20">
                <h3 className="text-lg font-bold mb-2">시간대별 리포트 (오늘)</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 h-48">
                    <div>
                        <h4 className="text-center text-sm mb-1">시간대별 방문객</h4>
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={hourlyChartData.visitorsData} margin={{ top: 5, right: 5, left: -25, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#9ca3af" />
                                <XAxis dataKey="hour" tick={{ fontSize: 10 }} interval={2} />
                                <YAxis tick={{ fontSize: 10 }} allowDecimals={false}/>
                                <Tooltip contentStyle={{ fontFamily: "'Press Start 2P', cursive", fontSize: '10px' }} formatter={(value: number) => [`${value}명`, '방문객']}/>
                                <Bar dataKey="방문객" fill="#8884d8" />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                    <div>
                        <h4 className="text-center text-sm mb-1">시간대별 매출</h4>
                         <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={hourlyChartData.salesData} margin={{ top: 5, right: 5, left: -25, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#9ca3af" />
                                <XAxis dataKey="hour" tick={{ fontSize: 10 }} interval={2} />
                                <YAxis tick={{ fontSize: 10 }} tickFormatter={(value: number) => `₩${value/1000}k`}/>
                                <Tooltip contentStyle={{ fontFamily: "'Press Start 2P', cursive", fontSize: '10px' }} formatter={(value: number) => [`₩${value.toLocaleString()}`, '매출']}/>
                                <Bar dataKey="매출" fill="#82ca9d" />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            <div className="pt-4 border-t-2 border-black/20">
              <div className="flex justify-between items-center mb-2">
                  <h3 className="text-lg font-bold">상품 판매 분석</h3>
                  <div className="flex gap-1">
                      {(['revenue', 'count', 'missed'] as SortKey[]).map(key => (
                          <button 
                              key={key} 
                              onClick={() => setSortKey(key)}
                              className={`px-2 py-1 text-xs rounded border-2 border-black ${sortKey === key ? 'bg-blue-500 text-white' : 'bg-white hover:bg-gray-100'}`}
                          >
                              {{revenue: '매출순', count: '판매량순', missed: '손실순'}[key]}
                          </button>
                      ))}
                  </div>
              </div>
              <div className="space-y-1 max-h-40 overflow-y-auto pr-2">
                {reportData.map(item => (
                  <div key={item.id} className="grid grid-cols-4 items-center gap-2 p-2 bg-white rounded border border-black/20 text-xs">
                    <div className="col-span-1 flex items-center gap-2">
                      <span className="text-lg">{item.icon}</span>
                      <span className="font-bold truncate">{item.name}</span>
                    </div>
                    <div className="text-center">
                      <p className="text-gray-600">판매량</p>
                      <p>{item.count}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-gray-600">총 매출</p>
                      <p className="text-green-600 font-semibold">₩{item.revenue.toLocaleString()}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-gray-600">기회 손실</p>
                      <p className={`font-semibold ${item.missed > 0 ? 'text-red-600 animate-pulse' : 'text-gray-500'}`}>{item.missed}</p>
                    </div>
                  </div>
                ))}
                {reportData.length === 0 && <p className="text-center text-gray-500 py-4">아직 판매 데이터가 없습니다.</p>}
              </div>
            </div>
          </div>
        )}
        {activeTab === '업적' && (
          <div className="space-y-2">
            <h3 className="text-lg font-bold">도전 과제</h3>
            <ul className="space-y-2 max-h-[250px] overflow-y-auto pr-2">
              {achievements.map(ach => (
                <li 
                  key={ach.id}
                  className={`p-3 rounded border-2 border-black flex items-center gap-4 transition-all ${
                    ach.isUnlocked ? 'bg-green-200' : 'bg-gray-200 opacity-70'
                  }`}
                >
                  <span className="text-3xl">{ach.icon}</span>
                  <div>
                    <h4 className="font-bold">{ach.name}</h4>
                    <p className="text-xs">{ach.description}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
        {activeTab === '경쟁' && (
          <div className="space-y-4">
            <h3 className="text-lg font-bold">상권 순위 (오늘)</h3>
            {dailyRankings.length > 0 ? (
              <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2">
                {dailyRankings.map((rank, index) => (
                  <div key={index} className={`p-3 rounded border-2 flex items-center gap-4 ${rank.isPlayer ? 'bg-yellow-200 border-yellow-500' : 'bg-white border-black'}`}>
                    <span className={`text-2xl font-bold w-8 text-center ${index === 0 ? 'text-amber-500' : (index === 1 ? 'text-slate-500' : (index === 2 ? 'text-amber-700' : 'text-gray-500'))}`}>{index + 1}</span>
                    <span className="text-2xl">{rank.icon}</span>
                    <div className="flex-grow">
                      <h4 className="font-bold">{rank.storeName}</h4>
                      <p className="text-sm text-green-600">매출: ₩{rank.sales.toLocaleString()}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-gray-500 py-4">첫 날이 끝나면 순위가 집계됩니다.</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ManagementPanel;
