'use client';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { supabaseConfigured } from '@/lib/supabase/env';
import { findAny, platformOf } from '@/lib/apps';
import { SiteNav } from './SiteNav';

/* Picks the highlighted nav item from the URL and swaps Sign in for My dashboard when signed in.
   The check runs in the browser so public pages stay static and fast. */
export function SiteNavByPath() {
  const path = usePathname();
  const [dash, setDash] = useState<string>();
  const slugKey: Record<string, string> = { android: 'android', ios: 'ios', web: 'webapp', desktop: 'desktop', digital: 'digital' };
  const productKey = () => {
    const pl = findAny(path.split('/')[2]);
    return pl && platformOf(pl) !== 'web' ? platformOf(pl) : 'browse';
  };
  const active = path.startsWith('/sell')
    ? 'sell'
    : path.startsWith('/developers')
      ? 'dev'
      : path.startsWith('/domains')
        ? 'domains'
        : path.startsWith('/find')
          ? 'find'
          : path.startsWith('/how-it-works')
            ? 'how'
            : path.startsWith('/apps/')
              ? (slugKey[path.split('/')[2]] ?? 'apps')
              : path.startsWith('/product/')
                ? productKey()
                : /^\/(browse|checkout)/.test(path)
                  ? 'browse'
                  : '';

  useEffect(() => {
    if (!supabaseConfigured) return;
    const sb = createClient();
    (async () => {
      const {
        data: { user },
      } = await sb.auth.getUser();
      if (!user) return setDash(undefined);
      const { data } = await sb.from('profiles').select('role').eq('id', user.id).single();
      setDash('/dashboard/' + (data?.role ?? 'buyer'));
    })();
  }, [path]);

  return <SiteNav active={active} dashHref={dash} />;
}
