import React from 'react';
import { Link } from 'react-router-dom';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
  to?: string;
  className?: string;
}

export const Logo: React.FC<LogoProps> = ({
  size = 'md',
  showText = true,
  to = '/',
  className = ''
}) => {
  const sizeMap = {
    sm: { icon: 28, text: 'text-lg', badge: 'text-[9px]' },
    md: { icon: 34, text: 'text-xl', badge: 'text-[10px]' },
    lg: { icon: 44, text: 'text-2xl', badge: 'text-xs' }
  };

  const current = sizeMap[size];

  const content = (
    <div className={`inline-flex items-center gap-2.5 font-bold tracking-tight select-none ${className}`}>
      <div className="relative flex items-center justify-center flex-shrink-0">
        <svg
          width={current.icon}
          height={current.icon}
          viewBox="0 0 48 48"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="transition-transform duration-300 group-hover:scale-105"
        >
          <rect width="48" height="48" rx="12" fill="url(#brandGrad)" />
          <path
            d="M14 24C14 18.4772 18.4772 14 24 14C29.5228 14 34 18.4772 34 24C34 29.5228 29.5228 34 24 34C21.8485 34 19.8515 33.3213 18.2144 32.1678L13 34.5L14.7397 29.7405C14.2642 27.9795 14 26.0357 14 24Z"
            stroke="#FFFFFF"
            strokeWidth="3.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <circle cx="20" cy="24" r="2.2" fill="#FFFFFF" />
          <circle cx="24" cy="24" r="2.2" fill="#FFFFFF" />
          <circle cx="28" cy="24" r="2.2" fill="#FFFFFF" />
          <defs>
            <linearGradient id="brandGrad" x1="0" y1="0" x2="48" y2="48" gradientUnits="userSpaceOnUse">
              <stop stopColor="#0EA5E9" />
              <stop offset="1" stopColor="#0284C7" />
            </linearGradient>
          </defs>
        </svg>
      </div>

      {showText && (
        <div className="flex flex-col leading-none">
          <span className={`${current.text} font-extrabold tracking-tight text-slate-900 dark:text-white`}>
            Connecto
          </span>
        </div>
      )}
    </div>
  );

  if (to) {
    return (
      <Link to={to} className="group inline-flex items-center" id="app-logo-link">
        {content}
      </Link>
    );
  }

  return content;
};
