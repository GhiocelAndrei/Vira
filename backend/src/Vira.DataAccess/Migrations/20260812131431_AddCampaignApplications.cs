using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Vira.DataAccess.Migrations
{
    /// <inheritdoc />
    public partial class AddCampaignApplications : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "CampaignApplications",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    CreatorId = table.Column<Guid>(type: "uuid", nullable: false),
                    CampaignId = table.Column<Guid>(type: "uuid", nullable: false),
                    Status = table.Column<int>(type: "integer", nullable: false),
                    Note = table.Column<string>(type: "text", nullable: false),
                    DraftFileName = table.Column<string>(type: "text", nullable: false),
                    DraftContentType = table.Column<string>(type: "text", nullable: false),
                    DraftSizeBytes = table.Column<long>(type: "bigint", nullable: false),
                    DraftContent = table.Column<byte[]>(type: "bytea", nullable: false),
                    SubmittedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_CampaignApplications", x => x.Id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_CampaignApplications_CreatorId_CampaignId",
                table: "CampaignApplications",
                columns: new[] { "CreatorId", "CampaignId" },
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "CampaignApplications");
        }
    }
}
