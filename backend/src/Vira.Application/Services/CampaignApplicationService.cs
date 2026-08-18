using Microsoft.EntityFrameworkCore;
using Vira.Abstractions.DTOs;
using Vira.Abstractions.Models.Campaigns;
using Vira.DataAccess;

namespace Vira.Application.Services;

/// <summary>A draft video handed from the controller to the service — plain bytes + metadata, so the
/// ASP.NET <c>IFormFile</c> type stays in the Api layer (dependency direction: Api → Application).</summary>
public record DraftUpload(byte[] Content, string FileName, string ContentType, long SizeBytes);

/// <summary>Why a create attempt landed where it did, so the controller can map to 404 / 403 / 200.</summary>
public enum ApplicationOutcome { Ok, CampaignNotFound, Locked }

public record ApplicationResult(ApplicationOutcome Outcome, CampaignApplicationDto? Application)
{
    public static readonly ApplicationResult CampaignNotFound = new(ApplicationOutcome.CampaignNotFound, null);
    public static readonly ApplicationResult Locked = new(ApplicationOutcome.Locked, null);
    public static ApplicationResult Ok(CampaignApplicationDto dto) => new(ApplicationOutcome.Ok, dto);
}

public interface ICampaignApplicationService
{
    /// <summary>Upsert the signed-in creator's application (with its draft) to a campaign. Idempotent per
    /// (creator, campaign): a re-submit replaces the draft and resets the status to Pending. Returns a
    /// result the controller maps to 404 (no such active campaign) / 403 (below the follower gate) / 200.</summary>
    Task<ApplicationResult> CreateAsync(Guid creatorId, Guid campaignId, DraftUpload draft, string note, CancellationToken ct = default);

    /// <summary>The signed-in creator's applications (metadata only, no draft bytes), newest first.</summary>
    Task<IReadOnlyList<CampaignApplicationDto>> ListForCreatorAsync(Guid creatorId, CancellationToken ct = default);

    /// <summary>Fetch the draft bytes for one of the creator's own applications, or null if not theirs.</summary>
    Task<DraftUpload?> GetDraftAsync(Guid creatorId, Guid applicationId, CancellationToken ct = default);

    // ── Brand side (the approval queue) ─────────────────────────────────────────────────────────

    /// <summary>Every application to the given business's campaigns (metadata only), newest first.</summary>
    Task<IReadOnlyList<BrandSubmissionDto>> ListForBrandAsync(Guid businessId, CancellationToken ct = default);

    /// <summary>Record the brand's decision on a submission. Returns false if the application doesn't
    /// exist or isn't for one of this business's campaigns. The caller enforces that a rejection carries
    /// a reason + note.</summary>
    Task<bool> DecideAsync(Guid businessId, Guid applicationId, bool approve, RejectionReason? reason, string? note, CancellationToken ct = default);

    /// <summary>Fetch the draft bytes for a submission to one of the business's campaigns, or null.</summary>
    Task<DraftUpload?> GetDraftForBrandAsync(Guid businessId, Guid applicationId, CancellationToken ct = default);
}

public class CampaignApplicationService(ViraDbContext db) : ICampaignApplicationService
{
    /// <summary>Server-side cap on a draft upload. Mirrors the frontend's 200 MB limit.</summary>
    public const int MaxDraftMb = 200;
    public const long MaxDraftBytes = (long)MaxDraftMb * 1024 * 1024;

    /// <summary>Draft container formats we accept — MP4 and MOV.</summary>
    public static readonly IReadOnlySet<string> AcceptedContentTypes =
        new HashSet<string> { "video/mp4", "video/quicktime" };

    private static CampaignApplicationDto ToDto(CampaignApplication a) => new()
    {
        Id = a.Id,
        CampaignId = a.CampaignId,
        Status = a.Status,
        Note = a.Note,
        DraftFileName = a.DraftFileName,
        DraftContentType = a.DraftContentType,
        DraftSizeBytes = a.DraftSizeBytes,
        SubmittedAt = a.SubmittedAt,
    };

    public async Task<ApplicationResult> CreateAsync(
        Guid creatorId, Guid campaignId, DraftUpload draft, string note, CancellationToken ct = default)
    {
        var creator = await db.Creators.FirstOrDefaultAsync(c => c.Id == creatorId, ct);
        if (creator is null)
            return ApplicationResult.CampaignNotFound;

        var campaign = await db.Campaigns
            .FirstOrDefaultAsync(c => c.Id == campaignId && c.Status == CampaignStatus.Active, ct);
        if (campaign is null)
            return ApplicationResult.CampaignNotFound;

        // Same hard gate the feed applies: a product-placement campaign below the follower threshold
        // is not applicable (the creator would have to buy the product themselves).
        var locked = campaign.AccessRule.ProductPlacement
                     && creator.FollowerCount < campaign.AccessRule.MinFollowerThreshold;
        if (locked)
            return ApplicationResult.Locked;

        // One application per (creator, campaign): re-submitting replaces the draft rather than piling
        // up rows. A fresh draft re-enters the queue, so the status resets to Pending.
        var application = await db.CampaignApplications
            .FirstOrDefaultAsync(a => a.CreatorId == creatorId && a.CampaignId == campaignId, ct);
        if (application is null)
        {
            application = new CampaignApplication { CreatorId = creatorId, CampaignId = campaignId };
            db.CampaignApplications.Add(application);
        }

        application.Status = ApplicationStatus.Pending;
        application.Note = note;
        application.DraftFileName = draft.FileName;
        application.DraftContentType = draft.ContentType;
        application.DraftSizeBytes = draft.SizeBytes;
        application.DraftContent = draft.Content;
        application.SubmittedAt = DateTimeOffset.UtcNow;

        await db.SaveChangesAsync(ct);
        return ApplicationResult.Ok(ToDto(application));
    }

    public async Task<IReadOnlyList<CampaignApplicationDto>> ListForCreatorAsync(Guid creatorId, CancellationToken ct = default)
    {
        // Join campaign (title) and business (brand name) so the creator sees what they applied to
        // and the brand's decision. Project in SQL so the draft bytes are never materialized here.
        return await (
            from a in db.CampaignApplications
            join c in db.Campaigns on a.CampaignId equals c.Id
            join b in db.Businesses on c.BusinessId equals b.Id
            where a.CreatorId == creatorId
            orderby a.SubmittedAt descending
            select new CampaignApplicationDto
            {
                Id = a.Id,
                CampaignId = a.CampaignId,
                CampaignName = c.Title,
                BrandName = b.CompanyName,
                Status = a.Status,
                Note = a.Note,
                DraftFileName = a.DraftFileName,
                DraftContentType = a.DraftContentType,
                DraftSizeBytes = a.DraftSizeBytes,
                SubmittedAt = a.SubmittedAt,
                RejectionReason = a.RejectionReason,
                DecisionNote = a.DecisionNote,
                DecidedAt = a.DecidedAt,
            })
            .ToListAsync(ct);
    }

    public async Task<DraftUpload?> GetDraftAsync(Guid creatorId, Guid applicationId, CancellationToken ct = default)
    {
        var a = await db.CampaignApplications
            .FirstOrDefaultAsync(x => x.Id == applicationId && x.CreatorId == creatorId, ct);
        return a is null ? null : new DraftUpload(a.DraftContent, a.DraftFileName, a.DraftContentType, a.DraftSizeBytes);
    }

    // ── Brand side ──────────────────────────────────────────────────────────────────────────────

    public async Task<IReadOnlyList<BrandSubmissionDto>> ListForBrandAsync(Guid businessId, CancellationToken ct = default)
    {
        // Join campaign (for name + ownership) and creator (for identity); project in SQL so the draft
        // bytes are never materialized here.
        return await (
            from a in db.CampaignApplications
            join c in db.Campaigns on a.CampaignId equals c.Id
            join cr in db.Creators on a.CreatorId equals cr.Id
            where c.BusinessId == businessId
            orderby a.SubmittedAt descending
            select new BrandSubmissionDto
            {
                Id = a.Id,
                CampaignId = a.CampaignId,
                CampaignName = c.Title,
                CreatorName = cr.DisplayName,
                CreatorFollowers = cr.FollowerCount,
                CreatorAvatarUrl = cr.AvatarUrl,
                Status = a.Status,
                CreatorNote = a.Note,
                DraftFileName = a.DraftFileName,
                DraftContentType = a.DraftContentType,
                DraftSizeBytes = a.DraftSizeBytes,
                SubmittedAt = a.SubmittedAt,
                RejectionReason = a.RejectionReason,
                DecisionNote = a.DecisionNote,
                DecidedAt = a.DecidedAt,
            })
            .ToListAsync(ct);
    }

    public async Task<bool> DecideAsync(
        Guid businessId, Guid applicationId, bool approve, RejectionReason? reason, string? note, CancellationToken ct = default)
    {
        // Load the application only if it belongs to one of this business's campaigns.
        var application = await (
            from a in db.CampaignApplications
            join c in db.Campaigns on a.CampaignId equals c.Id
            where a.Id == applicationId && c.BusinessId == businessId
            select a)
            .FirstOrDefaultAsync(ct);
        if (application is null)
            return false;

        if (approve)
        {
            application.Status = ApplicationStatus.Approved;
            application.RejectionReason = null;
            application.DecisionNote = note ?? string.Empty;
        }
        else
        {
            application.Status = ApplicationStatus.Rejected;
            application.RejectionReason = reason;
            application.DecisionNote = note ?? string.Empty;
        }
        application.DecidedAt = DateTimeOffset.UtcNow;

        await db.SaveChangesAsync(ct);
        return true;
    }

    public async Task<DraftUpload?> GetDraftForBrandAsync(Guid businessId, Guid applicationId, CancellationToken ct = default)
    {
        var a = await (
            from app in db.CampaignApplications
            join c in db.Campaigns on app.CampaignId equals c.Id
            where app.Id == applicationId && c.BusinessId == businessId
            select app)
            .FirstOrDefaultAsync(ct);
        return a is null ? null : new DraftUpload(a.DraftContent, a.DraftFileName, a.DraftContentType, a.DraftSizeBytes);
    }
}
