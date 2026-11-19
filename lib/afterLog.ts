import { countLog, shouldAsk } from './rating';
import { useStore } from './store';

/** Called after every logged expense. A "win" is a day that is still under its allowance. */
export async function afterLog(win: boolean) {
  await countLog();
  if (await shouldAsk(win)) setTimeout(() => useStore.getState().setRatingPrompt(true), 1600);
}

/** Opens the paywall when a Pro feature is used by a free member. Returns true when allowed. */
export function requirePro(router: { push: (h: any) => void }, feature: string) {
  if (useStore.getState().pro) return true;
  router.push({ pathname: '/paywall', params: { from: feature } });
  return false;
}
