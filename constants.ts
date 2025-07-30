

import { Product, GameState, StoreTile, FloorStyle, WallStyle, Achievement, Table, Weather, CustomerType, CustomerProfile, EmployeeRole, RivalStore, Ranking, Employee } from './types';

export const TICK_RATE = 100; // ms per tick
export const DAY_LENGTH_SECONDS = 60; // 1 minute day
export const SAVE_GAME_KEY = 'convenience_store_save_game';

export const ATM_COST = 5000;
export const COFFEE_MACHINE_COST = 3000;
export const COFFEE_PRICE = 100;
export const ATM_FEE = 50;

export const STOCKER_HIRE_COST = 10000;
export const STOCKER_SALARY = 1000;
export const CASHIER_HIRE_COST = 8000;
export const CASHIER_SALARY = 800;
export const SERVICE_STAFF_HIRE_COST = 9000;
export const SERVICE_STAFF_SALARY = 900;
export const STAFF_RESTOCK_THRESHOLD = 0.5; // Restock if stock is below 50%
export const STOCK_ROOM_Y = 0;

export const STOCKER_MOVE_DURATION = 30; // base ticks
export const STOCKER_RESTOCK_DURATION = 20; // base ticks

export const CHECKOUT_TIME = 25; // 2.5 seconds
export const MAX_QUEUE_WAIT_TIME = 400; // 40 seconds

export const CLEANING_COST = 20;
export const CLEANLINESS_THRESHOLD_FOR_SERVICE = 80;
export const CLEANING_RATE = 0.1; // cleanliness points per tick
export const CLEANING_SPOT_DURATION = 100; // 10 seconds per spot
export const APPEASE_DURATION = 50; // 5 seconds
export const INSPECTION_PASS_REWARD = 1000;
export const INSPECTION_FAIL_PENALTY = 2000;

export const DIFFICULT_CUSTOMER_CHANCE = 0.03;
export const DIFFICULT_CUSTOMER_MAX_COMPLAINT_TIME = 300; // 30 seconds
export const DIFFICULT_CUSTOMER_CLEANLINESS_PENALTY_ON_TIMEOUT = 10;
export const DIFFICULT_CUSTOMER_TICK_CLEANLINESS_PENALTY = 0.02;

export const SALE_EVENT_CHANCE = 0.25; // 25% chance for a sale event each day
export const SALE_DISCOUNT = 0.3; // 30% discount

export const REGULAR_CONVERSION_BASE_CHANCE = 0.01; // 1% chance per purchase at 100 satisfaction
export const REGULAR_SPAWN_CHANCE_FACTOR = 20;
export const REGULAR_SPEND_MULTIPLIER = 1.2;

export const HOT_FOOD_CORNER_COST = 7000;
export const TABLE_COST = 500;
export const FREEZER_COST = 1500;
export const CHILLER_COST = 2000;
export const HOT_FOOD_PRICE = 250;
export const EATABLE_PRODUCTS = ['onigiri', 'bento', 'hot_food', 'christmas_cake', 'banana'];
export const EAT_IN_CHANCE = 0.5; // 50% chance to eat in if possible
export const EATING_TIME = 50; // 5 seconds

export const LOTTERY_STAND_COST = 15000;
export const LOTTERY_TICKET_SALE_PRICE = 500; // Profit for the store per ticket
export const CHANCE_TO_BUY_LOTTERY_TICKET = 0.1; // 10% chance after any purchase
export const LOTTERY_PRIZES = [
  { chance: 0.01, amount: 20000 }, // 1% chance for grand prize
  { chance: 0.05, amount: 2000 },  // 5% chance for small prize
];
export const LOTTERY_BUYING_TIME = 30; // 3 seconds
export const LOTTERY_REACTION_TIME = 40; // 4 seconds

export const EXPANSION_COST = 50000;
export const INITIAL_GRID_WIDTH = 8;
export const INITIAL_GRID_HEIGHT = 8;
export const EXPANDED_GRID_WIDTH = 10;
export const EXPANDED_GRID_HEIGHT = 10;

// Employee Training
export const MAX_EMPLOYEE_LEVEL = 5;
export const TRAINING_COSTS: { [key in EmployeeRole]: number[] } = {
  // Index corresponds to the level they are training FOR (e.g., index 2 is cost for Lv.2)
  STOCKER: [0, 15000, 30000, 60000, 120000],
  CASHIER: [0, 12000, 25000, 50000, 100000],
  SERVICE: [0, 14000, 28000, 55000, 110000],
};
export const STOCKER_SPEED_PER_LEVEL = 0.15; // 15% faster per level
export const CASHIER_SPEED_PER_LEVEL = 0.20; // 20% faster per level
export const SERVICE_SPEED_PER_LEVEL = 0.20; // 20% faster per level

// Seasonal Events
export const CHRISTMAS_EVENT_DAY = 24;

export const WEATHER_AFFECTED_PRODUCTS: { [key in Weather]?: string[] } = {
  SUNNY: ['soda', 'icecream'],
  RAINY: ['umbrella'],
  SNOWY: ['hot_food', 'coffee_machine', 'bento'],
};

export const PRODUCTS: Product[] = [
  { id: 'onigiri', name: '주먹밥', icon: '🍙', cost: 50, price: 120, capacity: 20, unlockCost: 0 },
  { id: 'bento', name: '도시락', icon: '🍱', cost: 150, price: 350, capacity: 15, unlockCost: 0 },
  { id: 'soda', name: '음료수', icon: '🥤', cost: 40, price: 100, capacity: 30, unlockCost: 500 },
  { id: 'chips', name: '과자', icon: '🥔', cost: 70, price: 160, capacity: 25, unlockCost: 800 },
  { id: 'bread', name: '빵', icon: '🍞', cost: 60, price: 150, capacity: 20, unlockCost: 2000 },
  { id: 'tissues', name: '화장지', icon: '🧻', cost: 120, price: 250, capacity: 15, unlockCost: 2500 },
  { id: 'umbrella', name: '우산', icon: '🌂', cost: 200, price: 500, capacity: 10, unlockCost: 3000 },
  { id: 'pen', name: '펜', icon: '✒️', cost: 80, price: 180, capacity: 20, unlockCost: 3500 },
  { id: 'notebook', name: '공책', icon: '📓', cost: 150, price: 300, capacity: 10, unlockCost: 4000 },
  { id: 'magazine', name: '잡지', icon: '📰', cost: 100, price: 250, capacity: 10, unlockCost: 5000 },
  { id: 'detergent', name: '세제', icon: '🧴', cost: 250, price: 550, capacity: 10, unlockCost: 7000 },
  { id: 'banana', name: '바나나', icon: '🍌', cost: 100, price: 220, capacity: 15, unlockCost: 8000 },
  { id: 'salad', name: '샐러드', icon: '🥗', cost: 250, price: 500, capacity: 10, unlockCost: 10000 },
  // Frozen
  { id: 'icecream', name: '아이스크림', icon: '🍦', cost: 80, price: 180, capacity: 25, unlockCost: 1000 },
  { id: 'frozen_dumplings', name: '냉동만두', icon: '🥟', cost: 200, price: 450, capacity: 10, unlockCost: 4000 },
  { id: 'frozen_pizza', name: '냉동피자', icon: '🍕', cost: 300, price: 600, capacity: 8, unlockCost: 6000 },
  // Seasonal
  { id: 'christmas_cake', name: '크리스마스 케이크', icon: '🍰', cost: 500, price: 1500, capacity: 10, unlockCost: 0, seasonal: 'CHRISTMAS' },
];

export const FROZEN_PRODUCTS = ['icecream', 'frozen_dumplings', 'frozen_pizza'];
export const FRESH_PRODUCTS = ['banana', 'salad'];
export const STATIONERY_PRODUCTS = ['pen', 'notebook'];

export const CUSTOMER_PROFILES: { [key in CustomerType]: CustomerProfile } = {
  STUDENT: {
    name: '학생',
    icons: ['🧑‍🎓', '👩‍🎓'],
    preferences: ['onigiri', 'soda', 'chips', 'icecream', 'frozen_dumplings', 'pen', 'notebook'],
    // 0-23h, peaks after school
    hourlyWeights: [1,1,1,1,1,1,1,2,2,1,1,1,2,3,3,4,4,4,3,3,2,2,1,1]
  },
  OFFICE_WORKER: {
    name: '직장인',
    icons: ['👨‍💼', '👩‍💼'],
    preferences: ['bento', 'coffee_machine', 'magazine', 'soda', 'hot_food', 'frozen_pizza', 'salad', 'pen'],
    // Peaks at lunch and after work
    hourlyWeights: [1,1,1,1,1,1,2,3,4,3,2,4,5,4,2,2,3,4,5,4,3,2,1,1]
  },
  HOUSEWIFE: {
    name: '주부',
    icons: ['👩‍🍳'],
    preferences: ['bread', 'bento', 'onigiri', 'tissues', 'detergent', 'banana'],
    // Peaks during the day
    hourlyWeights: [1,1,1,1,1,1,1,2,3,4,4,4,3,3,4,4,3,2,1,1,1,1,1,1]
  },
  GENERAL: {
    name: '일반 손님',
    icons: ['🧑', '👧', '👨', '👩', '👴'],
    preferences: [], // Will buy anything
    // Flat distribution
    hourlyWeights: [2,2,2,2,2,2,2,3,3,3,3,3,3,3,3,3,3,3,3,3,2,2,2,2]
  },
};


export const INITIAL_PRODUCTS: string[] = ['onigiri', 'bento'];

export const RIVAL_STORES: RivalStore[] = [
  { id: 'rival1', name: 'GS24', icon: '🏪', level: 3, dailySales: 0, marketShare: 0 },
  { id: 'rival2', name: '7-Eleven-ish', icon: '🏪', level: 2, dailySales: 0, marketShare: 0 },
  { id: 'rival3', name: 'CU Later', icon: '🏪', level: 1, dailySales: 0, marketShare: 0 },
];

export const generateLayout = (width: number, height: number, hasAtm: boolean, hasCoffeeMachine: boolean): StoreTile[] => {
    const layout: StoreTile[] = Array.from({ length: width * height }, () => ({ type: 'floor' }));
    const doorX = Math.floor(width / 2);

    for (let i = 0; i < width; i++) {
        layout[i] = { type: 'counter' };
    }
    layout[doorX] = { type: 'door' };

    if (hasAtm) layout[0] = { type: 'atm' };
    if (hasCoffeeMachine) layout[1] = { type: 'coffee_machine' };
    
    return layout;
};

export const ACHIEVEMENTS: Achievement[] = [
    { id: 'first_sale', name: '첫 판매', description: '첫 번째 상품을 판매하세요.', isUnlocked: false, icon: '💰' },
    { id: 'money_10000', name: '작은 부자', description: '자금 10,000원을 돌파하세요.', isUnlocked: false, icon: '💵' },
    { id: 'place_first_shelf', name: '첫걸음', description: '첫 번째 선반을 설치하세요.', isUnlocked: false, icon: '🛠️' },
    { id: 'unlock_first_product', name: '상품 개발자', description: '새로운 상품을 잠금 해제하세요.', isUnlocked: false, icon: '💡' },
    { id: 'day_1_survivor', name: '1일차 생존!', description: '첫 날을 무사히 마치세요.', isUnlocked: false, icon: '📅' },
    { id: 'day_7_veteran', name: '일주일 단골', description: '7일차까지 가게를 운영하세요.', isUnlocked: false, icon: '🗓️' },
    { id: 'first_expansion', name: '가게 확장!', description: '가게를 처음으로 확장하세요.', isUnlocked: false, icon: '🏗️' },
    { id: 'first_hot_food', name: '따끈한 시작', description: '즉석 조리 코너를 처음으로 설치하세요.', isUnlocked: false, icon: '♨️' },
    { id: 'first_regular', name: '첫 단골', description: '첫 단골 손님을 확보하세요.', isUnlocked: false, icon: '💖' },
    { id: 'christmas_event', name: '메리 크리스마스', description: '크리스마스 이벤트를 성공적으로 마치세요.', isUnlocked: false, icon: '🎄' },
    { id: 'first_chiller', name: '신선함 가득', description: '첫 번째 신선 식품 매대를 설치하세요.', isUnlocked: false, icon: '🥬' },
    { id: 'first_stationery', name: '문구점 사장님', description: '첫 문구류 상품을 판매하세요.', isUnlocked: false, icon: '✒️' },
];

export const INITIAL_GAME_STATE: GameState = {
  time: 0,
  money: 2000,
  width: INITIAL_GRID_WIDTH,
  height: INITIAL_GRID_HEIGHT,
  shelves: [],
  freezers: [],
  chillers: [],
  layout: generateLayout(INITIAL_GRID_WIDTH, INITIAL_GRID_HEIGHT, false, false),
  unlockedProducts: INITIAL_PRODUCTS,
  customers: [],
  dailySales: [],
  dailyExpenses: [],
  employees: [
    {
      id: 'emp_CASHIER_initial',
      role: 'CASHIER',
      icon: '💁',
      salary: CASHIER_SALARY,
      level: 1,
      x: Math.floor(INITIAL_GRID_WIDTH / 2),
      y: 0,
      state: 'IDLE',
      targetShelfId: null,
      stateProgress: 0,
      stateMaxProgress: 0,
    }
  ],
  hotFoodCorners: [],
  tables: [],
  lotteryStands: [],
  productSales: {},
  missedSales: {},
  storeMode: 'NORMAL',
  showEndDayModal: false,
  floorStyle: 'default',
  wallStyle: 'default',
  weather: 'SUNNY',
  achievements: ACHIEVEMENTS.map(a => ({ ...a })),
  hasAtm: false,
  hasCoffeeMachine: false,
  cleanliness: 100,
  satisfaction: 80,
  regulars: 0,
  currentEvent: null,
  eventNotification: null,
  isPaused: false,
  hourlySales: Array(24).fill(0),
  hourlyVisitors: Array(24).fill(0),
  complaintCounts: {},
  rivals: RIVAL_STORES.map(r => ({ ...r })),
  dailyRankings: [],
};