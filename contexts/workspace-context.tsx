"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { Workspace } from "../types/workspace";
import { WelcomeAgent } from "../types/welcome-agent";
import { getWorkspaceWelcomeAgents } from "@/firebase/welcome-agent-utils";
import { useQuery } from "@tanstack/react-query";
import { auth } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { getUserWorkspaces } from "@/firebase/workspace-utils";

interface WorkspaceContextType {
  workspace: Workspace | null;
  setWorkspace: (workspace: Workspace | null) => void;
  workspaces: Workspace[];
  setWorkspaces: (workspaces: Workspace[]) => void;
  agents: WelcomeAgent[];
  setAgents: (agents: WelcomeAgent[]) => void;
  agentsLoading: boolean;
  workspacesLoading: boolean;
}

const WORKSPACE_STORAGE_KEY = "currentWorkspace";

export function WorkspaceProvider({ children }: { children: React.ReactNode }) {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [workspace, setWorkspaceState] = useState<Workspace | null>(null);
  const [agents, setAgents] = useState<WelcomeAgent[]>([]);
  const [agentsLoading, setAgentsLoading] = useState(true);
  const [workspacesLoading, setWorkspacesLoading] = useState(true);

  // Custom setter that also updates localStorage
  const setWorkspace = (newWorkspace: Workspace | null) => {
    setWorkspaceState(newWorkspace);
    if (newWorkspace) {
      localStorage.setItem(WORKSPACE_STORAGE_KEY, JSON.stringify(newWorkspace));
    } else {
      localStorage.removeItem(WORKSPACE_STORAGE_KEY);
    }
  };

  // Set workspaces and restore the current workspace from localStorage
  const handleSetWorkspaces = (newWorkspaces: Workspace[]) => {
    setWorkspaces(newWorkspaces);

    if (newWorkspaces.length > 0) {
      // Try to get the saved workspace from localStorage
      const savedWorkspaceJson = localStorage.getItem(WORKSPACE_STORAGE_KEY);

      if (savedWorkspaceJson) {
        try {
          const savedWorkspace = JSON.parse(savedWorkspaceJson);
          // Check if the saved workspace still exists in the new workspaces
          const workspaceExists = newWorkspaces.some((w) => w.id === savedWorkspace.id);

          if (workspaceExists) {
            // Find the full workspace object with updated data
            const currentWorkspace = newWorkspaces.find((w) => w.id === savedWorkspace.id) || null;
            setWorkspaceState(currentWorkspace);
          } else {
            // If saved workspace no longer exists, use the first one
            setWorkspace(newWorkspaces[0]);
          }
        } catch (error) {
          // If there's an error parsing, use the first workspace
          setWorkspace(newWorkspaces[0]);
        }
      } else {
        // If no saved workspace, use the first one
        setWorkspace(newWorkspaces[0]);
      }
    } else {
      // If there are no workspaces, clear the current workspace
      setWorkspace(null);
    }
  };

  const { data: agentsData } = useQuery({
    queryKey: ["workspace-agents", workspace?.id],
    queryFn: async () => {
      setAgentsLoading(true);
      if (!workspace) return { agents: [] };
      return await getWorkspaceWelcomeAgents({ workspaceId: workspace.id });
    },

    enabled: !!workspace,
  });

  useEffect(() => {
    if (agentsData) {
      setAgents(agentsData.agents);
      setAgentsLoading(false);
    }
  }, [agentsData]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const { workspaces } = await getUserWorkspaces();
        setWorkspaces(workspaces);
        handleSetWorkspaces(workspaces);
        setWorkspacesLoading(false);
      }
    });

    return () => {
      unsubscribe();
    };
  }, []);

  return (
    <WorkspaceContext.Provider
      value={{
        workspace,
        setWorkspace,
        workspaces,
        setWorkspaces: handleSetWorkspaces,
        agents,
        setAgents,
        agentsLoading,
        workspacesLoading,
      }}
    >
      {children}
    </WorkspaceContext.Provider>
  );
}

export const WorkspaceContext = createContext<WorkspaceContextType | null>(null);
export const useWorkspaceContext = () => {
  const context = useContext(WorkspaceContext);
  if (!context) {
    throw new Error("useWorkspaceContext must be used within a WorkspaceProvider");
  }
  return context;
};
