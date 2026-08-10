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
}

public class CreatorService(ViraDbContext db, ICampaignMatcher matcher) : ICreatorService
{

    public async Task<CreatorProfileDto?> GetProfileAsync(Guid creatorId, CancellationToken ct = default)
    {
        var creator = await db.Creators.FirstOrDefaultAsync(c => c.Id == creatorId, ct);
        if (creator is null)
            return null;

        var clips = await db.CreatorClips
            .Where(c => c.CreatorId == creatorId)
            .OrderByDescending(c => c.TikTokCreateTime)
            .ToListAsync(ct);

        return new CreatorProfileDto
        {
            Id = creator.Id,
            DisplayName = creator.DisplayName,
            FollowerCount = creator.FollowerCount,
            AvatarUrl = creator.AvatarUrl,
            Niche = creator.Niche,
            Clips = [.. clips.Select(c => new ClipDto
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
            })],
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
