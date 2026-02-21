import useSWR from "swr";

const fetcher = (url: string) =>
  fetch(url, { credentials: "include" }).then((res) => {
    if (!res.ok) return null;
    return res.json();
  });

export function useUser() {
  const { data, error, isLoading } = useSWR(
    "http://localhost/api/user",
    fetcher
  );

  return {
    user: data,
    isLoading,
    isSignedIn: !!data,
    error,
  };
}