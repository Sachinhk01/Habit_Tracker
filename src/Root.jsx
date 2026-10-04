import { useEffect, useState } from "react";
import { onAuthStateChanged, signInWithEmailAndPassword, signOut } from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { auth, db } from "./firebase.js";
import Tracker from "./App.jsx";

const EMPTY = { name: "", habits: Array(10).fill(""), months: {} };

// One-time carry-over of progress saved in this browser by the earlier version
function fromBrowser() {
  try {
    const s = JSON.parse(localStorage.getItem("habit-tracker-v2"));
    if (s && s.habits) return s;
  } catch {}
  return EMPTY;
}

export default function Root() {
  const [user, setUser] = useState(undefined); // undefined = checking, null = signed out
  const [initial, setInitial] = useState(null);
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [show, setShow] = useState(false);

  useEffect(() => {
    const off = onAuthStateChanged(auth, async (u) => {
      setInitial(null);
      if (!u) return setUser(null);
      try {
        const snap = await getDoc(doc(db, "users", u.uid));
        setInitial(snap.exists() ? JSON.parse(snap.data().json) : fromBrowser());
        setUser(u);
      } catch {
        setErr("Could not load your data. Check your connection and your Firestore rules.");
        await signOut(auth);
      }
    });
    return off;
  }, []);

  const save = (data) =>
    setDoc(doc(db, "users", user.uid), { json: JSON.stringify(data), updatedAt: Date.now() });

  const submit = async (ev) => {
    ev.preventDefault();
    setErr("");
    setBusy(true);
    try {
      await signInWithEmailAndPassword(auth, email.trim(), pw);
    } catch {
      setErr("Wrong email or password.");
    }
    setBusy(false);
  };

  if (user === undefined) return <p className="center">Loading...</p>;
  if (user && initial)
    return <Tracker key={user.uid} initial={initial} onSave={save} onLogout={() => signOut(auth)} />;

  return (
    <form className="auth" onSubmit={submit}>
      <h1>Log in</h1>
      <label>Email
        <input type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
      </label>
      <label>Password
        <span className="pw">
          <input type={show ? "text" : "password"} required autoComplete="current-password"
            value={pw} onChange={(e) => setPw(e.target.value)} />
          <button type="button" className="eye" onClick={() => setShow(!show)}
            aria-label={show ? "Hide password" : "Show password"} aria-pressed={show}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor"
              strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" />
              <circle cx="12" cy="12" r="3" />
              {show && <path d="M3 3l18 18" />}
            </svg>
          </button>
        </span>
      </label>
      {err && <p className="err" role="alert">{err}</p>}
      <button className="btn primary" disabled={busy}>{busy ? "Please wait..." : "Log in"}</button>
    </form>
  );
}