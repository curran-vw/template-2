import { useWorkspaceContext } from "@/contexts/workspace-context";

export const useWorkspace = () => {
  const {
    workspace,
    setWorkspace,
    workspaces,
    setWorkspaces,
    agents,
    setAgents,
    agentsLoading,
    workspacesLoading,
  } = useWorkspaceContext();
  return {
    workspace,
    setWorkspace,
    workspaces,
    setWorkspaces,
    agents,
    setAgents,
    agentsLoading,
    workspacesLoading,
  };
};
