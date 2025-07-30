

import React, { useState, useEffect, useCallback, useReducer } from 'react';
import { GameState, GameAction, Product, Customer, DailySale, StoreMode, FloorStyle, WallStyle, Achievement, Employee, CustomerType, Weather, EventNotification, GameEvent, PlacedObject, Table, LotteryStand, Freezer, EmployeeRole, Chiller, RivalStore, Ranking } from './types';
import { INITIAL_GAME_STATE, TICK_RATE, DAY_LENGTH_SECONDS, PRODUCTS, ACHIEVEMENTS, ATM_COST, COFFEE_MACHINE_COST, COFFEE_PRICE, ATM_FEE, STOCKER_HIRE_COST, STOCKER_SALARY, STAFF_RESTOCK_THRESHOLD, STOCK_ROOM_Y, CUSTOMER_PROFILES, CLEANING_COST, INSPECTION_PASS_REWARD, INSPECTION_FAIL_PENALTY, DIFFICULT_CUSTOMER_CHANCE, DIFFICULT_CUSTOMER_MAX_COMPLAINT_TIME, DIFFICULT_CUSTOMER_CLEANLINESS_PENALTY_ON_TIMEOUT, DIFFICULT_CUSTOMER_TICK_CLEANLINESS_PENALTY, SALE_EVENT_CHANCE, SALE_DISCOUNT, EXPANSION_COST, EXPANDED_GRID_WIDTH, EXPANDED_GRID_HEIGHT, generateLayout, HOT_FOOD_CORNER_COST, TABLE_COST, HOT_FOOD_PRICE, EATABLE_PRODUCTS, EAT_IN_CHANCE, EATING_TIME, LOTTERY_STAND_COST, CHANCE_TO_BUY_LOTTERY_TICKET, LOTTERY_TICKET_SALE_PRICE, LOTTERY_PRIZES, LOTTERY_BUYING_TIME, LOTTERY_REACTION_TIME, FREEZER_COST, FROZEN_PRODUCTS, CASHIER_HIRE_COST, CASHIER_SALARY, CHECKOUT_TIME, MAX_QUEUE_WAIT_TIME, WEATHER_AFFECTED_PRODUCTS, REGULAR_CONVERSION_BASE_CHANCE, REGULAR_SPAWN_CHANCE_FACTOR, REGULAR_SPEND_MULTIPLIER, SERVICE_STAFF_HIRE_COST, SERVICE_STAFF_SALARY, CLEANLINESS_THRESHOLD_FOR_SERVICE, CLEANING_RATE, APPEASE_DURATION, CLEANING_SPOT_DURATION, STOCKER_MOVE_DURATION, STOCKER_RESTOCK_DURATION, CASHIER_SPEED_PER_LEVEL, SERVICE_SPEED_PER_LEVEL, STOCKER_SPEED_PER_LEVEL, CHRISTMAS_EVENT_DAY, CHILLER_COST, FRESH_PRODUCTS, STATIONERY_PRODUCTS, SAVE_GAME_KEY } from './constants';
import Header from './components/Header';
import Store from './components/Store';
import ManagementPanel from './components/ManagementPanel';
import EndDayModal from './components/EndDayModal';
import ConfirmationModal from './components/ConfirmationModal';

const gameReducer = (state: GameState, action: GameAction): GameState => {
  switch (action.type) {
    case 'TICK': {
      let money = state.money;
      let shelves = state.shelves.map(s => ({...s}));
      let freezers = state.freezers.map(f => ({...f}));
      let chillers = state.chillers.map(c => ({...c}));
      let tables = [...state.tables];
      let lotteryStands = [...state.lotteryStands];
      let customers = [...state.customers];
      let regulars = state.regulars;
      let satisfaction = state.satisfaction;

      // Defer copying state until mutation is needed to prevent re-renders
      let newProductSales: GameState['productSales'] | null = null;
      let newMissedSales: GameState['missedSales'] | null = null;
      let newDailySales: GameState['dailySales'] | null = null;
      let newHourlySales: GameState['hourlySales'] | null = null;
      let newHourlyVisitors: GameState['hourlyVisitors'] | null = null;
      let newComplaintCounts: GameState['complaintCounts'] | null = null;
      let achievements = state.achievements; // No copy yet
      let eventNotification = state.eventNotification;

      const time = state.time + 1;
      const ticksPerDay = DAY_LENGTH_SECONDS * (1000 / TICK_RATE);
      const dayIndex = Math.floor(state.time / ticksPerDay);
      const timeOfDay = state.time % ticksPerDay;
      const hour = Math.floor((timeOfDay / ticksPerDay) * 24);

      // --- Satisfaction Calculation ---
      const totalCapacity = [...shelves, ...freezers, ...chillers].reduce((sum, facility) => {
        const product = PRODUCTS.find(p => p.id === facility.productId);
        return sum + (product ? product.capacity : 0);
      }, 0);
      const totalStock = [...shelves, ...freezers, ...chillers].reduce((sum, facility) => sum + facility.stock, 0);
      const stockAvailability = totalCapacity > 0 ? (totalStock / totalCapacity) * 100 : 100;
      satisfaction = (state.cleanliness * 0.6) + (stockAvailability * 0.4);

      // --- Cleanliness Logic ---
      const normalCleanlinessDecrease = 0.01 + customers.filter(c => !c.isDifficult).length * 0.005;
      let cleanliness = Math.max(0, state.cleanliness - normalCleanlinessDecrease);
      cleanliness -= customers.filter(c => c.isDifficult && (c.pathProgress || 0) >= 15).length * DIFFICULT_CUSTOMER_TICK_CLEANLINESS_PENALTY;

      // --- Customer Update Loop ---
      const nextCustomers: Customer[] = [];
      for (const c of customers) {
        let customer = { ...c };

        if (customer.isExiting) {
          const newProgress = customer.pathProgress + 1;
          if (newProgress < 15) { 
            nextCustomers.push({ ...customer, pathProgress: newProgress });
          }
          continue; 
        }

        if (customer.lotteryReactionTimer !== undefined) {
            const newTimer = customer.lotteryReactionTimer + 1;
            if (newTimer > LOTTERY_REACTION_TIME) {
                lotteryStands = lotteryStands.map(ls => ls.id === customer.targetLotteryId ? { ...ls, isOccupied: false } : ls);
                customer = { ...customer, lotteryReactionTimer: undefined, isExiting: true, pathProgress: 0, targetLotteryId: undefined };
            } else {
                customer = { ...customer, lotteryReactionTimer: newTimer };
            }
        } else if (customer.isBuyingLottery) {
            const newTimer = (customer.lotteryBuyTimer || 0) + 1;
            if (newTimer === 1) { 
                const saleAmount = LOTTERY_TICKET_SALE_PRICE;
                money += saleAmount;
                
                if (!newHourlySales) newHourlySales = [...state.hourlySales];
                newHourlySales[hour] += saleAmount;
                
                if (!newProductSales) newProductSales = { ...state.productSales };
                const currentSales = newProductSales['lottery'] || { count: 0, revenue: 0 };
                newProductSales['lottery'] = { count: currentSales.count + 1, revenue: currentSales.revenue + saleAmount };
            }
            if (newTimer > LOTTERY_BUYING_TIME) {
                let winAmount = null;
                const prizeRoll = Math.random();
                let cumulativeChance = 0;
                for (const prize of LOTTERY_PRIZES) {
                    cumulativeChance += prize.chance;
                    if (prizeRoll < cumulativeChance) { winAmount = prize.amount; break; }
                }
                if (winAmount !== null) money -= winAmount;
                customer = { ...customer, isBuyingLottery: false, lotteryWinAmount: winAmount, lotteryReactionTimer: 0 };
            } else {
                customer = { ...customer, lotteryBuyTimer: newTimer };
            }
        } else if (customer.isMovingToLottery) {
             const newProgress = customer.pathProgress + 1;
            if (newProgress >= 15) {
                customer = { ...customer, isMovingToLottery: false, isBuyingLottery: true, lotteryBuyTimer: 0, pathProgress: 15 };
            } else {
                customer = { ...customer, pathProgress: newProgress };
            }
        } else if (customer.isBeingServed) {
            // Cashier controls this state
        } else if (customer.isQueuing) {
             const newProgress = customer.pathProgress + 1;
             const isAtQueueSpot = newProgress >= 15;
             if (isAtQueueSpot && customer.queueTimer === undefined) {
                 customer = { ...customer, queueTimer: 0, pathProgress: 15 };
             } else if (isAtQueueSpot) {
                 const newTimer = (customer.queueTimer || 0) + 1;
                 if (newTimer > MAX_QUEUE_WAIT_TIME) {
                    if (customer.purchasedProductId) {
                         if (!newMissedSales) newMissedSales = { ...state.missedSales };
                         const currentMissed = newMissedSales[customer.purchasedProductId] || 0;
                         newMissedSales[customer.purchasedProductId] = currentMissed + 1;
                    }
                    if (!newComplaintCounts) newComplaintCounts = { ...state.complaintCounts };
                    const key = 'queue_too_long';
                    newComplaintCounts[key] = (newComplaintCounts[key] || 0) + 1;

                    customer = { ...customer, isExiting: true, pathProgress: 0, isQueuing: false, purchaseValue: 0 };
                 } else {
                    customer = { ...customer, queueTimer: newTimer };
                 }
             } else {
                 customer = { ...customer, pathProgress: newProgress };
             }
        } else if (customer.isEating) {
            const newTimer = (customer.eatingTimer || 0) + 1;
            if (newTimer > EATING_TIME) {
                tables = tables.map(t => t.id === customer.targetTableId ? { ...t, isOccupied: false } : t);
                customer = { ...customer, isEating: false, isQueuing: true, pathProgress: 0, targetTableId: undefined };
            } else {
                customer = { ...customer, eatingTimer: newTimer };
            }
        } else if (customer.isMovingToTable) {
            const newProgress = customer.pathProgress + 1;
            if (newProgress >= 15) {
                 customer = { ...customer, isMovingToTable: false, isEating: true, eatingTimer: 0, pathProgress: 15 };
            } else {
                 customer = { ...customer, pathProgress: newProgress };
            }
        } else if (customer.isDifficult) {
             const currentPathProgress = customer.pathProgress || 0;
            if (currentPathProgress < 15) {
                customer = { ...customer, pathProgress: currentPathProgress + 1 };
            } else {
                const newTimer = (customer.complaintTimer || 0) + 1;
                if (newTimer > DIFFICULT_CUSTOMER_MAX_COMPLAINT_TIME) {
                    cleanliness -= DIFFICULT_CUSTOMER_CLEANLINESS_PENALTY_ON_TIMEOUT;
                    customer = { ...customer, isExiting: true, pathProgress: 0, isDifficult: false };
                } else {
                    customer = { ...customer, complaintTimer: newTimer };
                }
            }
        } else if (customer.isShopping) {
          const shoppingTime = customer.shoppingTime + 1;
          if (shoppingTime > customer.maxShoppingTime) {
            let purchaseSuccess = false;
            let soldPrice = 0;
            let purchasedProductId: string | null = null;
            const targetId = customer.targetShelfId;

            if (targetId === 'coffee_machine') { soldPrice = COFFEE_PRICE; purchaseSuccess = true; purchasedProductId = 'coffee'; }
            else if (targetId === 'atm') { soldPrice = ATM_FEE; purchaseSuccess = true; purchasedProductId = 'atm'; }
            else if (targetId?.startsWith('hfc_')) { soldPrice = HOT_FOOD_PRICE; purchaseSuccess = true; purchasedProductId = 'hot_food'; }
            else if (targetId?.startsWith('shelf_')) {
                const shelfIndex = shelves.findIndex(s => s.id === targetId);
                if (shelfIndex !== -1 && shelves[shelfIndex].stock > 0) {
                  const p = PRODUCTS.find(p => p.id === shelves[shelfIndex].productId);
                  if(p) { soldPrice = p.price; purchasedProductId = p.id; shelves[shelfIndex].stock--; purchaseSuccess = true; }
                } else if (shelves[shelfIndex]?.productId) { 
                    if (!newMissedSales) newMissedSales = { ...state.missedSales };
                    newMissedSales[shelves[shelfIndex].productId] = (newMissedSales[shelves[shelfIndex].productId] || 0) + 1; 
                    if (!newComplaintCounts) newComplaintCounts = { ...state.complaintCounts };
                    const key = 'stock_out';
                    newComplaintCounts[key] = (newComplaintCounts[key] || 0) + 1;
                }
            } else if (targetId?.startsWith('freezer_')) {
                const freezerIndex = freezers.findIndex(s => s.id === targetId);
                if (freezerIndex !== -1 && freezers[freezerIndex].stock > 0) {
                    const p = PRODUCTS.find(p => p.id === freezers[freezerIndex].productId);
                    if(p) { soldPrice = p.price; purchasedProductId = p.id; freezers[freezerIndex].stock--; purchaseSuccess = true; }
                } else if (freezers[freezerIndex]?.productId) { 
                    if (!newMissedSales) newMissedSales = { ...state.missedSales };
                    newMissedSales[freezers[freezerIndex].productId] = (newMissedSales[freezers[freezerIndex].productId] || 0) + 1;
                    if (!newComplaintCounts) newComplaintCounts = { ...state.complaintCounts };
                    const key = 'stock_out';
                    newComplaintCounts[key] = (newComplaintCounts[key] || 0) + 1;
                }
            } else if (targetId?.startsWith('chiller_')) {
                const chillerIndex = chillers.findIndex(s => s.id === targetId);
                if (chillerIndex !== -1 && chillers[chillerIndex].stock > 0) {
                    const p = PRODUCTS.find(p => p.id === chillers[chillerIndex].productId);
                    if(p) { soldPrice = p.price; purchasedProductId = p.id; chillers[chillerIndex].stock--; purchaseSuccess = true; }
                } else if (chillers[chillerIndex]?.productId) { 
                    if (!newMissedSales) newMissedSales = { ...state.missedSales };
                    newMissedSales[chillers[chillerIndex].productId] = (newMissedSales[chillers[chillerIndex].productId] || 0) + 1;
                    if (!newComplaintCounts) newComplaintCounts = { ...state.complaintCounts };
                    const key = 'stock_out';
                    newComplaintCounts[key] = (newComplaintCounts[key] || 0) + 1;
                }
            }
            
            if (purchaseSuccess) {
                const saleEvent = state.currentEvent?.type === 'SALE' ? state.currentEvent : null;
                if (saleEvent && purchasedProductId === saleEvent.productId) { soldPrice *= (1 - saleEvent.discount); }
                soldPrice = Math.round(soldPrice);

                const wantsToEat = purchasedProductId && EATABLE_PRODUCTS.includes(purchasedProductId) && Math.random() < EAT_IN_CHANCE;
                const availableTable = tables.find(t => !t.isOccupied);

                customer = { ...customer, isShopping: false, pathProgress: 0, purchaseValue: soldPrice, purchasedProductId };
                if (wantsToEat && availableTable) {
                    tables = tables.map(t => t.id === availableTable.id ? { ...t, isOccupied: true } : t);
                    customer = { ...customer, isMovingToTable: true, targetTableId: availableTable.id };
                } else {
                    customer = { ...customer, isQueuing: true };
                }
            } else {
                 customer = { ...customer, isShopping: false, isExiting: true, pathProgress: 0 };
            }
          } else {
            customer = { ...customer, shoppingTime };
          }
        } else { // Entering
            const newProgress = customer.pathProgress + 1;
            if (newProgress < 15) {
                customer = { ...customer, pathProgress: newProgress };
            } else {
                customer = { ...customer, isShopping: true, shoppingTime: 0, pathProgress: 15 };
            }
        }
        nextCustomers.push(customer);
      }
      customers = nextCustomers;
      
      // --- Spawning Logic ---
      const doorXForSpawn = Math.floor(state.width / 2);
      const isChristmas = state.currentEvent?.type === 'CHRISTMAS';
      const spawnChance = isChristmas ? 0.08 : 0.05;

      if (Math.random() < spawnChance && customers.length < 10) {
          const isDifficult = Math.random() < DIFFICULT_CUSTOMER_CHANCE;
          const isRegular = !isDifficult && state.regulars > 0 && Math.random() < state.regulars / (state.regulars + REGULAR_SPAWN_CHANCE_FACTOR);

          const customerTypesWithWeights = (Object.keys(CUSTOMER_PROFILES) as CustomerType[]).map(type => ({
            type,
            weight: CUSTOMER_PROFILES[type].hourlyWeights[hour] || 1,
          }));
          const totalWeight = customerTypesWithWeights.reduce((sum, current) => sum + current.weight, 0);
          let randomWeight = Math.random() * totalWeight;
          let customerType: CustomerType = 'GENERAL';
          for (const item of customerTypesWithWeights) {
              randomWeight -= item.weight;
              if (randomWeight <= 0) {
                  customerType = item.type;
                  break;
              }
          }

          const profile = CUSTOMER_PROFILES[customerType];
          const icon = profile.icons[Math.floor(Math.random() * profile.icons.length)];

          let targetShelfId: string | null = null;
          let targetPos: { x: number; y: number } | undefined = undefined;

          if (isDifficult) {
              targetPos = {
                  x: 1 + Math.floor(Math.random() * (state.width - 2)),
                  y: 1 + Math.floor(Math.random() * (state.height - 2)),
              };
          } else {
              const availableTargets: string[] = [];
              shelves.forEach(shelf => {
                  if (shelf.productId && shelf.stock > 0) availableTargets.push(shelf.id);
              });
              freezers.forEach(freezer => {
                  if (freezer.productId && freezer.stock > 0) availableTargets.push(freezer.id);
              });
              chillers.forEach(chiller => {
                  if (chiller.productId && chiller.stock > 0) availableTargets.push(chiller.id);
              });
              if (state.hasAtm) availableTargets.push('atm');
              if (state.hasCoffeeMachine) availableTargets.push('coffee_machine');
              if (state.hotFoodCorners.length > 0) {
                  state.hotFoodCorners.forEach(hfc => availableTargets.push(hfc.id));
              }

              let preferredTargets = availableTargets.filter(targetId => {
                  if (profile.preferences.length === 0) return true;
                  
                  if (targetId === 'atm') return false;
                  if (targetId === 'coffee_machine') return profile.preferences.includes('coffee_machine');
                  if (targetId.startsWith('hfc_')) return profile.preferences.includes('hot_food');

                  const facility = shelves.find(s => s.id === targetId) || freezers.find(f => f.id === targetId) || chillers.find(c => c.id === targetId);
                  if (facility && facility.productId) {
                      return profile.preferences.includes(facility.productId);
                  }
                  return false;
              });
              
              if (isChristmas) {
                  const christmasCakeTargets = shelves.filter(s => s.productId === 'christmas_cake' && s.stock > 0).map(s => s.id);
                  preferredTargets.push(...christmasCakeTargets, ...christmasCakeTargets, ...christmasCakeTargets); // Strongly prefer cake
              }

              // Weather-based preferences
              const weatherProducts = WEATHER_AFFECTED_PRODUCTS[state.weather];
              if (weatherProducts) {
                  const weatherTargets = availableTargets.filter(targetId => {
                       const facility = shelves.find(s => s.id === targetId) || freezers.find(f => f.id === targetId) || chillers.find(c => c.id === targetId);
                       if (facility?.productId) return weatherProducts.includes(facility.productId);
                       if (targetId === 'coffee_machine') return weatherProducts.includes('coffee_machine');
                       if (targetId.startsWith('hfc_')) return weatherProducts.includes('hot_food');
                       return false;
                   });
                   // Add weather-preferred items twice to boost their chance
                   if (weatherTargets.length > 0) {
                       preferredTargets.push(...weatherTargets, ...weatherTargets);
                   }
              }

              if (preferredTargets.length === 0) {
                  preferredTargets = availableTargets;
              }

              if (preferredTargets.length > 0) {
                  targetShelfId = preferredTargets[Math.floor(Math.random() * preferredTargets.length)];
              }
          }
          
          if (targetShelfId || isDifficult) {
              const newCustomer: Customer = {
                  id: Date.now() + Math.random(),
                  type: customerType,
                  icon: icon,
                  x: doorXForSpawn,
                  y: state.height,
                  targetShelfId: targetShelfId,
                  targetPos: targetPos,
                  isShopping: false,
                  isExiting: false,
                  shoppingTime: 0,
                  maxShoppingTime: 50 + Math.floor(Math.random() * 100),
                  pathProgress: 0,
                  isDifficult: isDifficult,
                  isRegular: isRegular,
                  purchaseValue: 0,
              };
              customers.push(newCustomer);
              if (!newHourlyVisitors) newHourlyVisitors = [...state.hourlyVisitors];
              newHourlyVisitors[hour]++;
          }
      }

      // --- Employee Logic ---
      let employees = [...state.employees];
      let cashier = employees.find(e => e.role === 'CASHIER');
      
      // Only perform checkout logic if a cashier is hired
      if (cashier) {
        cashier = {...cashier}; // Create a mutable copy
        
        const cashierSpeedMultiplier = 1 + (cashier.level - 1) * CASHIER_SPEED_PER_LEVEL;

        if (cashier.state === 'IDLE') {
            const customerInQueue = customers.find(c => c.isQueuing && c.pathProgress >= 15);
            if (customerInQueue) {
                cashier.state = 'CHECKING_OUT';
                cashier.stateProgress = 0;
                cashier.targetCustomerId = customerInQueue.id;
                customers = customers.map(c => c.id === customerInQueue.id ? { ...c, isQueuing: false, isBeingServed: true } : c);
            }
        } else if (cashier.state === 'CHECKING_OUT') {
            cashier.stateProgress++;
            const checkoutTime = Math.round(CHECKOUT_TIME / cashierSpeedMultiplier);

            if (cashier.stateProgress > checkoutTime) {
                const servedCustomerIndex = customers.findIndex(c => c.id === cashier.targetCustomerId);
                if (servedCustomerIndex !== -1) {
                    let servedCustomer = customers[servedCustomerIndex];
                    if(servedCustomer.purchaseValue && servedCustomer.purchaseValue > 0) {
                      let saleAmount = servedCustomer.purchaseValue;
                      if (servedCustomer.isRegular) {
                        saleAmount = Math.round(saleAmount * REGULAR_SPEND_MULTIPLIER);
                      }
                      money += saleAmount;
                      
                      if (!newHourlySales) newHourlySales = [...state.hourlySales];
                      newHourlySales[hour] += saleAmount;

                      if(servedCustomer.purchasedProductId) {
                         const pid = servedCustomer.purchasedProductId;
                         if (!newProductSales) newProductSales = { ...state.productSales };
                         const currentSales = newProductSales[pid] || { count: 0, revenue: 0 };
                         newProductSales[pid] = { count: currentSales.count + 1, revenue: currentSales.revenue + saleAmount };
                         
                         if (STATIONERY_PRODUCTS.includes(pid) && !achievements.find(a => a.id === 'first_stationery')?.isUnlocked) {
                             if (achievements === state.achievements) achievements = [...achievements];
                             achievements = achievements.map(a => a.id === 'first_stationery' ? { ...a, isUnlocked: true } : a);
                         }
                      }
                      const today = dayIndex + 1;
                      if (!newDailySales) newDailySales = [...state.dailySales];
                      const saleIndex = newDailySales.findIndex(s => s.day === today);
                      if (saleIndex !== -1) {
                          const updatedEntry = { ...newDailySales[saleIndex], sales: newDailySales[saleIndex].sales + saleAmount };
                          newDailySales[saleIndex] = updatedEntry;
                      } else {
                          newDailySales.push({ day: today, sales: saleAmount });
                      }

                      if (!achievements.find(a => a.id === 'first_sale')?.isUnlocked) { 
                          if (achievements === state.achievements) achievements = [...achievements];
                          achievements = achievements.map(a => a.id === 'first_sale' ? { ...a, isUnlocked: true } : a); 
                      }
                      if (money >= 10000 && !achievements.find(a => a.id === 'money_10000')?.isUnlocked) {
                          if (achievements === state.achievements) achievements = [...achievements];
                          achievements = achievements.map(a => a.id === 'money_10000' ? { ...a, isUnlocked: true } : a); 
                      }

                      // Convert to regular
                      if (!servedCustomer.isDifficult && !servedCustomer.isRegular) {
                          const conversionChance = (satisfaction / 100) * REGULAR_CONVERSION_BASE_CHANCE;
                          if (Math.random() < conversionChance) {
                              regulars++;
                              eventNotification = { id: Date.now(), message: '새로운 단골 손님이 생겼습니다! 💖', type: 'regular' };
                              if (!achievements.find(a => a.id === 'first_regular')?.isUnlocked) {
                                  if (achievements === state.achievements) achievements = [...achievements];
                                  achievements = achievements.map(a => a.id === 'first_regular' ? { ...a, isUnlocked: true } : a);
                              }
                          }
                      }
                    }

                    const wantsToBuyLottery = Math.random() < CHANCE_TO_BUY_LOTTERY_TICKET;
                    const availableLotteryStand = lotteryStands.find(ls => !ls.isOccupied);
                    if (wantsToBuyLottery && availableLotteryStand) {
                         lotteryStands = lotteryStands.map(ls => ls.id === availableLotteryStand.id ? { ...ls, isOccupied: true } : ls);
                         customers[servedCustomerIndex] = { ...servedCustomer, isBeingServed: false, isMovingToLottery: true, pathProgress: 0, targetLotteryId: availableLotteryStand.id };
                    } else {
                         customers[servedCustomerIndex] = { ...servedCustomer, isBeingServed: false, isExiting: true, pathProgress: 0 };
                    }
                }
                cashier.state = 'IDLE'; cashier.targetCustomerId = undefined;
            }
        }
        employees = employees.map(e => e.id === cashier!.id ? cashier! : e);
      }

      employees = employees.map(employee => {
        let newEmployee = { ...employee };
        
        if (newEmployee.role === 'STOCKER') {
            const speedMultiplier = 1 + (newEmployee.level - 1) * STOCKER_SPEED_PER_LEVEL;
            const stockerHomeX = state.width - 2;
            const stockerHomeY = 1;

            switch(newEmployee.state) {
            case 'IDLE': {
                newEmployee.x = stockerHomeX;
                newEmployee.y = stockerHomeY;
                const shelfToRestock = shelves.find(shelf => {
                const product = PRODUCTS.find(p => p.id === shelf.productId);
                return product && shelf.stock < product.capacity * STAFF_RESTOCK_THRESHOLD;
                });
                if (shelfToRestock) {
                    newEmployee.state = 'MOVING_TO_STOCK';
                    newEmployee.targetShelfId = shelfToRestock.id;
                    newEmployee.stateProgress = 0;
                    newEmployee.stateMaxProgress = Math.round(STOCKER_MOVE_DURATION / speedMultiplier);
                }
                break;
            }
            case 'MOVING_TO_STOCK': {
                newEmployee.stateProgress++;
                newEmployee.x = stockerHomeX;
                newEmployee.y = stockerHomeY;
                if (newEmployee.stateProgress >= newEmployee.stateMaxProgress) {
                    const shelfIndex = shelves.findIndex(s => s.id === newEmployee.targetShelfId);
                    if (shelfIndex !== -1) {
                        const shelf = shelves[shelfIndex];
                        const product = PRODUCTS.find(p => p.id === shelf.productId);
                        if (product) {
                            const amountToStock = product.capacity - shelf.stock;
                            const cost = amountToStock * product.cost;
                            if (money >= cost) {
                                money -= cost;
                                shelves[shelfIndex] = { ...shelf, stock: product.capacity };
                                newEmployee.state = 'MOVING_TO_SHELF';
                                newEmployee.stateProgress = 0;
                                newEmployee.stateMaxProgress = Math.round(STOCKER_MOVE_DURATION / speedMultiplier);
                            } else {
                                newEmployee.state = 'IDLE';
                            }
                        } else {
                             newEmployee.state = 'IDLE';
                        }
                    } else {
                        newEmployee.state = 'IDLE';
                    }
                }
                break;
            }
            case 'MOVING_TO_SHELF': {
                newEmployee.stateProgress++;
                const shelf = shelves.find(s => s.id === newEmployee.targetShelfId);
                if (shelf) {
                    const progress = newEmployee.stateMaxProgress > 0 ? newEmployee.stateProgress / newEmployee.stateMaxProgress : 1;
                    newEmployee.x = stockerHomeX + (shelf.x - stockerHomeX) * progress;
                    newEmployee.y = stockerHomeY + (shelf.y - stockerHomeY) * progress;
                }
                
                if (!shelf || newEmployee.stateProgress >= newEmployee.stateMaxProgress) {
                    if (shelf) {
                        newEmployee.x = shelf.x;
                        newEmployee.y = shelf.y;
                        newEmployee.state = 'RESTOCKING';
                        newEmployee.stateProgress = 0;
                        newEmployee.stateMaxProgress = Math.round(STOCKER_RESTOCK_DURATION / speedMultiplier);
                    } else {
                        newEmployee.state = 'IDLE';
                        newEmployee.targetShelfId = null;
                        newEmployee.x = stockerHomeX;
                        newEmployee.y = stockerHomeY;
                    }
                }
                break;
            }
            case 'RESTOCKING': {
                newEmployee.stateProgress++;
                if (newEmployee.stateProgress >= newEmployee.stateMaxProgress) {
                    newEmployee.state = 'IDLE';
                    newEmployee.targetShelfId = null;
                    newEmployee.x = stockerHomeX;
                    newEmployee.y = stockerHomeY;
                }
                break;
            }
            }
        }

        if (newEmployee.role === 'SERVICE') {
            const speedMultiplier = 1 + (newEmployee.level - 1) * SERVICE_SPEED_PER_LEVEL;
            const serviceStaffHomeX = 1;
            const serviceStaffHomeY = 1;

            switch(newEmployee.state) {
                case 'IDLE': {
                    const difficultCustomer = customers.find(c => c.isDifficult && !employees.some(e => e.targetCustomerId === c.id && e.id !== newEmployee.id));
                    if (difficultCustomer) {
                        newEmployee.state = 'MOVING_TO_CUSTOMER';
                        newEmployee.targetCustomerId = difficultCustomer.id;
                        newEmployee.stateProgress = 0; 
                        newEmployee.stateMaxProgress = Math.round(30 / speedMultiplier);
                    } else if (cleanliness < CLEANLINESS_THRESHOLD_FOR_SERVICE && cleanliness < 100) {
                        const floorTiles = state.layout.map((tile, index) => ({...tile, index})).filter(t => t.type === 'floor' && Math.floor(t.index / state.width) > 0);
                        if (floorTiles.length > 0) {
                            const randomTile = floorTiles[Math.floor(Math.random() * floorTiles.length)];
                            newEmployee.state = 'MOVING_TO_CLEAN_SPOT';
                            newEmployee.targetPos = { x: randomTile.index % state.width, y: Math.floor(randomTile.index / state.width) };
                            newEmployee.stateProgress = 0; 
                            newEmployee.stateMaxProgress = Math.round(30 / speedMultiplier);
                            newEmployee.x = serviceStaffHomeX;
                            newEmployee.y = serviceStaffHomeY;
                        }
                    }
                    break;
                }
                case 'MOVING_TO_CUSTOMER': {
                    newEmployee.stateProgress++;
                    const customer = customers.find(c => c.id === newEmployee.targetCustomerId);
                    if (customer) {
                        const progress = newEmployee.stateProgress / newEmployee.stateMaxProgress;
                        const startX = serviceStaffHomeX; const startY = serviceStaffHomeY;
                        newEmployee.x = startX + (customer.x - startX) * progress;
                        newEmployee.y = startY + (customer.y - startY) * progress;
                    }
                    if (newEmployee.stateProgress >= newEmployee.stateMaxProgress || !customer || !customer.isDifficult) {
                        if (customer && customer.isDifficult) {
                            newEmployee.state = 'APPEASING';
                            newEmployee.stateProgress = 0;
                            newEmployee.stateMaxProgress = Math.round(APPEASE_DURATION / speedMultiplier);
                        } else {
                            newEmployee.state = 'IDLE'; newEmployee.targetCustomerId = undefined;
                            newEmployee.x = serviceStaffHomeX;
                            newEmployee.y = serviceStaffHomeY;
                        }
                    }
                    break;
                }
                case 'APPEASING': {
                    newEmployee.stateProgress++;
                    const customerIdx = customers.findIndex(c => c.id === newEmployee.targetCustomerId);
                    if (customerIdx !== -1) {
                         const customer = customers[customerIdx];
                         newEmployee.x = customer.x; newEmployee.y = customer.y;
                    }
                    if (newEmployee.stateProgress >= newEmployee.stateMaxProgress || customerIdx === -1) {
                        if (customerIdx !== -1) {
                            customers = customers.map((c, i) => i === customerIdx ? { ...c, isDifficult: false, isExiting: true, pathProgress: 0 } : c);
                        }
                        newEmployee.state = 'IDLE'; newEmployee.targetCustomerId = undefined;
                        newEmployee.x = serviceStaffHomeX;
                        newEmployee.y = serviceStaffHomeY;
                    }
                    break;
                }
                case 'MOVING_TO_CLEAN_SPOT': {
                    newEmployee.stateProgress++;
                    if (newEmployee.targetPos) {
                        const progress = newEmployee.stateProgress / newEmployee.stateMaxProgress;
                        const startX = serviceStaffHomeX; const startY = serviceStaffHomeY;
                        newEmployee.x = startX + (newEmployee.targetPos.x - startX) * progress;
                        newEmployee.y = startY + (newEmployee.targetPos.y - startY) * progress;
                    }
                    if (newEmployee.stateProgress >= newEmployee.stateMaxProgress) {
                        newEmployee.state = 'CLEANING';
                        newEmployee.stateProgress = 0;
                        newEmployee.stateMaxProgress = Math.round(CLEANING_SPOT_DURATION / speedMultiplier);
                    }
                    break;
                }
                case 'CLEANING': {
                    newEmployee.stateProgress++;
                    cleanliness = Math.min(100, cleanliness + (CLEANING_RATE * speedMultiplier));
                    if (newEmployee.stateProgress >= newEmployee.stateMaxProgress || cleanliness >= 100) {
                        newEmployee.state = 'IDLE'; newEmployee.targetPos = undefined;
                        newEmployee.x = serviceStaffHomeX;
                        newEmployee.y = serviceStaffHomeY;
                    }
                    break;
                }
            }
        }

        return newEmployee;
      });

      // ... rest of TICK ...
      let currentEvent = state.currentEvent;
      
      const dayOver = time % ticksPerDay === 0 && time > 0;
      let showEndDayModal = state.showEndDayModal;

      if (currentEvent?.type === 'HYGIENE_INSPECTION' && time === currentEvent.scheduledTick) {
        const pass = cleanliness > 50;
        if(pass) {
          money += INSPECTION_PASS_REWARD;
          eventNotification = { id: Date.now(), message: `위생 점검 통과! (+₩${INSPECTION_PASS_REWARD.toLocaleString()})`, type: 'pass'};
        } else {
          money -= INSPECTION_FAIL_PENALTY;
          eventNotification = { id: Date.now(), message: `위생 점검 실패... (-₩${INSPECTION_FAIL_PENALTY.toLocaleString()})`, type: 'fail'};
        }
        currentEvent = null;
      }

      if (dayOver) {
        showEndDayModal = true;
        const today = dayIndex;
        let expenses = 0;
        employees.forEach(e => expenses += e.salary);
        
        let dailyExpenses = [...state.dailyExpenses];
        const expenseIndex = dailyExpenses.findIndex(e => e.day === today);
        if (expenseIndex !== -1) {
          const updatedEntry = { ...dailyExpenses[expenseIndex], expenses: expenses };
          dailyExpenses[expenseIndex] = updatedEntry;
        } else {
          dailyExpenses.push({ day: today, expenses });
        }
        money -= expenses;

        let finalAchievements = achievements;
        if (state.currentEvent?.type === 'CHRISTMAS' && !finalAchievements.find(a => a.id === 'christmas_event')?.isUnlocked) {
            if (finalAchievements === achievements) finalAchievements = [...achievements];
            finalAchievements = finalAchievements.map(a => a.id === 'christmas_event' ? { ...a, isUnlocked: true } : a);
        }
        const achievementIndex = finalAchievements.findIndex(a => a.id === 'day_1_survivor' && !a.isUnlocked);
        if (dayIndex === 1 && achievementIndex !== -1) {
            if (finalAchievements === achievements) finalAchievements = [...achievements];
            finalAchievements[achievementIndex] = { ...finalAchievements[achievementIndex], isUnlocked: true };
        }
        const vetAchievement = finalAchievements.findIndex(a => a.id === 'day_7_veteran' && !a.isUnlocked);
        if (dayIndex === 7 && vetAchievement !== -1) {
            if (finalAchievements === achievements) finalAchievements = [...achievements];
            finalAchievements[vetAchievement] = { ...finalAchievements[vetAchievement], isUnlocked: true };
        }

        return {
          ...state, time, money, shelves, freezers, chillers, customers: [], employees, tables, lotteryStands,
          dailySales: newDailySales || state.dailySales,
          dailyExpenses,
          productSales: newProductSales || state.productSales,
          missedSales: newMissedSales || state.missedSales,
          achievements: finalAchievements,
          showEndDayModal: true,
          isPaused: true, cleanliness, satisfaction, regulars, eventNotification, currentEvent,
          hourlySales: newHourlySales || state.hourlySales,
          hourlyVisitors: newHourlyVisitors || state.hourlyVisitors,
          complaintCounts: newComplaintCounts || state.complaintCounts,
        };
      }
      
      return { 
        ...state, time, money, shelves, freezers, chillers, customers, employees, tables, lotteryStands,
        dailySales: newDailySales || state.dailySales,
        dailyExpenses: state.dailyExpenses,
        productSales: newProductSales || state.productSales,
        missedSales: newMissedSales || state.missedSales,
        achievements, cleanliness, satisfaction, regulars, showEndDayModal, eventNotification, currentEvent,
        hourlySales: newHourlySales || state.hourlySales,
        hourlyVisitors: newHourlyVisitors || state.hourlyVisitors,
        complaintCounts: newComplaintCounts || state.complaintCounts,
      };
    }
    case 'HIRE_EMPLOYEE': {
      const { role } = action.payload;
      let hireCost = 0, salary = 0, icon = '', x = 0, y = 0;

      if (role === 'STOCKER') {
        hireCost = STOCKER_HIRE_COST; salary = STOCKER_SALARY; icon = '🧑‍💼';
        x = state.width - 2; y = 1;
      } else if (role === 'CASHIER') {
        hireCost = CASHIER_HIRE_COST; salary = CASHIER_SALARY; icon = '💁';
        x = Math.floor(state.width / 2); y = 0;
      } else if (role === 'SERVICE') {
        hireCost = SERVICE_STAFF_HIRE_COST; salary = SERVICE_STAFF_SALARY; icon = '🧹';
        x = 1; y = 1;
      }

      if (state.money < hireCost || state.employees.some(e => e.role === role)) {
        return state;
      }
      
      const newEmployee: Employee = {
        id: `emp_${role}_${Date.now()}`,
        role: role,
        icon: icon,
        salary: salary,
        level: 1,
        x: x,
        y: y,
        state: 'IDLE',
        targetShelfId: null,
        stateProgress: 0,
        stateMaxProgress: 0,
      };

      return {
        ...state,
        money: state.money - hireCost,
        employees: [...state.employees, newEmployee],
      };
    }
    case 'PLACE_OBJECT': {
      const { x, y } = action.payload;
      const tileIndex = y * state.width + x;
      if (state.layout[tileIndex].type !== 'floor' || y === 0) {
        return state;
      }

      switch (state.storeMode) {
        case 'PLACE_SHELF': {
          if (state.money < 100) return state;

          const newLayout = [...state.layout];
          const newShelf = { id: `shelf_${Date.now()}`, productId: null, stock: 0, x, y };
          newLayout[tileIndex] = { type: 'shelf', entityId: newShelf.id };
          
          const newAchievements = state.achievements.map(a => {
              if (a.id === 'place_first_shelf' && !a.isUnlocked) {
                  return { ...a, isUnlocked: true };
              }
              return a;
          });

          return {
            ...state,
            money: state.money - 100,
            shelves: [...state.shelves, newShelf],
            layout: newLayout,
            storeMode: 'NORMAL',
            achievements: newAchievements,
          };
        }
        case 'PLACE_FREEZER': {
          if (state.money < FREEZER_COST) return state;
          
          const newLayout = [...state.layout];
          const newFreezer: Freezer = { id: `freezer_${Date.now()}`, productId: null, stock: 0, x, y };
          newLayout[tileIndex] = { type: 'freezer', entityId: newFreezer.id };

          return {
            ...state,
            money: state.money - FREEZER_COST,
            freezers: [...state.freezers, newFreezer],
            layout: newLayout,
            storeMode: 'NORMAL',
          };
        }
        case 'PLACE_CHILLER': {
          if (state.money < CHILLER_COST) return state;
          
          const newLayout = [...state.layout];
          const newChiller: Chiller = { id: `chiller_${Date.now()}`, productId: null, stock: 0, x, y };
          newLayout[tileIndex] = { type: 'chiller', entityId: newChiller.id };
          
          const newAchievements = state.achievements.map(a => {
            if (a.id === 'first_chiller' && !a.isUnlocked) {
              return { ...a, isUnlocked: true };
            }
            return a;
          });

          return {
            ...state,
            money: state.money - CHILLER_COST,
            chillers: [...state.chillers, newChiller],
            layout: newLayout,
            storeMode: 'NORMAL',
            achievements: newAchievements,
          };
        }
        case 'PLACE_HOT_FOOD_CORNER': {
          if (state.money < HOT_FOOD_CORNER_COST) return state;
          
          const newLayout = [...state.layout];
          const newHotFoodCorner: PlacedObject = { id: `hfc_${Date.now()}`, x, y };
          newLayout[tileIndex] = { type: 'hot_food_corner', entityId: newHotFoodCorner.id };
          
          const newAchievements = state.achievements.map(a => {
            if (a.id === 'first_hot_food' && !a.isUnlocked) {
              return { ...a, isUnlocked: true };
            }
            return a;
          });

          return {
            ...state,
            money: state.money - HOT_FOOD_CORNER_COST,
            hotFoodCorners: [...state.hotFoodCorners, newHotFoodCorner],
            layout: newLayout,
            storeMode: 'NORMAL',
            achievements: newAchievements,
          };
        }
        case 'PLACE_TABLE': {
          if (state.money < TABLE_COST) return state;
          
          const newLayout = [...state.layout];
          const newTable: Table = { id: `table_${Date.now()}`, x, y, isOccupied: false };
          newLayout[tileIndex] = { type: 'table', entityId: newTable.id };
          
          return {
            ...state,
            money: state.money - TABLE_COST,
            tables: [...state.tables, newTable],
            layout: newLayout,
            storeMode: 'NORMAL',
          };
        }
        case 'PLACE_LOTTERY_STAND': {
          if (state.money < LOTTERY_STAND_COST) return state;
          
          const newLayout = [...state.layout];
          const newLotteryStand: LotteryStand = { id: `lottery_${Date.now()}`, x, y, isOccupied: false };
          newLayout[tileIndex] = { type: 'lottery_stand', entityId: newLotteryStand.id };

          return {
            ...state,
            money: state.money - LOTTERY_STAND_COST,
            lotteryStands: [...state.lotteryStands, newLotteryStand],
            layout: newLayout,
            storeMode: 'NORMAL',
          };
        }
        default:
          return state;
      }
    }
    case 'STOCK_ITEM': {
      const { facilityId, productId, amount } = action.payload;
      const product = PRODUCTS.find(p => p.id === productId);
      if (!product) return state;

      const cost = product.cost * amount;
      if (state.money < cost) return state;

      let shelves = state.shelves;
      let freezers = state.freezers;
      let chillers = state.chillers;
      let success = false;

      if (facilityId.startsWith('shelf_')) {
          if (FROZEN_PRODUCTS.includes(productId) || FRESH_PRODUCTS.includes(productId)) return state;
          shelves = state.shelves.map(shelf => {
              if (shelf.id === facilityId) {
                  success = true;
                  const isNewProduct = shelf.productId !== productId;
                  const currentStock = isNewProduct ? 0 : shelf.stock;
                  return {
                      ...shelf,
                      productId: productId,
                      stock: Math.min(product.capacity, currentStock + amount)
                  };
              }
              return shelf;
          });
      } else if (facilityId.startsWith('freezer_')) {
          if (!FROZEN_PRODUCTS.includes(productId)) return state; // Only stock frozen in freezers
          freezers = state.freezers.map(freezer => {
              if (freezer.id === facilityId) {
                  success = true;
                  const isNewProduct = freezer.productId !== productId;
                  const currentStock = isNewProduct ? 0 : freezer.stock;
                  return {
                      ...freezer,
                      productId: productId,
                      stock: Math.min(product.capacity, currentStock + amount)
                  };
              }
              return freezer;
          });
      } else if (facilityId.startsWith('chiller_')) {
          if (!FRESH_PRODUCTS.includes(productId)) return state;
          chillers = state.chillers.map(chiller => {
              if (chiller.id === facilityId) {
                  success = true;
                  const isNewProduct = chiller.productId !== productId;
                  const currentStock = isNewProduct ? 0 : chiller.stock;
                  return { ...chiller, productId: productId, stock: Math.min(product.capacity, currentStock + amount) };
              }
              return chiller;
          });
      }
      
      if (!success) return state;

      return {
          ...state,
          money: state.money - cost,
          shelves,
          freezers,
          chillers,
      };
    }
    case 'UNLOCK_PRODUCT': {
        const { productId } = action.payload;
        const product = PRODUCTS.find(p => p.id === productId);
        if (!product || state.unlockedProducts.includes(productId) || state.money < product.unlockCost) {
            return state;
        }
        
        const achievements = [...state.achievements];
        const achievementIndex = achievements.findIndex(a => a.id === 'unlock_first_product' && !a.isUnlocked);
        if (achievementIndex !== -1) {
            achievements[achievementIndex] = {...achievements[achievementIndex], isUnlocked: true};
        }

        return {
            ...state,
            money: state.money - product.unlockCost,
            unlockedProducts: [...state.unlockedProducts, productId],
            achievements
        };
    }
    case 'CLOSE_MODAL': {
        const ticksPerDay = DAY_LENGTH_SECONDS * (1000 / TICK_RATE);
        const dayThatEnded = Math.floor(state.time / ticksPerDay);
        
        // --- Rival Logic ---
        const todaySales = state.dailySales.find(s => s.day === dayThatEnded)?.sales || 0;
        let newRivals = state.rivals.map(rival => {
            const baseSales = 2000;
            const sales = Math.floor(baseSales * rival.level * (0.8 + Math.random() * 0.4));
            let newLevel = rival.level;
            if (Math.random() < 0.1) newLevel = Math.min(10, newLevel + 1);
            else if (Math.random() < 0.05) newLevel = Math.max(1, newLevel - 1);
            return { ...rival, dailySales: sales, level: newLevel };
        });
        const allStoresForRanking: Ranking[] = [
            { storeName: '나의 편의점', sales: todaySales, isPlayer: true, icon: '⭐' },
            ...newRivals.map(r => ({ storeName: r.name, sales: r.dailySales, isPlayer: false, icon: r.icon }))
        ];
        const newDailyRankings = allStoresForRanking.sort((a, b) => b.sales - a.sales);
        // --- End Rival Logic ---

        // --- Event & Weather Logic for Next Day ---
        let currentEvent: GameEvent | null = null;
        let newWeather: Weather = 'SUNNY';
        const nextDay = dayThatEnded + 1;

        if (nextDay === CHRISTMAS_EVENT_DAY) {
            currentEvent = { type: 'CHRISTMAS' };
            newWeather = 'SNOWY';
        } else {
            newWeather = Math.random() < 0.3 ? 'RAINY' : 'SUNNY';
            const eventRoll = Math.random();
            const eligibleForSale = state.unlockedProducts.filter(pId => {
                const p = PRODUCTS.find(p => p.id === pId);
                return p && !p.seasonal;
            });
            
            if (eligibleForSale.length > 0 && eventRoll < SALE_EVENT_CHANCE) {
                const saleProductId = eligibleForSale[Math.floor(Math.random() * eligibleForSale.length)];
                currentEvent = { type: 'SALE', productId: saleProductId, discount: SALE_DISCOUNT };
            } else if (eventRoll < SALE_EVENT_CHANCE + 0.15) {
                if (state.time > 0) {
                  const scheduledTick = state.time + Math.floor(ticksPerDay * (0.1 + Math.random() * 0.8));
                  currentEvent = { type: 'HYGIENE_INSPECTION', scheduledTick };
                }
            }
        }
        
        return { 
            ...state, 
            showEndDayModal: false, 
            weather: newWeather, 
            currentEvent, 
            eventNotification: null, 
            isPaused: false,
            hourlySales: Array(24).fill(0),
            hourlyVisitors: Array(24).fill(0),
            complaintCounts: {},
            rivals: newRivals,
            dailyRankings: newDailyRankings,
        };
    }
    case 'CHANGE_INTERIOR': {
      const { type, style } = action.payload;
      const cost = 500;
      
      if (type === 'floor' && state.floorStyle === style) return state;
      if (type === 'wall' && state.wallStyle === style) return state;
      
      if (state.money < cost) return state;

      if (type === 'floor') {
          return { ...state, money: state.money - cost, floorStyle: style as FloorStyle };
      } else { // wall
          return { ...state, money: state.money - cost, wallStyle: style as WallStyle };
      }
    }
    case 'PURCHASE_FACILITY': {
      const { facilityType } = action.payload;
      const newLayout = [...state.layout];
      let money = state.money;
      let hasAtm = state.hasAtm;
      let hasCoffeeMachine = state.hasCoffeeMachine;

      if (facilityType === 'atm') {
        if (money < ATM_COST || hasAtm) return state;
        newLayout[0] = { type: 'atm' };
        money -= ATM_COST;
        hasAtm = true;
      }
      
      if (facilityType === 'coffee_machine') {
          if (money < COFFEE_MACHINE_COST || hasCoffeeMachine) return state;
          newLayout[1] = { type: 'coffee_machine' };
          money -= COFFEE_MACHINE_COST;
          hasCoffeeMachine = true;
      }

      return { ...state, money, hasAtm, hasCoffeeMachine, layout: newLayout };
    }
    case 'CLEAN_STORE': {
        if (state.money < CLEANING_COST) return state;
        return {
            ...state,
            money: state.money - CLEANING_COST,
            cleanliness: 100,
        };
    }
    case 'EXPAND_STORE': {
        if (state.money < EXPANSION_COST || state.width >= EXPANDED_GRID_WIDTH) {
            return state;
        }

        const newWidth = EXPANDED_GRID_WIDTH;
        const newHeight = EXPANDED_GRID_HEIGHT;
        const newLayout = generateLayout(newWidth, newHeight, state.hasAtm, state.hasCoffeeMachine);

        // Re-place all objects
        for (const shelf of state.shelves) { newLayout[shelf.y * newWidth + shelf.x] = { type: 'shelf', entityId: shelf.id }; }
        for (const freezer of state.freezers) { newLayout[freezer.y * newWidth + freezer.x] = { type: 'freezer', entityId: freezer.id }; }
        for (const chiller of state.chillers) { newLayout[chiller.y * newWidth + chiller.x] = { type: 'chiller', entityId: chiller.id }; }
        for (const hfc of state.hotFoodCorners) { newLayout[hfc.y * newWidth + hfc.x] = { type: 'hot_food_corner', entityId: hfc.id }; }
        for (const table of state.tables) { newLayout[table.y * newWidth + table.x] = { type: 'table', entityId: table.id }; }
        for (const stand of state.lotteryStands) { newLayout[stand.y * newWidth + stand.x] = { type: 'lottery_stand', entityId: stand.id }; }
        
        const newAchievements = [...state.achievements];
        const achievementIndex = newAchievements.findIndex(a => a.id === 'first_expansion' && !a.isUnlocked);
        if (achievementIndex !== -1) {
            newAchievements[achievementIndex] = {...newAchievements[achievementIndex], isUnlocked: true};
        }

        return {
            ...state,
            money: state.money - EXPANSION_COST,
            width: newWidth,
            height: newHeight,
            layout: newLayout,
            achievements: newAchievements,
        };
    }
    case 'TRAIN_EMPLOYEE': {
      const { role, cost } = action.payload;
      if (state.money < cost) {
        return state;
      }
      const employees = state.employees.map(e => {
        if (e.role === role) {
          return { ...e, level: e.level + 1 };
        }
        return e;
      });
      return {
        ...state,
        money: state.money - cost,
        employees,
      };
    }
    case 'LOAD_GAME':
      return {
        ...action.payload,
        showEndDayModal: false,
        isPaused: true,
        eventNotification: { id: Date.now(), message: '게임을 불러왔습니다.', type: 'info' },
      };
    case 'RESET_GAME':
      return {
        ...INITIAL_GAME_STATE,
        eventNotification: { id: Date.now(), message: '게임이 초기화되었습니다.', type: 'info' },
      };
    case 'SHOW_NOTIFICATION':
      return { ...state, eventNotification: action.payload };

    case 'DISMISS_NOTIFICATION': { return { ...state, eventNotification: null }; }
    case 'TOGGLE_PAUSE': { return { ...state, isPaused: !state.isPaused }; }
    case 'CUSTOMER_LEAVE': { return { ...state, customers: state.customers.filter(c => c.id !== action.payload.customerId) } }
    case 'SET_STORE_MODE': return { ...state, storeMode: action.payload };
    default: return state;
  }
};

const App: React.FC = () => {
  const [gameState, dispatch] = useReducer(gameReducer, INITIAL_GAME_STATE);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [confirmation, setConfirmation] = useState<{ message: string; onConfirm: () => void; } | null>(null);

  useEffect(() => {
    if (isInitialLoad) {
      const savedGame = localStorage.getItem(SAVE_GAME_KEY);
      if (savedGame) {
        try {
          const loadedState: GameState = JSON.parse(savedGame);
          if (loadedState && typeof loadedState.money === 'number') {
            dispatch({ type: 'LOAD_GAME', payload: loadedState });
          }
        } catch (e) {
          console.error("Could not parse saved game:", e);
          localStorage.removeItem(SAVE_GAME_KEY);
        }
      }
      setIsInitialLoad(false);
    }
  }, [isInitialLoad]);

  useEffect(() => {
    const gameLoop = setInterval(() => {
        if (!gameState.showEndDayModal && !gameState.isPaused) {
            dispatch({ type: 'TICK' });
        }
    }, TICK_RATE);
    return () => clearInterval(gameLoop);
  }, [gameState.showEndDayModal, gameState.isPaused]);

  const handlePlaceObject = useCallback((x: number, y: number) => {
    dispatch({ type: 'PLACE_OBJECT', payload: { x, y } });
  }, []);

  const handleStockItem = useCallback((facilityId: string, productId: string, amount: number) => {
    dispatch({ type: 'STOCK_ITEM', payload: { facilityId, productId, amount }});
  }, []);
  
  const handleUnlockProduct = useCallback((productId: string) => {
    dispatch({ type: 'UNLOCK_PRODUCT', payload: { productId } });
  }, []);

  const handleSetStoreMode = useCallback((mode: StoreMode) => {
    dispatch({ type: 'SET_STORE_MODE', payload: mode });
  }, []);
  
  const handleCloseModal = useCallback(() => {
    dispatch({ type: 'CLOSE_MODAL' });
  }, []);

  const handleChangeInterior = useCallback((type: 'floor' | 'wall', style: FloorStyle | WallStyle) => {
    dispatch({ type: 'CHANGE_INTERIOR', payload: { type, style } });
  }, []);
  
  const handlePurchaseFacility = useCallback((facilityType: 'atm' | 'coffee_machine') => {
    dispatch({ type: 'PURCHASE_FACILITY', payload: { facilityType } });
  }, []);
  
  const handleHireEmployee = useCallback((role: EmployeeRole) => {
    dispatch({ type: 'HIRE_EMPLOYEE', payload: { role } });
  }, []);

  const handleTrainEmployee = useCallback((role: EmployeeRole, cost: number) => {
    dispatch({ type: 'TRAIN_EMPLOYEE', payload: { role, cost } });
  }, []);

  const handleExpandStore = useCallback(() => {
    dispatch({ type: 'EXPAND_STORE' });
  }, []);
  

  
  const handleCleanStore = useCallback(() => {
    dispatch({ type: 'CLEAN_STORE' });
  }, []);
  
  const handleDismissNotification = useCallback(() => {
    dispatch({ type: 'DISMISS_NOTIFICATION' });
  }, []);

  const handleTogglePause = useCallback(() => {
    dispatch({ type: 'TOGGLE_PAUSE' });
  }, []);

  const handleSaveGame = useCallback(() => {
    try {
        localStorage.setItem(SAVE_GAME_KEY, JSON.stringify(gameState));
        dispatch({ type: 'SHOW_NOTIFICATION', payload: { id: Date.now(), message: '게임이 저장되었습니다!', type: 'info' } });
    } catch (error) {
        console.error("Failed to save game:", error);
        dispatch({ type: 'SHOW_NOTIFICATION', payload: { id: Date.now(), message: '저장 실패!', type: 'fail' } });
    }
  }, [gameState]);

  const handleLoadGame = useCallback(() => {
    const savedGame = localStorage.getItem(SAVE_GAME_KEY);
    if (savedGame) {
      setConfirmation({
        message: '저장된 게임을 불러오시겠습니까? 현재 진행 상황은 사라집니다.',
        onConfirm: () => {
          try {
            const loadedState: GameState = JSON.parse(savedGame);
             if (loadedState && typeof loadedState.money === 'number') {
                dispatch({ type: 'LOAD_GAME', payload: loadedState });
             } else {
               throw new Error("Invalid save file structure");
             }
          } catch (error) {
            console.error("Failed to load game:", error);
            dispatch({ type: 'SHOW_NOTIFICATION', payload: { id: Date.now(), message: '불러오기 실패! 파일이 손상되었을 수 있습니다.', type: 'fail' } });
          }
          setConfirmation(null);
        }
      });
    } else {
      dispatch({ type: 'SHOW_NOTIFICATION', payload: { id: Date.now(), message: '저장된 게임이 없습니다.', type: 'warn' } });
    }
  }, []);

  const handleResetGame = useCallback(() => {
    setConfirmation({
      message: '정말로 게임을 초기화하시겠습니까? 모든 진행 상황이 사라집니다.',
      onConfirm: () => {
        localStorage.removeItem(SAVE_GAME_KEY);
        dispatch({ type: 'RESET_GAME' });
        setConfirmation(null);
      }
    });
  }, []);

  useEffect(() => {
    if (gameState.eventNotification) {
        const timer = setTimeout(() => {
            handleDismissNotification();
        }, 3000);
        return () => clearTimeout(timer);
    }
  }, [gameState.eventNotification, handleDismissNotification]);

  const saleEvent = gameState.currentEvent?.type === 'SALE' ? gameState.currentEvent : null;
  const saleProduct =
    saleEvent
      ? PRODUCTS.find((p) => p.id === saleEvent.productId)
      : null;


  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-slate-800 p-4 text-xs md:text-sm">
      <div className="w-full max-w-6xl mx-auto bg-white/50 rounded-lg shadow-2xl border-4 border-black p-1">
        <div className="w-full bg-blue-100 rounded-md shadow-inner border-2 border-black p-4 flex flex-col gap-4">
          <Header 
            money={gameState.money} 
            time={gameState.time} 
            weather={gameState.weather}
            cleanliness={gameState.cleanliness}
            satisfaction={gameState.satisfaction}
            regulars={gameState.regulars}

            isPaused={gameState.isPaused}
            onTogglePause={handleTogglePause}
            dailyRankings={gameState.dailyRankings}
            onSaveGame={handleSaveGame}
            onLoadGame={handleLoadGame}
            onResetGame={handleResetGame}
          />

           {gameState.currentEvent?.type === 'HYGIENE_INSPECTION' && !gameState.showEndDayModal && (
            <div className="bg-orange-400 text-white p-2 rounded-md border-2 border-black text-center font-bold animate-pulse">
                📋 오늘 위생 점검이 예정되어 있습니다! 가게를 깨끗하게 유지하세요.
            </div>
          )}

          {saleEvent && saleProduct && !gameState.showEndDayModal && (
            <div className="bg-pink-500 text-white p-2 rounded-md border-2 border-black text-center font-bold animate-pulse">
                🎉 오늘의 할인! {saleProduct.icon} {saleProduct.name} - {(saleEvent.discount * 100)}% OFF!
            </div>
          )}

          {gameState.currentEvent?.type === 'CHRISTMAS' && !gameState.showEndDayModal && (
            <div className="bg-green-600 text-white p-2 rounded-md border-2 border-black text-center font-bold animate-pulse">
                🎄 메리 크리스마스! 특별 케이크 판매 중! 🍰
            </div>
          )}

          <main className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <Store 
              layout={gameState.layout} 
              shelves={gameState.shelves} 
              freezers={gameState.freezers}
              chillers={gameState.chillers}
              customers={gameState.customers}
              employees={gameState.employees}
              storeMode={gameState.storeMode}
              onPlaceObject={handlePlaceObject}
              dispatch={dispatch}
              floorStyle={gameState.floorStyle}
              wallStyle={gameState.wallStyle}
              weather={gameState.weather}
              cleanliness={gameState.cleanliness}
              isPaused={gameState.isPaused}
              currentEvent={gameState.currentEvent}
              width={gameState.width}
              height={gameState.height}
              hotFoodCorners={gameState.hotFoodCorners}
              tables={gameState.tables}
              lotteryStands={gameState.lotteryStands}
            />
            <ManagementPanel 
              shelves={gameState.shelves}
              freezers={gameState.freezers}
              chillers={gameState.chillers}
              unlockedProducts={gameState.unlockedProducts}
              dailySales={gameState.dailySales}
              money={gameState.money}
              onStockItem={handleStockItem}
              onUnlockProduct={handleUnlockProduct}
              onSetMode={handleSetStoreMode}
              floorStyle={gameState.floorStyle}
              wallStyle={gameState.wallStyle}
              onChangeInterior={handleChangeInterior}
              achievements={gameState.achievements}
              hasAtm={gameState.hasAtm}
              hasCoffeeMachine={gameState.hasCoffeeMachine}
              onPurchaseFacility={handlePurchaseFacility}
              employees={gameState.employees}
              onHireEmployee={handleHireEmployee}
              onTrainEmployee={handleTrainEmployee}
              onCleanStore={handleCleanStore}
              currentEvent={gameState.currentEvent}
              width={gameState.width}
              onExpandStore={handleExpandStore}
              productSales={gameState.productSales}
              missedSales={gameState.missedSales}
              satisfaction={gameState.satisfaction}
              regulars={gameState.regulars}
              hourlySales={gameState.hourlySales}
              hourlyVisitors={gameState.hourlyVisitors}
              isPaused={gameState.isPaused}
              onTogglePause={handleTogglePause}
              complaintCounts={gameState.complaintCounts}
              cleanliness={gameState.cleanliness}
              rivals={gameState.rivals}
              dailyRankings={gameState.dailyRankings}
            />
          </main>
        </div>
      </div>
      <p className="text-center mt-2 text-slate-400 text-xs">React 엔지니어가 만든 카이로소프트 스타일 게임.</p>
       {gameState.showEndDayModal && (
        <EndDayModal
          dailySales={gameState.dailySales}
          dailyExpenses={gameState.dailyExpenses}
          onClose={handleCloseModal}
          day={Math.floor(gameState.time / (DAY_LENGTH_SECONDS * (1000/TICK_RATE)))}
          dailyRankings={gameState.dailyRankings}
        />
      )}
       {gameState.eventNotification && (
        <EventPopup notification={gameState.eventNotification} onClose={() => dispatch({type: 'DISMISS_NOTIFICATION'})} />
      )}
      {confirmation && (
        <ConfirmationModal
          message={confirmation.message}
          onConfirm={confirmation.onConfirm}
          onCancel={() => setConfirmation(null)}
        />
      )}
    </div>
  );
};

// EventPopup is a local component now
const EventPopup: React.FC<{ notification: EventNotification, onClose: () => void }> = ({ notification, onClose }) => {
    const bgColor = { pass: 'bg-green-500', fail: 'bg-red-500', warn: 'bg-yellow-500', info: 'bg-blue-500', regular: 'bg-pink-500' }[notification.type];
    return (
        <div 
            className={`fixed bottom-5 right-5 ${bgColor} text-white px-6 py-3 rounded-lg shadow-lg border-2 border-black animate-bounce z-50 cursor-pointer`}
            onClick={onClose}
        >
            {notification.message}
        </div>
    );
};

export default App;
