import { useCallback, useEffect, useState } from "react";
import { Tractor, MapPin, CalendarDays, IndianRupee } from "lucide-react";
import { api, errorMessage } from "../services/api";
import { PageHeader, Card, Pill, ErrorNote } from "../components/UI";
import type { Equipment as EquipmentItem, RentalResponse } from "../types";

export default function Equipment() {
  const [items, setItems] = useState<EquipmentItem[]>([]);
  const [days, setDays] = useState(1);
  const [location, setLocation] = useState("Idukki");
  const [selected, setSelected] = useState<EquipmentItem | null>(null);
  const [rental, setRental] = useState<RentalResponse | null>(null);
  const [error, setError] = useState("");

  const load = useCallback(() => {
    api.get<EquipmentItem[]>(`/equipment?location=${encodeURIComponent(location)}&days=${days}`)
      .then(setItems).catch((e) => setError(errorMessage(e)));
  }, [location, days]);
  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  async function rent() {
    if (!selected) return;
    try {
      const r = await api.post<RentalResponse>("/equipment/rent", {
        equipment_id: selected.id, farmer_name: "Demo Farmer",
        start_date: new Date().toISOString().slice(0, 10), days,
      });
      setRental(r); setSelected(null); load();
    } catch (e) { setError(errorMessage(e)); setSelected(null); }
  }

  return (
    <>
      <PageHeader eyebrow="RESOURCE SHARING" title="Equipment Rental"
        description="Find shared farm equipment and request a rental." />
      <Card title="Search equipment" icon={<Tractor />}>
        <div className="search-row">
          <input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Location" />
          <input type="number" min={1} max={60} value={days}
            onChange={(e) => setDays(Math.max(1, Number(e.target.value) || 1))} placeholder="Days" />
          <button className="primary-button" onClick={load}>Find Equipment</button>
        </div>
      </Card>
      <ErrorNote message={error} />

      {rental && <div className="success-box">✓ {rental.message}. Request ID: {rental.rental_id}</div>}

      <div className="cards-grid">
        {items.map((e) => (
          <Card key={e.id}>
            <div className="equipment-row">
              <div className="equipment-icon"><Tractor /></div>
              <div className="grow">
                <Pill>{e.category}</Pill><h2>{e.name}</h2>
                <p><MapPin size={14} /> {e.location} • {e.owner}</p><small>{e.description}</small>
              </div>
              <div className="equipment-price">
                <b>₹{e.daily_rate}</b><span>/day</span>
                <button className="secondary-button" onClick={() => setSelected(e)}>Rent</button>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {selected && (
        <div className="modal-backdrop" onClick={() => setSelected(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>Rent {selected.name}</h2>
            <p><CalendarDays size={15} /> {days} day(s)</p>
            <p><IndianRupee size={15} /> Estimated rental: ₹{selected.daily_rate * days + selected.deposit}</p>
            <div className="modal-actions">
              <button className="secondary-button" onClick={() => setSelected(null)}>Cancel</button>
              <button className="primary-button" onClick={rent}>Submit Request</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
