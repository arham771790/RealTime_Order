import { useQuery } from "@tanstack/react-query";

import { getOrders } from "../api/ordersApi.js";

export function useOrders(filters) {
  return useQuery({
    queryKey: ["orders", filters],
    queryFn: () => getOrders(filters),
    placeholderData: (previousData) => previousData ?? []
  });
}
