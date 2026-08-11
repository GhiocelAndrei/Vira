using System;
using System.Collections.Generic;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Vira.DataAccess.Migrations
{
    /// <inheritdoc />
    public partial class CreatorQuestionnaire : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "CreatorQuestionnaires",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    CreatorId = table.Column<Guid>(type: "uuid", nullable: false),
                    PreferredCategories = table.Column<int[]>(type: "integer[]", nullable: false),
                    ExcludedCategories = table.Column<int[]>(type: "integer[]", nullable: false),
                    AcceptsShippedProducts = table.Column<bool>(type: "boolean", nullable: false),
                    CanPurchaseProducts = table.Column<bool>(type: "boolean", nullable: false),
                    TravelWillingness = table.Column<int>(type: "integer", nullable: false),
                    Goals = table.Column<List<string>>(type: "text[]", nullable: false),
                    Values = table.Column<List<string>>(type: "text[]", nullable: false),
                    PreferredFormats = table.Column<List<string>>(type: "text[]", nullable: false),
                    ContentLanguages = table.Column<List<string>>(type: "text[]", nullable: false),
                    ExcludedBrands = table.Column<List<string>>(type: "text[]", nullable: false),
                    AllowsAlcohol = table.Column<bool>(type: "boolean", nullable: false),
                    AllowsGambling = table.Column<bool>(type: "boolean", nullable: false),
                    AllowsPolitical = table.Column<bool>(type: "boolean", nullable: false),
                    CollabCapacityPerMonth = table.Column<int>(type: "integer", nullable: false),
                    SelfDescribedAudience = table.Column<string>(type: "text", nullable: false),
                    CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    PriorSponsorships = table.Column<string>(type: "jsonb", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_CreatorQuestionnaires", x => x.Id);
                });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "CreatorQuestionnaires");
        }
    }
}
