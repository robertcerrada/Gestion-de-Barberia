'use client';

import React, { useEffect, useState } from 'react';
import { Home, Users, BarChart3, Settings } from 'lucide-react';

interface NavItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ size: number; className?: string; style?: React.CSSProperties }>;
}

interface PremiumNavBarProps {
  activeTab: string;
  onTabChange: (tabId: string) => void;
  items: readonly NavItem[];
}

export default function PremiumNavBar({ activeTab, onTabChange, items }: PremiumNavBarProps) {
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);
  const [bottomSafeArea, setBottomSafeArea] = useState('0px');

  useEffect(() => {
    const safeBottom = getComputedStyle(document.documentElement).getPropertyValue('--safe-bottom').trim();
    setBottomSafeArea(safeBottom || '0px');
  }, []);

  const activeIndex = items.findIndex(item => item.id === activeTab);
  const itemWidth = 100 / items.length;

  return (
    <nav id="premium-nav-bar" className="premium-nav-bar" style={{ paddingBottom: bottomSafeArea }}>

      {/* Animated background curve */}
      <div
        className="premium-nav-bg-curve"
        style={{
          left: `${activeIndex * itemWidth}%`,
          width: `${itemWidth}%`,
        }}
      />


      {/* Nav items */}
      <div className="premium-nav-items">
        {items.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          const isHovered = hoveredItem === item.id;

          return (
            <button
              key={item.id}
              id={`tab-${item.id}`}
              type="button"
              onClick={() => onTabChange(item.id)}
              onMouseEnter={() => setHoveredItem(item.id)}
              onMouseLeave={() => setHoveredItem(null)}
              className="premium-nav-item"
              style={{
                color: isActive ? 'var(--gold)' : 'var(--gray-muted)',
                transform: isActive ? 'translateY(-2px)' : isHovered ? 'translateY(-1px)' : 'translateY(0)',
              }}
            >
              {/* Icon with glow effect */}
              <div className="premium-nav-item-icon">

                {isActive && (
                  <div
                    style={{
                      position: 'absolute',
                      width: '40px',
                      height: '40px',
                      borderRadius: '50%',
                      background: 'radial-gradient(circle, rgba(212,175,55,0.2) 0%, transparent 70%)',
                      animation: 'navGlow 2s ease-in-out infinite',
                      zIndex: -1
                    }}
                  />
                )}
                <Icon
                  size={22}
                  style={{
                    color: isActive ? 'var(--gold)' : isHovered ? 'rgba(212,175,55,0.6)' : 'var(--gray-muted)',
                    transition: 'color 0.3s ease',
                    filter: isActive ? 'drop-shadow(0 0 8px rgba(212,175,55,0.4))' : 'none'
                  }}
                />
              </div>

              {/* Label */}
              <span
                className="premium-nav-label"
                style={{
                  color: isActive ? 'var(--gold)' : isHovered ? 'rgba(212,175,55,0.6)' : 'var(--gray-muted)',
                  fontWeight: isActive ? 600 : 400,
                }}
              >
                {item.label}
              </span>
            </button>
          );
        })}
      </div>

      {/* Decorative corner ornaments */}
      <div className="premium-nav-ornament" />
      <div className="premium-nav-ornament premium-nav-ornament--right" />

      <style>{`
        @keyframes navGlow {
          0%, 100% {
            opacity: 0.3;
            transform: scale(1);
          }
          50% {
            opacity: 0.1;
            transform: scale(1.2);
          }
        }

        @media (hover: none) and (pointer: coarse) {
          #premium-nav-bar button:active {
            transform: scale(0.95) !important;
          }
        }
      `}</style>
    </nav>
  );
}
