import { initials } from "@/lib/format";

export function Avatar({ title, color, small }: { title: string; color: string; small?: boolean }) {
  return (
    <div className={`ava${small ? " sm" : ""}`} style={{ background: `linear-gradient(135deg, ${color}, color-mix(in srgb, ${color} 62%, #000))` }}>
      {initials(title)}
    </div>
  );
}

export function StatusTag({ label, tone }: { label: string; tone: string }) {
  return <span className={`tag ${tone}`}>{label}</span>;
}
