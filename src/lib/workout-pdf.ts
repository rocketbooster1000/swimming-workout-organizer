import jsPDF from "jspdf";
import {
  formatInterval,
  isGroup,
  isRest,
  itemDistance,
  itemSeconds,
  type SectionItem,
  type Workout,
} from "./workout";

function fmtTime(s: number): string {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return `${h}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}

function fmtInterval(s?: number | null): string {
  if (!s) return "0:00:00";
  return fmtTime(s);
}

function renderItem(item: SectionItem, indent: number, lines: string[]) {
  const pad = "  ".repeat(indent);
  if (isRest(item)) {
    lines.push(`${pad}0 x 0 @ ${fmtInterval(item.seconds)} Rest ${item.label ?? ""}`.trimEnd());
    return;
  }
  if (isGroup(item)) {
    const label = item.label ? ` ${item.label}` : "";
    lines.push(`${pad}${item.rounds || 1} x {${label}`);
    for (const child of item.children) renderItem(child, indent + 1, lines);
    lines.push(`${pad}}`);
    return;
  }
  const stroke = item.stroke ? ` ${item.stroke}` : "";
  const desc = item.description ? ` ${item.description}` : "";
  lines.push(
    `${pad}${item.reps} x ${item.distance} @ ${fmtInterval(item.interval_seconds)}${stroke}${desc}`.trimEnd(),
  );
}

export function buildWorkoutLines(workout: Workout): string[] {
  const lines: string[] = [];
  let cumDist = 0;
  let cumSec = 0;
  for (const item of workout.sets) {
    const block: string[] = [];
    renderItem(item, 0, block);
    const d = itemDistance(item);
    const t = itemSeconds(item);
    cumDist += d;
    cumSec += t;
    for (const l of block) lines.push(l);
    lines.push("");
    lines.push(`Distance: ${d}/${cumDist} | Time: ${fmtTime(t)}/${fmtTime(cumSec)}`);
    lines.push("");
  }
  return lines;
}

export function downloadWorkoutPdf(workout: Workout) {
  const doc = new jsPDF({ unit: "pt", format: "letter" });
  const marginX = 54;
  let y = 64;
  const lineHeight = 14;
  const pageHeight = doc.internal.pageSize.getHeight();
  const pageWidth = doc.internal.pageSize.getWidth();
  const maxWidth = pageWidth - marginX * 2;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text(workout.title || "Workout", marginX, y);
  y += 22;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  const meta = [
    workout.focus ? `Focus: ${workout.focus}` : null,
    workout.pool_unit ? `Course: ${workout.pool_unit.toUpperCase()}` : null,
  ]
    .filter(Boolean)
    .join("  •  ");
  if (meta) {
    doc.text(meta, marginX, y);
    y += 18;
  }

  doc.setFont("courier", "normal");
  doc.setFontSize(11);

  const lines = buildWorkoutLines(workout);
  for (const raw of lines) {
    const wrapped = doc.splitTextToSize(raw === "" ? " " : raw, maxWidth);
    for (const w of wrapped) {
      if (y > pageHeight - 54) {
        doc.addPage();
        y = 64;
      }
      doc.text(w, marginX, y);
      y += lineHeight;
    }
  }

  const safe = (workout.title || "workout").replace(/[^a-z0-9-_]+/gi, "_").toLowerCase();
  doc.save(`${safe}.pdf`);
}

// keep formatInterval reachable for potential future use
void formatInterval;
