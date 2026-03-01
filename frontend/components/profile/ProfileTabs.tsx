// frontend/components/profile/ProfileTabs.tsx
'use client';

import { useTheme } from '@/context/ThemeContext';
import { motion } from 'framer-motion';
import { useId } from 'react';
import { LIQUID_GLASS_NOISE_B64 } from '@/lib/constants';

interface TabItem {
  id: string;
  label: string;
  count?: number;
}

interface ProfileTabsProps {
  tabs: TabItem[];
  activeTab: string;
  onChange: (tabId: any) => void;
  prefixId?: string;
}

export default function ProfileTabs({ tabs, activeTab, onChange, prefixId = 'profile' }: ProfileTabsProps) {
  const { isDarkMode } = useTheme();
  const filterId = `filter-${prefixId}-${useId().replace(/:/g, '')}`;

  const liquidGlassStyles = {
    '--c-glass': isDarkMode ? '#bbbbbc' : '#bbbbbc',
    '--c-light': isDarkMode ? '#fff' : '#fff',
    '--c-dark': isDarkMode ? '#000' : '#000',
    '--c-content': isDarkMode ? '#e1e1e1' : '#224',
    '--c-action': isDarkMode ? '#a3e635' : '#0052f5',
    '--saturation': '150%',
  } as React.CSSProperties;

  return (
    <div className="relative mb-6">
      <style dangerouslySetInnerHTML={{ __html: `
        .liquid-switcher-${prefixId}::-webkit-scrollbar { display: none; }
        .liquid-switcher-${prefixId} { 
          -ms-overflow-style: none; scrollbar-width: none; 
          position: relative; z-index: 1; display: flex; align-items: center; gap: 4px; height: 52px;
          box-sizing: border-box; padding: 6px; border-radius: 99em;
          background-color: color-mix(in srgb, var(--c-glass) 12%, transparent);
          backdrop-filter: blur(8px) url(#${filterId}) saturate(var(--saturation));
          box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--c-light) 10%, transparent);
          overflow-x: auto; 
        }
        .liquid-option-${prefixId} {
          color: var(--c-content); position: relative; z-index: 2; display: flex; align-items: center; justify-content: center;
          height: 100%; padding: 0 16px; border-radius: 99em; font-size: 13px; font-weight: 700; cursor: pointer; transition: color 160ms; white-space: nowrap;
        }
        .liquid-option-${prefixId}:hover { color: var(--c-action); }
        .liquid-option-${prefixId}[data-active="true"] { color: var(--c-content); cursor: default; }
        .liquid-blob-${prefixId} {
          border-radius: 99em; background-color: color-mix(in srgb, var(--c-glass) 36%, transparent);
          box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--c-light) 10%, transparent);
        }
      `}} />

      <div className="absolute w-0 h-0 overflow-hidden -z-10 pointer-events-none">
        <svg>
          <filter id={filterId} primitiveUnits="objectBoundingBox">
            <feImage result="map" width="100%" height="100%" x="0" y="0" href={LIQUID_GLASS_NOISE_B64}/>
            <feGaussianBlur in="SourceGraphic" stdDeviation="0.01" result="blur"/>
            <feDisplacementMap in="blur" in2="map" scale="0.5" xChannelSelector="R" yChannelSelector="G"/>
          </filter>
        </svg>
      </div>

      <div className={`liquid-switcher-${prefixId}`} style={liquidGlassStyles}>
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button 
              key={tab.id}
              onClick={() => onChange(tab.id)}
              className={`liquid-option-${prefixId} relative cursor-pointer`}
              data-active={isActive}
            >
              {isActive && (
                <motion.div
                  layoutId={`blob-${prefixId}`}
                  className={`liquid-blob-${prefixId} absolute inset-0 z-0`}
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                />
              )}
              <div className="relative z-10 flex items-center justify-center gap-2">
                <span>{tab.label}</span>
                {(tab.count ?? 0) > 0 && (
                   <span className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 text-[10px] bg-lime-400 text-black rounded-full font-bold shadow">
                      {tab.count}
                   </span>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}