import React from 'react';
import { ChessPieceColor, ChessPieceType } from '../../../types';
import { ChessPiece } from './ChessPiece';

interface ChessPromotionModalProps {
  isOpen: boolean;
  color: ChessPieceColor;
  onSelectPiece: (pieceType: ChessPieceType) => void;
  onCancel?: () => void;
}

export const ChessPromotionModal: React.FC<ChessPromotionModalProps> = ({
  isOpen,
  color,
  onSelectPiece,
  onCancel
}) => {
  if (!isOpen) return null;

  const promotionChoices: { type: ChessPieceType; name: string }[] = [
    { type: 'q', name: 'Queen' },
    { type: 'r', name: 'Rook' },
    { type: 'b', name: 'Bishop' },
    { type: 'n', name: 'Knight' }
  ];

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white dark:bg-[#111b21] border border-slate-200 dark:border-[#1f2c34] rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl p-6 text-center animate-in zoom-in-95 duration-200">
        <h3 className="text-lg font-black text-slate-900 dark:text-white mb-1">
          Promote Pawn ♟️ ➔
        </h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 mb-6 font-medium">
          Choose a piece for promotion
        </p>

        <div className="grid grid-cols-2 gap-3 mb-4">
          {promotionChoices.map((choice) => (
            <button
              key={choice.type}
              type="button"
              onClick={() => onSelectPiece(choice.type)}
              className="p-4 rounded-2xl bg-slate-50 dark:bg-[#19242b] hover:bg-indigo-50 dark:hover:bg-indigo-950/40 border border-slate-200 dark:border-[#2a3942] hover:border-indigo-500/50 flex flex-col items-center justify-center gap-2 transition cursor-pointer group active:scale-95 shadow-xs"
            >
              <ChessPiece type={choice.type} color={color} size={48} />
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300 group-hover:text-indigo-600 dark:group-hover:text-indigo-400">
                {choice.name}
              </span>
            </button>
          ))}
        </div>

        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="w-full py-2.5 rounded-xl bg-slate-100 dark:bg-[#1f2c34] hover:bg-slate-200 dark:hover:bg-[#2a3942] text-xs font-bold text-slate-600 dark:text-slate-400 transition cursor-pointer"
          >
            Cancel Move
          </button>
        )}
      </div>
    </div>
  );
};
