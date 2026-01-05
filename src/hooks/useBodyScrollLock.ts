import { useEffect, useRef } from 'react';

let lockCount = 0;

export const useBodyScrollLock = (isLocked: boolean) => {
  const prevIsLockedRef = useRef(false);

  useEffect(() => {
    const wasLocked = prevIsLockedRef.current;
    const isNowLocked = isLocked;
    let didAcquire = false;

    if (wasLocked === isNowLocked) {
      return;
    }

    if (isNowLocked && !wasLocked) {
      lockCount++;
      didAcquire = true;
      if (lockCount === 1) {
        const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
        document.body.style.overflow = 'hidden';
        document.body.style.paddingRight = `${scrollbarWidth}px`;
      }
    }

    prevIsLockedRef.current = isNowLocked;

    return () => {
      if (didAcquire && lockCount > 0) {
        lockCount--;
        if (lockCount === 0) {
          document.body.style.overflow = '';
          document.body.style.paddingRight = '';
        }
      }
    };
  }, [isLocked]);
};
