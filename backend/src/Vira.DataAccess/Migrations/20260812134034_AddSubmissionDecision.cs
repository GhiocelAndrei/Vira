using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Vira.DataAccess.Migrations
{
    /// <inheritdoc />
    public partial class AddSubmissionDecision : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateTimeOffset>(
                name: "DecidedAt",
                table: "CampaignApplications",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "DecisionNote",
                table: "CampaignApplications",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<int>(
                name: "RejectionReason",
                table: "CampaignApplications",
                type: "integer",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "DecidedAt",
                table: "CampaignApplications");

            migrationBuilder.DropColumn(
                name: "DecisionNote",
                table: "CampaignApplications");

            migrationBuilder.DropColumn(
                name: "RejectionReason",
                table: "CampaignApplications");
        }
    }
}
