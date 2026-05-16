import { createHash } from "node:crypto";

export type ProductType = "single" | "series-bundle" | "mega-bundle";
export type TemplateId = "scale-shock" | "solve-reveal" | "before-after" | "print-ritual" | "print-ritual-real" | "collection-showcase";
export type ArtworkAssetKind = "solution" | "cover" | "index" | "other";
export type ArtworkAssetRole = "hero" | "representative" | "cover" | "index";
export type ArtworkSelectionMode = "hero-only" | "representative-set" | "series-cover-set";

export interface SourceArtworkAsset {
  file: string;
  url: string;
  localPath?: string;
}

export interface SourceArtworkManifest {
  covers: SourceArtworkAsset[];
  solutions: SourceArtworkAsset[];
}

export interface ArtworkAsset {
  asset_id: string;
  listing_id: string;
  asset_role: ArtworkAssetRole;
  asset_kind: ArtworkAssetKind;
  file_name: string;
  local_path: string | null;
  storage_path: string;
  public_url: string;
  title: string;
  tags: string[];
  source_manifest: string;
}

export interface ArtworkSelectionItem {
  asset_id: string;
  display_order: number;
  segment_role: "hero" | "opening" | "variety" | "payoff" | "series-cover";
  crop_hint_json: Record<string, unknown>;
  motion_hint_json: Record<string, unknown>;
  rationale: string;
}

export interface ArtworkSelectionSet {
  selection_version: string;
  listing_id: string;
  product_type: ProductType;
  selection_mode: ArtworkSelectionMode;
  template_scope: string[];
  platform_scope: string[];
  language_scope: string[];
  recommended_asset_count: number;
  status: "proposed";
  rationale: string;
  evidence_json: Record<string, unknown>;
  items: ArtworkSelectionItem[];
}

export interface ArtworkSelectionRecipeContext {
  listing_id: string;
  template_id: TemplateId;
  language_code: string;
  voice_id: string;
  track_title: string;
  track_mood?: string | null;
}

export interface ArtworkV1Manifest {
  generated_at: string;
  selection_version: string;
  assets: ArtworkAsset[];
  selections: ArtworkSelectionSet[];
}

const DEFAULT_PLATFORMS = ["tiktok", "reels", "shorts"];
const DEFAULT_LANGUAGES = ["en", "es", "ja", "pt-BR"];

const LISTING_PRODUCT_TYPES: Record<string, ProductType> = {
  "cafe-serenade": "single",
  "dragons-wrath": "single",
  "frozen-gaze": "single",
  "titanic-series": "series-bundle",
  "colossus-series": "series-bundle",
  "behemoth-series": "series-bundle",
  "ultimate-bundle": "mega-bundle",
};

const LISTING_TEMPLATE_SCOPE: Record<string, string[]> = {
  "cafe-serenade": ["print-ritual", "scale-shock"],
  "dragons-wrath": ["solve-reveal", "before-after"],
  "frozen-gaze": ["solve-reveal"],
  "titanic-series": ["solve-reveal", "before-after"],
  "colossus-series": ["scale-shock", "solve-reveal", "collection-showcase"],
  "behemoth-series": ["scale-shock", "collection-showcase"],
  "ultimate-bundle": ["scale-shock", "before-after", "collection-showcase"],
};

const SERIES_SELECTION_PROFILES: Record<string, Array<{ role: ArtworkSelectionItem["segment_role"]; tags: string[]; note: string }>> = {
  "titanic-series": [
    { role: "opening", tags: ["dragon", "rider"], note: "high-impact fantasy creature hook" },
    { role: "variety", tags: ["library", "glow"], note: "interior scene contrast and warm visual texture" },
    { role: "payoff", tags: ["moonlit", "enchantment"], note: "romantic night-scene payoff for subject variety" },
  ],
  "colossus-series": [
    { role: "opening", tags: ["savannah", "majesty"], note: "wildlife/landscape hook with broad Etsy appeal" },
    { role: "variety", tags: ["peaks"], note: "landscape-scale contrast against animal subjects" },
    { role: "payoff", tags: ["sentinel"], note: "strong final wildlife subject and clear silhouette" },
  ],
  "behemoth-series": [
    { role: "opening", tags: ["ballroom", "elegance"], note: "human/occasion scene with polished first impression" },
    { role: "variety", tags: ["bistro", "nights"], note: "cozy place scene for subject contrast" },
    { role: "payoff", tags: ["moonlit", "serenade"], note: "night/romance scene that keeps the sequence from feeling repetitive" },
  ],
};

const ULTIMATE_SELECTION_PROFILES = [
  { role: "opening" as const, listingId: "titanic-series", tags: ["dragon", "rider"], note: "fantasy action subject for the first book" },
  { role: "variety" as const, listingId: "colossus-series", tags: ["savannah", "majesty"], note: "wildlife/landscape subject for book-to-book contrast" },
  { role: "payoff" as const, listingId: "behemoth-series", tags: ["ballroom", "elegance"], note: "people/place subject to show the bundle is not one-note" },
];

export function buildArtworkV1Manifest(
  source: SourceArtworkManifest,
  generatedAt: string,
  selectionVersion = "artwork-v1",
): ArtworkV1Manifest {
  const assets = normalizeAssets(source);
  const selections = Object.keys(LISTING_PRODUCT_TYPES).map((listingId) =>
    buildSelectionForListing(listingId, assets, selectionVersion),
  );

  return {
    generated_at: generatedAt,
    selection_version: selectionVersion,
    assets,
    selections,
  };
}

export function buildSelectionForListing(
  listingId: string,
  assets: ArtworkAsset[],
  selectionVersion = "artwork-v1",
): ArtworkSelectionSet {
  const productType = LISTING_PRODUCT_TYPES[listingId];
  if (!productType) throw new Error(`Unknown listing for artwork selection: ${listingId}`);

  if (productType === "single") {
    const hero = requireSingleHero(listingId, assets);
    return selectionSet({
      selectionVersion,
      listingId,
      productType,
      selectionMode: "hero-only",
      rationale: "Singles use the one solved hero artwork only; no invented alternate artwork.",
      evidenceScope: "Step 6 singles hero-only rule",
      items: [
        {
          asset_id: hero.asset_id,
          display_order: 1,
          segment_role: "hero",
          crop_hint_json: { fit: "cover", protect_subject: true },
          motion_hint_json: { camera: "slow_push_or_reveal", max_assets: 1 },
          rationale: "Single listing V1 uses its exact solved artwork as the tracked hero asset.",
        },
      ],
    });
  }

  if (productType === "mega-bundle") {
    const representatives = ULTIMATE_SELECTION_PROFILES.map((profile) => ({
      profile,
      asset: selectBestAsset(assets.filter((asset) => asset.listing_id === profile.listingId && asset.asset_kind === "solution"), profile.tags),
    }));
    return selectionSet({
      selectionVersion,
      listingId,
      productType,
      selectionMode: "representative-set",
      rationale:
        "Mega-bundle selection uses one solved representative from each included book, with subject variety across fantasy, wildlife, and people/place scenes.",
      evidenceScope: "Step 7 V3 research-backed selector: one included book per beat, solved art only, varied subjects and shapes where the product permits it",
      items: representatives.map(({ asset, profile }, index) => ({
        asset_id: asset.asset_id,
        display_order: index + 1,
        segment_role: profile.role,
        crop_hint_json: { fit: "contain", protect_subject: true, shape_strategy: "vary_by_included_book" },
        motion_hint_json: { camera: "detail_to_full_art", sequence: "one_at_a_time" },
        rationale: `Solved representative from ${profile.listingId}; ${profile.note}.`,
      })),
    });
  }

  const profiles = SERIES_SELECTION_PROFILES[listingId] ?? [];
  const representatives = profiles.map((profile) => ({
    profile,
    asset: selectBestAsset(assets.filter((asset) => asset.listing_id === listingId && asset.asset_kind === "solution"), profile.tags),
  }));
  if (representatives.length !== 3) {
    throw new Error(`Expected 3 representative assets for ${listingId}; found ${representatives.length}.`);
  }

  return selectionSet({
    selectionVersion,
    listingId,
    productType,
    selectionMode: "representative-set",
    rationale:
      "Series bundle selection uses three solved artworks with deliberate subject variety; shape variety is used only when the product/book supplies it.",
    evidenceScope: "Step 7 V3 research-backed selector: short-form bundle proofs need quick variety, clear subjects, and no cover/divider placeholders",
    items: representatives.map(({ asset, profile }, index) => ({
      asset_id: asset.asset_id,
      display_order: index + 1,
      segment_role: profile.role,
      crop_hint_json: { fit: "contain", protect_subject: true, shape_strategy: "preserve_listing_grid_shape" },
      motion_hint_json: { camera: "detail_to_full_art", sequence: "one_at_a_time" },
      rationale: `Chosen for ${profile.role} beat: ${profile.note}.`,
    })),
  });
}

export function buildSelectionForRecipe(
  context: ArtworkSelectionRecipeContext,
  assets: ArtworkAsset[],
  selectionVersion = "artwork-recipe-v1",
): ArtworkSelectionSet {
  const productType = LISTING_PRODUCT_TYPES[context.listing_id];
  if (!productType) throw new Error(`Unknown listing for artwork selection: ${context.listing_id}`);
  if (!(LISTING_TEMPLATE_SCOPE[context.listing_id] ?? []).includes(context.template_id)) {
    throw new Error(`Template ${context.template_id} is not in scope for ${context.listing_id}`);
  }

  if (productType === "single") {
    const hero = requireSingleHero(context.listing_id, assets);
    return selectionSet({
      selectionVersion,
      listingId: context.listing_id,
      productType,
      selectionMode: "hero-only",
      rationale: "Single-listing recipe selection uses the exact solved hero artwork; no invented alternate artwork.",
      evidenceScope: "Recipe-aware selector: singles use the tracked solved hero asset only.",
      recipeContext: context,
      selectorScoring: scoringForContext(context, productType),
      items: [
        {
          asset_id: hero.asset_id,
          display_order: 1,
          segment_role: "hero",
          crop_hint_json: cropHintForContext(context, "single"),
          motion_hint_json: motionHintForContext(context),
          rationale: `Chosen for ${context.template_id}: exact solved hero artwork for ${context.listing_id}.`,
        },
      ],
    });
  }

  const representatives =
    productType === "mega-bundle"
      ? selectMegaRepresentatives(context, assets)
      : selectSeriesRepresentatives(context, assets);

  return selectionSet({
    selectionVersion,
    listingId: context.listing_id,
    productType,
    selectionMode: "representative-set",
    rationale: rationaleForContext(context, productType),
    evidenceScope:
      "Recipe-aware selector: art is selected against template objective, music mood, narrator/language context, subject variety, shape policy, and mobile legibility.",
    recipeContext: context,
    selectorScoring: scoringForContext(context, productType),
    items: representatives.map(({ asset, role, note }, index) => ({
      asset_id: asset.asset_id,
      display_order: index + 1,
      segment_role: role,
      crop_hint_json: cropHintForContext(context, productType, asset),
      motion_hint_json: motionHintForContext(context),
      rationale: note,
    })),
  });
}

export function normalizeAssets(source: SourceArtworkManifest): ArtworkAsset[] {
  const covers = source.covers.map((asset) => normalizeAsset(asset, "cover"));
  const solutions = source.solutions.map((asset) => normalizeAsset(asset, "solution"));
  return [...covers, ...solutions].sort((a, b) => a.asset_id.localeCompare(b.asset_id));
}

function selectionSet(input: {
  selectionVersion: string;
  listingId: string;
  productType: ProductType;
  selectionMode: ArtworkSelectionMode;
  rationale: string;
  evidenceScope: string;
  items: ArtworkSelectionItem[];
  recipeContext?: ArtworkSelectionRecipeContext;
  selectorScoring?: Record<string, unknown>;
}): ArtworkSelectionSet {
  return {
    selection_version: input.selectionVersion,
    listing_id: input.listingId,
    product_type: input.productType,
    selection_mode: input.selectionMode,
    template_scope: LISTING_TEMPLATE_SCOPE[input.listingId] ?? [],
    platform_scope: DEFAULT_PLATFORMS,
    language_scope: DEFAULT_LANGUAGES,
    recommended_asset_count: input.items.length,
    status: "proposed",
    rationale: input.rationale,
    evidence_json: {
      source_docs: [
        "docs/marketing-plans/2026-05-13-grandgrid-video-technical-plan.md",
        "docs/marketing-plans/2026-05-13-step4-research-evidence-ledger.md",
        "docs/marketing-plans/2026-05-14-step7-v3-template-artwork-research.md",
      ],
      evidence_scope: input.evidenceScope,
      selector_prompt:
        "Choose solved nonogram artwork for a short-form Etsy video by matching listing, product type, template goal, language/narrator context, subject variety, shape variety, and the need for fast mobile legibility.",
      variety_policy:
        "Prefer varied subjects and varied shapes where the product permits it; do not force all vertical, all horizontal, or all square artwork unless research or the listing's actual grid constraints require it.",
      requires_yaniv_review: input.productType !== "single",
      recipe_context_json: input.recipeContext ?? null,
      selector_scoring_json: input.selectorScoring ?? null,
    },
    items: input.items,
  };
}

function selectSeriesRepresentatives(
  context: ArtworkSelectionRecipeContext,
  assets: ArtworkAsset[],
): Array<{ asset: ArtworkAsset; role: ArtworkSelectionItem["segment_role"]; note: string }> {
  const profiles = SERIES_SELECTION_PROFILES[context.listing_id] ?? [];
  if (profiles.length !== 3) {
    throw new Error(`Expected 3 representative profiles for ${context.listing_id}; found ${profiles.length}.`);
  }

  return profiles.map((profile) => ({
    asset: selectBestAsset(
      assets.filter((asset) => asset.listing_id === context.listing_id && asset.asset_kind === "solution"),
      profile.tags,
    ),
    role: profile.role,
    note: contextualItemNote(context, profile.role, profile.note),
  }));
}

function selectMegaRepresentatives(
  context: ArtworkSelectionRecipeContext,
  assets: ArtworkAsset[],
): Array<{ asset: ArtworkAsset; role: ArtworkSelectionItem["segment_role"]; note: string }> {
  return ULTIMATE_SELECTION_PROFILES.map((profile) => ({
    asset: selectBestAsset(
      assets.filter((asset) => asset.listing_id === profile.listingId && asset.asset_kind === "solution"),
      profile.tags,
    ),
    role: profile.role,
    note:
      context.template_id === "scale-shock"
        ? `Solved representative from ${profile.listingId}; preserves the mega-bundle scale ladder and supports axis-aware scan while adding ${profile.note}.`
        : `Solved representative from ${profile.listingId}; supports Collection Showcase variety with ${profile.note}.`,
  }));
}

function rationaleForContext(context: ArtworkSelectionRecipeContext, productType: ProductType): string {
  if (context.template_id === "scale-shock") {
    return productType === "mega-bundle"
      ? "Mega-bundle Scale Shock selection uses one solved representative per included book so the edit can show escalating grid scale and varied subject matter."
      : "Series-bundle Scale Shock selection uses solved representatives that can support detail-to-full-art camera motion without repeating one subject type.";
  }

  if (context.template_id === "collection-showcase") {
    return "Collection Showcase selection uses solved representatives with fast subject variety, shaped for a browse-and-discover edit under the approved music/narrator pairing.";
  }

  return "Recipe-aware selection uses solved representatives matched to the template objective, mobile legibility, and subject variety.";
}

function scoringForContext(context: ArtworkSelectionRecipeContext, productType: ProductType): Record<string, unknown> {
  return {
    template_objective:
      context.template_id === "scale-shock"
        ? "make grid size feel large through detail-to-full-art motion"
        : context.template_id === "collection-showcase"
          ? "show breadth and visual variety across the collection"
          : "support the template's solved-art payoff",
    product_rule:
      productType === "mega-bundle"
        ? "choose one solved representative from each included book"
        : productType === "series-bundle"
          ? "choose three solved representatives with subject contrast"
          : "use the exact solved hero artwork",
    music_fit:
      context.template_id === "collection-showcase"
        ? `${context.track_title} supports a lighter browse-and-discover rhythm when mixed below narration.`
        : `${context.track_title} supports scale/impact pacing for the template.`,
    narrator_fit: `${context.voice_id} / ${context.language_code} remains part of the review context; native QA is still required for Japanese shipping decisions.`,
    variety_policy:
      "Prefer varied subjects and shapes where available; do not force one orientation unless research or actual product constraints require it.",
    mobile_legibility: "Prefer clear solved-art subjects that read quickly in 9:16 short-form video.",
  };
}

function cropHintForContext(
  context: ArtworkSelectionRecipeContext,
  productType: ProductType | "single",
  asset?: ArtworkAsset,
): Record<string, unknown> {
  const focusWindow = asset ? focusWindowForContext(context, asset) : null;
  if (context.template_id === "scale-shock") {
    return {
      fit: productType === "single" ? "cover" : "contain",
      protect_subject: true,
      protect_clue_area: false,
      camera_start: context.listing_id === "ultimate-bundle" ? "center_art_first" : "shape_aware_detail",
      shape_strategy: productType === "mega-bundle" ? "vary_by_included_book" : "preserve_listing_grid_shape",
      focus_window_json: focusWindow,
    };
  }

  return {
    fit: productType === "single" ? "cover" : "contain",
    protect_subject: true,
    shape_strategy: productType === "mega-bundle" ? "vary_by_included_book" : "preserve_listing_grid_shape",
    focus_window_json: null,
  };
}

function focusWindowForContext(
  context: ArtworkSelectionRecipeContext,
  asset: ArtworkAsset,
): { x: number; startY: number; endY: number; zoom: number; mode: string } | null {
  if (context.template_id !== "scale-shock") return null;
  if (asset.file_name !== "colossus_05_savannah_majesty.png") return null;

  return {
    x: 0.74,
    startY: 0.54,
    endY: 0.74,
    zoom: 1.22,
    mode: "savannah_art_body_vertical_scan",
  };
}

function motionHintForContext(context: ArtworkSelectionRecipeContext): Record<string, unknown> {
  if (context.template_id === "scale-shock") {
    return {
      camera: "axis_aware_detail_to_full_art",
      horizontal_art: "left_to_right_or_reverse",
      vertical_or_square_art: context.listing_id === "ultimate-bundle" ? "center_start_top_to_bottom" : "top_to_bottom_or_reverse",
    };
  }

  if (context.template_id === "collection-showcase") {
    return {
      camera: "even_time_collection_showcase",
      sequence: "one_at_a_time",
      music_sync: "match browse-and-discover pacing",
    };
  }

  return { camera: "template_default", sequence: "one_at_a_time" };
}

function contextualItemNote(
  context: ArtworkSelectionRecipeContext,
  role: ArtworkSelectionItem["segment_role"],
  baseNote: string,
): string {
  if (context.template_id === "scale-shock") {
    return `Chosen for ${role} Scale Shock beat: ${baseNote}; solved-art detail must support axis-aware scan before full reveal.`;
  }

  if (context.template_id === "collection-showcase") {
    return `Chosen for ${role} Collection Showcase beat: ${baseNote}; supports variety under ${context.track_title}.`;
  }

  return `Chosen for ${role} beat: ${baseNote}.`;
}

function normalizeAsset(source: SourceArtworkAsset, kind: ArtworkAssetKind): ArtworkAsset {
  const listingId = listingForArtwork(source.file, kind);
  const assetRole: ArtworkAssetRole =
    kind === "cover" ? "cover" : source.file.startsWith("single_") ? "hero" : "representative";
  return {
    asset_id: `${kind}_${stableSlug(source.file.replace(/\.[^.]+$/, ""))}`,
    listing_id: listingId,
    asset_role: assetRole,
    asset_kind: kind,
    file_name: source.file,
    local_path: source.localPath ?? null,
    storage_path: `marketing-images/${kind === "cover" ? "covers" : "solutions"}/${source.file}`,
    public_url: source.url,
    title: titleFromFile(source.file),
    tags: tagsFromFile(source.file),
    source_manifest: "extracted_images/image_manifest.json",
  };
}

function requireSingleHero(listingId: string, assets: ArtworkAsset[]): ArtworkAsset {
  const hero = assets.find(
    (asset) => asset.listing_id === listingId && asset.asset_role === "hero",
  );
  if (!hero) throw new Error(`Missing single hero artwork for ${listingId}.`);
  return hero;
}

function requireAssetByFile(fileName: string, assets: ArtworkAsset[]): ArtworkAsset {
  const asset = assets.find((candidate) => candidate.file_name === fileName);
  if (!asset) throw new Error(`Missing artwork asset: ${fileName}`);
  return asset;
}

function selectBestAsset(candidates: ArtworkAsset[], requiredTags: string[]): ArtworkAsset {
  const ranked = candidates
    .map((asset) => ({
      asset,
      score: requiredTags.reduce((score, tag) => score + (asset.tags.includes(tag) || asset.file_name.includes(tag) ? 1 : 0), 0),
    }))
    .sort((a, b) => b.score - a.score || a.asset.file_name.localeCompare(b.asset.file_name));

  const match = ranked[0];
  if (!match || match.score === 0) {
    throw new Error(`No artwork asset matched required tags: ${requiredTags.join(", ")}`);
  }
  return match.asset;
}

function listingForArtwork(file: string, kind: ArtworkAssetKind): string {
  if (kind === "cover") {
    if (file.startsWith("titanic_")) return "titanic-series";
    if (file.startsWith("colossus_")) return "colossus-series";
    if (file.startsWith("behemoth_")) return "behemoth-series";
    if (file.startsWith("dragons_")) return "dragons-wrath";
    if (file.startsWith("frozen_")) return "frozen-gaze";
    if (file.startsWith("cafe_")) return "cafe-serenade";
  }
  if (file.startsWith("titanic_")) return "titanic-series";
  if (file.startsWith("colossus_")) return "colossus-series";
  if (file.startsWith("behemoth_")) return "behemoth-series";
  if (file.startsWith("single_dragons")) return "dragons-wrath";
  if (file.startsWith("single_frozen")) return "frozen-gaze";
  if (file.startsWith("single_cafe")) return "cafe-serenade";
  return "unknown";
}

function titleFromFile(file: string): string {
  return file
    .replace(/\.[^.]+$/, "")
    .replace(/^(single_|titanic_|colossus_|behemoth_)/, "")
    .replace(/[-_]\d+$/, "")
    .replace(/[_-]/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function tagsFromFile(file: string): string[] {
  return file
    .replace(/\.[^.]+$/, "")
    .split(/[_-]+/)
    .filter((part) => !/^\d+$/.test(part) && part !== "single" && part !== "sol" && part !== "cover");
}

function stableSlug(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

export function selectionFingerprint(selection: ArtworkSelectionSet): string {
  return createHash("sha256")
    .update(JSON.stringify({
      listing_id: selection.listing_id,
      selection_version: selection.selection_version,
      asset_ids: selection.items.map((item) => item.asset_id),
    }))
    .digest("hex")
    .slice(0, 16);
}
