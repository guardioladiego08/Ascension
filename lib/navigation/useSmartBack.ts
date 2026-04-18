import { useCallback } from 'react';
import { type Href, usePathname, useRouter } from 'expo-router';

import { useNavigationHistory } from '@/providers/NavigationHistoryProvider';

type SmartBackOptions = {
  fallbackHref?: Href | string;
  fallbackReplace?: boolean;
};

export function useSmartBack() {
  const router = useRouter();
  const pathname = usePathname();
  const { getPreviousRoute, popPreviousRoute } = useNavigationHistory();

  const peekPreviousRoute = useCallback(() => {
    const previous = getPreviousRoute();
    if (!previous || previous === pathname) return null;
    return previous;
  }, [getPreviousRoute, pathname]);

  const goBackSmart = useCallback(
    (options?: SmartBackOptions) => {
      const previous = popPreviousRoute();
      if (previous && previous !== pathname) {
        router.replace(previous as Href);
        return true;
      }

      if (router.canGoBack()) {
        router.back();
        return true;
      }

      if (options?.fallbackHref) {
        if (options.fallbackReplace ?? true) {
          router.replace(options.fallbackHref as Href);
        } else {
          router.push(options.fallbackHref as Href);
        }
        return true;
      }

      return false;
    },
    [pathname, popPreviousRoute, router]
  );

  return {
    goBackSmart,
    peekPreviousRoute,
  };
}

