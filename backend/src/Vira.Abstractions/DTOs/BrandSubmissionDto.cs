using Vira.Abstractions.Models.Campaigns;

namespace Vira.Abstractions.DTOs;

/// <summary>
/// A creator's application as the brand reviews it in the approval queue — the application joined with
/// its campaign and creator. Metadata only; the draft video is fetched from the draft-download
/// endpoint. Decision fields (<see cref="RejectionReason"/>, <see cref="DecisionNote"/>) are populated
/// once the brand has decided.
/// </summary>
public class BrandSubmissionDto
{
    public Guid Id { get; set; }                       // the application id
    public Guid CampaignId { get; set; }
    public string CampaignName { get; set; } = string.Empty;

    public string CreatorName { get; set; } = string.Empty;
    public long CreatorFollowers { get; set; }
    public string? CreatorAvatarUrl { get; set; }

    public ApplicationStatus Status { get; set; }
    /// <summary>The creator's note to the brand, submitted with the draft.</summary>
    public string CreatorNote { get; set; } = string.Empty;

    public string DraftFileName { get; set; } = string.Empty;
    public string DraftContentType { get; set; } = string.Empty;
    public long DraftSizeBytes { get; set; }
    public DateTimeOffset SubmittedAt { get; set; }

    public RejectionReason? RejectionReason { get; set; }
    public string DecisionNote { get; set; } = string.Empty;
    public DateTimeOffset? DecidedAt { get; set; }
}

/// <summary>The brand's decision on a submission. A rejection must carry a reason and a note.</summary>
public class SubmissionDecisionDto
{
    /// <summary>True to approve, false to reject.</summary>
    public bool Approve { get; set; }
    public RejectionReason? RejectionReason { get; set; }
    public string? Note { get; set; }
}
