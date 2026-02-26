'use client';

import { useEffect, useRef, useId } from 'react';
import { MessageSquare, MessageSquareOff } from 'lucide-react';
import gsap from 'gsap';
import styles from './LiquidSwitch.module.css';

interface ToggleSwitchProps {
  label: string;
  enabled: boolean;
  setEnabled: (enabled: boolean) => void;
  isDarkMode: boolean;
}

export default function ToggleSwitch({ label, enabled, setEnabled, isDarkMode }: ToggleSwitchProps) {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const uniqueId = useId().replace(/:/g, ''); 
  const gooId = `goo-${uniqueId}`;
  const removeBlackId = `remove-black-${uniqueId}`;

  useEffect(() => {
    if (buttonRef.current) {
      gsap.set(buttonRef.current, {
        '--complete': enabled ? 100 : 0,
        '--hue': 144 
      });
    }
  }, []);

  useEffect(() => {
    if (!buttonRef.current) return;
    const toggle = buttonRef.current;
    toggle.dataset.active = 'true';

    gsap.to(toggle, {
      '--complete': enabled ? 100 : 0,
      duration: 0.35,
      ease: "power2.inOut",
      onComplete: () => {
        gsap.delayedCall(0.1, () => {
          toggle.dataset.active = 'false';
        });
      }
    });
  }, [enabled]);

  return (
    // Убраны классы hover:bg-white/5 и hover:bg-black/5
    <div className={`w-full flex items-center justify-between p-2 rounded-xl transition-colors`}>
      
      <div className="flex items-center gap-3">
         <div className={`p-2 rounded-xl transition-colors duration-300 ${enabled ? 'bg-lime-400/20 text-lime-400' : 'bg-red-500/20 text-red-500'}`}>
            {enabled ? <MessageSquare size={18} /> : <MessageSquareOff size={18} />}
         </div>
         <div className="text-left select-none">
            <p className={`font-bold text-sm ${isDarkMode ? 'text-zinc-200' : 'text-zinc-800'}`}>{label}</p>
            <p className={`text-xs font-medium transition-colors duration-300 ${enabled ? 'text-lime-500' : 'text-red-500'}`}>
                {enabled ? 'Включены' : 'Отключены'}
            </p>
         </div>
      </div>
      
      <div className={`${styles.liquidContainer} flex items-center justify-center relative p-1 bg-transparent`}>
        <div 
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white rounded-full pointer-events-none"
          style={{ width: '56px', height: '26px', zIndex: 0 }} 
        />
        <button
          ref={buttonRef}
          className={styles.liquidToggle}
          onClick={() => setEnabled(!enabled)}
          aria-pressed={enabled}
          data-active="false"
          aria-label="Toggle"
          style={{ zIndex: 1 }}
        >
          <div className={styles.knockout} style={{ filter: `url(#${removeBlackId})` }}>
            <div className={styles.indicatorMasked}>
              <div className={styles.mask}></div>
            </div>
          </div>
          <div className={styles.indicatorLiquid}>
            <div className={styles.shadow}></div>
            <div className={styles.wrapper}>
              <div className={styles.liquids} style={{ filter: `url(#${gooId})` }}>
                <div className={styles.liquid_shadow}></div>
                <div className={styles.liquid_track}></div>
              </div>
            </div>
            <div className={styles.cover}></div>
          </div>
        </button>
        <svg className={styles.srOnly} aria-hidden="true" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <filter id={gooId}>
              <feGaussianBlur in="SourceGraphic" stdDeviation="4" result="blur" />
              <feColorMatrix
                in="blur"
                mode="matrix"
                values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 18 -7"
                result="goo"
              />
              <feComposite in="SourceGraphic" in2="goo" operator="atop" />
            </filter>
            <filter id={removeBlackId} colorInterpolationFilters="sRGB">
              <feColorMatrix
                type="matrix"
                values="1 0 0 0 0
                        0 1 0 0 0
                        0 0 1 0 0
                        -1 -1 -1 1 0"
                result="knocked"
              />
              <feComposite in="SourceGraphic" in2="knocked" operator="out" />
            </filter>
          </defs>
        </svg>
      </div>
    </div>
  );
}