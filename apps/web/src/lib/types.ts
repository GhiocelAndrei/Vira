// Hand-written mirrors of the backend DTOs. TODO: replace with types generated from the OpenAPI
// spec (packages/contracts) — until then these must be kept in sync with Vira.Abstractions/DTOs.

export interface Me {
  accountId: string;
  email: string;
  type: "Creator" | "Business";
  businessId?: string | null;
  companyName?: string | null;
  onboardingComplete: boolean;
  creatorId?: string | null;
  displayName?: string | null;
}

export interface ClipDto {
  tikTokVideoId: string;
  title?: string | null;
  coverImageUrl?: string | null;
  embedLink?: string | null;
  viewCount: number;
  likeCount: number;
  commentCount: number;
  shareCount: number;
  tikTokCreateTime: string;
}

export interface AggregatesDto {
  avgViews: number;
  avgLikes: number;
  avgComments: number;
  avgShares: number;
  engagementRate: number;
}

/** Onboarding clip selection — up to 10 TikTok video ids the creator keeps; the rest are discarded. */
export interface ClipSelectionRequestDto {
  tikTokVideoIds: string[];
}

export interface PriorSponsorshipDto {
  brandName: string;
  category: CreatorCategory;
}

/** The creator's intake questionnaire — mirrors the backend QuestionnaireDto; feeds brand/campaign matching. */
export interface CreatorQuestionnaireDto {
  preferredCategories: CreatorCategory[];
  excludedCategories: CreatorCategory[];
  acceptsShippedProducts: boolean;
  canPurchaseProducts: boolean;
  travelWillingness: TravelWillingness;
  goals: string[];
  values: string[];
  preferredFormats: string[];
  contentLanguages: string[];
  excludedBrands: string[];
  allowsAlcohol: boolean;
  allowsGambling: boolean;
  allowsPolitical: boolean;
  collabCapacityPerMonth: number;
  selfDescribedAudience: string;
  priorSponsorships: PriorSponsorshipDto[];
}

export interface CreatorProfileDto {
  id: string;
  displayName: string;
  followerCount: number;
  avatarUrl?: string | null;
  niche?: string | null;
  clipsSelected: boolean;
  questionnaireComplete: boolean;
  clips: ClipDto[];
  aggregates: AggregatesDto;
}

export type CreatorCategory =
  | "Food" | "Sport" | "Tech" | "Beauty" | "Travel"
  | "Comedy" | "Education" | "Lifestyle" | "Gaming" | "Music";

export type TravelWillingness = "None" | "SameCounty" | "Nationwide" | "OutOfCountry";
export type CampaignObjective = "Awareness" | "Visits" | "Offer" | "Launch" | "Community";
export type CampaignStatus = "Draft" | "Active" | "Closed";
export type CompanySize = "Solo" | "Small" | "Medium" | "Large";
export type BudgetBand = "Under1k" | "From1kTo5k" | "From5kTo20k" | "Over20k";
export type AudienceAge = "Teens" | "A18_24" | "A25_34" | "A35_44" | "A45Plus";

export interface CampaignDto {
  id: string;
  title: string;
  status: CampaignStatus;
  objective: CampaignObjective;
  budgetMinor: number;
  spentMinor: number;
  views: number;
  createdAt: string;
}

/** A campaign as a creator discovers it (feed / marketplace) — mirrors the backend FeedCampaignDto. */
export interface FeedCampaignDto {
  id: string;
  brandName: string;
  title: string;
  objective: CampaignObjective;
  category?: CreatorCategory | null;
  deadline?: string | null;
  message: string;
  hashtags: string[];
  mention?: string | null;
  requirements: string[];
  durationPreset: string;
  budgetMinor: number;
  minFollowerThreshold: number;
  productPlacement: boolean;
  locked: boolean;
  matchPercent: number;
  matchReasons: string[];
  createdAt: string;
}

export interface CreateCampaignDto {
  title: string;
  objective: CampaignObjective;
  category?: CreatorCategory | null;
  deadline?: string | null;
  budgetMinor: number;
  hashtags: string[];
  mention?: string | null;
  durationPreset: string;
  requirements: string[];
  productPlacement: boolean;
  minFollowerThreshold: number;
  extraRequirements: string;
  message: string;
}

export interface BusinessProfileDto {
  companyName: string;
  verticals: CreatorCategory[];
  companySize: CompanySize;
  budgetBand: BudgetBand;
  targetAudienceAges: AudienceAge[];
  primaryGoal: CampaignObjective;
  avoidsAlcohol: boolean;
  avoidsGambling: boolean;
  avoidsPolitical: boolean;
  description: string;
  values: string[];
  website: string;
  competitorBrands: string[];
  productsToPromote: string;
}
