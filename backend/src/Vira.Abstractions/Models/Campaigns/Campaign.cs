using Vira.Abstractions.Common;

namespace Vira.Abstractions.Models.Campaigns;

public class Business : Entity
{
    public Guid AccountId { get; set; }
    public string CompanyName { get; set; } = string.Empty;
}

public enum CampaignStatus { Draft, Active, Closed }

public class Campaign : Entity
{
    public Guid BusinessId { get; set; }
    public string Title { get; set; } = string.Empty;
    public CampaignBrief Brief { get; set; } = new();    // structured brief (JSONB)
    public Money Budget { get; set; }                    // integer EUR cents
    public CampaignStatus Status { get; set; } = CampaignStatus.Draft;

    /// <summary>The brand's content vertical for this campaign — what a creator filters "Nișă" by.
    /// Nullable so campaigns created before this field (and any left uncategorized) are representable.</summary>
    public CreatorCategory? Category { get; set; }

    /// <summary>When the campaign stops accepting new posts — what "Termen" sorts by. Nullable = open-ended.</summary>
    public DateTimeOffset? Deadline { get; set; }

    public StyleVector TargetStyleVector { get; set; } = new();
    public CampaignAccessRule AccessRule { get; set; } = new();
}

/// <summary>Structured campaign brief (stored as JSONB). What the brand asks creators to do.</summary>
public class CampaignBrief
{
    public CampaignObjective Objective { get; set; }
    public List<string> Hashtags { get; set; } = [];
    public string? Mention { get; set; }
    public string DurationPreset { get; set; } = string.Empty;   // e.g. "15-60s"
    public List<string> Requirements { get; set; } = [];         // predefined chips seeded by objective
    public string ExtraRequirements { get; set; } = string.Empty; // free text
    public string Message { get; set; } = string.Empty;           // free-text brief
}

/// <summary>Hard floor. The follower threshold gates product-placement campaigns (demo.docx).</summary>
public class CampaignAccessRule
{
    public long MinFollowerThreshold { get; set; }
    public bool ProductPlacement { get; set; }
}
