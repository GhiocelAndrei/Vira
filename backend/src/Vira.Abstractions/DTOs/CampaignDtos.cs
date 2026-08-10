using Vira.Abstractions.Common;
using Vira.Abstractions.Models.Campaigns;

namespace Vira.Abstractions.DTOs;

/// <summary>Brand's campaign-creation payload (from the NewCampaignPage wizard). Money is EUR cents.</summary>
public class CreateCampaignDto
{
    public string Title { get; set; } = string.Empty;
    public CampaignObjective Objective { get; set; }
    public CreatorCategory? Category { get; set; }       // brand vertical (the creator's "Nișă" filter)
    public DateTimeOffset? Deadline { get; set; }        // campaign end date (the "Termen" sort)
    public long BudgetMinor { get; set; }               // integer EUR cents
    public List<string> Hashtags { get; set; } = [];
    public string? Mention { get; set; }
    public string DurationPreset { get; set; } = string.Empty;
    public List<string> Requirements { get; set; } = [];
    public bool ProductPlacement { get; set; }
    public long MinFollowerThreshold { get; set; }
    public string ExtraRequirements { get; set; } = string.Empty;
    public string Message { get; set; } = string.Empty;
}

/// <summary>Campaign row for the brand dashboard. Spent/Views are 0 until measurement lands.</summary>
public class CampaignDto
{
    public Guid Id { get; set; }
    public string Title { get; set; } = string.Empty;
    public CampaignStatus Status { get; set; }
    public CampaignObjective Objective { get; set; }
    public long BudgetMinor { get; set; }
    public long SpentMinor { get; set; }
    public long Views { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
}
