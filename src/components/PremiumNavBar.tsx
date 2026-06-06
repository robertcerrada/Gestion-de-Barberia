'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';

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
  const [collapsed, setCollapsed] = useState(false);
  const [bottomSafeArea, setBottomSafeArea] = useState('0px');
  const scrollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastScrollY = useRef(0);
  const isScrolling = useRef(false);

  useEffect(() => {
    const cancelled = { current: false };
    const t = setTimeout(() => {
      if (cancelled.current) return;
      try {
        const safeBottom = getComputedStyle(document.documentElement)
          .getPropertyValue('--safe-bottom').trim();
        requestAnimationFrame(() => {
          if (!cancelled.current) {
            setBottomSafeArea(prev => (prev === (safeBottom || '0px') ? prev : (safeBottom || '0px')));
          }
        });
      } catch (err) {
        console.warn('[PremiumNavBar] failed to read --safe-bottom:', err);
      }
    }, 0);
    return () => { cancelled.current = true; clearTimeout(t); };
  }, []);

  // Scroll detection: collapse while scrolling, expand when stopped
  const handleScroll = useCallback(() => {
    const currentScrollY = window.scrollY;
    const delta = currentScrollY - lastScrollY.current;
    lastScrollY.current = currentScrollY;

    // Only collapse if scrolling down meaningfully
    if (Math.abs(delta) > 2 && !isScrolling.current) {
      isScrolling.current = true;
      setCollapsed(true);
    }

    // Clear any existing idle timer
    if (scrollTimerRef.current) clearTimeout(scrollTimerRef.current);

    // Re-expand after scroll stops (500ms idle)
    scrollTimerRef.current = setTimeout(() => {
      isScrolling.current = false;
      setCollapsed(false);
    }, 500);
  }, []);

  useEffect(() => {
    // Use passive listener for better performance on mobile
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', handleScroll);
      if (scrollTimerRef.current) clearTimeout(scrollTimerRef.current);
    };
  }, [handleScroll]);

  const activeIndex = items.findIndex(item => item.id === activeTab);
  const activeItem = items.find(item => item.id === activeTab);
  const ActiveIcon = activeItem?.icon;
  const itemWidth = 100 / items.length;

  return (
    <nav
      id="premium-nav-bar"
      className={`premium-nav-bar${collapsed ? ' premium-nav-bar--collapsed' : ''}`}
      style={{ paddingBottom: bottomSafeArea }}
    >
      {/* Animated selection highlight — only visible when expanded */}
      {!collapsed && (
        <div
          className="premium-nav-bg-curve"
          style={{
            left: `${activeIndex * itemWidth}%`,
            width: `${itemWidth}%`,
          }}
        />
      )}

      {/* Collapsed state: single floating icon pill */}
      {collapsed && ActiveIcon && (
        <div className="premium-nav-collapsed-pill">
          <ActiveIcon
            size={22}
            style={{
              color: 'var(--gold)',
              filter: 'drop-shadow(0 0 8px rgba(212,175,55,0.6))',
            }}
          />
        </div>
      )}

      {/* Full nav items — visible when expanded */}
      {!collapsed && (
        <div className="premium-nav-items">
          {items.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;

            return (
              <button
                key={item.id}
                id={`tab-${item.id}`}
                type="button"
                onClick={() => onTabChange(item.id)}
                data-active={isActive ? 'true' : 'false'}
                className="premium-nav-item"
                style={{
                  color: isActive ? 'var(--gold)' : 'var(--gray-muted)',
                  transform: isActive ? 'translateY(-2px)' : 'translateY(0)',
                }}
              >
                {/* Icon with glow */}
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
                        zIndex: -1,
                      }}
                    />
                  )}
                  <Icon
                    size={22}
                    style={{
                      color: isActive ? 'var(--gold)' : 'var(--gray-muted)',
                      transition: 'color 0.3s ease',
                      filter: isActive ? 'drop-shadow(0 0 8px rgba(212,175,55,0.4))' : 'none',
                    }}
                  />
                </div>

                {/* Label */}
                <span
                  className="premium-nav-label"
                  style={{
                    color: isActive ? 'var(--gold)' : 'var(--gray-muted)',
                    fontWeight: isActive ? 600 : 400,
                  }}
                >
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>
      )}

      <style>{`
        @keyframes navGlow {
          0%, 100% { opacity: 0.3; transform: scale(1); }
          50%       { opacity: 0.1; transform: scale(1.2); }
        }

        @keyframes collapsePulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(212,175,55,0); }
          50%       { box-shadow: 0 0 0 6px rgba(212,175,55,0.08); }
        }

        .premium-nav-collapsed-pill {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 100%;
          height: 100%;
          animation: collapsePulse 2.5s ease-in-out infinite;
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
