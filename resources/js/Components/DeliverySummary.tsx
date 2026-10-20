import { usePage } from "@inertiajs/react";

type Method = {
  key: string; label: string; description: string; kind: string;
  price: number; price_mode: string; carrier_key: string;
  eta_min_days: number; eta_max_days: number; free_for_members: boolean;
};

export default function DeliverySummary() {
  const { storeSettings } = usePage<{
    storeSettings: { delivery: { methods: Method[]; carriers: { key: string; name: string }[] } };
  }>().props;
  const delivery = storeSettings?.delivery;

  return (
    <span className="block space-y-2">
      {(delivery?.methods ?? []).map((method) => {
        const carrier = delivery.carriers.find((item) => item.key === method.carrier_key);
        const price = method.price_mode === "live" ? "Priced at checkout"
          : Number(method.price) === 0 ? "Free" : `£${Number(method.price).toFixed(2)}`;
        const days = method.eta_min_days === method.eta_max_days
          ? `${method.eta_min_days}` : `${method.eta_min_days}–${method.eta_max_days}`;
        return (
          <span className="block" key={method.key}>
            <strong>{method.label}</strong> · {price}
            {carrier ? ` · ${carrier.name}` : ""}
            {method.kind === "timed" ? " · Choose an available date at checkout"
              : method.kind !== "collection" && method.eta_max_days > 0 ? ` · ${days} working days` : ""}
            {method.free_for_members && Number(method.price) > 0 ? " · Free for members" : ""}
          </span>
        );
      })}
      <span className="block text-xs">Availability and final delivery cost are confirmed for your address at checkout.</span>
    </span>
  );
}
