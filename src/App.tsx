import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react'
import { loadMatch, type Match, type Team } from './opl'
import { wallpapers } from './wallpapers'


function Icon({ kind, className = '' }: { kind: 'arrow' | 'link' | 'clock' | 'crown' | 'close'; className?: string }) {
  const paths: Record<typeof kind, ReactNode> = {
    arrow: <><path d="M5 12h14M13 6l6 6-6 6" /></>,
    link: <><path d="m10 13 4-4M8 16l-1 1a4.2 4.2 0 0 1-6-6l4-4a4.2 4.2 0 0 1 6 0" transform="translate(2 0)" /><path d="m16 8 1-1a4.2 4.2 0 0 1 6 6l-4 4a4.2 4.2 0 0 1-6 0" transform="translate(-2 -2)" /></>,
    clock: <><circle cx="12" cy="12" r="8.5" /><path d="M12 7v5l3 2" /></>,
    crown: <><path d="m3 7 5 4 4-6 4 6 5-4-2 11H5L3 7Z" /><path d="M6 21h12" /></>,
    close: <path d="m6 6 12 12M6 18 18 6" />,
  }
  return <svg className={`icon ${className}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[kind]}</svg>
}

function Brand() {
  return <a className="brand" href="./" aria-label="Uniliga MultiGG home">
    <svg className="brand-mark" viewBox="0 0 40 40" fill="none" aria-hidden="true"><path d="M7 7v21l13 8 13-8V7M14 7v17l6 4 6-4V7" stroke="currentColor" strokeWidth="2.4" strokeLinejoin="round" /></svg>
    <span>UNILIGA<span className="brand-secondary">MULTI<span className="gold">GG</span></span></span>
  </a>
}

function TeamResult({ team, side }: { team: Team; side: 'left' | 'right' }) {
  const [brokenLogo, setBrokenLogo] = useState(false)
  const initials = team.name.split(/\s+/).map(word => word[0]).slice(0, 3).join('')
  const person = team.captain ?? team.contact
  const personLabel = team.captain ? 'Captain' : 'Contact'
  const crest = <>
    <span className="crest-ring" aria-hidden="true" />
    {team.logo && !brokenLogo
      ? <img src={team.logo} alt="" width="104" height="104" onError={() => setBrokenLogo(true)} />
      : <span className="crest-initials">{initials}</span>}
    {team.multiUrl && <span className="crest-arrow"><Icon kind="arrow" /></span>}
  </>
  return <article className={`team team-${side}`}>
    <span className="team-eyebrow">{side === 'left' ? 'TEAM 01' : 'TEAM 02'}</span>
    {team.multiUrl
      ? <a className="crest" href={team.multiUrl} target="_blank" rel="noopener noreferrer" aria-label={`Open all ${team.riotIds.length} registered Riot IDs for ${team.name} on OP.GG (new tab)`}>{crest}</a>
      : <div className="crest crest-disabled">{crest}</div>}
    <h3>{team.name}</h3>
    {team.multiUrl
      ? <a className="team-action" href={team.multiUrl} target="_blank" rel="noopener noreferrer">Open on OP.GG <Icon kind="arrow" /></a>
      : <p className="team-unavailable">No complete Riot IDs registered</p>}
    {team.riotIds.length > 0 && <details className="roster">
      <summary>{team.riotIds.length} registered Riot IDs <span aria-hidden="true">+</span></summary>
      <ul>{team.riotIds.map(id => <li key={id}>{id}</li>)}</ul>
    </details>}
    {team.skippedPlayers > 0 && <p className="roster-note">{team.skippedPlayers} without a complete Riot ID omitted</p>}
    <div className="captain">
      <Icon kind="crown" />
      {person
        ? person.url
          ? <a href={person.url} target="_blank" rel="noopener noreferrer"><span>{personLabel}</span> {person.name} <span aria-hidden="true">↗</span></a>
          : <span className="contact-person"><span>{personLabel}</span> {person.name}</span>
        : <span>{team.contactUnavailable ? 'Contact details unavailable' : 'No contact person provided'}</span>}
    </div>
  </article>
}

function MatchTime({ match }: { match: Match }) {
  const formatted = match.startsAt
    ? new Intl.DateTimeFormat('en-GB', {
        timeZone: 'Europe/Berlin', weekday: 'short', day: '2-digit', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit', timeZoneName: 'short', hour12: false,
      }).format(match.startsAt)
    : null
  return <div className="match-time">
    <Icon kind="clock" />
    <span>{formatted ? <><span className="schedule-label">Scheduled</span> <time dateTime={new Date(match.startsAt!).toISOString()}>{formatted}</time></> : 'Match time not scheduled yet'}</span>
    <a href={match.url} target="_blank" rel="noopener noreferrer" aria-label="View match on OPL (new tab)">OPL ↗</a>
  </div>
}

export default function App() {
  const [wallpaperIndex, setWallpaperIndex] = useState(() => Math.floor(Math.random() * wallpapers.length))
  const [wallpaperReady, setWallpaperReady] = useState(false)
  const failedWallpapers = useRef(0)
  const [input, setInput] = useState('')
  const [match, setMatch] = useState<Match | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const controller = useRef<AbortController | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const wallpaper = wallpapers[wallpaperIndex]
  useEffect(() => () => controller.current?.abort(), [])

  function changeInput(value: string) {
    controller.current?.abort()
    setInput(value)
    setLoading(false)
    setError('')
    setMatch(null)
  }

  async function findMatch(value: string) {
    controller.current?.abort()
    const request = new AbortController()
    controller.current = request
    setLoading(true)
    setMatch(null)
    setError('')
    try {
      const result = await loadMatch(value, request.signal)
      if (!request.signal.aborted) setMatch(result)
    } catch (caught) {
      if (!request.signal.aborted) setError(caught instanceof Error ? caught.message : 'Something went wrong. Please try again.')
    } finally {
      if (!request.signal.aborted) setLoading(false)
    }
  }

  function submit(event: FormEvent) {
    event.preventDefault()
    void findMatch(input)
  }

  return <div className={`app ${match ? 'has-match' : ''}`}>
    <div className="backdrop" aria-hidden="true">
      {failedWallpapers.current < wallpapers.length && <img
        key={wallpaper.url}
        className={wallpaperReady ? 'wallpaper is-ready' : 'wallpaper'}
        src={wallpaper.url}
        alt=""
        onLoad={() => setWallpaperReady(true)}
        onError={() => {
          failedWallpapers.current++
          setWallpaperReady(false)
          setWallpaperIndex(index => (index + 1) % wallpapers.length)
        }}
      />}
      <div className="backdrop-shade" />
      <div className="backdrop-grain" />
    </div>
    <header className="site-header">
      <Brand />
      <span className="header-note"><span className="status-dot" /> THE PRE-GAME STARTS HERE</span>
    </header>
    <main className="main">
      <section className="lookup" aria-labelledby="page-title">
        <div className="eyebrow"><span /> LEAGUE OF LEGENDS · EUW <span /></div>
        <h1 id="page-title">One match.<br className="mobile-break" /> <em>Both teams.</em></h1>
        <p className="intro">Your next opponents, one click away.</p>
        <form className="search-form" onSubmit={submit} noValidate>
          <label className="input-label" htmlFor="match-url">PASTE YOUR OPL MATCH LINK</label>
          <div className={`search-box ${error ? 'has-error' : ''}`}>
            <Icon kind="link" className="input-icon" />
            <input
              ref={inputRef} id="match-url" name="match-url" type="text" inputMode="url"
              autoComplete="off" spellCheck={false} placeholder="https://www.opleague.pro/match/..."
              value={input} onChange={event => changeInput(event.target.value)}
              aria-invalid={!!error} aria-describedby={error ? 'lookup-error' : 'search-help'} required
            />
            {input && <button className="clear-button" type="button" aria-label="Clear match link" onClick={() => { changeInput(''); inputRef.current?.focus() }}><Icon kind="close" /></button>}
            <button className="search-button" type="submit" disabled={loading}>
              {loading ? <><span className="spinner" aria-hidden="true" /> Finding teams</> : <>Find teams <Icon kind="arrow" /></>}
            </button>
          </div>
          <div className="search-meta">
            <span id="search-help">One OPL link. Every registered Riot ID.</span>
            {match && <span className="region-tag">EUW MULTI-SEARCH</span>}
          </div>
        </form>
        <div className="lookup-status" role="status" aria-live="polite" aria-atomic="true">
          {loading && <p className="loading-message">Reading the match and registered rosters from OPL<span className="loading-dots" aria-hidden="true">…</span></p>}
          {match && <MatchTime match={match} />}
        </div>
        {error && <p id="lookup-error" className="error-message" role="alert">{error}</p>}
      </section>
      {match && <section className="results" aria-label="Match teams">
        {match.event && <p className="event-name">{match.event}</p>}
        <div className="teams">
          <TeamResult key={`${match.id}-${match.teams[0].id}`} team={match.teams[0]} side="left" />
          <div className="versus" aria-hidden="true"><span /><i>vs</i><span /></div>
          <TeamResult key={`${match.id}-${match.teams[1].id}`} team={match.teams[1]} side="right" />
        </div>
        <p className="results-hint">Click a team crest to open its roster on OP.GG.</p>
      </section>}
    </main>
    <footer className="site-footer">
      <span>BUILT FOR THE <span className="gold">RIFT.</span></span>
      <a href={wallpaper.source} title={wallpaper.title} target="_blank" rel="noopener noreferrer" className="art-credit">League of Legends artwork <span aria-hidden="true">↗</span></a>
      <span className="footer-note">Fan-made · Not affiliated with Riot Games, Uniliga, OPL or OP.GG.</span>
    </footer>
  </div>
}
