import { useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { Icon } from "../../components/Icon";
import { Button, Card, Chip } from "../../components/ui";
import { cn } from "../../lib/cn";
import { postJson } from "../../lib/api";
import type { CampaignObjective, CreatorCategory } from "../../lib/types";
import { t } from "@vira/core";
import {
  AVERAGE_VIEWS_PER_CREATOR,
  CAMPAIGN_BUDGET_PRESETS_MINOR,
  CAMPAIGN_BUDGET_STEP_MINOR,
  CAMPAIGN_MAX_BUDGET_MINOR,
  CAMPAIGN_MIN_BUDGET_MINOR,
  campaignObjectives,
  clipDurationPresets,
  type CampaignObjectiveId,
} from "@vira/core";
import {
  estimateCreatorCount,
  estimateViewsForBudget,
  formatMoney,
  formatRatePerMille,
  formatViews,
} from "@vira/core";

const steps = [
  t.newCampaign.steps.objective,
  t.newCampaign.steps.budget,
  t.newCampaign.steps.requirements,
  t.newCampaign.steps.review,
];

const inputClass = cn(
  "w-full rounded border border-white/10 bg-surface-container-lowest px-4 py-3",
  "font-body text-[15px] text-on-surface placeholder:text-on-surface-variant/40",
  "outline-none transition-colors focus:border-business/60",
);

/**
 * Campaign creation for brands.
 *
 * Built around the promise the landing page makes: a business that has never
 * advertised answers one question — what do you want to happen — and everything
 * else has a defensible default. The objective sets the rate and seeds the
 * requirements; the budget step shows what that money actually buys before it
 * is committed.
 *
 * Money stays in integer minor units from the slider to the created row: the
 * control's min/max/step are all minor units, so no euro↔cent conversion and no
 * decimal parsing happens anywhere in this file (CLAUDE.md #1). The view and
 * creator counts are estimates from `@vira/core/estimates` and are labelled as
 * such — nothing here derives a payable amount.
 */
/** Wizard objective ids are lowercase; the API enum is PascalCase. */
const OBJECTIVE_MAP: Record<CampaignObjectiveId, CampaignObjective> = {
  awareness: "Awareness",
  visits: "Visits",
  offer: "Offer",
  launch: "Launch",
  community: "Community",
};

/** Content verticals, keyed off the canonical label map so they never drift out of sync. */
const CATEGORY_IDS = Object.keys(t.brandOnboarding.categories) as CreatorCategory[];

export default function NewCampaignPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [step, setStep] = useState(0);
  const [objectiveId, setObjectiveId] = useState<CampaignObjectiveId | null>(null);
  const [budgetMinor, setBudgetMinor] = useState(CAMPAIGN_MIN_BUDGET_MINOR);
  const [name, setName] = useState("");
  const [hashtags, setHashtags] = useState<string[]>([]);
  const [hashtagInput, setHashtagInput] = useState("");
  const [mention, setMention] = useState("");
  const [durationId, setDurationId] = useState(clipDurationPresets[1].id);
  const [category, setCategory] = useState<CreatorCategory | null>(null);
  const [deadline, setDeadline] = useState(""); // yyyy-mm-dd from the date input; "" = no deadline
  const [extraRequirements, setExtraRequirements] = useState<string[]>([]);
  const [productPlacement, setProductPlacement] = useState(false);

  const objective = campaignObjectives.find((item) => item.id === objectiveId) ?? null;
  const ratePerMilleMinor = objective?.ratePerMilleMinor ?? 0;
  const estimatedViews = estimateViewsForBudget(budgetMinor, ratePerMilleMinor);
  const estimatedCreators = estimateCreatorCount(estimatedViews, AVERAGE_VIEWS_PER_CREATOR);

  /** Changing the objective re-seeds its suggestions — they are defaults, not accumulated state. */
  function pickObjective(id: CampaignObjectiveId) {
    const picked = campaignObjectives.find((item) => item.id === id);
    setObjectiveId(id);
    setExtraRequirements(picked ? [...picked.suggestedRequirements] : []);
    setProductPlacement(id === "launch");
  }

  function addHashtag() {
    const raw = hashtagInput.trim().replace(/^#+/, "");
    if (!raw) return;
    const tag = `#${raw}`;
    setHashtags((current) => (current.includes(tag) ? current : [...current, tag]));
    setHashtagInput("");
  }

  const canAdvance = step === 0 ? objectiveId !== null : step === 2 ? name.trim().length > 0 : true;

  const allRequirements = [
    ...hashtags,
    ...(mention.trim() ? [mention.trim()] : []),
    ...extraRequirements,
  ];

  async function submit() {
    if (!objectiveId) return;
    setSubmitError(null);
    setSubmitting(true);
    try {
      await postJson("/brand/campaigns", {
        title: name.trim(),
        objective: OBJECTIVE_MAP[objectiveId],
        category, // vertical for the creator's "Nișă" filter (null = uncategorized)
        deadline: deadline ? new Date(deadline).toISOString() : null,
        budgetMinor, // integer minor units all the way through — no euro↔cent conversion
        hashtags,
        mention: mention.trim() || null,
        durationPreset: clipDurationPresets.find((p) => p.id === durationId)?.label ?? "",
        requirements: extraRequirements,
        productPlacement,
        minFollowerThreshold: 0,
        extraRequirements: "",
        message: "",
      });
      queryClient.invalidateQueries({ queryKey: ["campaigns"] });
      navigate("/brand", { state: { created: name.trim() } });
    } catch {
      setSubmitError(t.newCampaign.createError);
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl px-6 py-10 md:px-12">
      <button
        type="button"
        onClick={() => navigate("/brand")}
        className="flex items-center gap-1 text-[13px] text-on-surface-variant transition-colors hover:text-on-surface"
      >
        <Icon name="arrow_back" size={16} />
        {t.newCampaign.cancel}
      </button>

      <h1 className="mt-6 font-display text-headline-lg text-on-surface">{t.newCampaign.title}</h1>
      <p className="mt-2 text-body-md text-on-surface-variant">{t.newCampaign.subtitle}</p>

      <StepBar current={step} />

      <div className="mt-8">
        {step === 0 && (
          <Section title={t.newCampaign.objectiveTitle} subtitle={t.newCampaign.objectiveSubtitle}>
            <div className="grid gap-3">
              {campaignObjectives.map((item) => {
                const copy = t.newCampaign.objectives[item.id];
                const selected = item.id === objectiveId;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => pickObjective(item.id)}
                    aria-pressed={selected}
                    className={cn(
                      "flex items-start gap-4 rounded-lg border p-5 text-left transition-colors",
                      selected
                        ? "border-business/60 bg-business/10"
                        : "border-white/5 bg-surface-container-low hover:border-white/15",
                    )}
                  >
                    <span
                      className={cn(
                        "grid h-10 w-10 shrink-0 place-items-center rounded-full",
                        selected ? "bg-business/20 text-business" : "bg-white/5 text-on-surface-variant",
                      )}
                    >
                      <Icon name={item.icon} size={20} filled={selected} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block font-display text-[15px] font-semibold text-on-surface">
                        {copy.title}
                      </span>
                      <span className="mt-1 block text-[13px] leading-5 text-on-surface-variant">
                        {copy.text}
                      </span>
                      <span className="numeric mt-2 block text-[12px] text-on-surface-variant/70">
                        {formatRatePerMille(item.ratePerMilleMinor)}
                      </span>
                    </span>
                    {selected && <Icon name="check_circle" size={20} className="text-business" filled />}
                  </button>
                );
              })}
            </div>
          </Section>
        )}

        {step === 1 && objective && (
          <Section title={t.newCampaign.budgetTitle} subtitle={t.newCampaign.budgetSubtitle}>
            <Card className="p-6">
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                  <p className="label-caps">{t.newCampaign.budgetLabel}</p>
                  <p className="numeric mt-2 text-[40px] font-semibold leading-none text-on-surface">
                    {formatMoney(budgetMinor, { compactZeroCents: true })}
                  </p>
                </div>
                <Chip tone="business">{formatRatePerMille(ratePerMilleMinor)}</Chip>
              </div>

              {/* Value, min, max and step are all minor units — the slider never sees euros. */}
              <input
                type="range"
                min={CAMPAIGN_MIN_BUDGET_MINOR}
                max={CAMPAIGN_MAX_BUDGET_MINOR}
                step={CAMPAIGN_BUDGET_STEP_MINOR}
                value={budgetMinor}
                onChange={(event) => setBudgetMinor(Number(event.target.value))}
                aria-label={t.newCampaign.budgetLabel}
                className="mt-6 h-1.5 w-full cursor-pointer appearance-none rounded-full bg-white/10 accent-business"
              />

              <div className="mt-4 flex flex-wrap gap-2">
                {CAMPAIGN_BUDGET_PRESETS_MINOR.map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setBudgetMinor(preset)}
                    className={cn(
                      "numeric rounded-full border px-3 py-1 text-[12px] font-semibold transition-colors",
                      preset === budgetMinor
                        ? "border-business/40 bg-business/10 text-business"
                        : "border-white/10 bg-white/5 text-on-surface-variant hover:border-white/20",
                    )}
                  >
                    {formatMoney(preset, { compactZeroCents: true })}
                  </button>
                ))}
              </div>

              <p className="mt-4 text-[12px] text-on-surface-variant/70">
                {t.newCampaign.budgetFloor(
                  formatMoney(CAMPAIGN_MIN_BUDGET_MINOR, { compactZeroCents: true }),
                )}
              </p>
            </Card>

            <Card className="mt-4 border-business/20 bg-business/5 p-6">
              <p className="label-caps text-business">{t.newCampaign.estimateTitle}</p>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <div>
                  <p className="numeric text-[32px] font-semibold leading-none text-on-surface">
                    {formatViews(estimatedViews)}
                  </p>
                  <p className="mt-1.5 text-[13px] text-on-surface-variant">
                    {t.newCampaign.estimatedViews}{" "}
                    <span className="text-on-surface-variant/60">· {t.newCampaign.estimated}</span>
                  </p>
                </div>
                <div>
                  <p className="numeric text-[32px] font-semibold leading-none text-on-surface">
                    {estimatedCreators}
                  </p>
                  <p className="mt-1.5 text-[13px] text-on-surface-variant">
                    {t.newCampaign.estimatedCreators}{" "}
                    <span className="text-on-surface-variant/60">· {t.newCampaign.estimated}</span>
                  </p>
                </div>
              </div>
              <p className="mt-5 border-t border-white/5 pt-4 text-[12px] leading-5 text-on-surface-variant/70">
                {t.newCampaign.estimateNote}
              </p>
              <p className="mt-2 text-[12px] leading-5 text-mint">{t.newCampaign.refundNote}</p>
            </Card>
          </Section>
        )}

        {step === 2 && (
          <Section
            title={t.newCampaign.requirementsTitle}
            subtitle={t.newCampaign.requirementsSubtitle}
          >
            <div className="grid gap-5">
              <Field label={t.newCampaign.nameLabel}>
                <input
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder={t.newCampaign.namePlaceholder}
                  className={inputClass}
                />
                {name.trim().length === 0 && (
                  <p className="mt-2 text-[12px] text-amber">{t.newCampaign.nameRequired}</p>
                )}
              </Field>

              <Field label={t.newCampaign.hashtagsLabel}>
                <div className="flex gap-2">
                  <input
                    value={hashtagInput}
                    onChange={(event) => setHashtagInput(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key !== "Enter") return;
                      event.preventDefault();
                      addHashtag();
                    }}
                    placeholder={t.newCampaign.hashtagPlaceholder}
                    className={inputClass}
                  />
                  <Button variant="subtle" onClick={addHashtag} type="button">
                    {t.newCampaign.add}
                  </Button>
                </div>
                {hashtags.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {hashtags.map((tag) => (
                      <RemovableChip
                        key={tag}
                        label={tag}
                        onRemove={() => setHashtags((c) => c.filter((item) => item !== tag))}
                      />
                    ))}
                  </div>
                )}
              </Field>

              <Field label={t.newCampaign.mentionLabel}>
                <input
                  value={mention}
                  onChange={(event) => setMention(event.target.value)}
                  placeholder={t.newCampaign.mentionPlaceholder}
                  className={inputClass}
                />
              </Field>

              <Field label={t.newCampaign.durationLabel}>
                <div className="flex flex-wrap gap-2">
                  {clipDurationPresets.map((preset) => (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => setDurationId(preset.id)}
                      className={cn(
                        "rounded-full border px-4 py-2 font-body text-[13px] font-semibold transition-colors",
                        preset.id === durationId
                          ? "border-business/40 bg-business/10 text-business"
                          : "border-white/10 bg-white/5 text-on-surface-variant hover:border-white/20",
                      )}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </Field>

              <Field label={t.newCampaign.categoryLabel}>
                <div className="flex flex-wrap gap-2">
                  {CATEGORY_IDS.map((id) => (
                    <button
                      key={id}
                      type="button"
                      aria-pressed={category === id}
                      onClick={() => setCategory((current) => (current === id ? null : id))}
                      className={cn(
                        "rounded-full border px-4 py-2 font-body text-[13px] font-semibold transition-colors",
                        category === id
                          ? "border-primary/40 bg-primary/10 text-primary"
                          : "border-white/10 bg-white/5 text-on-surface-variant hover:border-white/20",
                      )}
                    >
                      {t.brandOnboarding.categories[id]}
                    </button>
                  ))}
                </div>
                <p className="mt-2 text-[12px] text-on-surface-variant/70">
                  {t.newCampaign.categoryHint}
                </p>
              </Field>

              <Field label={t.newCampaign.deadlineFieldLabel}>
                <input
                  type="date"
                  value={deadline}
                  min={new Date().toISOString().slice(0, 10)}
                  onChange={(event) => setDeadline(event.target.value)}
                  className={cn(inputClass, "[color-scheme:dark]")}
                />
                <p className="mt-2 text-[12px] text-on-surface-variant/70">
                  {t.newCampaign.deadlineHint}
                </p>
              </Field>

              {extraRequirements.length > 0 && (
                <Field label={t.newCampaign.extraRequirements}>
                  <div className="flex flex-wrap gap-2">
                    {extraRequirements.map((requirement) => (
                      <RemovableChip
                        key={requirement}
                        label={requirement}
                        onRemove={() =>
                          setExtraRequirements((c) => c.filter((item) => item !== requirement))
                        }
                      />
                    ))}
                  </div>
                </Field>
              )}

              <Card className="p-5">
                <button
                  type="button"
                  role="switch"
                  aria-checked={productPlacement}
                  onClick={() => setProductPlacement((current) => !current)}
                  className="flex w-full items-center justify-between gap-4 text-left"
                >
                  <span className="font-body text-[14px] text-on-surface">
                    {t.newCampaign.productPlacementLabel}
                  </span>
                  <span
                    className={cn(
                      "relative h-6 w-11 shrink-0 rounded-full transition-colors",
                      productPlacement ? "bg-business" : "bg-white/10",
                    )}
                  >
                    <span
                      className={cn(
                        "absolute top-1 h-4 w-4 rounded-full bg-background transition-all",
                        productPlacement ? "left-6" : "left-1",
                      )}
                    />
                  </span>
                </button>
                {productPlacement && (
                  <p className="mt-3 flex gap-2 border-t border-white/5 pt-3 text-[12px] leading-5 text-amber">
                    <Icon name="warning" size={16} className="shrink-0" />
                    {t.newCampaign.productPlacementNote}
                  </p>
                )}
              </Card>
            </div>
          </Section>
        )}

        {step === 3 && objective && (
          <Section title={t.newCampaign.reviewTitle} subtitle={t.newCampaign.reviewSubtitle}>
            <Card className="divide-y divide-white/5">
              <SummaryRow label={t.newCampaign.nameLabel} value={name.trim()} />
              <SummaryRow
                label={t.newCampaign.steps.objective}
                value={t.newCampaign.objectives[objective.id].title}
              />
              <SummaryRow
                label={t.newCampaign.budgetLabel}
                value={formatMoney(budgetMinor, { compactZeroCents: true })}
              />
              <SummaryRow
                label={t.newCampaign.ratePerMille}
                value={formatRatePerMille(ratePerMilleMinor)}
              />
              <SummaryRow
                label={t.newCampaign.estimatedViews}
                value={`${formatViews(estimatedViews)} · ${t.newCampaign.estimated}`}
              />
              <SummaryRow
                label={t.newCampaign.durationLabel}
                value={clipDurationPresets.find((p) => p.id === durationId)?.label ?? ""}
              />
              {category && (
                <SummaryRow
                  label={t.newCampaign.categoryLabel}
                  value={t.brandOnboarding.categories[category]}
                />
              )}
              {deadline && (
                <SummaryRow
                  label={t.newCampaign.deadlineFieldLabel}
                  value={new Date(deadline).toLocaleDateString("ro-RO")}
                />
              )}
              <div className="px-6 py-4">
                <p className="label-caps">{t.newCampaign.reviewRequirements}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {allRequirements.length === 0 && !productPlacement ? (
                    <p className="text-[13px] text-on-surface-variant/60">
                      {t.newCampaign.reviewNoRequirements}
                    </p>
                  ) : (
                    allRequirements.map((item) => <Chip key={item}>{item}</Chip>)
                  )}
                  {productPlacement && (
                    <Chip tone="amber" icon="shopping_bag">
                      {t.newCampaign.productPlacementChip}
                    </Chip>
                  )}
                </div>
              </div>
            </Card>

            <p className="mt-4 text-[12px] leading-5 text-on-surface-variant/70">
              {t.newCampaign.refundNote}
            </p>
          </Section>
        )}
      </div>

      {/* Footer nav. Sticky so the phone layout never hides the way forward. */}
      <div className="sticky bottom-24 z-10 mt-8 flex items-center justify-between gap-3 md:bottom-6">
        <Button
          variant="subtle"
          onClick={() => (step === 0 ? navigate("/brand") : setStep((s) => s - 1))}
          icon="arrow_back"
        >
          {step === 0 ? t.newCampaign.cancel : t.newCampaign.back}
        </Button>

        {step < steps.length - 1 ? (
          <Button onClick={() => setStep((s) => s + 1)} disabled={!canAdvance}>
            {t.newCampaign.next}
            <Icon name="arrow_forward" size={18} />
          </Button>
        ) : (
          <Button onClick={submit} icon="check" disabled={submitting}>
            {submitting ? t.newCampaign.creating : t.newCampaign.create}
          </Button>
        )}
      </div>

      {submitError && <p className="mt-3 text-right text-[13px] text-error">{submitError}</p>}
    </div>
  );
}

/* -------------------------------------------------------------------------- */

function StepBar({ current }: { current: number }) {
  return (
    <div className="mt-8">
      <p className="label-caps">{t.newCampaign.stepLabel(current + 1, steps.length)}</p>
      <div className="mt-3 flex gap-2">
        {steps.map((label, index) => (
          <div key={label} className="flex-1">
            <div
              className={cn(
                "h-1 rounded-full transition-colors",
                index <= current ? "bg-business" : "bg-white/10",
              )}
            />
            <p
              className={cn(
                "mt-2 hidden text-[11px] font-semibold sm:block",
                index === current ? "text-business" : "text-on-surface-variant/50",
              )}
            >
              {label}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

function Section({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
}) {
  return (
    <div className="animate-fade-up">
      <h2 className="font-display text-headline-md text-on-surface">{title}</h2>
      <p className="mt-1.5 text-[14px] text-on-surface-variant">{subtitle}</p>
      <div className="mt-6">{children}</div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="label-caps mb-2">{label}</p>
      {children}
    </div>
  );
}

function RemovableChip({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 py-1 pl-3 pr-1.5 font-body text-[12px] font-semibold text-on-surface-variant">
      {label}
      <button
        type="button"
        onClick={onRemove}
        aria-label={t.newCampaign.remove(label)}
        className="grid h-5 w-5 place-items-center rounded-full transition-colors hover:bg-white/10 hover:text-on-surface"
      >
        <Icon name="close" size={14} />
      </button>
    </span>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4 px-6 py-4">
      <p className="label-caps">{label}</p>
      <p className="numeric text-right text-[14px] font-semibold text-on-surface">{value}</p>
    </div>
  );
}
