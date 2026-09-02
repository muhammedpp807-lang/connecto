import React from 'react';
import { ChessPieceColor, ChessPieceType } from '../../../types';

interface ChessPieceProps {
  type: ChessPieceType;
  color: ChessPieceColor;
  className?: string;
  size?: number;
}

export const ChessPiece: React.FC<ChessPieceProps> = ({
  type,
  color,
  className = '',
  size = 44
}) => {
  const isWhite = color === 'w';

  // Crisp SVG definitions with drop shadow and clean outlines
  const renderSvgContent = () => {
    switch (type) {
      case 'k': // King
        return (
          <g
            fill={isWhite ? '#FFFFFF' : '#1E293B'}
            stroke={isWhite ? '#0F172A' : '#F8FAFC'}
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            {/* Cross */}
            <path d="M22.5 11.5V6M20 8.5H25" stroke={isWhite ? '#0F172A' : '#F8FAFC'} strokeWidth="1.7" />
            {/* Crown */}
            <path d="M22.5 12.5C12.5 12.5 11 21 11 25.5C11 28.5 12 30.5 13.5 32H31.5C33 30.5 34 28.5 34 25.5C34 21 32.5 12.5 22.5 12.5Z" />
            <path d="M11.5 25.5C15 28 20 28.5 22.5 28.5C25 28.5 30 28 33.5 25.5" fill="none" />
            <circle cx="16" cy="18" r="1.5" fill={isWhite ? '#E2E8F0' : '#475569'} />
            <circle cx="22.5" cy="16.5" r="1.5" fill={isWhite ? '#E2E8F0' : '#475569'} />
            <circle cx="29" cy="18" r="1.5" fill={isWhite ? '#E2E8F0' : '#475569'} />
            {/* Base */}
            <path d="M11.5 35.5H33.5V38.5H11.5Z" />
            <path d="M9.5 38.5H35.5V41H9.5Z" />
          </g>
        );

      case 'q': // Queen
        return (
          <g
            fill={isWhite ? '#FFFFFF' : '#1E293B'}
            stroke={isWhite ? '#0F172A' : '#F8FAFC'}
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            {/* Crown Jewels */}
            <circle cx="8" cy="12" r="2" fill={isWhite ? '#FFFFFF' : '#1E293B'} />
            <circle cx="15" cy="9" r="2" fill={isWhite ? '#FFFFFF' : '#1E293B'} />
            <circle cx="22.5" cy="8" r="2" fill={isWhite ? '#FFFFFF' : '#1E293B'} />
            <circle cx="30" cy="9" r="2" fill={isWhite ? '#FFFFFF' : '#1E293B'} />
            <circle cx="37" cy="12" r="2" fill={isWhite ? '#FFFFFF' : '#1E293B'} />
            {/* Crown Body */}
            <path d="M9 26C10.5 22 10 14 8 13.5C11.5 16.5 13.5 13.5 15 10.5C17.5 15.5 19.5 14 22.5 9.5C25.5 14 27.5 15.5 30 10.5C31.5 13.5 33.5 16.5 37 13.5C35 14 34.5 22 36 26C32 29 27 30 22.5 30C18 30 13 29 9 26Z" />
            <path d="M12 28.5C16 31 29 31 33 28.5" fill="none" />
            {/* Base */}
            <path d="M11.5 35.5H33.5V38.5H11.5Z" />
            <path d="M9.5 38.5H35.5V41H9.5Z" />
          </g>
        );

      case 'r': // Rook
        return (
          <g
            fill={isWhite ? '#FFFFFF' : '#1E293B'}
            stroke={isWhite ? '#0F172A' : '#F8FAFC'}
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            {/* Crenels */}
            <path d="M12 11H16V15H20V11H25V15H29V11H33V17H12Z" />
            {/* Waist */}
            <path d="M14 17L15.5 33H29.5L31 17Z" />
            {/* Decorative Waist Band */}
            <path d="M13 25H32" fill="none" strokeWidth="1.2" />
            {/* Base */}
            <path d="M12 33.5H33V37.5H12Z" />
            <path d="M9.5 37.5H35.5V41H9.5Z" />
          </g>
        );

      case 'b': // Bishop
        return (
          <g
            fill={isWhite ? '#FFFFFF' : '#1E293B'}
            stroke={isWhite ? '#0F172A' : '#F8FAFC'}
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            {/* Top finial */}
            <circle cx="22.5" cy="8.5" r="1.8" />
            {/* Mitre head */}
            <path d="M22.5 10.5C15 10.5 14 19 14 24C14 28 16 30 17 33H28C29 30 31 28 31 24C31 19 30 10.5 22.5 10.5Z" />
            {/* Mitre slit */}
            <path d="M17.5 18L26 23M20 16L23 20" fill="none" stroke={isWhite ? '#0F172A' : '#F8FAFC'} strokeWidth="1.3" />
            {/* Collar */}
            <path d="M15 33.5H30V36.5H15Z" />
            {/* Base */}
            <path d="M10.5 37.5H34.5V41H10.5Z" />
          </g>
        );

      case 'n': // Knight
        return (
          <g
            fill={isWhite ? '#FFFFFF' : '#1E293B'}
            stroke={isWhite ? '#0F172A' : '#F8FAFC'}
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            {/* Horse Head */}
            <path d="M22 10C21.5 8 19.5 8 18 10C17 11.5 16 11 14 12C12 13 11 15 11 18C11 20 12 21.5 10 23C8.5 24 8 26 10 27.5C11.5 28.5 13.5 27 15 25C17.5 28 20 30 21 34H33C33 30 34 22 31 17C29 13.5 26 11.5 22 10Z" />
            {/* Eye */}
            <circle cx="16" cy="16" r="1.5" fill={isWhite ? '#0F172A' : '#F8FAFC'} />
            {/* Mane line */}
            <path d="M24 13C25 17 26 22 25 27" fill="none" strokeWidth="1.2" />
            {/* Nostril */}
            <circle cx="11.5" cy="24.5" r="0.8" fill={isWhite ? '#0F172A' : '#F8FAFC'} />
            {/* Base */}
            <path d="M11 34.5H34V37.5H11Z" />
            <path d="M9.5 37.5H35.5V41H9.5Z" />
          </g>
        );

      case 'p': // Pawn
      default:
        return (
          <g
            fill={isWhite ? '#FFFFFF' : '#1E293B'}
            stroke={isWhite ? '#0F172A' : '#F8FAFC'}
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            {/* Head */}
            <circle cx="22.5" cy="14" r="5" />
            {/* Neck / Collar */}
            <path d="M18 20H27" strokeWidth="1.3" />
            {/* Body */}
            <path d="M19 21C16.5 24 16 28 15 34H30C29 28 28.5 24 26 21Z" />
            {/* Base */}
            <path d="M13.5 34.5H31.5V37.5H13.5Z" />
            <path d="M11 37.5H34V41H11Z" />
          </g>
        );
    }
  };

  return (
    <div
      className={`inline-flex items-center justify-center select-none transition-transform duration-100 ${className}`}
      style={{ width: size, height: size }}
    >
      <svg
        viewBox="0 0 45 45"
        width={size}
        height={size}
        className="filter drop-shadow-xs"
        style={{
          filter: isWhite
            ? 'drop-shadow(0 2px 3px rgba(0,0,0,0.35))'
            : 'drop-shadow(0 2px 3px rgba(255,255,255,0.2))'
        }}
      >
        {renderSvgContent()}
      </svg>
    </div>
  );
};
