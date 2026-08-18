import { ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import {
  currentCreator,
  formatCompactNumber,
  portrait,
  STYLE_DIMENSIONS,
  t,
  tokens,
} from "@vira/core";
import { Card, Chip, LabelCaps, Numeric, ProgressBar } from "../../src/ui";

const { colors } = tokens;

/**
 * The AI Creator Portrait — the demo's "wow" screen.
 *
 * Two rules from CLAUDE.md are visible in the markup: every claim renders its
 * proving clip (no evidence, no render), and the confidence tier is always on
 * screen so an early portrait never reads as settled fact. No letter grades — a
 * score without a receipt is exactly what this product refuses to ship.
 */
export default function PortraitScreen() {
  const insets = useSafeAreaInsets();

  return (
    <ScrollView
      className="flex-1 bg-background"
      contentContainerStyle={{ padding: 20, paddingTop: insets.top + 16, paddingBottom: 32 }}
    >
      {/* Identity */}
      <View className="flex-row items-center gap-4">
        <View className="h-20 w-20 items-center justify-center rounded-full border border-primary/20 bg-primary/10">
          <Text className="text-[28px] font-bold text-primary">
            {currentCreator.displayName.charAt(0)}
          </Text>
        </View>
        <View className="flex-1">
          <Text className="text-[24px] font-bold text-on-surface">
            {currentCreator.displayName}
          </Text>
          <Text className="mt-0.5 text-on-surface-variant">{currentCreator.handle}</Text>
          <View className="mt-2">
            <Chip tone="primary">
              {`${formatCompactNumber(currentCreator.followerCount)} ${t.portrait.followers}`}
            </Chip>
          </View>
        </View>
      </View>

      {/* Brought onto the real `CreatorPortrait` contract (ADR-011 → ADR-016)
          when the shared fixture changed. This app is parked, so this is the
          port that keeps it compiling and honest — not a redesign; the web
          screen is the source it will eventually be derived from. Archetype,
          tagline, standalone claims and the growth tip are gone because none of
          them exist in the contract. */}
      <Card className="mt-6 overflow-hidden p-6">
        <LabelCaps>{t.portrait.dossierTitle}</LabelCaps>
        <Text className="mt-3 text-[15px] leading-6 text-on-surface">
          {portrait.narrativeDossier}
        </Text>
      </Card>

      {/* Style dimensions, each with the reason it scored what it did. */}
      <Card className="mt-4 p-5">
        <LabelCaps>{t.portrait.styleDimensions}</LabelCaps>
        <View className="mt-4 gap-4">
          {STYLE_DIMENSIONS.map((key) => {
            const value = portrait.styleVector[key];
            const evidence = portrait.styleEvidence[key];
            // No clips behind it means unmeasured, not average (CLAUDE.md #3).
            const ungrounded = evidence.evidenceClipIds.length === 0;

            return (
              <View key={key}>
                <View className="flex-row items-baseline justify-between">
                  <Text className="text-[13px] text-on-surface">{t.portrait.dimensions[key]}</Text>
                  {ungrounded ? (
                    <Text className="text-[12px] text-on-surface-variant/60">
                      {t.portrait.ungrounded}
                    </Text>
                  ) : (
                    <Numeric className="text-[13px] text-on-surface-variant">
                      {String(Math.round(value * 100))}
                    </Numeric>
                  )}
                </View>
                {!ungrounded && (
                  <View className="mt-1.5">
                    <ProgressBar percent={value * 100} />
                  </View>
                )}
                <Text className="mt-2 text-[12px] leading-5 text-on-surface-variant/70">
                  {ungrounded ? t.portrait.ungroundedNote : evidence.rationale}
                </Text>
              </View>
            );
          })}
        </View>
      </Card>

      {/* Brands seen on screen. `disclosed` travels with the name — without it
          the list reads as a sponsorship roster (ADR-016). */}
      {portrait.observedProducts.length > 0 && (
        <Card className="mt-4 p-5">
          <LabelCaps>{t.portrait.productsTitle}</LabelCaps>
          <Text className="mt-1.5 text-[12px] leading-5 text-on-surface-variant/70">
            {t.portrait.productsNote}
          </Text>
          <View className="mt-4 gap-3">
            {portrait.observedProducts.map((product) => (
              <View
                key={product.name}
                className="rounded-md border border-white/5 bg-surface-container-lowest/60 p-3"
              >
                <View className="flex-row items-center gap-2">
                  <MaterialIcons name="label" size={16} color={colors.primary} />
                  <Text className="text-[14px] font-semibold text-on-surface">{product.name}</Text>
                </View>
                <View className="mt-2 flex-row flex-wrap items-center gap-2">
                  <Chip tone={product.disclosed ? "mint" : "amber"}>
                    {product.disclosed
                      ? t.portrait.productDisclosed
                      : t.portrait.productNotDisclosed}
                  </Chip>
                  {product.declaredByCreator && (
                    <Chip tone="neutral">{t.portrait.productDeclaredByCreator}</Chip>
                  )}
                </View>
              </View>
            ))}
          </View>
        </Card>
      )}
    </ScrollView>
  );
}
