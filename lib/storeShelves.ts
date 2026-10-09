import { shelfHref, shelfLabel, type Platform } from './apps';

/* The shelves a search can go to: the page address and its name. */
const ORDER: Platform[] = ['web', 'android', 'ios', 'webapp', 'desktop', 'digital'];
export const SHELF_OPTIONS: [href: string, label: string][] = ORDER.map((pl) => [shelfHref(pl), shelfLabel(pl)]);
