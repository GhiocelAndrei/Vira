using Microsoft.EntityFrameworkCore;
using Vira.Abstractions.DTOs;
using Vira.Abstractions.Models.Campaigns;
using Vira.Abstractions.Models.Creators;
using Vira.DataAccess;

namespace Vira.Application.Services;

public interface ICreatorService
{
    /// <summary>The authenticated creator's real profile + cached clips, or null if not found.</summary>
    Task<CreatorProfileDto?> GetProfileAsync(Guid creatorId, CancellationToken ct = default);

    /// <summary>Persist an AI video-analysis for one of a creator's clips (append-only). Returns false
    /// if the creator has no clip with that TikTok video id.</summary>
    Task<bool> SaveClipAnalysisAsync(Guid creatorId, string tikTokVideoId, ClipAnalysisDto dto, CancellationToken ct = default);

    /// <summary>Active campaigns for the creator feed / marketplace, with match + follower gate applied.</summary>
    Task<IReadOnlyList<FeedCampaignDto>> GetFeedAsync(Guid creatorId, CancellationToken ct = default);

    /// <summary>Persist the creator's onboarding clip selection: keep only the given clips (each must
    /// be one we fetched on login) and delete the rest. The caller enforces the 1..10 count bound.</summary>
    Task<ClipSelectionResult> SelectClipsAsync(Guid creatorId, IReadOnlyList<string> tikTokVideoIds, CancellationToken ct = default);

    /// <summary>Upsert the creator's onboarding questionnaire (matching preferences + business intent).
    /// Returns false if the creator doesn't exist.</summary>
    Task<bool> SaveQuestionnaireAsync(Guid creatorId, QuestionnaireDto dto, CancellationToken ct = default);

    /// <summary>Dev-only: clear the creator's onboarding flags (clip selection + questionnaire) so the
    /// guided flow runs again. Returns false if the creator doesn't exist.</summary>
    Task<bool> ResetOnboardingAsync(Guid creatorId, CancellationToken ct = default);
}

/// <summary>Outcome of a clip-selection request, so the controller can map to 404 / 400 / 200.</summary>
public record ClipSelectionResult(bool CreatorFound, IReadOnlyList<string> UnknownVideoIds, IReadOnlyList<ClipDto> Selected)
{
    public static readonly ClipSelectionResult NotFound = new(false, [], []);
    public static ClipSelectionResult Unknown(IReadOnlyList<string> ids) => new(true, ids, []);
    public static ClipSelectionResult Ok(IReadOnlyList<ClipDto> selected) => new(true, [], selected);
}

public class CreatorService(ViraDbContext db, ICampaignMatcher matcher) : ICreatorService
{
    /// <summary>Hard cap on how many clips a creator may keep from their onboarding selection.</summary>
    public const int MaxSelectedClips = 10;

    private static ClipDto ToClipDto(CreatorClip c) => new()
    {
        TikTokVideoId = c.TikTokVideoId,
        Title = c.Title,
        CoverImageUrl = c.CoverImageUrl,
        EmbedLink = c.EmbedLink,
        ViewCount = c.ViewCount,
        LikeCount = c.LikeCount,
        CommentCount = c.CommentCount,
        ShareCount = c.ShareCount,
        TikTokCreateTime = c.TikTokCreateTime,
    };

    public async Task<CreatorProfileDto?> GetProfileAsync(Guid creatorId, CancellationToken ct = default)
    {
        var creator = await db.Creators.FirstOrDefaultAsync(c => c.Id == creatorId, ct);
        if (creator is null)
            return null;

        var clips = await db.CreatorClips
            .Where(c => c.CreatorId == creatorId)
            .OrderByDescending(c => c.TikTokCreateTime)
            .ToListAsync(ct);

        var questionnaireComplete = await db.CreatorQuestionnaires.AnyAsync(q => q.CreatorId == creatorId, ct);

        return new CreatorProfileDto
        {
            Id = creator.Id,
            DisplayName = creator.DisplayName,
            FollowerCount = creator.FollowerCount,
            AvatarUrl = creator.AvatarUrl,
            Niche = creator.Niche,
            ClipsSelected = creator.ClipsSelected,
            QuestionnaireComplete = questionnaireComplete,
            Clips = [.. clips.Select(ToClipDto)],
            Aggregates = ClipAggregates.From(clips),
        };
    }

    public async Task<bool> SaveClipAnalysisAsync(Guid creatorId, string tikTokVideoId, ClipAnalysisDto dto, CancellationToken ct = default)
    {
        // Resolve the clip and confirm it belongs to this creator in one query.
        var clip = await db.CreatorClips
            .FirstOrDefaultAsync(c => c.CreatorId == creatorId && c.TikTokVideoId == tikTokVideoId, ct);
        if (clip is null)
            return false;

        db.ClipAnalyses.Add(new ClipAnalysis
        {
            ClipId = clip.Id,
            AiModel = dto.AiModel,
            PromptVersion = dto.PromptVersion,
            OntologyVersion = dto.OntologyVersion,
            AnalyzedAt = dto.AnalyzedAt,
            AnalysisJson = dto.Analysis.GetRawText(),   // store the AI output verbatim
        });
        await db.SaveChangesAsync(ct);
        return true;
    }

    public async Task<ClipSelectionResult> SelectClipsAsync(Guid creatorId, IReadOnlyList<string> tikTokVideoIds, CancellationToken ct = default)
    {
        var creator = await db.Creators.FirstOrDefaultAsync(c => c.Id == creatorId, ct);
        if (creator is null)
            return ClipSelectionResult.NotFound;

        var requested = tikTokVideoIds.Distinct().ToList();

        // Only clips we actually fetched for this creator can be selected — this is how ownership is
        // enforced (the fetch on login was ownership-validated by TikTok's video/query).
        var clips = await db.CreatorClips.Where(c => c.CreatorId == creatorId).ToListAsync(ct);
        var owned = clips.Select(c => c.TikTokVideoId).ToHashSet();
        var unknown = requested.Where(id => !owned.Contains(id)).ToList();
        if (unknown.Count > 0)
            return ClipSelectionResult.Unknown(unknown);

        // Keep only the selected clips; drop the rest of the fetched candidates. Mark onboarding done
        // so future logins refresh metrics instead of re-fetching the whole pool (which would un-select).
        var toRemove = clips.Where(c => !requested.Contains(c.TikTokVideoId)).ToList();
        db.CreatorClips.RemoveRange(toRemove);
        creator.ClipsSelected = true;
        await db.SaveChangesAsync(ct);

        var kept = clips
            .Where(c => requested.Contains(c.TikTokVideoId))
            .OrderByDescending(c => c.TikTokCreateTime)
            .Select(ToClipDto)
            .ToList();
        return ClipSelectionResult.Ok(kept);
    }

    public async Task<bool> SaveQuestionnaireAsync(Guid creatorId, QuestionnaireDto dto, CancellationToken ct = default)
    {
        if (!await db.Creators.AnyAsync(c => c.Id == creatorId, ct))
            return false;

        var q = await db.CreatorQuestionnaires.FirstOrDefaultAsync(x => x.CreatorId == creatorId, ct);
        if (q is null)
        {
            q = new CreatorQuestionnaire { CreatorId = creatorId };
            db.CreatorQuestionnaires.Add(q);
        }

        q.PreferredCategories = dto.PreferredCategories;
        q.ExcludedCategories = dto.ExcludedCategories;
        q.AcceptsShippedProducts = dto.AcceptsShippedProducts;
        q.CanPurchaseProducts = dto.CanPurchaseProducts;
        q.TravelWillingness = dto.TravelWillingness;
        q.Goals = dto.Goals;
        q.Values = dto.Values;
        q.PreferredFormats = dto.PreferredFormats;
        q.ContentLanguages = dto.ContentLanguages;
        q.ExcludedBrands = dto.ExcludedBrands;
        q.AllowsAlcohol = dto.AllowsAlcohol;
        q.AllowsGambling = dto.AllowsGambling;
        q.AllowsPolitical = dto.AllowsPolitical;
        q.CollabCapacityPerMonth = dto.CollabCapacityPerMonth;
        q.SelfDescribedAudience = dto.SelfDescribedAudience;
        q.PriorSponsorships = [.. dto.PriorSponsorships.Select(p =>
            new PriorSponsorship { BrandName = p.BrandName, Category = p.Category })];

        await db.SaveChangesAsync(ct);
        return true;
    }

    public async Task<bool> ResetOnboardingAsync(Guid creatorId, CancellationToken ct = default)
    {
        var creator = await db.Creators.FirstOrDefaultAsync(c => c.Id == creatorId, ct);
        if (creator is null)
            return false;

        creator.ClipsSelected = false;
        await db.CreatorQuestionnaires.Where(q => q.CreatorId == creatorId).ExecuteDeleteAsync(ct);
        await db.SaveChangesAsync(ct);
        return true;
    }

    public async Task<IReadOnlyList<FeedCampaignDto>> GetFeedAsync(Guid creatorId, CancellationToken ct = default)
    {
        var creator = await db.Creators.FirstOrDefaultAsync(c => c.Id == creatorId, ct);
        if (creator is null)
            return [];

        var campaigns = await db.Campaigns
            .Where(c => c.Status == CampaignStatus.Active)
            .ToListAsync(ct);
        if (campaigns.Count == 0)
            return [];

        var businessIds = campaigns.Select(c => c.BusinessId).Distinct().ToList();
        var brandNames = await db.Businesses
            .Where(b => businessIds.Contains(b.Id))
            .ToDictionaryAsync(b => b.Id, b => b.CompanyName, ct);

        return campaigns
            .Select(c =>
            {
                var m = matcher.Match(creator, c);
                return new FeedCampaignDto
                {
                    Id = c.Id,
                    BrandName = brandNames.GetValueOrDefault(c.BusinessId, string.Empty),
                    Title = c.Title,
                    Objective = c.Brief.Objective,
                    Category = c.Category,
                    Deadline = c.Deadline,
                    Message = c.Brief.Message,
                    Hashtags = c.Brief.Hashtags,
                    Mention = c.Brief.Mention,
                    Requirements = c.Brief.Requirements,
                    DurationPreset = c.Brief.DurationPreset,
                    BudgetMinor = c.Budget.Cents,
                    MinFollowerThreshold = c.AccessRule.MinFollowerThreshold,
                    ProductPlacement = c.AccessRule.ProductPlacement,
                    Locked = c.AccessRule.ProductPlacement && creator.FollowerCount < c.AccessRule.MinFollowerThreshold,
                    MatchPercent = m.Percent,
                    MatchReasons = [.. m.Reasons],
                    CreatedAt = c.CreatedAt,
                };
            })
            .OrderByDescending(x => x.MatchPercent)
            .ThenByDescending(x => x.CreatedAt)
            .ToList();
    }
}
