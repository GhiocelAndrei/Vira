using Microsoft.EntityFrameworkCore;
using Vira.Abstractions.Common;
using Vira.Abstractions.Models.Campaigns;
using Vira.Abstractions.Models.Identity;
using Vira.DataAccess;

namespace Vira.Application.Seed;

/// <summary>
/// Seeds a spread of real-brand demo campaigns into the DB so the creator feed / marketplace have
/// varied, realistic content. Idempotent and version-guarded: a hidden marker account records the
/// seed version, so bumping <see cref="SeedVersion"/> re-seeds once (old seed data is cleared first)
/// and every other startup is a no-op. Seeded brands have no Firebase login — they are only feed data.
/// </summary>
public static class DemoBrandSeeder
{
    private const string SeedEmailDomain = "@seed.vira";

    // Bump whenever the seeded content shape changes (e.g. new campaign fields) to force a one-time
    // re-seed of the demo data on the next startup.
    private const int SeedVersion = 2;
    private static string MarkerEmail => $"__seed_v{SeedVersion}{SeedEmailDomain}";

    public static async Task SeedAsync(ViraDbContext db, CancellationToken ct = default)
    {
        if (await db.Accounts.AnyAsync(a => a.Email == MarkerEmail, ct))
            return; // already at this seed version

        // Remove any prior-version seed data before re-inserting. Safe: seeded brands/campaigns carry
        // no ledger and are referenced only by read-time feed queries.
        var stale = await db.Accounts.Where(a => a.Email.EndsWith(SeedEmailDomain)).ToListAsync(ct);
        if (stale.Count > 0)
        {
            var staleAccountIds = stale.Select(a => a.Id).ToList();
            var staleBiz = await db.Businesses.Where(b => staleAccountIds.Contains(b.AccountId)).ToListAsync(ct);
            var staleBizIds = staleBiz.Select(b => b.Id).ToList();
            db.Campaigns.RemoveRange(db.Campaigns.Where(c => staleBizIds.Contains(c.BusinessId)));
            db.Businesses.RemoveRange(staleBiz);
            db.Accounts.RemoveRange(stale);
            await db.SaveChangesAsync(ct);
        }

        var now = DateTimeOffset.UtcNow;
        var brands = 0;
        var campaignCount = 0;

        foreach (var brand in Brands)
        {
            var account = new Account { Email = $"{brand.Slug}{SeedEmailDomain}", Type = AccountType.Business };
            var business = new Business { AccountId = account.Id, CompanyName = brand.Company };
            db.Accounts.Add(account);
            db.Businesses.Add(business);
            brands++;

            foreach (var c in brand.Campaigns)
            {
                db.Campaigns.Add(new Campaign
                {
                    BusinessId = business.Id,
                    Title = c.Title,
                    Status = CampaignStatus.Active,
                    Budget = new Money(c.BudgetMinor),
                    Category = c.Category,
                    Deadline = now.AddDays(c.DeadlineInDays),
                    Brief = new CampaignBrief
                    {
                        Objective = c.Objective,
                        Hashtags = [.. c.Hashtags],
                        Mention = c.Mention,
                        DurationPreset = c.Duration,
                        Requirements = [.. c.Requirements],
                        ExtraRequirements = string.Empty,
                        Message = c.Message,
                    },
                    AccessRule = new CampaignAccessRule
                    {
                        MinFollowerThreshold = c.MinFollowers,
                        ProductPlacement = c.ProductPlacement,
                    },
                });
                campaignCount++;
            }
        }

        // Marker so the next startup recognises this seed version and skips.
        db.Accounts.Add(new Account { Email = MarkerEmail, Type = AccountType.Business });

        await db.SaveChangesAsync(ct);
        Console.WriteLine($"[seed] demo brands added (v{SeedVersion}): {brands} brands, {campaignCount} campaigns");
    }

    private sealed record SeedCampaign(
        string Title,
        CampaignObjective Objective,
        CreatorCategory Category,  // brand vertical — the creator's "Nișă" filter
        long BudgetMinor,          // EUR cents
        int DeadlineInDays,        // campaign end, relative to seed time — the "Termen" sort
        string[] Hashtags,
        string? Mention,
        string Duration,
        string[] Requirements,
        string Message,
        long MinFollowers = 0,
        bool ProductPlacement = false);

    private sealed record SeedBrand(string Company, string Slug, SeedCampaign[] Campaigns);

    // ~17 real brands across verticals, each with an Active campaign. Budgets in EUR cents; deadlines
    // spread out so the "Termen" sort is meaningful; categories spread so the "Nișă" filter has range.
    private static readonly SeedBrand[] Brands =
    [
        // ── Fashion (→ Lifestyle) ───────────────────────────────────────────────────────────────
        new("Zara", "zara", [
            new("Colecția de toamnă", CampaignObjective.Launch, CreatorCategory.Lifestyle, 800_000, 30,
                ["#ZaraToamna"], "@zara", "15-60s",
                ["ținuta purtată în clip", "produsul vizibil"],
                "Arată cum porți tu piesele noii colecții — natural, în ziua ta.",
                MinFollowers: 10_000, ProductPlacement: true),
        ]),
        new("Answear", "answear", [
            new("Reduceri de sezon", CampaignObjective.Offer, CreatorCategory.Lifestyle, 400_000, 10,
                ["#answear", "#reduceri"], "@answear.ro", "15-30s",
                ["oferta spusă clar", "codul de reducere în descriere"],
                "Spune-le urmăritorilor de reducerile până la -50% și de codul tău."),
        ]),

        // ── Tech ─────────────────────────────────────────────────────────────────────────────
        new("eMAG", "emag", [
            new("Zilele eMAG", CampaignObjective.Awareness, CreatorCategory.Tech, 1_200_000, 14,
                ["#ZileleEmag"], "@emag.ro", "15-30s",
                ["numele campaniei spus în clip"],
                "Fă-le curioși pe urmăritorii tăi de ce urmează la Zilele eMAG."),
        ]),
        new("Samsung", "samsung", [
            new("Noul Galaxy", CampaignObjective.Launch, CreatorCategory.Tech, 1_500_000, 45,
                ["#Galaxy"], "@samsungromania", "30-60s",
                ["telefonul vizibil", "o funcție demonstrată"],
                "Arată o funcție a noului Galaxy care chiar te-a impresionat.",
                MinFollowers: 20_000, ProductPlacement: true),
        ]),
        new("Altex", "altex", [
            new("Setup-ul tău de acasă", CampaignObjective.Visits, CreatorCategory.Tech, 300_000, 25,
                ["#Altex"], "@altex.romania", "15-60s",
                ["produsul menționat"],
                "Ce gadget de la Altex îți face ziua mai ușoară?"),
        ]),

        // ── Restaurants / Food ─────────────────────────────────────────────────────────────────
        new("5 to go", "5togo", [
            new("Cafeaua ta de dimineață", CampaignObjective.Visits, CreatorCategory.Food, 200_000, 40,
                ["#5togo"], "@5togo", "7-15s",
                ["locația vizibilă", "orașul menționat"],
                "Filmează cafeaua ta de la 5 to go pe drum spre muncă sau facultate."),
        ]),
        new("Salad Box", "saladbox", [
            new("Prânz sănătos", CampaignObjective.Visits, CreatorCategory.Food, 150_000, 35,
                ["#SaladBox"], "@saladbox", "15-30s",
                ["produsul vizibil"],
                "Arată-le cum arată un prânz rapid și sănătos."),
        ]),
        new("Spartan", "spartan", [
            new("Poftă bună, Spartan!", CampaignObjective.Offer, CreatorCategory.Food, 250_000, 7,
                ["#Spartan"], "@spartan.romania", "15-30s",
                ["oferta spusă clar"],
                "Comandă preferată + oferta zilei, spusă natural."),
        ]),

        // ── Education ────────────────────────────────────────────────────────────────────────
        new("BRIO", "brio", [
            new("Testează-ți cunoștințele", CampaignObjective.Community, CreatorCategory.Education, 300_000, 60,
                ["#BRIO"], "@brio.ro", "up-to-3m",
                ["contul menționat"],
                "Dă un test BRIO pe camera și reacționează la scor."),
        ]),
        new("Kinderpedia", "kinderpedia", [
            new("Școala, mai simplă", CampaignObjective.Awareness, CreatorCategory.Education, 250_000, 50,
                ["#Kinderpedia"], "@kinderpedia", "30-60s",
                ["numele aplicației spus în clip"],
                "Dacă ești părinte sau profesor, spune ce te-ar ajuta cel mai mult."),
        ]),

        // ── Beauty ───────────────────────────────────────────────────────────────────────────
        new("Sephora", "sephora", [
            new("Rutina ta de vară", CampaignObjective.Launch, CreatorCategory.Beauty, 600_000, 21,
                ["#Sephora"], "@sephora_romania", "30-60s",
                ["produsul vizibil", "aplicarea demonstrată"],
                "Arată rutina ta cu noile produse de sezon.",
                MinFollowers: 15_000, ProductPlacement: true),
        ]),
        new("Farmec", "farmec", [
            new("Îngrijire made in Romania", CampaignObjective.Awareness, CreatorCategory.Beauty, 250_000, 55,
                ["#Farmec", "#GerovitalRO"], "@farmec.romania", "15-30s",
                ["numele brandului spus în clip"],
                "Spune de ce alegi un brand românesc de îngrijire."),
        ]),

        // ── Sport / Fitness ────────────────────────────────────────────────────────────────────
        new("Decathlon", "decathlon", [
            new("Mișcare în fiecare zi", CampaignObjective.Community, CreatorCategory.Sport, 400_000, 45,
                ["#Decathlon"], "@decathlon.romania", "15-60s",
                ["contul menționat"],
                "Arată sportul tău preferat și cum te echipezi pentru el."),
        ]),

        // ── Travel ───────────────────────────────────────────────────────────────────────────
        new("Wizz Air", "wizzair", [
            new("Zboruri de la 19 €", CampaignObjective.Offer, CreatorCategory.Travel, 350_000, 12,
                ["#WizzAir"], "@wizzair", "15-30s",
                ["oferta spusă clar", "perioada ofertei"],
                "Unde ai zbura data viitoare la prețul ăsta?"),
        ]),

        // ── Fintech (→ Lifestyle) ──────────────────────────────────────────────────────────────
        new("Revolut", "revolut", [
            new("Economisește cu Revolut", CampaignObjective.Community, CreatorCategory.Lifestyle, 500_000, 40,
                ["#Revolut"], "@revolut", "30-60s",
                ["contul menționat", "o funcție demonstrată"],
                "Arată cum folosești Revolut pentru economii sau împărțit nota."),
        ]),

        // ── Home / Retail (→ Lifestyle) ─────────────────────────────────────────────────────────
        new("Dedeman", "dedeman", [
            new("Renovează primăvara asta", CampaignObjective.Visits, CreatorCategory.Lifestyle, 450_000, 30,
                ["#Dedeman"], "@dedeman", "up-to-3m",
                ["locația vizibilă"],
                "Un proiect de weekend cu ce găsești la Dedeman."),
        ]),

        // ── Entertainment (→ Lifestyle) ─────────────────────────────────────────────────────────
        new("Netflix România", "netflix", [
            new("Ce vezi weekendul ăsta", CampaignObjective.Awareness, CreatorCategory.Lifestyle, 1_000_000, 18,
                ["#Netflix"], "@netflixro", "15-30s",
                ["titlul menționat"],
                "Recomandă un serial fără spoilere — doar de ce merită."),
        ]),
    ];
}
