'use client';

import { useState, useEffect } from 'react';
import { useTheme } from '@/context/ThemeContext';
import { Shield, Lock, Eye, Bell } from 'lucide-react';
import SecuritySettings from '@/components/settings/SecuritySettings';
import PrivacySettings from '@/components/settings/PrivacySettings';
import NotificationsSettings from '@/components/settings/NotificationsSettings'; // Импортируем компонент
import { motion, AnimatePresence } from 'framer-motion';
import { LIQUID_GLASS_NOISE_B64 } from '@/lib/constants';

type SettingsTab = 'security' | 'privacy' | 'notifications';

export default function SettingsPage() {
  const { isDarkMode } = useTheme();
  const [activeTab, setActiveTab] = useState<SettingsTab>('security');

  const [prevIndex, setPrevIndex] = useState(0);
  const [direction, setDirection] = useState<'left' | 'right' | 'up' | 'down'>('right');

  const tabs = [
    { id: 'security', label: 'Безопасность', icon: Shield },
    { id: 'privacy', label: 'Приватность', icon: Eye },
    { id: 'notifications', label: 'Уведомления', icon: Bell },
  ];

  const currentIndex = tabs.findIndex(t => t.id === activeTab);

  useEffect(() => {
    if (currentIndex > prevIndex) setDirection('down');
    else if (currentIndex < prevIndex) setDirection('up');
    setPrevIndex(currentIndex);
  }, [currentIndex, prevIndex]);

  const liquidGlassStyles = {
    '--c-glass': isDarkMode ? '#bbbbbc' : '#bbbbbc',
    '--c-light': isDarkMode ? '#fff' : '#fff',
    '--c-dark': isDarkMode ? '#000' : '#000',
    '--c-content': isDarkMode ? '#e1e1e1' : '#224',
    '--c-action': isDarkMode ? '#a3e635' : '#0052f5',
    '--c-bg': isDarkMode ? '#1b1b1d' : '#E8E8E9',
    '--glass-reflex-dark': isDarkMode ? 2 : 1,
    '--glass-reflex-light': isDarkMode ? 0.3 : 1,
    '--saturation': '150%',
  } as React.CSSProperties;

  return (
    <div className={`min-h-full p-6 md:p-8 transition-colors relative z-10 ${isDarkMode ? 'bg-black text-zinc-100' : 'bg-white text-zinc-900'}`}>
      
      <style dangerouslySetInnerHTML={{ __html: `
        .settings-liquid-switcher {
          position: relative;
          z-index: 1;
          display: flex;
          flex-direction: row; 
          align-items: center;
          gap: 4px;
          width: 100%; 
          height: 60px;
          box-sizing: border-box;
          padding: 6px;
          border-radius: 99em;
          background-color: color-mix(in srgb, var(--c-glass) 12%, transparent);
          backdrop-filter: blur(8px) url(#settings-switcher-filter) saturate(var(--saturation));
          -webkit-backdrop-filter: blur(8px) saturate(var(--saturation));
          box-shadow: 
            inset 0 0 0 1px color-mix(in srgb, var(--c-light) calc(var(--glass-reflex-light) * 10%), transparent),
            inset 1.8px 3px 0px -2px color-mix(in srgb, var(--c-light) calc(var(--glass-reflex-light) * 90%), transparent);
          overflow-x: auto;
          scrollbar-width: none; 
        }
        .settings-liquid-switcher::-webkit-scrollbar { display: none; }

        @media (min-width: 768px) {
          .settings-liquid-switcher {
             flex-direction: column;
             width: 100%; 
             height: auto; 
             padding: 6px;
             border-radius: 24px; 
             overflow: visible;
          }
        }

        .settings-liquid-option {
          color: var(--c-content);
          position: relative;
          z-index: 2;
          display: flex;
          align-items: center;
          justify-content: center;
          height: 100%;
          padding: 0 20px;
          border-radius: 99em;
          font-size: 14px;
          font-weight: 700;
          cursor: pointer;
          transition: color 160ms;
          white-space: nowrap;
        }

        @media (min-width: 768px) {
            .settings-liquid-option {
                width: 100%;
                height: 50px;
                justify-content: flex-start;
                padding: 0 16px;
                border-radius: 16px; 
            }
        }

        .settings-liquid-option:hover { color: var(--c-action); }
        .settings-liquid-option[data-active="true"] { color: var(--c-content); cursor: default; }

        .settings-liquid-icon {
          margin-right: 8px;
          transition: scale 200ms cubic-bezier(0.5, 0, 0, 1);
        }

        .settings-liquid-option:hover .settings-liquid-icon { scale: 1.2; }
        .settings-liquid-option[data-active="true"] .settings-liquid-icon { scale: 1; }

        .settings-liquid-blob {
          border-radius: 99em;
          background-color: color-mix(in srgb, var(--c-glass) 36%, transparent);
          box-shadow: 
            inset 0 0 0 1px color-mix(in srgb, var(--c-light) calc(var(--glass-reflex-light) * 10%), transparent),
            inset 2px 1px 0px -1px color-mix(in srgb, var(--c-light) calc(var(--glass-reflex-light) * 90%), transparent);
        }

        @media (min-width: 768px) {
            .settings-liquid-blob {
                border-radius: 16px;
            }
        }
      `}} />

      <div className="absolute w-0 h-0 overflow-hidden -z-10 pointer-events-none">
        <svg>
          <filter id="settings-switcher-filter" primitiveUnits="objectBoundingBox">
            <feImage result="map" width="100%" height="100%" x="0" y="0" href={LIQUID_GLASS_NOISE_B64}/>
            <feGaussianBlur in="SourceGraphic" stdDeviation="0.01" result="blur"/>
            <feDisplacementMap 
              id="disp" 
              in="blur" 
              in2="map" 
              scale="0.5" 
              xChannelSelector="R" 
              yChannelSelector="G"
            />
          </filter>
        </svg>
      </div>

      <div className="max-w-5xl mx-auto">
        <h1 className="text-3xl font-bold mb-2">Настройки</h1>
        <p className="text-zinc-500 mb-8">Управляйте безопасностью и конфиденциальностью вашего аккаунта</p>

        <div className="flex flex-col md:flex-row gap-8">
          
          <div className="md:w-64 shrink-0">
            <div 
                className="settings-liquid-switcher" 
                style={liquidGlassStyles}
                data-active-index={currentIndex}
            >
              {tabs.map((tab) => {
                 const isActive = activeTab === tab.id;
                 return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id as SettingsTab)}
                      className="settings-liquid-option relative"
                      data-active={isActive}
                    >
                      {isActive && (
                          <motion.div
                            layoutId="settings-active-blob"
                            className="settings-liquid-blob absolute inset-0 z-0"
                            transition={{ type: "spring", stiffness: 400, damping: 30 }}
                          />
                        )}
                        <div className="relative z-10 flex items-center">
                          <tab.icon size={20} className="settings-liquid-icon" />
                          {tab.label}
                        </div>
                    </button>
                 )
              })}
            </div>
          </div>

          {/* Контент */}
          <div className="flex-1 min-w-0">
            {activeTab === 'security' && <SecuritySettings />}
            {activeTab === 'privacy' && <PrivacySettings />}
            {activeTab === 'notifications' && <NotificationsSettings />}
          </div>
        </div>
      </div>
    </div>
  );
}