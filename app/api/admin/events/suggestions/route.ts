import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getTokenFromRequest, verifyToken } from "@/lib/auth";

type SuggestionRow = {
  externalId: string;
  homeTeam: string;
  awayTeam: string;
  kickoffUtc: string;
  league: string;
};

type SuggestionsCacheEntry = {
  suggestions: SuggestionRow[];
  firstAvailableDay: string;
  updatedAt: number;
};

const FOOTBALL_DATA_BASE_URL = "https://api.football-data.org/v4";
const SUGGESTIONS_CACHE_TTL_MS = 15 * 60 * 1000;
const suggestionsCache = new Map<string, SuggestionsCacheEntry>();

function budapestDateKeyFromIso(isoUtc: string) {
  const date = new Date(isoUtc);
  if (Number.isNaN(date.getTime())) return "";

  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Budapest",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  const y = parts.find((p) => p.type === "year")?.value || "0000";
  const m = parts.find((p) => p.type === "month")?.value || "00";
  const d = parts.find((p) => p.type === "day")?.value || "00";
  return `${y}-${m}-${d}`;
}

function getTodayBudapestKey() {
  return budapestDateKeyFromIso(new Date().toISOString());
}

function getTomorrowBudapestKey() {
  const now = new Date();
  now.setUTCDate(now.getUTCDate() + 1);
  return budapestDateKeyFromIso(now.toISOString());
}

function toStringValue(value: unknown): string {
  if (typeof value === "string") return value.trim();
  if (typeof value === "number") return String(value);
  return "";
}

function extractName(value: unknown): string {
  if (typeof value === "string" || typeof value === "number") {
    return toStringValue(value);
  }
  if (value && typeof value === "object") {
    const obj = value as Record<string, unknown>;
    return toStringValue(obj.name) || toStringValue(obj.title) || toStringValue(obj.shortName);
  }
  return "";
}

function parseKickoff(value: unknown): string {
  if (typeof value === "number") {
    const ms = value < 1_000_000_000_000 ? value * 1000 : value;
    const d = new Date(ms);
    return Number.isNaN(d.getTime()) ? "" : d.toISOString();
  }

  if (typeof value === "string") {
    const numeric = Number(value);
    if (Number.isFinite(numeric) && value.trim() !== "") {
      return parseKickoff(numeric);
    }

    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? "" : d.toISOString();
  }

  return "";
}

function collectObjects(input: unknown, bucket: Record<string, unknown>[] = []): Record<string, unknown>[] {
  if (Array.isArray(input)) {
    for (const item of input) collectObjects(item, bucket);
    return bucket;
  }

  if (!input || typeof input !== "object") {
    return bucket;
  }

  const obj = input as Record<string, unknown>;
  bucket.push(obj);
  for (const value of Object.values(obj)) {
    if (Array.isArray(value) || (value && typeof value === "object")) {
      collectObjects(value, bucket);
    }
  }
  return bucket;
}

function extractSuggestions(payload: unknown, fallbackLeagueLabel: string): SuggestionRow[] {
  const objects = collectObjects(payload);
  const seen = new Set<string>();
  const result: SuggestionRow[] = [];

  for (const obj of objects) {
    const home =
      extractName(obj.homeTeam) ||
      extractName(obj.home_team) ||
      extractName(obj.home) ||
      extractName(obj.team_home) ||
      extractName(obj.strHomeTeam);

    const away =
      extractName(obj.awayTeam) ||
      extractName(obj.away_team) ||
      extractName(obj.away) ||
      extractName(obj.team_away) ||
      extractName(obj.strAwayTeam);

    const kickoffUtc =
      parseKickoff(obj.kickoff) ||
      parseKickoff(obj.kickoff_time) ||
      parseKickoff(obj.match_date) ||
      parseKickoff(obj.date) ||
      parseKickoff(obj.startTime) ||
      parseKickoff(obj.timestamp) ||
      parseKickoff(obj.strTimestamp) ||
      parseKickoff((obj.status as Record<string, unknown> | undefined)?.utcTime) ||
      parseKickoff((obj.status as Record<string, unknown> | undefined)?.utc_time);

    if (!home || !away || !kickoffUtc) {
      continue;
    }

    const externalId =
      toStringValue(obj.id) ||
      toStringValue(obj.match_id) ||
      toStringValue(obj.fixture_id) ||
      toStringValue(obj.event_id) ||
      toStringValue(obj.idEvent) ||
      `${home}-${away}-${kickoffUtc}`;

    const league =
      extractName(obj.league) ||
      extractName(obj.competition) ||
      extractName(obj.tournament) ||
      extractName(obj.league_name) ||
      fallbackLeagueLabel;

    const key = `${externalId}::${home}::${away}::${kickoffUtc}`.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);

    result.push({
      externalId,
      homeTeam: home,
      awayTeam: away,
      kickoffUtc,
      league: league || "Ismeretlen liga",
    });
  }

  return result;
}

function addDaysIso(day: string, days: number): string {
  const d = new Date(`${day}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

async function fetchFootballDataMatchesByRange(
  apiKey: string,
  competitionCode: string,
  dateFrom: string,
  dateTo: string
): Promise<SuggestionRow[]> {
  const url = `${FOOTBALL_DATA_BASE_URL}/competitions/${encodeURIComponent(competitionCode)}/matches?dateFrom=${encodeURIComponent(dateFrom)}&dateTo=${encodeURIComponent(dateTo)}`;

  const res = await fetch(url, {
    cache: "no-store",
    headers: {
      "X-Auth-Token": apiKey,
    },
  });

  if (!res.ok) {
    throw new Error(`football-data matches hiba: ${res.status}`);
  }

  const data = await res.json();
  const matches = Array.isArray(data?.matches) ? data.matches : [];

  return matches
    .map((row: Record<string, unknown>) => {
      const id = toStringValue(row.id);
      const utcDate = toStringValue(row.utcDate);

      const homeObj = row.homeTeam && typeof row.homeTeam === "object"
        ? (row.homeTeam as Record<string, unknown>)
        : null;
      const awayObj = row.awayTeam && typeof row.awayTeam === "object"
        ? (row.awayTeam as Record<string, unknown>)
        : null;
      const competitionObj = row.competition && typeof row.competition === "object"
        ? (row.competition as Record<string, unknown>)
        : null;

      const homeTeam = toStringValue(homeObj?.name);
      const awayTeam = toStringValue(awayObj?.name);
      const league = toStringValue(competitionObj?.name) || "Ismeretlen liga";

      if (!homeTeam || !awayTeam || !utcDate) return null;

      return {
        externalId: id || `${homeTeam}-${awayTeam}-${utcDate}`,
        homeTeam,
        awayTeam,
        kickoffUtc: utcDate,
        league,
      } as SuggestionRow;
    })
    .filter((item: SuggestionRow | null): item is SuggestionRow => Boolean(item));
}

export async function GET(req: NextRequest) {
  try {
    const token = getTokenFromRequest(req);
    if (!token) {
      return NextResponse.json({ message: "Nincs token" }, { status: 401 });
    }

    const decoded = verifyToken(token);
    if (!decoded) {
      return NextResponse.json({ message: "Érvénytelen token" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { role: true },
    });

    if (!user || user.role !== "ADMIN") {
      return NextResponse.json({ message: "Csak admin használhatja" }, { status: 403 });
    }

    const leagueId = req.nextUrl.searchParams.get("leagueId") || "47";
    const leagueName = req.nextUrl.searchParams.get("leagueName") || "";
    const requestedDayParam = req.nextUrl.searchParams.get("dayBudapest") || "";
    const fromUtc = req.nextUrl.searchParams.get("fromUtc");
    const toUtc = req.nextUrl.searchParams.get("toUtc");
    const tomorrowBudapest = getTomorrowBudapestKey();
    const requestedDayBudapest =
      requestedDayParam && requestedDayParam >= tomorrowBudapest
        ? requestedDayParam
        : tomorrowBudapest;
    const footballDataKey = process.env.FOOTBALL_DATA_API_KEY;
    const rapidApiKey = process.env.RAPIDAPI_KEY || process.env.API_FOOTBALL_KEY;
    const rapidApiHost = process.env.RAPIDAPI_HOST || "free-api-live-football-data.p.rapidapi.com";

    if (!footballDataKey && !rapidApiKey) {
      return NextResponse.json(
        { message: "Hiányzik a FOOTBALL_DATA_API_KEY vagy RAPIDAPI_KEY (API_FOOTBALL_KEY) környezeti változó." },
        { status: 500 }
      );
    }

    const endpointTemplateRaw =
      process.env.RAPIDAPI_FIXTURES_ENDPOINTS ||
      process.env.RAPIDAPI_FIXTURES_ENDPOINT ||
      "/football-get-all-matches-by-league?leagueid={leagueId},/football-get-match-score";

    const endpointTemplates = endpointTemplateRaw
      .split(",")
      .map((entry) => entry.trim())
      .filter(Boolean)
      .map((entry) => (entry.startsWith("/") ? entry : `/${entry}`));

    const cacheKey = `${leagueId}`;
    const cachedEntry = suggestionsCache.get(cacheKey);
    const hasFreshCache =
      Boolean(cachedEntry) && Date.now() - (cachedEntry?.updatedAt || 0) < SUGGESTIONS_CACHE_TTL_MS;

    let gathered: SuggestionRow[] = [];
    let lastExternalStatus: number | null = null;

    if (footballDataKey) {
      try {
        const selectedDayRows = await fetchFootballDataMatchesByRange(
          footballDataKey,
          leagueId,
          requestedDayBudapest,
          requestedDayBudapest
        );

        if (selectedDayRows.length > 0) {
          gathered = selectedDayRows;
        } else {
          const endDay = addDaysIso(requestedDayBudapest, 14);
          gathered = await fetchFootballDataMatchesByRange(
            footballDataKey,
            leagueId,
            requestedDayBudapest,
            endDay
          );
        }
      } catch (error) {
        // Néma fallback RapidAPI-ra
      }
    }

    for (const template of endpointTemplates) {
      if (gathered.length > 0 || !rapidApiKey) break;
      const rapidKey = rapidApiKey;

      const endpoint = template
        .replaceAll("{leagueId}", encodeURIComponent(leagueId))
        .replaceAll("{dayBudapest}", encodeURIComponent(requestedDayBudapest))
        .replaceAll("{fromUtc}", encodeURIComponent(fromUtc || ""))
        .replaceAll("{toUtc}", encodeURIComponent(toUtc || ""));

      const url = `https://${rapidApiHost}${endpoint}`;

      const res = await fetch(url, {
        cache: "no-store",
        headers: {
          "x-rapidapi-key": rapidKey,
          "x-rapidapi-host": rapidApiHost,
        },
      });

      lastExternalStatus = res.status;
      if (!res.ok) {
        continue;
      }

      const data = await res.json();
      const fallbackLeagueLabel = leagueName.trim() || `Liga #${leagueId}`;
      const rows = extractSuggestions(data, fallbackLeagueLabel);
      gathered = rows;

      if (rows.length > 0) {
        break;
      }
    }

    if (gathered.length === 0 && lastExternalStatus && lastExternalStatus >= 400) {
      if (hasFreshCache && cachedEntry && cachedEntry.suggestions.length > 0) {
        return NextResponse.json({
          suggestions: cachedEntry.suggestions,
          selectedLeague: leagueName || null,
          warning: `Külső API hiba (${lastExternalStatus}), ezért az utolsó sikeres lekérés adatait mutatjuk (${cachedEntry.firstAvailableDay}).`,
        });
      }

      return NextResponse.json({
        suggestions: [],
        selectedLeague: leagueName || null,
        warning:
          lastExternalStatus === 429
            ? "Az API ideiglenesen túlterhelt (429 Too Many Requests). Próbáld újra 1-2 perc múlva."
            : `Külső API hiba (${lastExternalStatus}). Ellenőrizd a RAPIDAPI_KEY és RAPIDAPI_HOST értékét a Vercel környezeti változókban.`,
      });
    }

    const upcomingSuggestions = gathered
      .filter((item) => {
        const dayKey = budapestDateKeyFromIso(item.kickoffUtc);
        return dayKey >= requestedDayBudapest;
      })
      .filter((item) => {
        const kickoff = new Date(item.kickoffUtc).getTime();
        if (Number.isNaN(kickoff)) return false;

        if (fromUtc) {
          const from = new Date(fromUtc).getTime();
          if (!Number.isNaN(from) && kickoff < from) return false;
        }

        if (toUtc) {
          const to = new Date(toUtc).getTime();
          if (!Number.isNaN(to) && kickoff > to) return false;
        }

        return true;
      })
      .sort((a, b) => new Date(a.kickoffUtc).getTime() - new Date(b.kickoffUtc).getTime());

    const selectedDaySuggestions = upcomingSuggestions.filter(
      (item) => budapestDateKeyFromIso(item.kickoffUtc) === requestedDayBudapest
    );

    const firstAvailableDay = selectedDaySuggestions.length
      ? requestedDayBudapest
      : upcomingSuggestions[0]
      ? budapestDateKeyFromIso(upcomingSuggestions[0].kickoffUtc)
      : "";

    const suggestions = firstAvailableDay
      ? upcomingSuggestions.filter((item) => budapestDateKeyFromIso(item.kickoffUtc) === firstAvailableDay)
      : [];

    const warning =
      suggestions.length === 0
        ? "Nincs elérhető közelgő meccs ebben a ligában."
        : selectedDaySuggestions.length > 0
          ? null
          : `A kiválasztott napon (${requestedDayBudapest}) nincs meccs, ezért a következő elérhető meccsnapot mutatjuk: ${firstAvailableDay}.`;

    if (suggestions.length > 0) {
      suggestionsCache.set(cacheKey, {
        suggestions,
        firstAvailableDay,
        updatedAt: Date.now(),
      });
    }

    return NextResponse.json({
      suggestions,
      selectedLeague: leagueName || null,
      warning,
    });
  } catch (err) {
    console.error("Suggestions API error:", err);
    return NextResponse.json({ message: "Hiba történt a meccsajánlók lekérésekor" }, { status: 500 });
  }
}
