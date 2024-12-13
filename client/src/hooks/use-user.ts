import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { User } from "@db/schema";

interface LoginData {
  username: string;
  password: string;
  name?: string;
  email?: string;
}

type RequestResult = {
  ok: true;
} | {
  ok: false;
  message: string;
};

async function handleRequest(
  url: string,
  method: string,
  body?: LoginData
): Promise<RequestResult> {
  try {
    const response = await fetch(url, {
      method,
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json"
      },
      body: body ? JSON.stringify(body) : undefined,
      credentials: "include",
    });

    const contentType = response.headers.get("content-type");
    const isJson = contentType && contentType.includes("application/json");
    
    if (!response.ok) {
      if (response.status >= 500) {
        return { ok: false, message: "Server error occurred" };
      }

      const message = isJson ? (await response.json()).message : await response.text();
      return { ok: false, message };
    }

    if (isJson) {
      const data = await response.json();
      return { ok: true, ...data };
    }

    return { ok: true };
  } catch (e: any) {
    console.error("Request error:", e);
    return { ok: false, message: "Network error occurred" };
  }
}

async function fetchUser(): Promise<User | null> {
  const response = await fetch('/api/user', {
    credentials: 'include'
  });

  if (!response.ok) {
    if (response.status === 401) {
      return null;
    }

    if (response.status >= 500) {
      throw new Error(`${response.status}: ${response.statusText}`);
    }

    throw new Error(`${response.status}: ${await response.text()}`);
  }

  return response.json();
}

export function useUser() {
  const queryClient = useQueryClient();

  const { data: user, error, isLoading } = useQuery<User | null, Error>({
    queryKey: ['/api/user'],
    queryFn: fetchUser,
    staleTime: 0,
    retry: false,
    refetchOnWindowFocus: true
  });

  const loginMutation = useMutation<RequestResult, Error, LoginData>({
    mutationFn: (userData) => handleRequest('/api/login', 'POST', userData),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/user'] });
      return data;
    },
  });

  const logoutMutation = useMutation<RequestResult, Error>({
    mutationFn: () => handleRequest('/api/logout', 'POST'),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/user'] });
      return data;
    },
  });

  const registerMutation = useMutation<RequestResult, Error, LoginData>({
    mutationFn: (userData) => handleRequest('/api/register', 'POST', userData),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/user'] });
      return data;
    },
  });

  return {
    user,
    isLoading,
    error,
    login: loginMutation.mutateAsync,
    logout: logoutMutation.mutateAsync,
    register: registerMutation.mutateAsync,
  };
}
