using Vira.Abstractions.Common;

namespace Vira.Abstractions.DTOs;

/// <summary>
/// A campaign as a creator discovers it in the feed / marketplace: the real campaign fields joined
/// with the brand name, plus the match result. The per-1k rate, earnings estimate, and card visuals
/// are derived on the client from <see cref="Objective"/>.
/// </summary>
public class FeedCampaignDto
{
    public Guid Id { get; set; }
    public string BrandName { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public CampaignObjective Objective { get; set; }
    public CreatorCategory? Category { get; set; }         // vertical — the "Nișă" filter
    public DateTimeOffset? Deadline { get; set; }          // campaign end — the "Termen" sort
    public string Message { get; set; } = string.Empty;   // the free-text hook/brief
    public List<string> Hashtags { get; set; } = [];
    public string? Mention { get; set; }
    public List<string> Requirements { get; set; } = [];
    public string DurationPreset { get; set; } = string.Empty;

    public long BudgetMinor { get; set; }
    public long MinFollowerThreshold { get; set; }
    public bool ProductPlacement { get; set; }
    /// <summary>True when this creator is below a product-placement campaign's follower gate.</summary>
    public bool Locked { get; set; }

    // From the matcher (stub for now: 100 / empty until the real engine lands).
    public double MatchPercent { get; set; }
    public List<string> MatchReasons { get; set; } = [];

    public DateTimeOffset CreatedAt { get; set; }
}
