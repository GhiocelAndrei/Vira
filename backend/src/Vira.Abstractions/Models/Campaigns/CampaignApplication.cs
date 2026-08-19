using Vira.Abstractions.Common;

namespace Vira.Abstractions.Models.Campaigns;

/// <summary>Where an application sits in the brand's review flow.</summary>
public enum ApplicationStatus { Pending, Approved, Rejected }

/// <summary>
/// Why a brand rejected a draft. A rejection is never a bare "no" — the creator has to know what to
/// change, so a reason category is required alongside the free-text note (enforced at the API edge).
/// </summary>
public enum RejectionReason { MissingRequirement, MisleadingClaim, Legal, OffBrand }

/// <summary>
/// A creator's application to a campaign, carrying the draft clip they propose to post. The brand
/// reviews the draft before the creator posts natively on TikTok — we never post for them (CLAUDE.md
/// TikTok limits), we verify afterwards. One row per (creator, campaign): re-submitting replaces the
/// draft and resets the status to <see cref="ApplicationStatus.Pending"/>.
///
/// The draft bytes live in <see cref="DraftContent"/> (Postgres <c>bytea</c>) rather than on disk:
/// the host filesystem is ephemeral (see Program.cs) and the TikTok API never returns video files, so
/// an uploaded draft is data we must own. The bytes are excluded from list projections so metadata
/// queries stay light — only the dedicated draft-download path materializes them.
/// </summary>
public class CampaignApplication : Entity
{
    public Guid CreatorId { get; set; }   // → Creator.Id (plain FK, per the no-navigation convention)
    public Guid CampaignId { get; set; }  // → Campaign.Id

    public ApplicationStatus Status { get; set; } = ApplicationStatus.Pending;

    /// <summary>Optional free-text note from the creator to the brand.</summary>
    public string Note { get; set; } = string.Empty;

    // ── The draft video — metadata + bytes ──────────────────────────────────────────────────────
    public string DraftFileName { get; set; } = string.Empty;
    public string DraftContentType { get; set; } = string.Empty;
    public long DraftSizeBytes { get; set; }
    public byte[] DraftContent { get; set; } = [];

    /// <summary>When the current draft was submitted — updated on each re-submit (unlike CreatedAt).</summary>
    public DateTimeOffset SubmittedAt { get; set; }

    // ── The brand's review decision (set when Status leaves Pending) ─────────────────────────────
    /// <summary>Set only on a rejection — pairs with <see cref="DecisionNote"/> so the creator knows what to fix.</summary>
    public RejectionReason? RejectionReason { get; set; }
    /// <summary>The brand's free-text note on its decision (required on a rejection).</summary>
    public string DecisionNote { get; set; } = string.Empty;
    public DateTimeOffset? DecidedAt { get; set; }
}
