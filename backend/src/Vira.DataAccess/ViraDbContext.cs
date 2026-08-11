using Microsoft.AspNetCore.DataProtection.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;
using Vira.Abstractions.Common;
using Vira.Abstractions.Models.Campaigns;
using Vira.Abstractions.Models.Creators;
using Vira.Abstractions.Models.Identity;

namespace Vira.DataAccess;

/// <summary>
/// EF Core context. Postgres, schema-per-service (D4). Covers auth + business + campaign and the
/// authenticated-creator slice (Creator/TikTokConnection/CreatorClip). Media/billing/match DbSets
/// return with their own slices. Also stores the Data Protection key ring (token encryption) so it
/// survives container restarts.
/// </summary>
public class ViraDbContext(DbContextOptions<ViraDbContext> options)
    : DbContext(options), IDataProtectionKeyContext
{
    public DbSet<Account> Accounts => Set<Account>();
    public DbSet<Session> Sessions => Set<Session>();
    public DbSet<Business> Businesses => Set<Business>();
    public DbSet<BusinessQuestionnaire> BusinessQuestionnaires => Set<BusinessQuestionnaire>();
    public DbSet<Campaign> Campaigns => Set<Campaign>();

    // Authenticated creator (their own real TikTok data). The 50-creator brand roster stays in the
    // in-memory seed for now.
    public DbSet<Creator> Creators => Set<Creator>();
    public DbSet<TikTokConnection> TikTokConnections => Set<TikTokConnection>();
    public DbSet<CreatorClip> CreatorClips => Set<CreatorClip>();
    public DbSet<ClipAnalysis> ClipAnalyses => Set<ClipAnalysis>();
    public DbSet<CreatorQuestionnaire> CreatorQuestionnaires => Set<CreatorQuestionnaire>();

    // ASP.NET Data Protection key ring (persisted for durable token encryption).
    public DbSet<DataProtectionKey> DataProtectionKeys => Set<DataProtectionKey>();

    // Deferred until their persistence slices land: Portraits,
    // Matches, FeedClips, TestClips, ViewSnapshots, Payouts.

    protected override void OnModelCreating(ModelBuilder b)
    {
        b.Entity<Campaign>(e =>
        {
            // Money is integer EUR cents — store the raw long, no floating point (CLAUDE.md rule 1).
            e.Property(c => c.Budget).HasConversion(m => m.Cents, v => new Money(v));

            // Value objects stored as JSONB.
            e.OwnsOne(c => c.Brief, o => o.ToJson());
            e.OwnsOne(c => c.TargetStyleVector, o => o.ToJson());
            e.OwnsOne(c => c.AccessRule, o => o.ToJson());
        });

        b.Entity<BusinessQuestionnaire>(e =>
        {
            // Scalar collections → Postgres arrays / primitive-collection columns.
            e.PrimitiveCollection(q => q.Verticals);
            e.PrimitiveCollection(q => q.TargetAudienceAges);
            e.PrimitiveCollection(q => q.Values);
            e.PrimitiveCollection(q => q.CompetitorBrands);
        });

        b.Entity<CreatorQuestionnaire>(e =>
        {
            // Scalar collections → primitive-collection columns; the complex prior-sponsorship list → JSONB.
            e.PrimitiveCollection(q => q.PreferredCategories);
            e.PrimitiveCollection(q => q.ExcludedCategories);
            e.PrimitiveCollection(q => q.Goals);
            e.PrimitiveCollection(q => q.Values);
            e.PrimitiveCollection(q => q.PreferredFormats);
            e.PrimitiveCollection(q => q.ContentLanguages);
            e.PrimitiveCollection(q => q.ExcludedBrands);
            e.OwnsMany(q => q.PriorSponsorships, o => o.ToJson());
        });

        // The whole scored analysis is stored verbatim as one JSONB column.
        b.Entity<ClipAnalysis>(e => e.Property(x => x.AnalysisJson).HasColumnType("jsonb"));
    }
}
