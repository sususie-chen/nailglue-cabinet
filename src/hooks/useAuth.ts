import { useCallback, useMemo } from "react";
import { trpc } from "@/providers/trpc";

export interface UnifiedUser {
  id: number;
  name: string;
  email?: string | null;
  avatar?: string | null;
  role?: string;
}

function setToken(token: string) {
  localStorage.setItem("nail_auth_token", token);
}

function removeToken() {
  localStorage.removeItem("nail_auth_token");
}

export function useAuth() {
  const utils = trpc.useUtils();
  const {
    data: user,
    isLoading: userLoading,
    error,
  } = trpc.auth.me.useQuery(undefined, {
    retry: false,
    refetchOnWindowFocus: true,
  });

  const loginMutation = trpc.auth.login.useMutation({
    onSuccess: (data) => {
      if (data.token) {
        setToken(data.token);
        utils.invalidate();
      }
    },
  });

  const logoutMutation = trpc.auth.logout.useMutation({
    onSuccess: () => {
      removeToken();
      utils.invalidate();
      window.location.reload();
    },
  });

  const isAuthenticated = useMemo(() => {
    return !!user && !error;
  }, [user, error]);

  const isLoading = userLoading;

  const unifiedUser: UnifiedUser | null = useMemo(() => {
    if (!user) return null;
    return {
      id: user.id,
      name: user.name || "用户",
      email: user.email,
      avatar: user.avatar,
      role: user.role || "user",
    };
  }, [user]);

  const login = useCallback(
    async (username: string, password?: string) => {
      await loginMutation.mutateAsync({ username, password });
    },
    [loginMutation]
  );

  const logout = useCallback(() => {
    removeToken();
    logoutMutation.mutate();
  }, [logoutMutation]);

  return {
    user: unifiedUser,
    isAuthenticated,
    isLoading,
    isAdmin: unifiedUser?.role === "admin",
    login,
    logout,
  };
}
