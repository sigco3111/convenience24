import React from 'react';
import { DailySale, DailyExpense, Ranking } from '../types';
import SalesChart from './SalesChart';

interface EndDayModalProps {
  dailySales: DailySale[];
  dailyExpenses: DailyExpense[];
  day: number;
  onClose: () => void;
  dailyRankings: Ranking[];
}

const EndDayModal: React.FC<EndDayModalProps> = ({ dailySales, dailyExpenses, day, onClose, dailyRankings }) => {
  const todaySales = dailySales.find(sale => sale.day === day)?.sales || 0;
  const todayExpenses = dailyExpenses.find(expense => expense.day === day)?.expenses || 0;
  const netProfit = todaySales - todayExpenses;
  
  const netProfitColor = netProfit >= 0 ? 'text-green-600' : 'text-red-600';
  const playerRankInfo = dailyRankings.findIndex(r => r.isPlayer) + 1;
  const playerRank = playerRankInfo > 0 ? playerRankInfo : null;

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-yellow-100 p-6 rounded-lg shadow-2xl border-4 border-black max-w-lg w-full text-center">
        <h2 className="text-2xl font-bold text-red-700 mb-2">{day}일차 종료</h2>
        <p className="mb-4">오늘의 실적을 확인할 시간입니다!</p>
        
        {playerRank && (
          <p className="text-lg font-bold mb-4 text-center">
            오늘 상권에서 <span className="text-blue-600">🏆{playerRank}위</span>를 차지했습니다!
          </p>
        )}

        <div className="bg-white/80 p-4 rounded-md border-2 border-black mb-4 space-y-2">
          <div className="grid grid-cols-3 gap-2 text-center">
              <div>
                <h3 className="text-sm font-bold">오늘의 매출</h3>
                <p className="text-xl text-green-700 font-bold">₩{todaySales.toLocaleString()}</p>
              </div>
              <div>
                <h3 className="text-sm font-bold">오늘의 지출</h3>
                <p className="text-xl text-red-700 font-bold">₩{todayExpenses.toLocaleString()}</p>
              </div>
               <div>
                <h3 className="text-sm font-bold">오늘의 순이익</h3>
                <p className={`text-xl ${netProfitColor} font-bold`}>₩{netProfit.toLocaleString()}</p>
              </div>
          </div>
        </div>
        
        <div className="h-48 mb-4">
            <h3 className="text-lg font-bold mb-2">일일 매출 그래프</h3>
            <SalesChart data={dailySales} />
        </div>

        <button
          onClick={onClose}
          className="w-full bg-blue-500 hover:bg-blue-600 text-white p-3 rounded border-2 border-black text-lg"
        >
          {day + 1}일차 시작
        </button>
      </div>
    </div>
  );
};

export default EndDayModal;