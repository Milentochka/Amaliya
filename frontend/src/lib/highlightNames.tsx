import React from "react";

// Longer forms first so the regex matches them in their full length
// before falling back to the short stem (e.g. «Матасянцев» before «Матасянц»).
const NAMES = [
  // Амалия
  "Амалии",
  "Амалию",
  "Амалией",
  "Амалия",
  // Милена
  "Миленой",
  "Милены",
  "Милене",
  "Милену",
  "Милена",
  // Микаел
  "Микаелом",
  "Микаела",
  "Микаелу",
  "Микаел",
  // Матасянц
  "Матасянцев",
  "Матасянцем",
  "Матасянцу",
  "Матасянц",
];

const REGEX = new RegExp(`(${NAMES.join("|")})`, "g");

/** Wraps Амалия / Милена / Микаел / Матасянц (and common cases) in a
 *  blush accent span. Default classes work on the cream/light background;
 *  pass `className` to override (e.g. for the dark projector). */
export function withNames(
  text: string | null | undefined,
  className = "font-semibold text-blush-600",
): React.ReactNode {
  if (!text) return text;
  const parts = text.split(REGEX);
  return parts.map((p, i) =>
    NAMES.includes(p) ? (
      <span key={i} className={className}>
        {p}
      </span>
    ) : (
      <React.Fragment key={i}>{p}</React.Fragment>
    ),
  );
}
