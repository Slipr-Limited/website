/**
 * admin/pages/LoginPage.jsx — Admin sign-in: password, then authenticator code.
 * First sign-in after an account is created shows a QR code to set up the app.
 */

import React, { useEffect, useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import QRCode from 'qrcode';
import { api, errorMessage } from '../api';
import { useAdminAuth } from '../AuthContext';
import { Notice, Spinner } from '../components/ui';

const CODE_RE = /^\d{6}$/;

export default function LoginPage() {
  const { status, completeSignIn } = useAdminAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from ?? '/admin';

  const [step, setStep]         = useState('credentials'); // credentials | setup | code
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode]         = useState('');
  const [busy, setBusy]         = useState(false);
  const [error, setError]       = useState(null);
  const [setup, setSetup]       = useState(null);   // { setupToken, secret, otpauthUri, qr }
  const [mfaToken, setMfaToken] = useState(null);

  useEffect(() => {
    if (step !== 'setup' || !setup?.otpauthUri || setup.qr) return;
    QRCode.toDataURL(setup.otpauthUri, { margin: 1, width: 220 })
      .then((qr) => setSetup((s) => ({ ...s, qr })))
      .catch(() => setSetup((s) => ({ ...s, qr: null })));
  }, [step, setup]);

  if (status === 'signedIn') return <Navigate to="/admin" replace />;

  const submitCredentials = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const { data } = await api.post('/auth/login', { email: email.trim(), password });
      const body = data.data;
      if (body.accessToken) {
        // Super admins: password alone is enough.
        completeSignIn(body);
        navigate(from, { replace: true });
        return;
      }
      if (body.status === 'mfa_setup') {
        setSetup({ setupToken: body.setupToken, secret: body.secret, otpauthUri: body.otpauthUri, qr: null });
        setStep('setup');
      } else {
        setMfaToken(body.mfaToken);
        setStep('code');
      }
      setPassword('');
    } catch (err) {
      setError(errorMessage(err, 'Sign-in failed'));
    } finally {
      setBusy(false);
    }
  };

  const submitCode = async (e) => {
    e.preventDefault();
    if (!CODE_RE.test(code)) { setError('Enter the 6-digit code from your authenticator app'); return; }
    setBusy(true);
    setError(null);
    try {
      const path = step === 'setup' ? '/auth/mfa/confirm' : '/auth/mfa/verify';
      const body = step === 'setup'
        ? { setupToken: setup.setupToken, code }
        : { mfaToken, code };
      const { data } = await api.post(path, body);
      completeSignIn(data.data);
      navigate(from, { replace: true });
    } catch (err) {
      setError(errorMessage(err, 'Invalid code'));
      setCode('');
    } finally {
      setBusy(false);
    }
  };

  const restart = () => {
    setStep('credentials');
    setSetup(null);
    setMfaToken(null);
    setCode('');
    setError(null);
  };

  return (
    <main className="ad-login">
      <div className="ad-login__panel">
        <p className="ad-brand">Slipr <span>Admin</span></p>

        {step === 'credentials' && (
          <form onSubmit={submitCredentials} className="ad-stack">
            <h1>Sign in</h1>
            <label className="ad-field">
              <span>Email</span>
              <input type="email" autoComplete="username" required value={email} onChange={(e) => setEmail(e.target.value)} />
            </label>
            <label className="ad-field">
              <span>Password</span>
              <input type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
            </label>
            <Notice kind="error">{error}</Notice>
            <button type="submit" className="ad-btn ad-btn--primary ad-btn--block" disabled={busy}>
              {busy ? <Spinner /> : 'Continue'}
            </button>
          </form>
        )}

        {step === 'setup' && (
          <form onSubmit={submitCode} className="ad-stack">
            <h1>Set up two-factor</h1>
            <p className="ad-muted">Scan this code with Google Authenticator, Microsoft Authenticator or 1Password. Then enter the 6-digit code it shows.</p>
            {setup?.qr ? <img className="ad-qr" src={setup.qr} alt="Authenticator setup QR code" /> : <Spinner />}
            <p className="ad-muted ad-small">Can't scan? Enter this key manually: <code className="ad-code">{setup?.secret}</code></p>
            <label className="ad-field">
              <span>6-digit code</span>
              <input inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))} />
            </label>
            <Notice kind="error">{error}</Notice>
            <button type="submit" className="ad-btn ad-btn--primary ad-btn--block" disabled={busy}>Finish set-up</button>
            <button type="button" className="ad-link" onClick={restart}>Back</button>
          </form>
        )}

        {step === 'code' && (
          <form onSubmit={submitCode} className="ad-stack">
            <h1>Enter your code</h1>
            <p className="ad-muted">Open your authenticator app and enter the current 6-digit code.</p>
            <label className="ad-field">
              <span>6-digit code</span>
              <input inputMode="numeric" autoComplete="one-time-code" maxLength={6} autoFocus value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))} />
            </label>
            <Notice kind="error">{error}</Notice>
            <button type="submit" className="ad-btn ad-btn--primary ad-btn--block" disabled={busy}>Sign in</button>
            <button type="button" className="ad-link" onClick={restart}>Back</button>
          </form>
        )}

        <p className="ad-small ad-muted ad-footnote">Authorised staff only. Every sign-in and change is logged.</p>
      </div>
    </main>
  );
}
