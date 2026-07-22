'use client';
import { Sun, Moon, Monitor, Check } from 'lucide-react';
import { useTheme } from '../../hooks/useTheme';

const OPTIONS = [
  { value: 'light',  label: 'Light',  icon: Sun,     desc: 'Bright interface' },
  { value: 'dark',   label: 'Dark',   icon: Moon,    desc: 'Easy on the eyes' },
  { value: 'system', label: 'System', icon: Monitor, desc: 'Match device settings' },
];

/**
 * ThemeSettingsPicker — full 3-option card picker for a Settings/Profile page
 * This is where the "system" option belongs — matches how GitHub, Linear,
 * Vercel structure their appearance settings.
 *
 * Usage: drop into profile page's "Preferences" tab
 */
export default function ThemeSettingsPicker() {
  const { mode, setMode } = useTheme();

  return (
    <div>
      <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-100 mb-1">Appearance</h3>
      <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">Choose how DeliverPro looks on this device</p>

      <div className="grid grid-cols-3 gap-3">
        {OPTIONS.map(({ value, label, icon: Icon, desc }) => {
          const active = mode === value;
          return (
            <button
              key={value}
              onClick={() => setMode(value)}
              className={`relative flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-colors text-center
                ${active
                  ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20 dark:border-primary-400'
                  : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                }`}
            >
              {active && (
                <div className="absolute top-2 right-2 w-4 h-4 bg-primary-600 rounded-full flex items-center justify-center">
                  <Check className="h-2.5 w-2.5 text-white" />
                </div>
              )}
              <Icon className={`h-5 w-5 ${active ? 'text-primary-600 dark:text-primary-400' : 'text-gray-400 dark:text-gray-500'}`} />
              <div>
                <p className={`text-sm font-medium ${active ? 'text-primary-700 dark:text-primary-300' : 'text-gray-700 dark:text-gray-300'}`}>
                  {label}
                </p>
                <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-0.5">{desc}</p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}