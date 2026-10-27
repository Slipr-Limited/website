/**
 * admin/pages/LoginPage.jsx — Admin sign-in.
 *   Super admins: email and password, straight in.
 *   Other roles: password, then an authenticator code (first sign-in shows a QR code to set it up).
 */

import React, { useEffect, useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import QRCode from 'qrcode';
import { Mail, Lock, ShieldCheck, ArrowLeft, KeyRound, Activity, Eye, EyeOff } from 'lucide-react';
import { api, errorMessage } from '../api';
import { useAdminAuth } from '../AuthContext';
import { Notice, Spinner } from '../components/ui';

const CODE_RE = /^\d{6}$/;
const STEP_MOTION = {
  initial: { opacity: 0, x: 28 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -28, transition: { duration: 0.18 } },
  transition: { duration: 0.38, ease: [0.22, 1, 0.36, 1] },
};

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
    QRCode.toDataURL(setup.otpauthUri, { margin: 1, width: 240, color: { dark: '#06060E', light: '#FFFFFF' } })
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
      <span>6-digit code</span>
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
      <div className="ad-login__mesh" aria-hidden="true">
        <div className="ad-blob ad-blob--a" />
        <div className="ad-blob ad-blob--b" />
        <div className="ad-blob ad-blob--c" />
      </div>

      <section className="ad-login__brand">
        <motion.p className="ad-brand" initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          <span className="ad-logo" aria-hidden="true"><ShieldCheck size={18} /></span>
          <span>Slipr <span>Admin</span></span>
        </motion.p>

        <div>
          <motion.h2
            className="ad-login__headline"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
          >
            Run the marketplace with <span className="ad-gradient-text">full control.</span>
          </motion.h2>
          <motion.p className="ad-login__lede" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.8, delay: 0.35 }}>
            Payments, disputes, verification and security, in one console built for the people who keep Slipr safe.
          </motion.p>
          <motion.div className="ad-login__chips" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.8, delay: 0.5 }}>
            <span className="ad-login__chip">Role-based access</span>
            <span className="ad-login__chip">Full audit trail</span>
            <span className="ad-login__chip">Live payment reconciliation</span>
          </motion.div>
        </div>

        <motion.p className="ad-small ad-muted" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.7 }}>
          <Activity size={12} aria-hidden="true" style={{ verticalAlign: '-2px', marginRight: 6 }} />
          Authorised staff only. Every sign-in and change is recorded.
        </motion.p>
      </section>

      <section className="ad-login__side">
        <motion.div
          className="ad-login__panel"
          initial={{ opacity: 0, y: 30, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        >
          <AnimatePresence mode="wait" initial={false}>
            {step === 'credentials' && (
              <motion.form key="credentials" onSubmit={submitCredentials} className="ad-stack" {...STEP_MOTION}>
                <div>
                  <h1>Welcome back</h1>
                  <p className="ad-muted">Sign in to continue to the console.</p>
                </div>
                <label className="ad-field">
                  <span><Mail size={12} aria-hidden="true" /> Email</span>
                  <input type="email" autoComplete="username" required value={email} onChange={(e) => setEmail(e.target.value)} />
                </label>
                <label className="ad-field">
                  <span><Lock size={12} aria-hidden="true" /> Password</span>
                  <span className="ad-row-end" style={{ position: 'relative' }}>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="current-password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      style={{ paddingRight: 44 }}
                    />
                    <button
                      type="button"
                      className="ad-link"
                      onClick={() => setShowPassword((v) => !v)}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                      style={{ position: 'absolute', right: 12, color: 'var(--ad-muted)' }}
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </span>
                </label>
                <Notice kind="error">{error}</Notice>
                <motion.button type="submit" className="ad-btn ad-btn--primary ad-btn--block" disabled={busy} whileTap={{ scale: 0.98 }}>
                  {busy ? <Spinner /> : 'Continue'}
                </motion.button>
              </motion.form>
            )}

            {step === 'setup' && (
              <motion.form key="setup" onSubmit={submitCode} className="ad-stack" {...STEP_MOTION}>
                <div>
                  <h1>Set up two-factor</h1>
                  <p className="ad-muted">Scan this code with Google Authenticator, Microsoft Authenticator or 1Password, then enter the 6-digit code it shows.</p>
                </div>
                <div className="ad-row-end" style={{ justifyContent: 'center', minHeight: 232 }}>
                  {setup?.qr
                    ? <motion.img className="ad-qr" src={setup.qr} alt="Authenticator setup QR code" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} />
                    : <Spinner />}
                </div>
                <p className="ad-muted ad-small">Can't scan? Enter this key: <code className="ad-code">{setup?.secret}</code></p>
                {codeField}
                <Notice kind="error">{error}</Notice>
                <motion.button type="submit" className="ad-btn ad-btn--primary ad-btn--block" disabled={busy} whileTap={{ scale: 0.98 }}>
                  {busy ? <Spinner /> : 'Finish set-up'}
                </motion.button>
                <button type="button" className="ad-link ad-row-end" onClick={restart} style={{ justifyContent: 'center', gap: 6 }}>
                  <ArrowLeft size={14} aria-hidden="true" /> Back
                </button>
              </motion.form>
            )}

            {step === 'code' && (
              <motion.form key="code" onSubmit={submitCode} className="ad-stack" {...STEP_MOTION}>
                <div>
                  <h1>Enter your code</h1>
                  <p className="ad-muted">Open your authenticator app and enter the current code.</p>
                </div>
                <div className="ad-row-end" style={{ justifyContent: 'center' }}>
                  <motion.span
                    initial={{ rotate: -12, scale: 0.8 }}
                    animate={{ rotate: 0, scale: 1 }}
                    className="ad-stat__icon"
                    style={{ width: 56, height: 56, borderRadius: 18 }}
                  >
                    <KeyRound size={24} aria-hidden="true" />
                  </motion.span>
                </div>
                {codeField}
                <Notice kind="error">{error}</Notice>
                <motion.button type="submit" className="ad-btn ad-btn--primary ad-btn--block" disabled={busy} whileTap={{ scale: 0.98 }}>
                  {busy ? <Spinner /> : 'Sign in'}
                </motion.button>
                <button type="button" className="ad-link ad-row-end" onClick={restart} style={{ justifyContent: 'center', gap: 6 }}>
                  <ArrowLeft size={14} aria-hidden="true" /> Back
                </button>
              </motion.form>
            )}
          </AnimatePresence>
        </motion.div>
      </section>
    </main>
  );
}
