using FirebaseAdmin.Auth;
using Microsoft.EntityFrameworkCore;
using Vira.Abstractions.Common;
using Vira.Abstractions.DTOs;
using Vira.Abstractions.Models.Campaigns;
using Vira.Abstractions.Models.Creators;
using Vira.Abstractions.Models.Identity;
using Vira.Application.Interfaces;
using Vira.DataAccess;

namespace Vira.Application.Services;

/// <summary>Auth (Firebase for brands, TikTok for creators) + server-side sessions over EF.</summary>
public class AuthService(ViraDbContext db, ITikTokClient tiktok, ITokenProtector tokens) : IAuthService
{
    private static readonly TimeSpan SessionLifetime = TimeSpan.FromDays(14);

    public async Task<AuthResultDto> AuthenticateWithFirebaseAsync(string idToken, CancellationToken ct = default)
    {
        var decoded = await FirebaseAuth.DefaultInstance.VerifyIdTokenAsync(idToken, ct);
        var uid = decoded.Uid;
        var email = decoded.Claims.TryGetValue("email", out var e) ? e?.ToString() ?? string.Empty : string.Empty;

        var account = await db.Accounts.FirstOrDefaultAsync(a => a.FirebaseUid == uid, ct);
        Business? business;
        if (account is null)
        {
            account = new Account { Email = email, Type = AccountType.Business, FirebaseUid = uid };
            db.Accounts.Add(account);
            business = new Business { AccountId = account.Id, CompanyName = string.Empty };
            db.Businesses.Add(business);
        }
        else
        {
            business = await db.Businesses.FirstOrDefaultAsync(x => x.AccountId == account.Id, ct);
            if (business is null)
            {
                business = new Business { AccountId = account.Id, CompanyName = string.Empty };
                db.Businesses.Add(business);
            }
        }

        var session = await OpenSessionAsync(account.Id, ct);
        var onboardingComplete = await db.BusinessQuestionnaires.AnyAsync(q => q.BusinessId == business.Id, ct);
        var companyName = string.IsNullOrWhiteSpace(business.CompanyName) ? null : business.CompanyName;

        return new AuthResultDto
        {
            SessionId = session.Id,
            ExpiresAt = session.ExpiresAt,
            Me = new MeDto
            {
                AccountId = account.Id,
                Email = account.Email,
                Type = account.Type,
                BusinessId = business.Id,
                CompanyName = companyName,
                DisplayName = companyName,
                OnboardingComplete = onboardingComplete,
            }
        };
    }

    public async Task<AuthResultDto> AuthenticateWithTikTokAsync(string code, CancellationToken ct = default)
    {
        var tokenSet = await tiktok.ExchangeCodeAsync(code, ct);
        var openId = tokenSet.OpenId;

        var connection = await db.TikTokConnections.FirstOrDefaultAsync(c => c.OpenId == openId, ct);
        Account account;
        Creator creator;
        if (connection is null)
        {
            account = new Account { Email = string.Empty, Type = AccountType.Creator };
            db.Accounts.Add(account);
            creator = new Creator { AccountId = account.Id };
            db.Creators.Add(creator);
            connection = new TikTokConnection { CreatorId = creator.Id, OpenId = openId };
            db.TikTokConnections.Add(connection);
        }
        else
        {
            creator = await db.Creators.FirstAsync(c => c.Id == connection.CreatorId, ct);
            account = await db.Accounts.FirstAsync(a => a.Id == creator.AccountId, ct);
        }

        // Refresh profile from user.info.
        var info = await tiktok.GetUserInfoAsync(tokenSet.AccessToken, ct);
        if (!string.IsNullOrWhiteSpace(info.DisplayName)) creator.DisplayName = info.DisplayName;
        creator.FollowerCount = info.FollowerCount;
        creator.AvatarUrl = info.AvatarUrl;

        // Fetch-live-on-login + cache: replace the cached clips (D4).
        var videos = await tiktok.GetVideosAsync(tokenSet.AccessToken, 20, ct);
        var stale = await db.CreatorClips.Where(c => c.CreatorId == creator.Id).ToListAsync(ct);
        db.CreatorClips.RemoveRange(stale);
        foreach (var v in videos)
        {
            db.CreatorClips.Add(new CreatorClip
            {
                CreatorId = creator.Id,
                TikTokVideoId = v.Id,
                Title = v.Title,
                CoverImageUrl = v.CoverImageUrl,
                EmbedLink = v.EmbedLink,
                ViewCount = v.ViewCount,
                LikeCount = v.LikeCount,
                CommentCount = v.CommentCount,
                ShareCount = v.ShareCount,
                TikTokCreateTime = v.CreateTime,
            });
        }

        // Store rotated tokens encrypted at rest.
        connection.AccessTokenEncrypted = tokens.Protect(tokenSet.AccessToken);
        connection.RefreshTokenEncrypted = tokens.Protect(tokenSet.RefreshToken);
        connection.ExpiresAt = DateTimeOffset.UtcNow.AddSeconds(tokenSet.ExpiresIn);
        connection.Scopes = tokenSet.Scope;

        var session = await OpenSessionAsync(account.Id, ct);

        return new AuthResultDto
        {
            SessionId = session.Id,
            ExpiresAt = session.ExpiresAt,
            Me = new MeDto
            {
                AccountId = account.Id,
                Email = account.Email,
                Type = account.Type,
                CreatorId = creator.Id,
                DisplayName = creator.DisplayName,
                OnboardingComplete = true,   // creators have no onboarding gate
            }
        };
    }

    // ── Dev login ────────────────────────────────────────────────────────────────────────────
    // No real OAuth: reuse (or seed once) a demo account and open a normal session. The controller
    // gates this behind App:DevAuth:Enabled so it can't be reached on a real prod backend.
    private const string DemoCreatorEmail = "demo-creator@dev.vira";
    private const string DemoBrandEmail = "demo-brand@dev.vira";

    public Task<AuthResultDto> DevLoginAsync(AccountType role, CancellationToken ct = default) =>
        role == AccountType.Creator ? DevCreatorAsync(ct) : DevBrandAsync(ct);

    private async Task<AuthResultDto> DevCreatorAsync(CancellationToken ct)
    {
        var account = await db.Accounts.FirstOrDefaultAsync(a => a.Email == DemoCreatorEmail, ct);
        Creator creator;
        if (account is null)
        {
            account = new Account { Email = DemoCreatorEmail, Type = AccountType.Creator };
            db.Accounts.Add(account);
            creator = new Creator
            {
                AccountId = account.Id,
                DisplayName = "Creator Demo",
                FollowerCount = 48_200,
                Niche = "Lifestyle",
                City = "Cluj-Napoca",
                County = "Cluj",
            };
            db.Creators.Add(creator);
            db.CreatorClips.AddRange(DemoClips(creator.Id));
        }
        else
        {
            creator = await db.Creators.FirstAsync(c => c.AccountId == account.Id, ct);
        }

        var session = await OpenSessionAsync(account.Id, ct);
        return new AuthResultDto
        {
            SessionId = session.Id,
            ExpiresAt = session.ExpiresAt,
            Me = new MeDto
            {
                AccountId = account.Id,
                Email = account.Email,
                Type = account.Type,
                CreatorId = creator.Id,
                DisplayName = creator.DisplayName,
                OnboardingComplete = true,
            }
        };
    }

    private async Task<AuthResultDto> DevBrandAsync(CancellationToken ct)
    {
        var account = await db.Accounts.FirstOrDefaultAsync(a => a.Email == DemoBrandEmail, ct);
        Business business;
        if (account is null)
        {
            account = new Account { Email = DemoBrandEmail, Type = AccountType.Business };
            db.Accounts.Add(account);
            business = new Business { AccountId = account.Id, CompanyName = "Brand Demo" };
            db.Businesses.Add(business);
            // A questionnaire so the demo brand lands on the dashboard, not onboarding.
            db.BusinessQuestionnaires.Add(new BusinessQuestionnaire
            {
                BusinessId = business.Id,
                Verticals = [CreatorCategory.Lifestyle, CreatorCategory.Food],
                CompanySize = CompanySize.Small,
                BudgetBand = BudgetBand.From1kTo5k,
                TargetAudienceAges = [AudienceAge.A18_24, AudienceAge.A25_34],
                PrimaryGoal = CampaignObjective.Awareness,
                Description = "Cont demo pentru dezvoltarea frontend-ului.",
                Website = "https://example.com",
            });
        }
        else
        {
            business = await db.Businesses.FirstAsync(b => b.AccountId == account.Id, ct);
        }

        var session = await OpenSessionAsync(account.Id, ct);
        return new AuthResultDto
        {
            SessionId = session.Id,
            ExpiresAt = session.ExpiresAt,
            Me = new MeDto
            {
                AccountId = account.Id,
                Email = account.Email,
                Type = account.Type,
                BusinessId = business.Id,
                CompanyName = business.CompanyName,
                DisplayName = business.CompanyName,
                OnboardingComplete = true,
            }
        };
    }

    private static IEnumerable<CreatorClip> DemoClips(Guid creatorId) =>
    [
        new() { CreatorId = creatorId, TikTokVideoId = "demo-1", Title = "O zi din viața mea",
            ViewCount = 128_400, LikeCount = 12_300, CommentCount = 540, ShareCount = 320,
            TikTokCreateTime = DateTimeOffset.UtcNow.AddDays(-6) },
        new() { CreatorId = creatorId, TikTokVideoId = "demo-2", Title = "Cafeaua de dimineață",
            ViewCount = 86_200, LikeCount = 9_100, CommentCount = 210, ShareCount = 140,
            TikTokCreateTime = DateTimeOffset.UtcNow.AddDays(-13) },
        new() { CreatorId = creatorId, TikTokVideoId = "demo-3", Title = "Recomandări de weekend",
            ViewCount = 203_900, LikeCount = 21_800, CommentCount = 900, ShareCount = 610,
            TikTokCreateTime = DateTimeOffset.UtcNow.AddDays(-21) },
    ];

    public async Task<SessionInfo?> ResolveSessionAsync(Guid sessionId, CancellationToken ct = default)
    {
        var session = await db.Sessions.FirstOrDefaultAsync(s => s.Id == sessionId, ct);
        if (session is null || session.ExpiresAt <= DateTimeOffset.UtcNow)
            return null;

        var account = await db.Accounts.FirstOrDefaultAsync(a => a.Id == session.AccountId, ct);
        if (account is null)
            return null;

        var businessId = await db.Businesses
            .Where(b => b.AccountId == account.Id).Select(b => (Guid?)b.Id).FirstOrDefaultAsync(ct);
        var creatorId = await db.Creators
            .Where(c => c.AccountId == account.Id).Select(c => (Guid?)c.Id).FirstOrDefaultAsync(ct);

        return new SessionInfo(account.Id, account.Type, businessId, creatorId);
    }

    public async Task<MeDto?> GetMeAsync(Guid accountId, CancellationToken ct = default)
    {
        var account = await db.Accounts.FirstOrDefaultAsync(a => a.Id == accountId, ct);
        if (account is null)
            return null;

        if (account.Type == AccountType.Creator)
        {
            var creator = await db.Creators.FirstOrDefaultAsync(c => c.AccountId == accountId, ct);
            return new MeDto
            {
                AccountId = account.Id,
                Email = account.Email,
                Type = account.Type,
                CreatorId = creator?.Id,
                DisplayName = creator?.DisplayName,
                OnboardingComplete = true,
            };
        }

        var business = await db.Businesses.FirstOrDefaultAsync(b => b.AccountId == accountId, ct);
        var onboardingComplete = business is not null
            && await db.BusinessQuestionnaires.AnyAsync(q => q.BusinessId == business.Id, ct);
        var companyName = string.IsNullOrWhiteSpace(business?.CompanyName) ? null : business!.CompanyName;

        return new MeDto
        {
            AccountId = account.Id,
            Email = account.Email,
            Type = account.Type,
            BusinessId = business?.Id,
            CompanyName = companyName,
            DisplayName = companyName,
            OnboardingComplete = onboardingComplete,
        };
    }

    public async Task LogoutAsync(Guid sessionId, CancellationToken ct = default)
    {
        await db.Sessions.Where(s => s.Id == sessionId).ExecuteDeleteAsync(ct);
    }

    private async Task<Session> OpenSessionAsync(Guid accountId, CancellationToken ct)
    {
        var session = new Session { AccountId = accountId, ExpiresAt = DateTimeOffset.UtcNow + SessionLifetime };
        db.Sessions.Add(session);
        await db.SaveChangesAsync(ct);
        return session;
    }
}
