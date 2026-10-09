import 'server-only';
import { ALL_PRODUCTS } from './apps';
import type { Product } from './data';
import { getSettings } from './settings';
import { supabaseConfigured } from './supabase/env';

/*
 * The made-up starter listings ("examples"). An admin can hide them all in Settings once real sellers have listed enough.
 * They can be bought only in demo mode (no database, or LAUNCHBAY_DEMO=1) or when EXAMPLE_ORDERS=1 is set (the test server):
 * on the live site nobody may pay for a product that does not exist.
 */
export const examplesBuyable = () => !supabaseConfigured || process.env.EXAMPLE_ORDERS === '1';
export const showExamples = async () => (await getSettings()).showExamples;
export const starterProducts = async (): Promise<Product[]> => ((await showExamples()) ? ALL_PRODUCTS : []);
export const EXAMPLE_NOTE = 'This is an example listing. We made it to show how the shop works, so it cannot be bought.';
