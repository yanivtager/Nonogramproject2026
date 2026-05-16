import type { TemplateId } from "../data/types.js";

export const DEFAULT_TRACK_ID_PER_TEMPLATE: Record<TemplateId, string> = {
  "scale-shock": "volatile-reaction",
  "collection-showcase": "carpe-diem",
  "print-ritual-real": "kevin-macleod-horroriffic",
  // Excluded templates retain a placeholder so the type is exhaustive; the seeder filters them out.
  "before-after": "carpe-diem",
  "solve-reveal": "investigations",
  "print-ritual": "life-of-riley",
};

export const SHIPPABLE_TEMPLATES: TemplateId[] = [
  "scale-shock",
  "collection-showcase",
  "print-ritual-real",
];
