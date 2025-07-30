import React from 'react';
import { TICK_RATE, DAY_LENGTH_SECONDS } from '../constants';
import { Weather, Ranking } from '../types';

interface HeaderProps {
  money: number;
  time: number;
  weather: Weather;
  cleanliness: number;
  satisfaction: number;
  regulars: number;
  onCheatAddMoney: () => void;
  isPaused: boolean;
  onTogglePause: () => void;
  dailyRankings: Ranking[];
  onSaveGame: () => void;
  onLoadGame: () => void;
  onResetGame: () => void;
}

const Header: React.FC<HeaderProps> = ({ money, time, weather, cleanliness, satisfaction, regulars, onCheatAddMoney, isPaused, onTogglePause, dailyRankings, onSaveGame, onLoadGame, onResetGame }) => {
  const ticksPerDay = DAY_LENGTH_SECONDS * (1000 / TICK_RATE);
  const day = Math.floor(time / ticksPerDay) + 1;
  const timeOfDay = time % ticksPerDay;
  const hour = Math.floor((timeOfDay / ticksPerDay) * 24);
  
  const formattedTime = `${String(hour).padStart(2, '0')}:00`;
  
  const cleanlinessColor = cleanliness > 80 ? 'text-green-600' : cleanliness > 40 ? 'text-yellow-600' : 'text-red-600';
  const satisfactionColor = satisfaction > 80 ? 'text-green-600' : satisfaction > 40 ? 'text-yellow-600' : 'text-red-600';

  const weatherIcon = () => {
    switch (weather) {
      case 'SUNNY': return '☀️';
      case 'RAINY': return '🌧️';
      case 'SNOWY': return '❄️';
      default: return '☀️';
    }
  }

  const weatherTitle = () => {
    switch (weather) {
      case 'SUNNY': return '맑음';
      case 'RAINY': return '비';
      case 'SNOWY': return '눈';
      default: return '맑음';
    }
  }

  const playerRankInfo = dailyRankings.findIndex(r => r.isPlayer) + 1;
  const playerRank = playerRankInfo > 0 ? playerRankInfo : null;

  return (
    <header className="bg-red-600 text-white p-3 rounded-md border-2 border-black flex justify-between items-center text-sm shadow-lg flex-wrap gap-2">
      <div className="flex items-center gap-4">
        <h1 className="text-lg md:text-xl font-bold">24시 편의점 이야기</h1>
        <button 
          onClick={onCheatAddMoney}
          className="bg-yellow-400 text-red-800 hover:bg-yellow-300 px-2 py-1 rounded-md border-2 border-black text-[10px] font-bold"
          title="테스트용 자금 추가 (+1,000,000)"
        >
            +1M
        </button>
      </div>
      <div className="flex gap-2 items-center flex-wrap justify-end">
         <div className="flex gap-1 bg-black/10 p-1 rounded-md">
            <button onClick={onSaveGame} className="bg-sky-500 hover:bg-sky-400 text-white px-2 py-1 rounded border-2 border-black text-xs">저장</button>
            <button onClick={onLoadGame} className="bg-emerald-500 hover:bg-emerald-400 text-white px-2 py-1 rounded border-2 border-black text-xs">불러오기</button>
            <button onClick={onResetGame} className="bg-rose-700 hover:bg-rose-600 text-white px-2 py-1 rounded border-2 border-black text-xs">초기화</button>
        </div>
         {playerRank && (
          <div className="bg-yellow-200 text-yellow-800 p-2 rounded border-2 border-black flex items-center gap-2" title={`현재 상권 내 순위: ${playerRank}위`}>
            <span className="text-xl">🏆</span>
            <span className="font-bold">#{playerRank}</span>
          </div>
        )}
         <div className="bg-pink-200 text-pink-800 p-2 rounded border-2 border-black flex items-center gap-2" title={`가게 만족도: ${Math.round(satisfaction)}%`}>
            <span className="text-xl">😊</span>
            <span className={`${satisfactionColor} font-bold`}>{Math.round(satisfaction)}%</span>
         </div>
         <div className="bg-red-200 text-red-800 p-2 rounded border-2 border-black flex items-center gap-2" title={`단골 손님 수: ${regulars}명`}>
            <span className="text-xl">💖</span>
            <span className="font-bold">{regulars}</span>
         </div>
         <div className="bg-blue-200 text-blue-800 p-2 rounded border-2 border-black flex items-center gap-2" title={`청결도: ${Math.round(cleanliness)}%`}>
           <span className="text-xl">✨</span>
           <span className={`${cleanlinessColor} font-bold`}>{Math.round(cleanliness)}%</span>
         </div>
        <div className="bg-yellow-300 text-red-700 p-2 rounded border-2 border-black flex items-center gap-2">
          <span>{day}일차 | {formattedTime}</span>
           <button 
                onClick={onTogglePause}
                className="bg-red-500 hover:bg-red-400 text-white w-6 h-6 flex items-center justify-center rounded border-2 border-black text-xs"
                aria-label={isPaused ? "게임 시작" : "게임 일시정지"}
            >
                {isPaused ? '▶️' : '⏸️'}
            </button>
          <span className="text-xl" title={weatherTitle()}>
            {weatherIcon()}
          </span>
        </div>
        <div className="bg-green-400 text-white p-2 rounded border-2 border-black">
          자금: ₩{money.toLocaleString()}
        </div>
      </div>
    </header>
  );
};

export default Header;
