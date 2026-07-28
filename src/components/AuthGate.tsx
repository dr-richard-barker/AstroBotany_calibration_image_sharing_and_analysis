import React, { useEffect, useState } from 'react';
import { LogIn, ShieldAlert, Loader2, Sprout } from 'lucide-react';
import { watchAuth, signInWithGoogle, signOut, type AuthState } from '../lib/auth';

const LOGO = `${import.meta.env.BASE_URL}cose/cose-logo.png`;

// Wraps the whole app. In unconfigured mode (no Supabase keys) it renders the
// app openly, exactly as before. Once configured, visitors must sign in with
// Google to reach anything; banned users are locked out.
export const AuthGate: React.FC<{ children: (auth: AuthState) => React.ReactNode }> = ({ children }) => {
  const [auth, setAuth] = useState<AuthState>({ status: 'loading', session: null, profile: null });
  useEffect(() => watchAuth(setAuth), []);

  if (auth.status === 'unconfigured' || auth.status === 'signed-in') return <>{children(auth)}</>;

  return (
    <div className="auth-screen">
      <div className="auth-card">
        <img src={LOGO} alt="CoSE" className="auth-logo" />
        <div className="auth-eyebrow">CoSE Cloud · AstroBotany</div>
        <h1>Calibration Image Database</h1>

        {auth.status === 'loading' && (
          <p className="auth-msg"><Loader2 className="spin" size={16} /> Checking your session…</p>
        )}

        {auth.status === 'signed-out' && (
          <>
            <p className="auth-msg">Sign in to view the shared collection, run the analysis tools, and upload your own calibrated images.</p>
            <button className="btn btn-primary auth-google" onClick={() => signInWithGoogle()}>
              <LogIn size={16} /> Continue with Google
            </button>
            <p className="auth-fine">New here? Signing in with Google creates your account automatically. <Sprout size={12} style={{ verticalAlign: -1, color: 'var(--accent2)' }} /></p>
          </>
        )}

        {auth.status === 'banned' && (
          <>
            <div className="auth-msg" style={{ color: 'var(--danger)' }}><ShieldAlert size={18} /> Your access to this database has been revoked by an administrator.</div>
            <button className="btn btn-ghost" onClick={() => signOut()}>Sign out</button>
          </>
        )}
      </div>
      <div className="auth-foot">Space biology · CoSE Cloud</div>
    </div>
  );
};
