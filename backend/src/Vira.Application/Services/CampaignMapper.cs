using Vira.Abstractions.Common;
using Vira.Abstractions.DTOs;
using Vira.Abstractions.Models.Campaigns;

namespace Vira.Application.Services;

/// <summary>
/// Pure mapping between the campaign DTOs and the entity. Kept side-effect-free so the money path
/// (budget as integer EUR cents) can be unit-tested without a database (CLAUDE.md rule 9).
/// </summary>
public static class CampaignMapper
{
    public static Campaign ToEntity(Guid businessId, CreateCampaignDto dto) => new()
    {
        BusinessId = businessId,
        Title = dto.Title,
        Budget = new Money(dto.BudgetMinor),   // integer cents in → stored verbatim
        Status = CampaignStatus.Active,
        Category = dto.Category,
        Deadline = dto.Deadline,
        Brief = new CampaignBrief
        {
            Objective = dto.Objective,
            Hashtags = dto.Hashtags,
            Mention = dto.Mention,
            DurationPreset = dto.DurationPreset,
            Requirements = dto.Requirements,
            ExtraRequirements = dto.ExtraRequirements,
            Message = dto.Message
        },
        AccessRule = new CampaignAccessRule
        {
            MinFollowerThreshold = dto.MinFollowerThreshold,
            ProductPlacement = dto.ProductPlacement
        }
        // TargetStyleVector left default — matching is a later slice.
    };

    public static CampaignDto ToDto(Campaign c) => new()
    {
        Id = c.Id,
        Title = c.Title,
        Status = c.Status,
        Objective = c.Brief.Objective,
        BudgetMinor = c.Budget.Cents,          // stored cents out → verbatim
        SpentMinor = 0,                        // no measurement/payouts yet
        Views = 0,
        CreatedAt = c.CreatedAt
    };
}
