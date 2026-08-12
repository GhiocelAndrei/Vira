using System.Text.Json;
using Vira.Abstractions.Common;

namespace Vira.Abstractions.DTOs;

/// <summary>
/// Everything the ai-service needs to build a Creator Portrait: the creator profile, their
/// per-clip TikTok metrics, derived aggregates, the intake questionnaire, and the stored per-clip
/// video analyses. Assembled by the backend and POSTed to the Python <c>/portrait</c> endpoint.
/// </summary>
public class PortraitRequestDto
{
    public Guid CreatorId { get; set; }
    public string DisplayName { get; set; } = string.Empty;
    public long FollowerCount { get; set; }
    public CreatorCategory Category { get; set; }
    public string? City { get; set; }
    public string? County { get; set; }
    public List<ClipDto> Clips { get; set; } = [];
    public AggregatesDto Aggregates { get; set; } = new();
    public QuestionnaireDto Questionnaire { get; set; } = new();

    /// <summary>The stored per-clip AI analyses that feed the portrait. Empty when a clip has not
    /// been analysed yet.</summary>
    public List<ClipAnalysisEntryDto> Analyses { get; set; } = [];
}

/// <summary>
/// A stored per-clip AI analysis passed through to the portrait pipeline — mirrors an entry of the
/// request JSON. The version stamps are typed (we use them); the scored analysis body is opaque
/// (its ontology is versioned and evolves) and carried as a raw <see cref="JsonElement"/>.
/// </summary>
public class ClipAnalysisEntryDto
{
    public string TikTokVideoId { get; set; } = string.Empty;
    public JsonElement Analysis { get; set; }
    public string AiModel { get; set; } = string.Empty;
    public string PromptVersion { get; set; } = string.Empty;
    public string OntologyVersion { get; set; } = string.Empty;
    public DateTimeOffset AnalyzedAt { get; set; }
}

/// <summary>Per-clip TikTok metrics — mirrors <see cref="Models.Creators.CreatorClip"/>.</summary>
public class ClipDto
{
    public string TikTokVideoId { get; set; } = string.Empty;
    public string? Title { get; set; }
    public string? CoverImageUrl { get; set; }
    public string? EmbedLink { get; set; }
    public long ViewCount { get; set; }
    public long LikeCount { get; set; }
    public long CommentCount { get; set; }
    public long ShareCount { get; set; }
    public DateTimeOffset TikTokCreateTime { get; set; }
}

/// <summary>Aggregates derived from the clip list.</summary>
public class AggregatesDto
{
    public long AvgViews { get; set; }
    public long AvgLikes { get; set; }
    public long AvgComments { get; set; }
    public long AvgShares { get; set; }

    // double is intentional — engagementRate is a ratio (0..1), NOT currency.
    // Money stays integer bani (CLAUDE.md rule 1); this is not on the money path.
    public double EngagementRate { get; set; }
}

/// <summary>The creator's intake questionnaire — mirrors <see cref="Models.Creators.CreatorQuestionnaire"/>.</summary>
public class QuestionnaireDto
{
    public List<CreatorCategory> PreferredCategories { get; set; } = [];
    public List<CreatorCategory> ExcludedCategories { get; set; } = [];
    public bool AcceptsShippedProducts { get; set; }
    public bool CanPurchaseProducts { get; set; }
    public TravelWillingness TravelWillingness { get; set; }
    public List<string> Goals { get; set; } = [];
    public List<string> Values { get; set; } = [];
    public List<string> PreferredFormats { get; set; } = [];
    public List<string> ContentLanguages { get; set; } = [];
    public List<string> ExcludedBrands { get; set; } = [];
    public bool AllowsAlcohol { get; set; }
    public bool AllowsGambling { get; set; }
    public bool AllowsPolitical { get; set; }
    public int CollabCapacityPerMonth { get; set; }
    public string SelfDescribedAudience { get; set; } = string.Empty;
    public List<PriorSponsorshipDto> PriorSponsorships { get; set; } = [];
}

public class PriorSponsorshipDto
{
    public string BrandName { get; set; } = string.Empty;
    public CreatorCategory Category { get; set; }
}
