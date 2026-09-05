import { useEffect, useState } from "react";

const fetcher = (url: string) =>
  fetch(url, { credentials: "include" }).then((res) => {
    if (!res.ok) return null;
    return res.json();
  });

export function useUser() {
  const [data, setData] = useState<unknown>(null);
  const [error, setError] = useState<unknown>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    fetcher("/api/user")
      .then((response) => {
        if (!isMounted) return;
        setData(response);
        setError(null);
      })
      .catch((err) => {
        if (!isMounted) return;
        setError(err);
      })
      .finally(() => {
        if (!isMounted) return;
        setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  return {
    user: data,
    isLoading,
    isSignedIn: !!data,
    error,
  };
}
