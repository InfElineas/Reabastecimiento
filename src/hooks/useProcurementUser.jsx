import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";

export function useProcurementUser() {
  const { data: user, isLoading } = useQuery({
    queryKey: ["current-user"],
    queryFn: () => base44.auth.me(),
    staleTime: 60000,
  });

  const isAdmin = ["admin", "supervisor"].includes(user?.role);
  const isComercial = user?.role === "comercial";

  // Returns filter object for entity queries (isolates comercial to own records)
  const getOwnerFilter = () => {
    if (isAdmin || !user) return null; // null = no filter (fetch all)
    return { created_by: user.email };
  };

  return { user, isLoading, isAdmin, isComercial, getOwnerFilter };
}