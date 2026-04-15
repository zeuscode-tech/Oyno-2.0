from django.contrib import admin
from .models import Game, GameParticipant, GameResult


class ParticipantInline(admin.TabularInline):
    model = GameParticipant
    extra = 0
    readonly_fields = ["joined_at"]


@admin.register(Game)
class GameAdmin(admin.ModelAdmin):
    list_display = ["title", "sport_id", "venue", "date_time", "status", "players_joined", "players_total"]
    list_filter = ["sport_id", "status", "level"]
    search_fields = ["title", "venue__name"]
    inlines = [ParticipantInline]
    date_hierarchy = "date_time"
