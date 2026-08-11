import { useState, type ReactNode } from "react";
import { Icon } from "../../components/Icon";
import { Button } from "../../components/ui";
import { cn } from "../../lib/cn";
import { t } from "@vira/core";
import { useSaveQuestionnaire } from "../../lib/queries";
import type {
  CreatorCategory,
  CreatorQuestionnaireDto,
  PriorSponsorshipDto,
  TravelWillingness,
} from "../../lib/types";

const CATEGORY_IDS = Object.keys(t.brandOnboarding.categories) as CreatorCategory[];
const TRAVEL_OPTIONS: TravelWillingness[] = ["None", "SameCounty", "Nationwide", "OutOfCountry"];

const inputClass = cn(
  "w-full rounded border border-white/10 bg-surface-container-lowest px-4 py-3",
  "font-body text-[15px] text-on-surface placeholder:text-on-surface-variant/40",
  "outline-none transition-colors focus:border-creator/60",
);

/**
 * Step 2 of creator onboarding: the intake questionnaire that feeds brand/campaign matching. Every
 * field is optional (more answers → better matches); submitting persists it and clears the gate.
 */
export function QuestionnaireForm() {
  const save = useSaveQuestionnaire();

  const [preferredCategories, setPreferred] = useState<CreatorCategory[]>([]);
  const [excludedCategories, setExcluded] = useState<CreatorCategory[]>([]);
  const [acceptsShippedProducts, setAcceptsShipped] = useState(false);
  const [canPurchaseProducts, setCanPurchase] = useState(false);
  const [travelWillingness, setTravel] = useState<TravelWillingness>("SameCounty");
  const [goals, setGoals] = useState<string[]>([]);
  const [preferredFormats, setFormats] = useState<string[]>([]);
  const [contentLanguages, setLanguages] = useState<string[]>([]);
  const [excludedBrands, setExcludedBrands] = useState<string[]>([]);
  const [allowsAlcohol, setAlcohol] = useState(true);
  const [allowsGambling, setGambling] = useState(false);
  const [allowsPolitical, setPolitical] = useState(false);
  const [selfDescribedAudience, setAudience] = useState("");
  const [priorSponsorships, setSponsorships] = useState<PriorSponsorshipDto[]>([]);

  function toggleIn(list: CreatorCategory[], set: (v: CreatorCategory[]) => void, id: CreatorCategory) {
    set(list.includes(id) ? list.filter((c) => c !== id) : [...list, id]);
  }

  function submit() {
    const dto: CreatorQuestionnaireDto = {
      preferredCategories,
      excludedCategories,
      acceptsShippedProducts,
      canPurchaseProducts,
      travelWillingness,
      goals,
      values: [],
      preferredFormats,
      contentLanguages,
      excludedBrands,
      allowsAlcohol,
      allowsGambling,
      allowsPolitical,
      collabCapacityPerMonth: 0,
      selfDescribedAudience: selfDescribedAudience.trim(),
      priorSponsorships,
    };
    save.mutate(dto); // on success the profile refetches → onboarding gate clears
  }

  const q = t.creatorQuestionnaire;

  return (
    <div className="fixed inset-0 z-[200] flex flex-col bg-background/95 backdrop-blur-xl">
      <div className="mx-auto flex h-full w-full max-w-3xl flex-col px-5 py-6 md:px-8 md:py-10">
        <header className="shrink-0">
          <p className="label-caps mb-2 text-creator">{t.creatorOnboarding.step(2, 2)}</p>
          <h1 className="font-display text-headline-md text-on-surface md:text-headline-lg">{q.title}</h1>
          <p className="mt-2 text-body-md text-on-surface-variant">{q.subtitle}</p>
        </header>

        <div className="mt-6 min-h-0 flex-1 space-y-8 overflow-y-auto pb-4">
          {/* Categories */}
          <Section title={q.sectionCategories}>
            <Field label={q.preferredCategories}>
              <CategoryGrid
                selected={preferredCategories}
                tone="creator"
                onToggle={(id) => toggleIn(preferredCategories, setPreferred, id)}
              />
            </Field>
            <Field label={q.excludedCategories}>
              <CategoryGrid
                selected={excludedCategories}
                tone="error"
                onToggle={(id) => toggleIn(excludedCategories, setExcluded, id)}
              />
            </Field>
          </Section>

          {/* Logistics */}
          <Section title={q.sectionLogistics}>
            <Toggle label={q.acceptsShippedProducts} checked={acceptsShippedProducts} onChange={setAcceptsShipped} />
            <Toggle label={q.canPurchaseProducts} checked={canPurchaseProducts} onChange={setCanPurchase} />
            <Field label={q.travelWillingness}>
              <div className="flex flex-wrap gap-2">
                {TRAVEL_OPTIONS.map((opt) => (
                  <Pill key={opt} active={travelWillingness === opt} onClick={() => setTravel(opt)}>
                    {q.travel[opt]}
                  </Pill>
                ))}
              </div>
            </Field>
          </Section>

          {/* Content */}
          <Section title={q.sectionContent}>
            <ChipsInput label={q.contentLanguages} values={contentLanguages} onChange={setLanguages} />
            <ChipsInput label={q.preferredFormats} values={preferredFormats} onChange={setFormats} />
          </Section>

          {/* Brand safety */}
          <Section title={q.sectionSafety}>
            <Toggle label={q.allowsAlcohol} checked={allowsAlcohol} onChange={setAlcohol} />
            <Toggle label={q.allowsGambling} checked={allowsGambling} onChange={setGambling} />
            <Toggle label={q.allowsPolitical} checked={allowsPolitical} onChange={setPolitical} />
            <ChipsInput label={q.excludedBrands} values={excludedBrands} onChange={setExcludedBrands} />
          </Section>

          {/* About */}
          <Section title={q.sectionAbout}>
            <ChipsInput label={q.goals} values={goals} onChange={setGoals} />
            <Field label={q.selfDescribedAudience}>
              <textarea
                value={selfDescribedAudience}
                onChange={(e) => setAudience(e.target.value)}
                placeholder={q.audiencePlaceholder}
                rows={3}
                className={cn(inputClass, "resize-none")}
              />
            </Field>
          </Section>

          {/* Prior sponsorships */}
          <Section title={q.sectionHistory}>
            <SponsorshipEditor value={priorSponsorships} onChange={setSponsorships} />
          </Section>
        </div>

        <footer className="shrink-0 border-t border-white/10 pt-4">
          <div className="flex items-center justify-between gap-4">
            <p className="text-[12px] text-error">{save.isError ? q.error : ""}</p>
            <Button onClick={submit} disabled={save.isPending} icon="check">
              {save.isPending ? q.saving : q.submit}
            </Button>
          </div>
        </footer>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="animate-fade-up">
      <h2 className="label-caps text-[11px] text-on-surface-variant">{title}</h2>
      <div className="mt-4 space-y-5">{children}</div>
    </section>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <p className="mb-2 font-body text-[13px] font-semibold text-on-surface">{label}</p>
      {children}
    </div>
  );
}

function Pill({
  active,
  onClick,
  children,
  tone = "creator",
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
  tone?: "creator" | "error";
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "rounded-full border px-3.5 py-2 font-body text-[13px] font-semibold transition-colors",
        active
          ? tone === "error"
            ? "border-error/50 bg-error/10 text-error"
            : "border-creator/50 bg-creator/10 text-creator"
          : "border-white/10 bg-white/5 text-on-surface-variant hover:border-white/25",
      )}
    >
      {children}
    </button>
  );
}

function CategoryGrid({
  selected,
  onToggle,
  tone,
}: {
  selected: CreatorCategory[];
  onToggle: (id: CreatorCategory) => void;
  tone: "creator" | "error";
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {CATEGORY_IDS.map((id) => (
        <Pill key={id} active={selected.includes(id)} onClick={() => onToggle(id)} tone={tone}>
          {t.brandOnboarding.categories[id]}
        </Pill>
      ))}
    </div>
  );
}

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="flex w-full items-center justify-between gap-4 text-left"
    >
      <span className="font-body text-[14px] text-on-surface">{label}</span>
      <span
        className={cn(
          "relative h-6 w-11 shrink-0 rounded-full transition-colors",
          checked ? "bg-creator" : "bg-white/10",
        )}
      >
        <span
          className={cn(
            "absolute top-1 h-4 w-4 rounded-full bg-background transition-all",
            checked ? "left-6" : "left-1",
          )}
        />
      </span>
    </button>
  );
}

function ChipsInput({
  label,
  values,
  onChange,
}: {
  label: string;
  values: string[];
  onChange: (v: string[]) => void;
}) {
  const [draft, setDraft] = useState("");

  function add() {
    const value = draft.trim();
    if (!value) return;
    if (!values.includes(value)) onChange([...values, value]);
    setDraft("");
  }

  return (
    <Field label={label}>
      <input
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key !== "Enter") return;
          e.preventDefault();
          add();
        }}
        placeholder={t.creatorQuestionnaire.addHint}
        className={inputClass}
      />
      {values.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {values.map((value) => (
            <span
              key={value}
              className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 py-1 pl-3 pr-1.5 font-body text-[12px] font-semibold text-on-surface-variant"
            >
              {value}
              <button
                type="button"
                onClick={() => onChange(values.filter((v) => v !== value))}
                className="grid h-5 w-5 place-items-center rounded-full transition-colors hover:bg-white/10 hover:text-on-surface"
              >
                <Icon name="close" size={14} />
              </button>
            </span>
          ))}
        </div>
      )}
    </Field>
  );
}

function SponsorshipEditor({
  value,
  onChange,
}: {
  value: PriorSponsorshipDto[];
  onChange: (v: PriorSponsorshipDto[]) => void;
}) {
  const [brandName, setBrandName] = useState("");
  const [category, setCategory] = useState<CreatorCategory>(CATEGORY_IDS[0]);

  function add() {
    const name = brandName.trim();
    if (!name) return;
    onChange([...value, { brandName: name, category }]);
    setBrandName("");
  }

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        <input
          value={brandName}
          onChange={(e) => setBrandName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key !== "Enter") return;
            e.preventDefault();
            add();
          }}
          placeholder={t.creatorQuestionnaire.brandNamePlaceholder}
          className={cn(inputClass, "flex-1")}
        />
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value as CreatorCategory)}
          className={cn(inputClass, "max-w-[10rem] [color-scheme:dark]")}
        >
          {CATEGORY_IDS.map((id) => (
            <option key={id} value={id}>
              {t.brandOnboarding.categories[id]}
            </option>
          ))}
        </select>
        <Button variant="subtle" type="button" onClick={add}>
          {t.creatorQuestionnaire.addSponsorship}
        </Button>
      </div>

      {value.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {value.map((s, i) => (
            <span
              key={`${s.brandName}-${i}`}
              className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 py-1 pl-3 pr-1.5 font-body text-[12px] font-semibold text-on-surface-variant"
            >
              {s.brandName}
              <span className="text-on-surface-variant/50">· {t.brandOnboarding.categories[s.category]}</span>
              <button
                type="button"
                onClick={() => onChange(value.filter((_, idx) => idx !== i))}
                className="grid h-5 w-5 place-items-center rounded-full transition-colors hover:bg-white/10 hover:text-on-surface"
              >
                <Icon name="close" size={14} />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
