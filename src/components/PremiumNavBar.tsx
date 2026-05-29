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
    <nav
      className="premium-nav-bar"
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        height: 'var(--tab-bar-height)',
        paddingBottom: bottomSafeArea,
        zIndex: 100,
        background: 'var(--black-card)',
        backdropFilter: 'blur(20px)',
        borderTop: '1px solid var(--black-border)',
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'space-around',
        paddingTop: '8px'
      }}
    >
      {/* Animated background curve */}
      <div
        className="nav-bg-curve"
        style={{
          position: 'absolute',
          bottom: 0,
          left: `${activeIndex * itemWidth}%`,
          width: `${itemWidth}%`,
          height: '100%',
          background: 'linear-gradient(180deg, rgba(212,175,55,0.15) 0%, rgba(212,175,55,0.05) 100%)',
          borderRadius: '50% 50% 0 0 / 20% 20% 0 0',
          transition: 'left 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
          pointerEvents: 'none',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(212,175,55,0.25)',
          borderBottom: 'none'
        }}
      />

      {/* Nav items */}
      <div style={{ display: 'flex', width: '100%', position: 'relative', zIndex: 10 }}>
        {items.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          const isHovered = hoveredItem === item.id;

          return (
            <button
              key={item.id}
              id={`tab-${item.id}`}
              onClick={() => onTabChange(item.id)}
              onMouseEnter={() => setHoveredItem(item.id)}
              onMouseLeave={() => setHoveredItem(null)}
              style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 0',
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                transition: 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
                color: isActive ? 'var(--gold)' : 'var(--gray-muted)',
                transform: isActive ? 'translateY(-2px)' : isHovered ? 'translateY(-1px)' : 'translateY(0)',
                WebkitTapHighlightColor: 'transparent'
              }}
            >
              {/* Icon with glow effect */}
              <div
                style={{
                  position: 'relative',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
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
                    transition: 'all 0.3s ease',
                    filter: isActive ? 'drop-shadow(0 0 8px rgba(212,175,55,0.4))' : 'none'
                  }}
                />
              </div>

              {/* Label */}
              <span
                style={{
                  fontSize: '10px',
                  fontWeight: isActive ? '600' : '400',
                  color: isActive ? 'var(--gold)' : isHovered ? 'rgba(212,175,55,0.6)' : 'var(--gray-muted)',
                  transition: 'all 0.3s ease',
                  fontFamily: 'var(--font-body)',
                  letterSpacing: '0.01em'
                }}
              >
                {item.label}
              </span>
            </button>
          );
        })}
      </div>

      {/* Decorative corner ornaments */}
      <div
        style={{
          position: 'absolute',
          bottom: '12px',
          left: '12px',
          width: '6px',
          height: '6px',
          borderRadius: '50%',
          background: 'rgba(212,175,55,0.2)',
          pointerEvents: 'none'
        }}
      />
      <div
        style={{
          position: 'absolute',
          bottom: '12px',
          right: '12px',
          width: '6px',
          height: '6px',
          borderRadius: '50%',
          background: 'rgba(212,175,55,0.2)',
          pointerEvents: 'none'
        }}
      />

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
