

import React, { useMemo } from 'react';
import { StoreTile, Shelf, Customer, Employee, StoreMode, GameAction, FloorStyle, WallStyle, Weather, GameEvent, PlacedObject, Table, LotteryStand, Freezer, Chiller } from '../types';
import { PRODUCTS, MAX_QUEUE_WAIT_TIME } from '../constants';

interface StoreProps {
  layout: StoreTile[];
  shelves: Shelf[];
  freezers: Freezer[];
  chillers: Chiller[];
  customers: Customer[];
  employees: Employee[];
  storeMode: StoreMode;
  onPlaceObject: (x: number, y: number) => void;
  dispatch: React.Dispatch<GameAction>;
  floorStyle: FloorStyle;
  wallStyle: WallStyle;
  weather: Weather;
  cleanliness: number;
  isPaused: boolean;
  currentEvent: GameEvent | null;
  width: number;
  height: number;
  hotFoodCorners: PlacedObject[];
  tables: Table[];
  lotteryStands: LotteryStand[];
}

const getTileBg = (type: StoreTile['type'], floorStyle: FloorStyle, wallStyle: WallStyle) => {
  switch(type) {
    case 'floor':
        switch(floorStyle) {
            case 'wood': return 'bg-[#a16207] hover:bg-[#854d0e]'; // amber-700, amber-800
            case 'checkered': return 'bg-slate-400 hover:bg-slate-500';
            case 'default':
            default: return 'bg-yellow-100 hover:bg-yellow-200';
        }
    case 'shelf': return 'bg-orange-300';
    case 'freezer': return 'bg-sky-200';
    case 'chiller': return 'bg-lime-300';
    case 'counter':
        switch(wallStyle) {
            case 'brick': return 'bg-[#991b1b]'; // red-800
            case 'blue-panel': return 'bg-[#0369a1]'; // sky-700
            case 'default':
            default: return 'bg-gray-400';
        }
    case 'door': return 'bg-blue-300';
    case 'atm': return 'bg-green-300';
    case 'coffee_machine': return 'bg-stone-500';
    case 'hot_food_corner': return 'bg-red-400';
    case 'table': return 'bg-yellow-600';
    case 'lottery_stand': return 'bg-purple-400';
    default: return 'bg-gray-200';
  }
};

const DirtParticle: React.FC<{ index: number }> = ({ index }) => {
  const style = useMemo(() => ({
    top: `${Math.random() * 80 + 10}%`,
    left: `${Math.random() * 80 + 10}%`,
    transform: `rotate(${Math.random() * 360}deg)`,
    width: '15%',
    height: '15%',
    opacity: 0.5,
  }), [index]);

  return (
    <div
      className="absolute bg-black/40 rounded-full"
      style={style}
    ></div>
  );
};

const Store: React.FC<StoreProps> = ({ layout, shelves, freezers, chillers, customers, employees, storeMode, onPlaceObject, dispatch, floorStyle, wallStyle, weather, cleanliness, isPaused, currentEvent, width, height, hotFoodCorners, tables, lotteryStands }) => {
  const shelfMap = useMemo(() => new Map(shelves.map(s => [s.id, s])), [shelves]);
  const freezerMap = useMemo(() => new Map(freezers.map(f => [f.id, f])), [freezers]);
  const chillerMap = useMemo(() => new Map(chillers.map(c => [c.id, c])), [chillers]);
  const hotFoodCornerMap = useMemo(() => new Map(hotFoodCorners.map(c => [c.id, c])), [hotFoodCorners]);
  const tableMap = useMemo(() => new Map(tables.map(t => [t.id, t])), [tables]);
  const lotteryStandMap = useMemo(() => new Map(lotteryStands.map(ls => [ls.id, ls])), [lotteryStands]);

  const handleTileClick = (x: number, y: number) => {
    if (storeMode !== 'NORMAL') {
      onPlaceObject(x, y);
    }
  };
  
  const dirtParticles = useMemo(() => {
    if (cleanliness >= 60) return [];
    const particleCount = Math.floor((60 - cleanliness) / 60 * 20); // Max 20 particles
    return Array.from({ length: particleCount }, (_, i) => i);
  }, [cleanliness]);

  const cellWidthPercent = 100 / width;
  const cellHeightPercent = 100 / height;
  const doorX = Math.floor(width / 2);
  
  const customersInQueue = useMemo(() => customers
    .filter(c => c.isQueuing || c.isBeingServed)
    .sort((a, b) => a.id - b.id), [customers]);

  const isChristmas = currentEvent?.type === 'CHRISTMAS';

  return (
    <div className="lg:col-span-2 bg-gray-700 p-2 rounded-md border-2 border-black shadow-inner relative aspect-square">
        <div className={`relative transition-all duration-500 ${isPaused ? 'filter blur-sm' : ''} ${weather === 'SUNNY' ? 'brightness-105' : ''} ${isChristmas ? 'brightness-95' : ''}`}>
          <div 
            className="grid gap-0.5 bg-black"
            style={{
                gridTemplateColumns: `repeat(${width}, minmax(0, 1fr))`,
                gridTemplateRows: `repeat(${height}, minmax(0, 1fr))`,
            }}
          >
            {layout.map((tile, index) => {
              const x = index % width;
              const y = Math.floor(index / width);
              const shelf = tile.type === 'shelf' ? shelfMap.get(tile.entityId || '') : null;
              const freezer = tile.type === 'freezer' ? freezerMap.get(tile.entityId || '') : null;
              const chiller = tile.type === 'chiller' ? chillerMap.get(tile.entityId || '') : null;
              const facility = shelf || freezer || chiller;
              const product = facility ? PRODUCTS.find(p => p.id === facility.productId) : null;
              const isPlaceable = storeMode !== 'NORMAL' && tile.type === 'floor' && y > 0;
              const isOnSale = currentEvent?.type === 'SALE' && facility?.productId === currentEvent.productId;

              return (
                <div
                  key={index}
                  className={`w-full aspect-square flex items-center justify-center text-2xl relative transition-colors duration-500 ${getTileBg(tile.type, floorStyle, wallStyle)} ${isPlaceable ? 'cursor-pointer ring-4 ring-green-500' : ''}`}
                  onClick={() => handleTileClick(x, y)}
                >
                  {isOnSale && (
                      <div className="absolute -top-1 -right-1 bg-red-600 text-white font-bold text-[9px] px-1.5 py-0.5 rounded-full border-2 border-white animate-pulse z-10">
                          SALE
                      </div>
                  )}
                  {facility && product && (
                    <div className="flex flex-col items-center justify-center text-center leading-none">
                      <span className="text-xl">{product.icon}</span>
                      <span className="text-[8px] font-bold text-black bg-white/70 px-1 rounded-sm">{facility.stock}</span>
                    </div>
                  )}
                  {shelf && !product && (
                    <span className="text-2xl opacity-50">🗄️</span>
                  )}
                   {tile.type === 'door' && <span className="text-xl">🚪</span>}
                   {tile.type === 'atm' && <span className="text-2xl">🏧</span>}
                   {tile.type === 'coffee_machine' && <span className="text-2xl">☕</span>}
                   {tile.type === 'hot_food_corner' && <span className="text-2xl">♨️</span>}
                   {tile.type === 'table' && <span className="text-2xl">🍽️</span>}
                   {tile.type === 'lottery_stand' && <span className="text-2xl">🎟️</span>}
                   {tile.type === 'freezer' && !product && <span className="text-2xl">🧊</span>}
                   {tile.type === 'chiller' && !product && <span className="text-2xl">🥬</span>}
                   {isChristmas && tile.type === 'counter' && <span className="absolute text-lg z-10">🎄</span>}
                </div>
              );
            })}
          </div>
          {/* Dirt Overlay */}
          <div className="absolute inset-0.5 pointer-events-none">
              {layout.map((tile, index) => {
                  if (tile.type !== 'floor' || Math.floor(index / width) === 0) return null;
                  const x = index % width;
                  const y = Math.floor(index / width);
                  const particleSeed = (x * 3 + y * 5) % dirtParticles.length;
                   if (dirtParticles.length > 0 && Math.random() < dirtParticles.length / 50) { // Randomly distribute dirt
                     return (
                        <div key={`dirt_${index}`} className="absolute" style={{ left: `${x * cellWidthPercent}%`, top: `${y * cellHeightPercent}%`, width: `${cellWidthPercent}%`, height: `${cellHeightPercent}%`}}>
                            <DirtParticle index={particleSeed} />
                        </div>
                     )
                   }
                   return null;
              })}
          </div>
          {/* Render Customers */}
          {customers.map(customer => {
              let startPos = { x: doorX, y: height };
              let targetPos = { x: doorX, y: height };

              const shelf = shelfMap.get(customer.targetShelfId || '');
              const freezer = freezerMap.get(customer.targetShelfId || '');
              const chiller = chillerMap.get(customer.targetShelfId || '');
              const hfc = hotFoodCornerMap.get(customer.targetShelfId || '');
              const table = tableMap.get(customer.targetTableId || '');
              const lotteryStand = lotteryStandMap.get(customer.targetLotteryId || '');
              
              let lastActivityPos = null;
              if (customer.isEating && table) lastActivityPos = { x: table.x, y: table.y };
              else if (shelf) lastActivityPos = { x: shelf.x, y: shelf.y };
              else if (freezer) lastActivityPos = { x: freezer.x, y: freezer.y };
              else if (chiller) lastActivityPos = { x: chiller.x, y: chiller.y };
              else if (hfc) lastActivityPos = { x: hfc.x, y: hfc.y };
              else if (customer.targetShelfId === 'atm') lastActivityPos = { x: 0, y: 0 };
              else if (customer.targetShelfId === 'coffee_machine') lastActivityPos = { x: 1, y: 0 };
              
              if (customer.isExiting) {
                  startPos = customer.targetLotteryId && lotteryStand ? {x: lotteryStand.x, y: lotteryStand.y} : lastActivityPos || { x: doorX, y: 1 };
                  targetPos = { x: doorX, y: height };
              } else if (customer.isBeingServed) {
                  startPos = targetPos = { x: doorX, y: 1 };
              } else if (customer.isQueuing) {
                  const queueIndex = customersInQueue.findIndex(c => c.id === customer.id);
                  startPos = lastActivityPos || { x: doorX, y: height };
                  targetPos = { x: doorX, y: Math.max(1, height - 2 - queueIndex) };
              } else if (customer.isMovingToLottery) {
                   startPos = { x: doorX, y: 1 };
                   if(lotteryStand) targetPos = { x: lotteryStand.x, y: lotteryStand.y };
              } else if (customer.isEating) {
                  if (table) startPos = targetPos = { x: table.x, y: table.y };
              } else if (customer.isMovingToTable) {
                  if (lastActivityPos) startPos = lastActivityPos;
                  if (table) targetPos = { x: table.x, y: table.y };
              } else { // Entering, shopping, difficult
                  startPos = { x: doorX, y: height };
                  if (customer.isDifficult && customer.targetPos) targetPos = customer.targetPos;
                  else if(lastActivityPos) targetPos = lastActivityPos;
              }
              
              const progress = customer.pathProgress / 15.0;
              let currentPos = { ...targetPos };

              const isStationary = ((customer.isShopping || customer.isDifficult || customer.isQueuing) && progress >= 1) || customer.isEating || customer.isBuyingLottery || customer.isBeingServed || (customer.lotteryReactionTimer !== undefined);
              
              if (!isStationary) {
                  currentPos.x = startPos.x + (targetPos.x - startPos.x) * progress;
                  currentPos.y = startPos.y + (targetPos.y - startPos.y) * progress;
              }
              
              if (customer.isExiting && progress >= 1) {
                  setTimeout(() => dispatch({type: 'CUSTOMER_LEAVE', payload: {customerId: customer.id}}), 0);
              }
              
              const left = currentPos.x * cellWidthPercent;
              const top = currentPos.y * cellHeightPercent;
              const isImpatient = (customer.queueTimer || 0) > MAX_QUEUE_WAIT_TIME * 0.5;

              return (
                <div
                  key={customer.id}
                  className="absolute text-2xl transition-all duration-100"
                  style={{ top: `${top}%`, left: `${left}%`, transform: `translate(25%, -25%) scale(${8/width})` }}
                >
                    {customer.isRegular && <div className="absolute -top-4 -right-2 text-lg animate-pulse">💖</div>}
                    {isImpatient && <div className="absolute -top-4 left-1/2 -translate-x-1/2 text-lg animate-bounce">💢</div>}
                    {customer.isDifficult && progress >= 1 && <div className="absolute -top-5 left-1/2 -translate-x-1/2 text-xl animate-bounce">💢</div>}
                    {customer.isShopping && <div className="absolute -top-4 left-1/2 -translate-x-1/2 text-xs bg-white/80 px-1 rounded">...</div>}
                    {customer.isEating && <div className="absolute -top-4 left-1/2 -translate-x-1/2 text-lg">😋</div>}
                    {customer.isQueuing && customer.pathProgress >= 15 && <div className="absolute -top-4 left-1/2 -translate-x-1/2 text-lg">🛒</div>}
                    {customer.isBeingServed && <div className="absolute -top-4 left-1/2 -translate-x-1/2 text-lg">💸</div>}
                    {customer.lotteryReactionTimer !== undefined && (
                        <div className="absolute -top-6 left-1/2 -translate-x-1/2 text-lg animate-bounce">
                           {customer.lotteryWinAmount ? `🎉₩${customer.lotteryWinAmount.toLocaleString()}` : '😭'}
                        </div>
                    )}
                    {customer.isExiting && customer.purchaseValue && customer.purchaseValue > 0 && <div className="absolute -top-4 left-1/2 -translate-x-1/2 text-xs bg-green-400/80 px-1 rounded">$</div>}
                    {customer.isExiting && (!customer.purchaseValue || customer.purchaseValue === 0) && <div className="absolute -top-4 left-1/2 -translate-x-1/2 text-xs bg-red-400/80 px-1 rounded">:(</div>}
                    {customer.icon}
                </div>
              );
          })}
          {/* Render Employees */}
          {employees.map(employee => {
            const left = employee.x * cellWidthPercent;
            const top = employee.y * cellHeightPercent;
            return (
                 <div
                  key={employee.id}
                  className="absolute text-2xl transition-all duration-100"
                  style={{ top: `${top}%`, left: `${left}%`, transform: `translate(25%, -25%) scale(${8/width})` }}
                >
                   {employee.state === 'RESTOCKING' && <div className="absolute -top-4 left-1/2 -translate-x-1/2 text-lg">📦</div>}
                   {employee.state === 'CHECKING_OUT' && <div className="absolute -top-4 left-1/2 -translate-x-1/2 text-lg">🧾</div>}
                   {employee.role === 'SERVICE' && employee.state === 'CLEANING' && <div className="absolute -top-4 left-1/2 -translate-x-1/2 text-lg animate-pulse">✨</div>}
                   {employee.role === 'SERVICE' && employee.state === 'APPEASING' && <div className="absolute -top-4 left-1/2 -translate-x-1/2 text-lg animate-bounce">💬</div>}
                   {employee.icon}
                </div>
            )
          })}
          {/* Weather Effect */}
          {weather === 'RAINY' && (
            <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
              {Array.from({ length: 50 }).map((_, i) => (
                <div 
                  key={i}
                  className="absolute bg-blue-300 w-px h-6 animate-rain opacity-0"
                  style={{ left: `${Math.random() * 100}%`, animationDuration: `${0.5 + Math.random() * 0.5}s`, animationDelay: `${Math.random() * 5}s` }}
                ></div>
              ))}
            </div>
          )}
          {weather === 'SNOWY' && (
            <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
              {Array.from({ length: 50 }).map((_, i) => (
                <div 
                  key={i}
                  className="absolute bg-white animate-snow opacity-0"
                  style={{ left: `${Math.random() * 100}%`, animationDuration: `${2 + Math.random() * 3}s`, animationDelay: `${Math.random() * 5}s` }}
                ></div>
              ))}
            </div>
          )}
      </div>
      {isPaused && (
        <div 
            className="absolute inset-0 flex items-center justify-center cursor-pointer" 
            onClick={() => dispatch({ type: 'TOGGLE_PAUSE' })}
            aria-live="polite"
            aria-label="클릭하여 게임 재개"
        >
          <div className="bg-black/50 text-white font-bold p-4 rounded-lg border-2 border-white pointer-events-none">
            일시정지됨
          </div>
        </div>
      )}
    </div>
  );
};

export default Store;