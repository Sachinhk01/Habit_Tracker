import { useEffect, useState } from "react";
import "./App.css";

const N = 10;
const SLEEP = [9, 8, 7, 6, 5];
const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const blank = () => ({ marks: {}, sleep: {}, notes: "" });

const KEY = "habit-tracker-v2";

function load() {
  try {
    const s = JSON.parse(localStorage.getItem(KEY));
    if (s && s.habits) return s;
  } catch {}
  return { name: "", habits: Array(N).fill(""), months: {} };
}

// Sleep chart geometry
const CW = 30, CH = 36, LEFT = 64, TOP = 30;

export default function App() {
  const [st, setSt] = useState(load);
  const [cur, setCur] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });
  const [brush, setBrush] = useState("right");

  useEffect(() => {
    try { localStorage.setItem(KEY, JSON.stringify(st)); } catch {}
  }, [st]);

  const key = `${cur.getFullYear()}-${cur.getMonth() + 1}`;
  const m = st.months[key] || blank();
  const days = new Date(cur.getFullYear(), cur.getMonth() + 1, 0).getDate();
  const now = new Date();
  const thisMonth = cur.getFullYear() === now.getFullYear() && cur.getMonth() === now.getMonth();
  const today = thisMonth ? now.getDate() : 0;
  const upto = thisMonth ? today : days;

  const patchMonth = (fn) =>
    setSt((s) => ({ ...s, months: { ...s.months, [key]: fn(s.months[key] || blank()) } }));

  const setMark = (r, c) =>
    patchMonth((mo) => {
      const k = `${r}-${c}`;
      const marks = { ...mo.marks };
      if (brush === "clear" || marks[k] === brush) delete marks[k];
      else marks[k] = brush;
      return { ...mo, marks };
    });

  const setSleep = (c, h) =>
    patchMonth((mo) => {
      const sleep = { ...mo.sleep };
      if (sleep[c] === h) delete sleep[c];
      else sleep[c] = h;
      return { ...mo, sleep };
    });

  const setHabit = (r, v) =>
    setSt((s) => ({ ...s, habits: s.habits.map((h, i) => (i === r ? v : h)) }));

  // Stats
  let right = 0, wrong = 0, best = 0, active = 0;
  const rowRight = [];
  for (let r = 0; r < N; r++) {
    let run = 0, rr = 0, used = !!st.habits[r].trim();
    for (let c = 1; c <= days; c++) {
      const v = m.marks[`${r}-${c}`];
      if (v) used = true;
      if (v === "right") { rr++; run++; best = Math.max(best, run); } else run = 0;
      if (v === "wrong") wrong++;
    }
    rowRight.push(rr);
    right += rr;
    if (used) active++;
  }
  const pct = active ? Math.round((right / (active * upto)) * 100) : 0;
  const logged = Object.keys(m.sleep).map(Number).sort((a, b) => a - b).filter((d) => d <= days);
  const avg = logged.length ? (logged.reduce((a, d) => a + m.sleep[d], 0) / logged.length).toFixed(1) : "-";
  const pts = logged.map((d) => [LEFT + (d - 0.5) * CW, TOP + (9 - m.sleep[d]) * CH + CH / 2]);

  const nums = Array.from({ length: 31 }, (_, i) => i + 1);

  return (
    <main>
      <header>
        <h1>Small habits. Big change.</h1>
        <div className="bar">
          <input className="name" placeholder="Your name" aria-label="Your name"
            value={st.name} onChange={(e) => setSt({ ...st, name: e.target.value })} />
          <button className="btn" aria-label="Previous month"
            onClick={() => setCur(new Date(cur.getFullYear(), cur.getMonth() - 1, 1))}>&lt;</button>
          <div className="month">{MONTHS[cur.getMonth()]} {cur.getFullYear()}</div>
          <button className="btn" aria-label="Next month"
            onClick={() => setCur(new Date(cur.getFullYear(), cur.getMonth() + 1, 1))}>&gt;</button>
          <button className="btn" onClick={() => window.print()}>Print</button>
        </div>
      </header>

      <section className="stats">
        <div className="stat"><b>{pct}%</b><span>Habits done (right)</span></div>
        <div className="stat"><b className="bad">{wrong}</b><span>Missed (wrong)</span></div>
        <div className="stat"><b>{best}</b><span>Best streak (days)</span></div>
        <div className="stat"><b>{avg}</b><span>Average sleep (hrs)</span></div>
      </section>

      <div className="brushes" role="group" aria-label="Marking tool">
        <span>Pick a button, then click the boxes:</span>
        <button className={"btn rt" + (brush === "right" ? " act" : "")} aria-pressed={brush === "right"}
          onClick={() => setBrush("right")}>&#10003; Right</button>
        <button className={"btn wr" + (brush === "wrong" ? " act" : "")} aria-pressed={brush === "wrong"}
          onClick={() => setBrush("wrong")}>&#10007; Wrong</button>
        <button className={"btn" + (brush === "clear" ? " act" : "")} aria-pressed={brush === "clear"}
          onClick={() => setBrush("clear")}>Clear</button>
      </div>

      <div className="wrap">
        <table>
          <thead>
            <tr>
              <th className="lab">Habits / days</th>
              {nums.map((c) => <th key={c} className={c === today ? "today" : ""}>{c}</th>)}
              <th>Right</th>
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: N }, (_, r) => (
              <tr key={r}>
                <td className="lab">
                  <i>{r + 1}</i>
                  <input maxLength={40} placeholder="Add a habit" aria-label={`Habit ${r + 1}`}
                    value={st.habits[r]} onChange={(e) => setHabit(r, e.target.value)} />
                </td>
                {nums.map((c) => {
                  const v = m.marks[`${r}-${c}`];
                  const off = c > days;
                  return (
                    <td key={c} className={c === today ? "tc" : ""}>
                      <button className={"cell " + (v || "")} disabled={off}
                        aria-label={`Habit ${r + 1}, day ${c}${v ? ", " + v : ""}`}
                        onClick={() => setMark(r, c)}>
                        {v === "right" ? "\u2713" : v === "wrong" ? "\u2717" : ""}
                      </button>
                    </td>
                  );
                })}
                <td className="pct">{rowRight[r] ? `${rowRight[r]}/${days}` : ""}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2>Sleep</h2>
      <div className="wrap">
        <svg className="sleep" width={LEFT + 31 * CW} height={TOP + 5 * CH + 4} role="img"
          aria-label="Sleep hours per day as a line graph">
          {nums.map((c) => (
            <text key={c} x={LEFT + (c - 0.5) * CW} y={19} textAnchor="middle"
              className={"tick" + (c === today ? " now" : "")}>{c}</text>
          ))}
          {SLEEP.map((h, i) => (
            <text key={h} x={12} y={TOP + i * CH + CH / 2 + 4} className="tick">{h} hrs</text>
          ))}
          {SLEEP.map((h, i) => nums.map((c) => (
            <rect key={h + "-" + c} x={LEFT + (c - 1) * CW} y={TOP + i * CH} width={CW} height={CH}
              className={"gcell" + (c > days ? " off" : "")}
              onClick={c <= days ? () => setSleep(c, h) : undefined} />
          )))}
          {pts.length > 1 && (
            <polyline className="line" points={pts.map((p) => p.join(",")).join(" ")} />
          )}
          {pts.map((p, i) => <circle key={i} className="dot" cx={p[0]} cy={p[1]} r="5" />)}
        </svg>
      </div>
      <p className="hint">Click a box to log your sleep for that day. Click it again to remove it. Dots are joined by a line.</p>

      <h2>Notes</h2>
      <textarea placeholder="What worked this month? What will you change next month?"
        value={m.notes} onChange={(e) => patchMonth((mo) => ({ ...mo, notes: e.target.value }))} />

      <footer>
        Saved in this browser only.{" "}
        <button className="btn" onClick={() => {
          if (confirm(`Clear all marks, sleep and notes for ${MONTHS[cur.getMonth()]} ${cur.getFullYear()}? Habit names stay.`))
            setSt((s) => { const mo = { ...s.months }; delete mo[key]; return { ...s, months: mo }; });
        }}>Clear this month</button>
      </footer>
    </main>
  );
}