using Vira.Abstractions.Models.Campaigns;

namespace Vira.Abstractions.DTOs;

/// <summary>
/// A creator's campaign application as returned to the client — metadata only, never the draft bytes.
/// The draft itself is fetched separately from the draft-download endpoint.
/// </summary>
public class CampaignApplicationDto
{
    public Guid Id { get; set; }
    public Guid CampaignId { get; set; }
    public string CampaignName { get; set; } = string.Empty;
    public string BrandName { get; set; } = string.Empty;
    public ApplicationStatus Status { get; set; }
    /// <summary>The creator's own note submitted with the draft.</summary>
    public string Note { get; set; } = string.Empty;
    public string DraftFileName { get; set; } = string.Empty;
    public string DraftContentType { get; set; } = string.Empty;
    public long DraftSizeBytes { get; set; }
    public DateTimeOffset SubmittedAt { get; set; }

    // ── The brand's decision, surfaced to the creator (populated once decided) ───────────────────
    public RejectionReason? RejectionReason { get; set; }
    /// <summary>The brand's note on its decision — what to change on a rejection.</summary>
    public string DecisionNote { get; set; } = string.Empty;
    public DateTimeOffset? DecidedAt { get; set; }
}
