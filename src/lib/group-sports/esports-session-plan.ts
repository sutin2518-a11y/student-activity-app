
export type EventInput = {
  id: string;
  event_code: string;
};

export type GroupInput = {
  id: string;
  event_id: string;
  group_code: string;
  sort_order: number;
};

export type TeamInput = {
  id: string;
  group_id: string;
  seed_order: number;
  school_name: string;
};

export type MatchInput = {
  id: string;
  event_id: string;
  group_id: string | null;
  stage: string;
  match_no: string;
  team1_id: string | null;
  team2_id: string | null;
  scheduled_date: string | null;
  start_time: string | null;
  match_status: string;
};

export type SessionFixture = {
  match: MatchInput;
  day: string;
  session: number;
  start: string;
  end: string;
  station: number;
  gender: "ชาย" | "หญิง";
  group: string;
};

const TIMES = [
  ["09:00", "10:30"],
  ["10:30", "12:00"],
  ["13:00", "14:30"],
  ["14:30", "16:00"],
] as const;

function matchKey(
  eventId: string,
  groupId: string,
  teamA: string,
  teamB: string
) {
  return [
    eventId,
    groupId,
    ...[teamA, teamB].sort(),
  ].join("|");
}

// Circle method: ทุกทีมพบกันครบ และทีมไม่ซ้ำภายในรอบ
function roundRobin(teamIds: string[]) {
  const rotating: (string | null)[] = [...teamIds];

  if (rotating.length % 2 !== 0) {
    rotating.push(null); // BYE สำหรับสาย 5 ทีม
  }

  const rounds: [string, string][][] = [];
  const size = rotating.length;

  for (let round = 0; round < size - 1; round++) {
    const pairs: [string, string][] = [];

    for (let i = 0; i < size / 2; i++) {
      const a = rotating[i];
      const b = rotating[size - 1 - i];

      if (a && b) pairs.push([a, b]);
    }

    rounds.push(pairs);

    // ตรึงตำแหน่งแรก หมุนตำแหน่งที่เหลือ
    const last = rotating.pop() ?? null;
    rotating.splice(1, 0, last);
  }

  return rounds;
}

export function buildEsportsSessions(
  events: EventInput[],
  groups: GroupInput[],
  teams: TeamInput[],
  matches: MatchInput[]
) {
  const eventById = new Map(events.map(e => [e.id, e]));

  const matchByPair = new Map(
    matches
      .filter(m =>
        m.stage === "group" &&
        m.group_id &&
        m.team1_id &&
        m.team2_id
      )
      .map(m => [
        matchKey(
          m.event_id,
          m.group_id!,
          m.team1_id!,
          m.team2_id!
        ),
        m,
      ])
  );

  const orderedGroups = groups
    .filter(g =>
      ["GS3-ES-SM", "GS3-ES-SF"].includes(
        eventById.get(g.event_id)?.event_code ?? ""
      )
    )
    .sort((a, b) => {
      const rank = (g: GroupInput) =>
        eventById.get(g.event_id)?.event_code === "GS3-ES-SM"
          ? 0
          : 1;

      return rank(a) - rank(b) ||
        a.sort_order - b.sort_order;
    });

  const fixtures: SessionFixture[] = [];
  const problems: string[] = [];

  orderedGroups.forEach((group, groupIndex) => {
    const roster = teams
      .filter(t => t.group_id === group.id)
      .sort((a, b) => a.seed_order - b.seed_order);

    if (![4, 5].includes(roster.length)) {
      problems.push(
        `กลุ่ม ${group.group_code}: จำนวนทีมไม่ใช่ 4 หรือ 5`
      );
      return;
    }

    const eventCode =
      eventById.get(group.event_id)?.event_code;

    const gender =
      eventCode === "GS3-ES-SM" ? "ชาย" : "หญิง";

    const rounds = roundRobin(roster.map(t => t.id));

    rounds.forEach((pairs, roundIndex) => {
      const session = (roundIndex % 4) + 1;
      const day =
        roundIndex < 4 ? "2026-12-05" : "2026-12-06";

      pairs.forEach(([a, b], pairIndex) => {
        const match = matchByPair.get(
          matchKey(group.event_id, group.id, a, b)
        );

        if (!match) {
          problems.push(
            `ไม่พบคู่แข่งขัน กลุ่ม ${group.group_code}: ${a} / ${b}`
          );
          return;
        }

        fixtures.push({
          match,
          day,
          session,
          start: TIMES[session - 1][0],
          end: TIMES[session - 1][1],
          station: groupIndex * 2 + pairIndex + 1,
          gender,
          group: group.group_code,
        });
      });
    });
  });

  fixtures.sort((a, b) =>
    a.day.localeCompare(b.day) ||
    a.session - b.session ||
    a.station - b.station
  );

  const uniqueMatches = new Set(fixtures.map(f => f.match.id));

  if (uniqueMatches.size !== fixtures.length) {
    problems.push("พบคู่แข่งขันซ้ำในแผนจัดรอบ");
  }

  const existing = matches.filter(m =>
    m.stage === "group" &&
    events.some(e =>
      e.id === m.event_id &&
      ["GS3-ES-SM", "GS3-ES-SF"].includes(e.event_code)
    )
  );

  if (fixtures.length !== existing.length) {
    problems.push(
      `จำนวนคู่ในแผน ${fixtures.length} ไม่ตรงกับฐานข้อมูล ${existing.length}`
    );
  }

  return {
    fixtures,
    problems,
    total: fixtures.length,
    firstSession: fixtures.filter(f =>
      f.day === "2026-12-05" && f.session === 1
    ).length,
  };
}
