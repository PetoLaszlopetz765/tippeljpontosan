import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getTokenFromRequest, verifyToken } from "@/lib/auth";

type LeagueOption = {
  id: string;
  name: string;
  country: string;
};

type Scope = "elite" | "international" | "all";

function toStringValue(value: unknown): string {
  if (typeof value === "string") return value.trim();
  if (typeof value === "number") return String(value);
  return "";
}

function pickString(obj: Record<string, unknown>, keys: string[]): string {
  for (const key of keys) {
    const direct = toStringValue(obj[key]);
    if (direct) return direct;

    const nested = obj[key];
    if (nested && typeof nested === "object") {
      const nestedObj = nested as Record<string, unknown>;
      const nestedName = toStringValue(nestedObj.name) || toStringValue(nestedObj.title);
      if (nestedName) return nestedName;
    }
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

function normalizeLeagueRows(payload: unknown): LeagueOption[] {
  const objects = collectObjects(payload);
  const seen = new Set<string>();
  const rows: LeagueOption[] = [];

  for (const obj of objects) {
    const name = pickString(obj, [
      "name",
      "localizedName",
      "league_name",
      "strLeague",
      "title",
      "league",
    ]);
    if (!name) continue;

    const id =
      pickString(obj, [
        "id",
        "league_id",
        "idLeague",
        "leagueId",
        "competition_id",
        "tournament_id",
      ]) || name;

    const country =
      pickString(obj, ["country", "country_name", "area", "region", "nation", "ccode", "countryCode"]) ||
      "Egyéb";
    const key = `${id}::${name}::${country}`.toLowerCase();
    if (seen.has(key)) continue;

    seen.add(key);
    rows.push({ id, name, country });
  }

  return rows;
}

function getDefaultLeagueEndpointsByHost(host: string): string[] {
  const normalizedHost = host.toLowerCase();
  if (normalizedHost.includes("api-football-v1.p.rapidapi.com")) {
    return ["/v3/leagues"];
  }

  return ["/football-get-all-leagues", "/football-leagues", "/football-popular-leagues"];
}

function isFreeLiveHost(host: string) {
  return host.toLowerCase().includes("free-api-live-football-data.p.rapidapi.com");
}

function mapLeagueRow(row: Record<string, unknown>): LeagueOption | null {
  const id =
    pickString(row, ["id", "league_id", "idLeague", "leagueId", "competition_id", "tournament_id"]) ||
    pickString(row, ["name", "localizedName", "league_name", "strLeague", "title", "league"]);
  const name = pickString(row, ["name", "localizedName", "league_name", "strLeague", "title", "league"]);
  const country =
    pickString(row, ["country", "country_name", "area", "region", "nation", "ccode", "countryCode"]) ||
    "Egyéb";

  if (!id || !name) return null;
  return { id, name, country };
}

function mergeLeagueLists(...lists: LeagueOption[][]): LeagueOption[] {
  const merged = new Map<string, LeagueOption>();
  for (const list of lists) {
    for (const league of list) {
      const key = String(league.id).toLowerCase();
      if (!merged.has(key)) {
        merged.set(key, league);
      }
    }
  }
  return Array.from(merged.values());
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

    const requestedScope = req.nextUrl.searchParams.get("scope") || "elite";
    const rapidApiKey = process.env.RAPIDAPI_KEY || process.env.API_FOOTBALL_KEY;
    const rapidApiHost = process.env.RAPIDAPI_HOST || "free-api-live-football-data.p.rapidapi.com";

    if (!rapidApiKey) {
      return NextResponse.json(
        { message: "Hiányzik a RAPIDAPI_KEY (vagy API_FOOTBALL_KEY) környezeti változó." },
        { status: 500 }
      );
    }

    let parsedLeagues: LeagueOption[] = [];
    let lastStatus: number | null = null;

    if (isFreeLiveHost(rapidApiHost)) {
      const fetchEndpoint = async (endpoint: string) => {
        const res = await fetch(`https://${rapidApiHost}${endpoint}`, {
          cache: "no-store",
          headers: {
            "x-rapidapi-key": rapidApiKey,
            "x-rapidapi-host": rapidApiHost,
          },
        });
        lastStatus = res.status;
        if (!res.ok) return null;
        const contentType = res.headers.get("content-type") || "";
        if (!contentType.toLowerCase().includes("application/json")) return null;
        return res.json();
      };

      const [popularData, allData] = await Promise.all([
        fetchEndpoint("/football-popular-leagues"),
        fetchEndpoint("/football-get-all-leagues"),
      ]);

      const popularRows = Array.isArray((popularData as any)?.response?.popular)
        ? (popularData as any).response.popular
        : [];
      const allRows = Array.isArray((allData as any)?.response?.leagues)
        ? (allData as any).response.leagues
        : [];

      const mappedPopular = popularRows
        .map((row: Record<string, unknown>) => mapLeagueRow(row))
        .filter((row: LeagueOption | null): row is LeagueOption => Boolean(row));

      const mappedAll = allRows
        .map((row: Record<string, unknown>) => mapLeagueRow(row))
        .filter((row: LeagueOption | null): row is LeagueOption => Boolean(row));

      parsedLeagues = mergeLeagueLists(mappedPopular, mappedAll);
    } else {
      const customEndpointsRaw = process.env.RAPIDAPI_LEAGUES_ENDPOINTS || process.env.RAPIDAPI_LEAGUES_ENDPOINT;
      const endpoints = customEndpointsRaw
        ? customEndpointsRaw
            .split(",")
            .map((entry) => entry.trim())
            .filter(Boolean)
            .map((entry) => (entry.startsWith("/") ? entry : `/${entry}`))
        : getDefaultLeagueEndpointsByHost(rapidApiHost);

      for (const endpoint of endpoints) {
        const res = await fetch(`https://${rapidApiHost}${endpoint}`, {
          cache: "no-store",
          headers: {
            "x-rapidapi-key": rapidApiKey,
            "x-rapidapi-host": rapidApiHost,
          },
        });

        lastStatus = res.status;
        if (!res.ok) {
          continue;
        }

        const contentType = res.headers.get("content-type") || "";
        if (!contentType.toLowerCase().includes("application/json")) {
          continue;
        }

        const data = await res.json();
        const rows = normalizeLeagueRows(data);
        if (rows.length > 0) {
          parsedLeagues = rows;
          break;
        }
      }
    }

    if (parsedLeagues.length === 0 && lastStatus && lastStatus >= 400) {
      return NextResponse.json(
        { message: `Külső API hiba: ${lastStatus}` },
        { status: 502 }
      );
    }

    if (parsedLeagues.length === 0) {
      return NextResponse.json(
        { message: "Nem érkezett feldolgozható liga adat a külső API-ból." },
        { status: 502 }
      );
    }

    const normalizedScope: Scope =
      requestedScope === "international"
        ? "international"
        : requestedScope === "all"
          ? "all"
          : "elite";

    const normalizeCompetitionName = (league: LeagueOption) => (league.name || "").toLowerCase();

    const isMaleCompetition = (name: string) =>
      !name.includes("women") &&
      !name.includes("qualification") &&
      !name.includes("qual") &&
      !name.includes("u17") &&
      !name.includes("u19") &&
      !name.includes("u20") &&
      !name.includes("u21") &&
      !name.includes("u23");

    const isRequestedInternationalCompetition = (league: LeagueOption) => {
      const name = normalizeCompetitionName(league);
      if (!isMaleCompetition(name)) return false;

      const isChampionsLeague = name.includes("champions league");
      const isEuropaLeague = name.includes("europa league");
      const isConferenceLeague = name.includes("conference league");
      const isNationsLeague = name.includes("nations league") && (name.includes("uefa") || name.includes("a"));
      const isWorldCup = name.includes("world cup") && !name.includes("club");
      const isEuro = name.includes("european championship") || name.includes("uefa euro") || name === "euro";

      return isChampionsLeague || isEuropaLeague || isConferenceLeague || isNationsLeague || isWorldCup || isEuro;
    };

    const isEliteLeague = (league: LeagueOption) => {
      const name = (league.name || "").toLowerCase();
      if (!isMaleCompetition(name)) return false;

      const country = (league.country || "").toLowerCase();

      const topLeaguePatterns = [
        "premier league",
        "la liga",
        "laliga",
        "serie a",
        "bundesliga",
        "ligue 1",
        "eredivisie",
        "primeira liga",
        "super lig",
        "belgian pro league",
        "nb i",
        "otp bank",
      ];

      const hasTopPattern = topLeaguePatterns.some((pattern) => name.includes(pattern));

      const englishCupPatterns = [
        "fa cup",
        "efl cup",
        "carabao cup",
        "community shield",
      ];

      const hasEnglishCupPattern =
        country.includes("eng") &&
        englishCupPatterns.some((pattern) => name.includes(pattern));

      return hasTopPattern || hasEnglishCupPattern;
    };

    const filtered = parsedLeagues
      .filter((league) => {
        if (normalizedScope === "all") return true;
        if (normalizedScope === "international") return isRequestedInternationalCompetition(league);
        return isEliteLeague(league) || isRequestedInternationalCompetition(league);
      })
      .sort((a, b) => {
        if (a.country !== b.country) {
          return a.country.localeCompare(b.country, "hu");
        }
        return a.name.localeCompare(b.name, "hu");
      });

    const hasHungarianLeague = parsedLeagues.some((league) => {
      const name = normalizeCompetitionName(league);
      const country = (league.country || "").toLowerCase();
      return country === "hun" || name.includes("nb i") || name.includes("otp bank");
    });

    const warning = hasHungarianLeague
      ? null
      : "A jelenlegi API adatforrásban nem található magyar bajnokság (NB I).";

    return NextResponse.json({ leagues: filtered, sport: "Soccer", scope: normalizedScope, warning });
  } catch (err) {
    console.error("Leagues API error:", err);
    return NextResponse.json({ message: "Hiba történt a ligák lekérésekor" }, { status: 500 });
  }
}
