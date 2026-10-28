export interface Team {
  id: string
  url: string | null
  name: string
  logo: string | null
  riotIds: string[]
  skippedPlayers: number
  captain: { name: string; url: string } | null
  contact: { name: string; url: string | null } | null
  contactUnavailable: boolean
  multiUrl: string | null
}

export interface Match {
  id: string
  url: string
  event: string | null
  startsAt: number | null
  teams: [Team, Team]
}

type JsonObject = Record<string, unknown>

function isObject(value: unknown): value is JsonObject {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function text(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

export function normalizeMatchUrl(input: string): { id: string; url: string } {
  let parsed: URL
  try {
    parsed = new URL(input.trim())
  } catch {
    throw new Error('Paste a full OPL match link, starting with https://www.opleague.pro/match/.')
  }
  if (
    parsed.protocol !== 'https:' ||
    !['www.opleague.pro', 'opleague.pro'].includes(parsed.hostname.toLowerCase()) ||
    parsed.port || parsed.username || parsed.password
  ) {
    throw new Error('Please use an https://www.opleague.pro match link.')
  }
  const match = /^\/match\/([1-9]\d*)(?:-[^/]*)?\/?$/.exec(parsed.pathname)
  if (!match) throw new Error('That is an OPL link, but not a match. Open the match page and copy its URL.')
  // Discard query strings, fragments and slugs: only the public match ID goes to the relay.
  return { id: match[1], url: `https://www.opleague.pro/match/${match[1]}` }
}

function oplUrl(input: unknown, kind?: 'user'): string | null {
  const value = text(input)
  if (!value) return null
  try {
    const url = new URL(value, 'https://www.opleague.pro/')
    if (url.protocol !== 'https:' || !['www.opleague.pro', 'opleague.pro'].includes(url.hostname) || url.port || url.username || url.password) return null
    if (kind && !/^\/user\/\d+(?:-|$)/.test(url.pathname)) return null
    return url.href
  } catch {
    return null
  }
}

// OPL embeds JSON in Object.assign(data, {...}) blocks, then renders it with JS.
// Read balanced JSON only. Never execute scripts from a fetched page.
function embeddedPayloads(html: string): JsonObject[] {
  const payloads: JsonObject[] = []
  const marker = /Object\.assign\s*\(\s*data\s*,\s*/g
  for (const match of html.matchAll(marker)) {
    const start = match.index + match[0].length
    if (html[start] !== '{') continue
    let depth = 0
    let quoted = false
    let escaped = false
    for (let i = start; i < html.length; i++) {
      const character = html[i]
      if (quoted) {
        if (escaped) escaped = false
        else if (character === '\\') escaped = true
        else if (character === '"') quoted = false
      } else if (character === '"') quoted = true
      else if (character === '{') depth++
      else if (character === '}' && --depth === 0) {
        try {
          const parsed: unknown = JSON.parse(html.slice(start, i + 1))
          if (isObject(parsed)) payloads.push(parsed)
        } catch { /* An unrelated non-JSON script is not match data. */ }
        break
      }
    }
  }
  return payloads
}

function parseTeam(source: JsonObject): Team {
  const header = isObject(source.player_header) ? text(source.player_header.ingame) : ''
  if (!/^riot\s+id\s*\(league of legends\)$/i.test(header)) {
    throw new Error('This match does not have a Riot ID (League of Legends) roster. Please use a League of Legends match.')
  }
  const players = Array.isArray(source.players) ? source.players.filter(isObject) : []
  const ids = players.map(player => text(player.ingame))
  const validIds = ids.filter(id => /^[^#\r\n,]+#[^#\s,]+$/u.test(id))
  const riotIds = [...new Map(validIds.map(id => [id.toLocaleLowerCase('en'), id])).values()]
  const captainRow = players.find(player => /\b(?:captain|kapitän)\b/i.test(text(player.position)))
  const username = captainRow && isObject(captainRow.username) ? captainRow.username : null
  const captainUrl = username ? oplUrl(username.href, 'user') : null
  const badges = username && isObject(username.name_with_badges) ? username.name_with_badges : null
  const captainName = badges ? text(badges.name) : ''
  const multiUrl = riotIds.length ? `https://op.gg/lol/multisearch/euw?summoners=${encodeURIComponent(riotIds.join(','))}` : null
  const id = text(source.id)
  return {
    id,
    url: /^[1-9]\d*$/.test(id) ? `https://www.opleague.pro/team/${id}` : null,
    name: text(source.name) || 'Unnamed team',
    logo: isObject(source.logo) ? oplUrl(source.logo.src) : null,
    riotIds,
    skippedPlayers: ids.length - validIds.length,
    captain: captainUrl ? { name: captainName || 'Team captain', url: captainUrl } : null,
    contact: null,
    contactUnavailable: false,
    multiUrl,
  }
}

export function parseMatchHtml(html: string, matchUrl: string): Match {
  const { id, url } = normalizeMatchUrl(matchUrl)
  if (html.length > 5_000_000) throw new Error('OPL returned an unexpectedly large page. Please try again.')
  const builds = embeddedPayloads(html).flatMap(payload => Object.entries(payload)
    .filter(([key, value]) => key.startsWith('build_') && isObject(value))
    .map(([, value]) => value as JsonObject))
  const teamsBlock = builds.find(build => isObject(build.teams))
  const teams = teamsBlock && isObject(teamsBlock.teams)
    ? Object.entries(teamsBlock.teams).sort(([a], [b]) => Number(a) - Number(b)).map(([, team]) => team).filter(isObject)
    : []
  if (teams.length !== 2 || teams.some(team => !text(team.name) || !Array.isArray(team.players))) {
    throw new Error('No two registered teams found. Check that the match exists and both teams have been assigned. OPL may also be temporarily unavailable.')
  }

  const info = builds.find(build => isObject(build.info_cards))
  let event: string | null = null
  let startsAt: number | null = null
  if (info && isObject(info.info_cards)) {
    const cards = Object.values(info.info_cards).filter(isObject)
    const eventCard = cards.find(card => text(card.title).toLowerCase() === 'event')
    if (eventCard && isObject(eventCard.value)) event = text(eventCard.value.content) || null
    const dateCard = cards.find(card => text(card.title).toLowerCase() === 'start time')
    const dateKey = dateCard && isObject(dateCard.value) ? text(dateCard.value.content).replace(/^%/, '') : ''
    const date = isObject(info.date) && isObject(info.date[dateKey]) ? info.date[dateKey] : null
    if (date && typeof date.unix === 'number' && Number.isFinite(date.unix) && date.unix > 0) startsAt = date.unix * 1000
  }

  return { id, url, event, startsAt, teams: [parseTeam(teams[0]), parseTeam(teams[1])] }
}

export function parseTeamContactHtml(html: string): Team['contact'] {
  const document = new DOMParser().parseFromString(html, 'text/html')
  if (!document.querySelector('.profile-info__container')) {
    throw new Error('The service did not return an OPL team profile')
  }
  // Scope this to the profile row; the page footer also contains a Contact label.
  const row = document.querySelector('tr.profile-info__contact')
  const value = row?.querySelectorAll('td')[1]
  const name = (value?.textContent ?? '').replace(/\s+/g, ' ').trim()
  if (!name || /^[-–—]$/.test(name)) return null
  const link = value?.querySelector('a[href]')?.getAttribute('href')
  return { name, url: oplUrl(link, 'user') }
}

async function fetchOplHtml(url: string, signal: AbortSignal): Promise<string> {
  const customRelay = import.meta.env?.VITE_OPL_PROXY_URL?.trim()
  const sources: Array<{ url: string; headers?: Record<string, string> }> = customRelay
    ? [{ url: `${customRelay}${encodeURIComponent(url)}` }]
    : [
        {
          url: `https://r.jina.ai/${url}`,
          headers: { 'X-Respond-With': 'html', 'X-No-Cache': 'true' },
        },
        { url: `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}` },
      ]
  for (const [index, source] of sources.entries()) {
    const timeout = AbortSignal.timeout(25_000)
    try {
      const response = await fetch(source.url, {
        headers: source.headers,
        signal: AbortSignal.any([signal, timeout]),
        credentials: 'omit',
        referrerPolicy: 'no-referrer',
      })
      if (!response.ok) throw new Error(`Match service returned HTTP ${response.status}`)
      const html = await response.text()
      const validPage = url.includes('/team/')
        ? /class\s*=\s*["'][^"']*\bprofile-info__container\b/.test(html)
        : /Object\.assign\s*\(\s*data\s*,/.test(html)
      if (validPage) return html
      throw new Error('The service did not return an OPL page')
    } catch (error) {
      if (signal.aborted) throw signal.reason
      if (index === sources.length - 1) {
        throw new Error('Could not reach OPL right now. Please try again in a moment.')
      }
    }
  }
  throw new Error('Could not load the OPL page. Please try again.')
}

export async function loadMatch(input: string, signal: AbortSignal): Promise<Match> {
  const { url } = normalizeMatchUrl(input)
  const match = parseMatchHtml(await fetchOplHtml(url, signal), url)
  await Promise.all(match.teams.map(async team => {
    if (team.captain) return
    if (!team.url) {
      team.contactUnavailable = true
      return
    }
    try {
      team.contact = parseTeamContactHtml(await fetchOplHtml(team.url, signal))
    } catch {
      if (signal.aborted) throw signal.reason
      // A failed contact lookup must not discard otherwise usable OP.GG links.
      team.contactUnavailable = true
    }
  }))
  return match
}
