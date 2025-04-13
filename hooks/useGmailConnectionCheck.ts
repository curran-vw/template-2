import { useEffect, useRef } from "react";
import { gmailUtils } from "../firebase/gmail-utils";

/**
 * Hook to periodically check and fix inactive Gmail connections
 * @param workspaceId The workspace ID to check connections for
 * @param intervalMinutes How often to check (default: 60 minutes)
 * @returns An object with the current status of the connection check
 */
export function useGmailConnectionCheck(
  workspaceId: string,
  intervalMinutes = 60,
) {
  const intervalIdRef = useRef<NodeJS.Timeout | null>(null);
  const isCheckingRef = useRef(false);
  const lastCheckTimeRef = useRef<Date | null>(null);
  const lastCheckResultRef = useRef<any>(null);

  useEffect(() => {
    // Start the periodic check
    const startCheck = () => {
      if (isCheckingRef.current) return;

      isCheckingRef.current = true;

      gmailUtils
        .checkAndFixInactiveConnections(workspaceId)
        .then((result) => {
          lastCheckTimeRef.current = new Date();
          lastCheckResultRef.current = result;
        })
        .catch((error) => {
          console.error("Error checking Gmail connections:", error);
          lastCheckResultRef.current = { error: error.message };
        })
        .finally(() => {
          isCheckingRef.current = false;
        });
    };

    // Run immediately
    startCheck();

    // Set up interval
    intervalIdRef.current = setInterval(
      startCheck,
      intervalMinutes * 60 * 1000,
    );

    // Clean up on unmount
    return () => {
      if (intervalIdRef.current) {
        clearInterval(intervalIdRef.current);
      }
    };
  }, [workspaceId, intervalMinutes]);

  // Function to manually trigger a check
  const checkNow = () => {
    if (isCheckingRef.current) return;

    isCheckingRef.current = true;

    return gmailUtils
      .checkAndFixInactiveConnections(workspaceId)
      .then((result) => {
        lastCheckTimeRef.current = new Date();
        lastCheckResultRef.current = result;

        return result;
      })
      .catch((error) => {
        console.error("Error in manual Gmail connection check:", error);
        lastCheckResultRef.current = { error: error.message };
        throw error;
      })
      .finally(() => {
        isCheckingRef.current = false;
      });
  };

  return {
    isChecking: isCheckingRef.current,
    lastCheckTime: lastCheckTimeRef.current,
    lastCheckResult: lastCheckResultRef.current,
    checkNow,
  };
}
