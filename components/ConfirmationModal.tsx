
import React from 'react';

interface ConfirmationModalProps {
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
}

const ConfirmationModal: React.FC<ConfirmationModalProps> = ({ message, onConfirm, onCancel }) => {
  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-yellow-100 p-6 rounded-lg shadow-2xl border-4 border-black max-w-sm w-full text-center">
        <p className="text-lg mb-6 leading-relaxed">{message}</p>
        <div className="flex justify-around gap-4">
          <button
            onClick={onConfirm}
            className="w-full bg-red-600 hover:bg-red-700 text-white p-3 rounded border-2 border-black"
          >
            확인
          </button>
          <button
            onClick={onCancel}
            className="w-full bg-gray-400 hover:bg-gray-500 text-white p-3 rounded border-2 border-black"
          >
            취소
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmationModal;
