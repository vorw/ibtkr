'use client';

import { useEffect, useState } from 'react';
import { Moon, Sun } from 'lucide-react';
import { useTheme } from 'next-themes';
import { Button } from '@/components/ui/button';

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const isDark = mounted && resolvedTheme === 'dark';
  const label = isDark ? 'تفعيل المظهر الفاتح' : 'تفعيل المظهر الداكن';

  return (
    <Button
      type="button"
      variant="outline"
      className="theme-toggle"
      aria-label={label}
      title={label}
      disabled={!mounted}
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
    >
      <span className="theme-icons" aria-hidden="true"><Sun className="theme-sun" /><Moon className="theme-moon" /></span>
      <span className="theme-label" aria-hidden="true"><span className="theme-light-label">فاتح</span><span className="theme-dark-label">داكن</span></span>
    </Button>
  );
}
