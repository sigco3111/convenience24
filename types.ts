

export interface Product {
  id: string;
  name: string;
  icon: string;
  cost: number;
  price: number;
  capacity: number;
  unlockCost: number;
  seasonal?: 'CHRISTMAS';
}

export interface Shelf {
  id:string;
  productId: string | null;
  stock: number;
  x: number;
  y: number;
}

export interface Freezer {
  id:string;
  productId: string | null;
  stock: number;
  x: number;
  y: number;
}

export interface Chiller {
  id:string;
  productId: string | null;
  stock: number;
  x: number;
  y: number;
}

export interface StoreTile {
    type: 'floor' | 'shelf' | 'counter' | 'door' | 'atm' | 'coffee_machine' | 'hot_food_corner' | 'table' | 'lottery_stand' | 'freezer' | 'chiller';
    entityId?: string;
}

export interface PlacedObject {
  id: string;
  x: number;
  y: number;
}

export interface Table extends PlacedObject {
  isOccupied: boolean;
}

export interface LotteryStand extends PlacedObject {
  isOccupied: boolean;
}

export type CustomerType = 'STUDENT' | 'OFFICE_WORKER' | 'HOUSEWIFE' | 'GENERAL';

export interface CustomerProfile {
  name: string;
  icons: string[];
  preferences: string[];
  hourlyWeights: number[];
}

export interface Customer {
    id: number;
    type: CustomerType;
    x: number;
    y: number;
    targetShelfId: string | null;
    targetPos?: { x: number; y: number }; // For special movement
    isShopping: boolean;
    isExiting: boolean;
    shoppingTime: number;
    maxShoppingTime: number;
    pathProgress: number; // 0-15, abstract path
    icon: string;
    isDifficult?: boolean;
    complaintTimer?: number;
    isRegular?: boolean;
    
    // New state flow
    isMovingToTable?: boolean;
    isEating?: boolean;
    eatingTimer?: number;
    targetTableId?: string;
    isQueuing?: boolean;
    isBeingServed?: boolean;
    queueTimer?: number;
    purchaseValue?: number;
    purchasedProductId?: string | null;

    isMovingToLottery?: boolean;
    isBuyingLottery?: boolean;
    lotteryBuyTimer?: number;
    targetLotteryId?: string;
    lotteryWinAmount?: number | null; // null for loss, number for win amount
    lotteryReactionTimer?: number;
    
    // Deprecating in favor of new flow
    hasPurchased?: boolean;
}

export type EmployeeRole = 'STOCKER' | 'CASHIER' | 'SERVICE';

export interface Employee {
  id: string;
  role: EmployeeRole;
  icon: string;
  salary: number; // daily
  level: number;
  x: number;
  y: number;
  state: 'IDLE' | 'MOVING_TO_STOCK' | 'RESTOCKING' | 'MOVING_TO_SHELF' | 'CHECKING_OUT' | 'MOVING_TO_CLEAN_SPOT' | 'CLEANING' | 'MOVING_TO_CUSTOMER' | 'APPEASING';
  targetShelfId: string | null;
  targetCustomerId?: number;
  targetPos?: { x: number; y: number };
  stateProgress: number;
  stateMaxProgress: number;
}

export interface DailySale {
    day: number;
    sales: number;
}

export interface DailyExpense {
    day: number;
    expenses: number;
}

export type StoreMode = 'NORMAL' | 'PLACE_SHELF' | 'PLACE_HOT_FOOD_CORNER' | 'PLACE_TABLE' | 'PLACE_LOTTERY_STAND' | 'PLACE_FREEZER' | 'PLACE_CHILLER';

export type FloorStyle = 'default' | 'wood' | 'checkered';
export type WallStyle = 'default' | 'brick' | 'blue-panel';

export type Weather = 'SUNNY' | 'RAINY' | 'SNOWY';

export interface Achievement {
  id: string;
  name: string;
  description: string;
  isUnlocked: boolean;
  icon: string;
}

export type GameEvent =
  | { type: 'HYGIENE_INSPECTION'; scheduledTick: number }
  | { type: 'SALE'; productId: string; discount: number }
  | { type: 'CHRISTMAS' };


export interface EventNotification {
  id: number;
  message: string;
  type: 'pass' | 'fail' | 'warn' | 'info' | 'regular';
}

export interface RivalStore {
  id: string;
  name: string;
  icon: string;
  level: number; // Represents overall strength
  dailySales: number;
  marketShare: number;
}

export interface Ranking {
  isPlayer: boolean;
  storeName: string;
  sales: number;
  icon: string;
}

export interface GameState {
  time: number; // in ticks
  money: number;
  width: number;
  height: number;
  shelves: Shelf[];
  freezers: Freezer[];
  chillers: Chiller[];
  layout: StoreTile[];
  unlockedProducts: string[];
  customers: Customer[];
  dailySales: DailySale[];
  dailyExpenses: DailyExpense[];
  employees: Employee[];
  hotFoodCorners: PlacedObject[];
  tables: Table[];
  lotteryStands: LotteryStand[];
  productSales: { [productId: string]: { count: number; revenue: number } };
  missedSales: { [productId: string]: number };
  storeMode: StoreMode;
  showEndDayModal: boolean;
  floorStyle: FloorStyle;
  wallStyle: WallStyle;
  weather: Weather;
  achievements: Achievement[];
  hasAtm: boolean;
  hasCoffeeMachine: boolean;
  cleanliness: number;
  satisfaction: number;
  regulars: number;
  currentEvent: GameEvent | null;
  eventNotification: EventNotification | null;
  isPaused: boolean;
  hourlySales: number[];
  hourlyVisitors: number[];
  complaintCounts: { [key: string]: number };
  rivals: RivalStore[];
  dailyRankings: Ranking[];
}

export type GameAction =
  | { type: 'TICK' }
  | { type: 'PLACE_OBJECT'; payload: { x: number; y: number } }
  | { type: 'STOCK_ITEM'; payload: { facilityId: string; productId: string; amount: number } }
  | { type: 'SET_STORE_MODE'; payload: StoreMode }
  | { type: 'UNLOCK_PRODUCT'; payload: { productId: string } }
  | { type: 'CLOSE_MODAL' }
  | { type: 'CUSTOMER_LEAVE'; payload: { customerId: number } }
  | { type: 'CHANGE_INTERIOR'; payload: { type: 'floor' | 'wall'; style: FloorStyle | WallStyle } }
  | { type: 'PURCHASE_FACILITY'; payload: { facilityType: 'atm' | 'coffee_machine' } }
  | { type: 'HIRE_EMPLOYEE'; payload: { role: EmployeeRole } }
  | { type: 'TRAIN_EMPLOYEE'; payload: { role: EmployeeRole; cost: number } }
  | { type: 'CLEAN_STORE' }
  | { type: 'DISMISS_NOTIFICATION' }
  | { type: 'TOGGLE_PAUSE' }
  | { type: 'EXPAND_STORE' }
  | { type: 'LOAD_GAME'; payload: GameState }
  | { type: 'RESET_GAME' }
  | { type: 'SHOW_NOTIFICATION', payload: EventNotification }
  | { type: 'CHEAT_ADD_MONEY' };
