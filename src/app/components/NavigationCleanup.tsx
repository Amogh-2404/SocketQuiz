'use client';

import { useEffect } from 'react';

/**
 * A component that ensures all cleanup operations have time to complete
 * This uses a more gentle approach than a blocking while loop
 */
export default function NavigationCleanup() {
  useEffect(() => {
    // Add a beforeunload listener to help with cleanup
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      // Attempt to return a message to show a confirmation dialog
      // This gives a small window of time for cleanup functions
      e.preventDefault();
      e.returnValue = '';
      return '';
    };
    
    window.addEventListener('beforeunload', handleBeforeUnload);
    
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, []);
  
  return null;
} 