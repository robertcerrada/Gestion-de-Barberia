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
  const [scrolling, setScrolling] = useState(false);
  const scrollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastScrollY = useRef(0);
  const ticking = useRef(false);

  const handleScroll = useCallback(() => {
    if (ticking.current) return;
    ticking.current = true;

    requestAnimationFrame(() => {
      const currentY = window.scrollY;
      const delta = currentY - lastScrollY.current;
      lastScrollY.current = currentY;

      // Solo colapsar si hay scroll DOWN significativo (>6px) y estamos lejos del tope
      if (delta > 6 && currentY > 80) {
        setScrolling(true);
      }

      if (scrollTimerRef.current) clearTimeout(scrollTimerRef.current);
      scrollTimerRef.current = setTimeout(() => {
        setScrolling(false);
      }, 600);

      ticking.current = false;
    });
  }, []);

  useEffect(() => {
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', handleScroll);
      if (scrollTimerRef.current) clearTimeout(scrollTimerRef.current);
    };
  }, [handleScroll]);

  const activeIndex = items.findIndex(item => item.id === activeTab);
  const itemWidth = 100 / items.length;

  return (
    <nav
      id="premium-nav-bar"
      className={`pnb${scrolling ? ' pnb--hidden' : ''}`}
      aria-label="Navegación principal"
    >
      {/* Pill de fondo del tab activo */}
      <div
        className="pnb__indicator"
        style={{
          left: `calc(${activeIndex * itemWidth}% + 6px)`,
          width: `calc(${itemWidth}% - 12px)`,
        }}
      />

      {/* Items */}
      {items.map((item) => {
        const Icon = item.icon;
        const isActive = activeTab === item.id;

        return (
          <button
            key={item.id}
            id={`tab-${item.id}`}
            type="button"
            onClick={() => onTabChange(item.id)}
            aria-current={isActive ? 'page' : undefined}
            className={`pnb__item${isActive ? ' pnb__item--active' : ''}`}
          >
            <span className="pnb__icon-wrap">
              <Icon
                size={21}
                className="pnb__icon"
              />
            </span>
            <span className="pnb__label">{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
