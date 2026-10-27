/**
 * admin/pages/LoginPage.jsx — Admin sign-in.
 *   Super admins: email and password, straight in.
 *   Other roles: password, then an authenticator code (first sign-in shows a QR code to set it up).
 */

import React, { useEffect, useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import QRCode from 'qrcode';
import { api, errorMessage } from '../api';
import { useAdminAuth } from '../AuthContext';
import { Notice, Spinner } from '../components/ui';
import { SliprLogo } from '../components/Logo';
import { Fade } from '../motion';

const CODE_RE = /^\d{6}$/;

export default function LoginPage() {
  const { status, completeSignIn } = useAdminAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from ?? '/admin';

  const [step, setStep]         = useState('credentials'); // credentials | setup | code
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [code, setCode]         = useState('');
  const [busy, setBusy]         = useState(false);
  const [error, setError]       = useState(null);
  const [setup, setSetup]       = useState(null);   // { setupToken, secret, otpauthUri, qr }
  const [mfaToken, setMfaToken] = useState(null);

  useEffect(() => {
    if (step !== 'setup' || !setup?.otpauthUri || setup.qr) return;
    QRCode.toDataURL(setup.otpauthUri, { margin: 1, width: 240, color: { dark: '#16150F', light: '#FFFFFF' } })
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

  const codeField = (
    <label className="ad-field ad-otp">
      <span>Six-digit code</span>
      <input
        inputMode="numeric"
        autoComplete="one-time-code"
        maxLength={6}
        autoFocus
        placeholder="000000"
        value={code}
        onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
      />
    </label>
  );

  return (
    <main className="ad-login">
      <section className="ad-login__brand">
        <SliprLogo tone="dark" showTagline />

        <div>
          <h2 className="ad-login__headline">Every slip, <em>every naira</em>, on record.</h2>
          <p className="ad-login__lede">
            Payments, disputes, verification and security, managed from one console. Every change you make here is recorded.
          </p>
          <dl className="ad-kv ad-login__kv">
            <dt>Environment</dt><dd>Production</dd>
            <dt>Connection</dt><dd>Encrypted</dd>
            <dt>Two-factor</dt><dd>Required for all roles except super admin</dd>
          </dl>
        </div>

        <p className="ad-small ad-muted ad-footnote">Authorised staff only.</p>
      </section>

      <section className="ad-login__side">
        <div className="ad-login__panel">
          <SliprLogo tone="light" />
          <hr className="ad-login__perf" />
          {step === 'credentials' && (
            <Fade>
              <form onSubmit={submitCredentials} className="ad-stack" style={{ gap: 22 }}>
                <div>
                  <h1>Sign in</h1>
                  <p className="ad-muted">Use the email and password on your account.</p>
                </div>
                <label className="ad-field">
                  <span>Email</span>
                  <input type="email" autoComplete="username" required value={email} onChange={(e) => setEmail(e.target.value)} />
                </label>
                <label className="ad-field">
                  <span>Password</span>
                  <span className="ad-row-end" style={{ position: 'relative', flexWrap: 'nowrap' }}>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="current-password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      style={{ paddingRight: 56 }}
                    />
                    <button
                      type="button"
                      className="ad-link"
                      onClick={() => setShowPassword((v) => !v)}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                      style={{ position: 'absolute', right: 0, bottom: 9 }}
                    >
                      {showPassword ? 'Hide' : 'Show'}
                    </button>
                  </span>
                </label>
                <Notice kind="error">{error}</Notice>
                <button type="submit" className="ad-btn ad-btn--primary ad-btn--block" disabled={busy}>
                  {busy ? <Spinner /> : 'Continue'}
                </button>
              </form>
            </Fade>
          )}

          {step === 'setup' && (
            <Fade>
              <form onSubmit={submitCode} className="ad-stack" style={{ gap: 22 }}>
                <div>
                  <h1>Set up two-factor</h1>
                  <p className="ad-muted">Scan the code with Google Authenticator, Microsoft Authenticator or 1Password, then enter the six digits it shows.</p>
                </div>
                <div style={{ minHeight: 212 }}>
                  {setup?.qr ? <img className="ad-qr" src={setup.qr} alt="Authenticator setup QR code" /> : <Spinner />}
                </div>
                <p className="ad-muted ad-small">Can't scan? Enter this key: <code className="ad-code">{setup?.secret}</code></p>
                {codeField}
                <Notice kind="error">{error}</Notice>
                <button type="submit" className="ad-btn ad-btn--primary ad-btn--block" disabled={busy}>
                  {busy ? <Spinner /> : 'Finish set-up'}
                </button>
                <button type="button" className="ad-link" onClick={restart}>Back</button>
              </form>
            </Fade>
          )}

          {step === 'code' && (
            <Fade>
              <form onSubmit={submitCode} className="ad-stack" style={{ gap: 22 }}>
                <div>
                  <h1>Enter your code</h1>
                  <p className="ad-muted">Open your authenticator app and enter the current code.</p>
                </div>
                {codeField}
                <Notice kind="error">{error}</Notice>
                <button type="submit" className="ad-btn ad-btn--primary ad-btn--block" disabled={busy}>
                  {busy ? <Spinner /> : 'Sign in'}
                </button>
                <button type="button" className="ad-link" onClick={restart}>Back</button>
              </form>
            </Fade>
          )}
        </div>
      </section>
    </main>
  );
}
