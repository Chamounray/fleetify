import type { DamageMark, DamageZone } from "@fleetify/shared";
import { DAMAGE_ZONES, DAMAGE_TYPES, DAMAGE_SEVERITIES } from "@fleetify/shared";
import { useMemo, useState } from "react";
import { Field, Select, Textarea } from "../../components/ui";

const labels: Record<DamageZone, string> = {
  frontBumper: "Front bumper",
  rearBumper: "Rear bumper",
  hood: "Hood",
  roof: "Roof",
  trunk: "Trunk",
  windshield: "Windshield",
  rearWindow: "Rear window",
  leftFrontDoor: "Left front door",
  leftRearDoor: "Left rear door",
  rightFrontDoor: "Right front door",
  rightRearDoor: "Right rear door",
  leftFrontTire: "Left front tire",
  leftRearTire: "Left rear tire",
  rightFrontTire: "Right front tire",
  rightRearTire: "Right rear tire",
};

const hotspots: Array<{ zone: DamageZone; x: number; y: number; w: number; h: number }> = [
  { zone: "frontBumper", x: 86, y: 38, w: 10, h: 24 },
  { zone: "hood", x: 68, y: 36, w: 16, h: 28 },
  { zone: "windshield", x: 56, y: 38, w: 10, h: 24 },
  { zone: "roof", x: 40, y: 38, w: 16, h: 24 },
  { zone: "rearWindow", x: 30, y: 40, w: 8, h: 20 },
  { zone: "trunk", x: 16, y: 38, w: 12, h: 24 },
  { zone: "rearBumper", x: 6, y: 38, w: 10, h: 24 },
  { zone: "leftFrontDoor", x: 52, y: 18, w: 18, h: 16 },
  { zone: "leftRearDoor", x: 32, y: 18, w: 18, h: 16 },
  { zone: "rightFrontDoor", x: 52, y: 66, w: 18, h: 16 },
  { zone: "rightRearDoor", x: 32, y: 66, w: 18, h: 16 },
  { zone: "leftFrontTire", x: 70, y: 10, w: 10, h: 10 },
  { zone: "leftRearTire", x: 20, y: 10, w: 10, h: 10 },
  { zone: "rightFrontTire", x: 70, y: 80, w: 10, h: 10 },
  { zone: "rightRearTire", x: 20, y: 80, w: 10, h: 10 },
];

export function DamageMatrix({
  value,
  onChange,
}: {
  value: DamageMark[];
  onChange: (next: DamageMark[]) => void;
}) {
  const [selected, setSelected] = useState<DamageZone>("frontBumper");
  const current = useMemo(() => value.find((item) => item.zone === selected), [selected, value]);

  function upsert(patch: Partial<DamageMark>) {
    const existing = value.find((item) => item.zone === selected);
    if (!existing) {
      onChange([...value, { zone: selected, type: "scratch", severity: "minor", notes: "", ...patch }]);
      return;
    }
    onChange(value.map((item) => (item.zone === selected ? { ...item, ...patch } : item)));
  }

  function clearZone() {
    onChange(value.filter((item) => item.zone !== selected));
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[1.2fr_1fr]">
      <svg viewBox="0 0 100 100" role="img" aria-label="Vehicle damage diagram" className="w-full rounded-xl bg-slate-100 dark:bg-white/5">
        <rect x="12" y="30" width="76" height="40" rx="12" fill="#cbd5e1" />
        {hotspots.map((spot) => {
          const marked = value.some((item) => item.zone === spot.zone);
          return (
            <rect
              key={spot.zone}
              x={spot.x}
              y={spot.y}
              width={spot.w}
              height={spot.h}
              rx="2"
              tabIndex={0}
              role="button"
              aria-label={labels[spot.zone]}
              className="cursor-pointer"
              fill={selected === spot.zone ? "#0369a1" : marked ? "#b45309" : "#94a3b8"}
              onClick={() => setSelected(spot.zone)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  setSelected(spot.zone);
                }
              }}
            />
          );
        })}
      </svg>
      <div className="grid gap-3">
        <p className="text-sm font-medium">{labels[selected]}</p>
        <Field label="Damage type" id="dtype">
          <Select id="dtype" value={current?.type ?? ""} onChange={(e) => upsert({ type: e.target.value as DamageMark["type"] })}>
            <option value="">None</option>
            {DAMAGE_TYPES.map((type) => <option key={type} value={type}>{type}</option>)}
          </Select>
        </Field>
        <Field label="Severity" id="sev">
          <Select id="sev" value={current?.severity ?? "minor"} onChange={(e) => upsert({ severity: e.target.value as DamageMark["severity"] })}>
            {DAMAGE_SEVERITIES.map((sev) => <option key={sev} value={sev}>{sev}</option>)}
          </Select>
        </Field>
        <Field label="Notes" id="dnotes">
          <Textarea id="dnotes" value={current?.notes ?? ""} onChange={(e) => upsert({ notes: e.target.value })} />
        </Field>
        <button type="button" className="cursor-pointer text-left text-sm text-action" onClick={clearZone}>
          Clear this zone
        </button>
        <p className="text-xs text-slate-500">{value.length} marked zone(s). Color plus label identify status.</p>
      </div>
    </div>
  );
}

export { DAMAGE_ZONES, labels as damageZoneLabels };
