'use client';

import { useEffect, useRef, useState, type FormEvent } from 'react';
import { ArrowLeft, ArrowUpLeft, Mail, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { getAuth } from '@/lib/auth-client';
import { loginReturn } from '@/lib/login-return';
import { ThemeToggle } from '../theme-toggle';

type Turnstile = {
  render: (element: HTMLElement, options: Record<string, unknown>) => string;
  reset: (id: string) => void;
  remove: (id: string) => void;
};

export default function Login() {
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState('');
  const [cooldown, setCooldown] = useState(0);
  const [captchaKey, setCaptchaKey] = useState('');
  const [captchaToken, setCaptchaToken] = useState('');
  const [destination, setDestination] = useState('/');
  const captchaElement = useRef<HTMLDivElement>(null);
  const widget = useRef<string | undefined>(undefined);
  const lock = useRef(false);
  const emailInput = useRef<HTMLInputElement>(null);
  const codeInput = useRef<HTMLInputElement>(null);

  async function initialize() {
    setError(''); setReady(false);
    try {
      const { client, config } = await getAuth();
      setCaptchaKey(config.captchaSiteKey); setReady(true);
      const { data } = await client.auth.getSession();
      if (data.session) {
        const verified = await client.auth.getUser();
        if (verified.data.user) window.location.replace(loginReturn(new URLSearchParams(window.location.search).get('return_to')));
        else if (verified.error?.status === 401 || verified.error?.status === 403) await client.auth.signOut({ scope: 'local' });
        else if (verified.error) throw verified.error;
      }
    } catch { setError('الدخول غير متاح حاليًا. جرّب مرة ثانية بعد قليل.'); }
  }
  useEffect(() => {
    setDestination(loginReturn(new URLSearchParams(window.location.search).get('return_to')));
    void initialize();
  }, []);
  useEffect(() => {
    if (!cooldown) return;
    const timer = setTimeout(() => setCooldown(value => Math.max(0, value - 1)), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);
  useEffect(() => {
    if (sent) codeInput.current?.focus();
  }, [sent]);
  useEffect(() => {
    if (!captchaKey) return;
    let disposed = false;
    const render = () => {
      const turnstile = (window as unknown as { turnstile?: Turnstile }).turnstile;
      if (disposed || !turnstile || !captchaElement.current) return;
      widget.current = turnstile.render(captchaElement.current, {
        sitekey: captchaKey, theme: 'auto', size: 'flexible', language: 'ar',
        callback: (token: string) => { setCaptchaToken(token); setError(''); },
        'expired-callback': () => setCaptchaToken(''),
        'error-callback': () => { setCaptchaToken(''); setError('تعذّر التحقق. حدّث الصفحة وأعد المحاولة.'); },
      });
    };
    const script = document.createElement('script');
    script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
    script.async = true; script.onload = render;
    script.onerror = () => setError('تعذّر تحميل التحقق. تأكد من الاتصال وحدّث الصفحة.');
    document.head.appendChild(script);
    return () => {
      disposed = true;
      const turnstile = (window as unknown as { turnstile?: Turnstile }).turnstile;
      if (widget.current !== undefined) turnstile?.remove(widget.current);
      script.remove();
    };
  }, [captchaKey]);

  function authError(caught: unknown, verifying: boolean) {
    const status = (caught as { status?: number })?.status;
    if (status === 429) { setCooldown(60); return 'طلبات كثيرة خلال وقت قصير. انتظر دقيقة ثم جرّب.'; }
    if (verifying && (status === 400 || status === 401 || status === 403)) return 'الرمز غير صحيح أو انتهت صلاحيته. تأكد منه أو اطلب رمزًا جديدًا.';
    return verifying ? 'ما قدرنا نتحقق من الرمز. أعد المحاولة.' : 'ما قدرنا نرسل الرمز. تأكد من بريدك واتصالك ثم جرّب ثانية.';
  }
  async function sendCode(event?: FormEvent) {
    event?.preventDefault();
    if (lock.current || cooldown || !ready || (captchaKey && !captchaToken)) return;
    if (!emailInput.current?.reportValidity()) return;
    lock.current = true; setBusy(true); setError('');
    try {
      const { client } = await getAuth();
      const { error: problem } = await client.auth.signInWithOtp({
        email: email.trim(), options: { shouldCreateUser: true, ...(captchaToken ? { captchaToken } : {}) },
      });
      if (problem) throw problem;
      setSent(true); setCode(''); setCooldown(60);
    } catch (caught) { setError(authError(caught, false)); }
    finally {
      lock.current = false; setBusy(false); setCaptchaToken('');
      if (widget.current !== undefined) (window as unknown as { turnstile?: Turnstile }).turnstile?.reset(widget.current);
    }
  }
  async function verifyCode(event: FormEvent) {
    event.preventDefault(); if (lock.current) return;
    lock.current = true; setBusy(true); setError('');
    try {
      const { client } = await getAuth();
      const { data, error: problem } = await client.auth.verifyOtp({ email: email.trim(), token: code.trim(), type: 'email' });
      if (problem) throw problem;
      if (!data.session) throw new Error('No session');
      window.location.replace(destination);
    } catch (caught) { setError(authError(caught, true)); }
    finally { lock.current = false; setBusy(false); }
  }

  return <main className="auth-page">
    <header className="auth-top"><a href="/" className="auth-brand" aria-label="ابتكر، الرئيسية">ابتكر<span>▪</span><small>لجنة الابتكار</small></a><ThemeToggle /></header>
    <section className="auth-card" aria-labelledby="login-heading">
      <span className="eyebrow">فكرة منك. بداية جديدة.</span>
      <div className="auth-icon" aria-hidden="true">{sent ? <ShieldCheck size={28} /> : <Mail size={28} />}</div>
      <h1 id="login-heading">{sent ? 'باقي الرمز، وتوصل.' : 'مكانك بين الأفكار.'}</h1>
      <p className="auth-description">{sent ? 'أرسلنا رمز الدخول إلى بريدك. اكتبه هنا لنرجعك لنفس المكان.' : 'ادخل ببريدك الإلكتروني. نرسل لك رمزًا، بدون كلمة مرور.'}</p>
      <form onSubmit={sent ? verifyCode : sendCode} className="auth-form">
        <label htmlFor="login-email">البريد الإلكتروني</label>
        <Input ref={emailInput} id="login-email" type="email" dir="ltr" autoComplete="email" required maxLength={254} placeholder="you@example.com" value={email} disabled={busy || sent} onChange={event => setEmail(event.target.value)} />
        {sent && <div className="auth-code-step"><label htmlFor="login-code">رمز الدخول</label><Input ref={codeInput} id="login-code" type="text" dir="ltr" inputMode="numeric" autoComplete="one-time-code" required pattern="[0-9]{6,8}" minLength={6} maxLength={8} placeholder="000000" value={code} disabled={busy} onChange={event => setCode(event.target.value.replace(/[^0-9]/g, ''))} /><p className="auth-hint">إذا ما وصل، تأكد من البريد غير المرغوب فيه.</p></div>}
        <div ref={captchaElement} className="auth-captcha" />
        {error && <p className="form-error" role="alert">{error}</p>}
        {!ready && error ? <Button type="button" className="launch-button" onClick={() => void initialize()}>أعد المحاولة</Button> : <Button type="submit" className="launch-button" disabled={busy || !ready || (!sent && (cooldown > 0 || Boolean(captchaKey && !captchaToken)))}>{busy ? 'لحظة…' : sent ? 'ادخل وكمّل' : cooldown ? `أعد المحاولة بعد ${cooldown} ثانية` : 'أرسل رمز الدخول'}<ArrowUpLeft size={20} /></Button>}
      </form>
      {sent && <div className="auth-secondary"><button disabled={busy || cooldown > 0 || Boolean(captchaKey && !captchaToken)} onClick={() => void sendCode()}>{cooldown ? `إعادة الإرسال بعد ${cooldown} ثانية` : 'أرسل رمزًا جديدًا'}</button><button disabled={busy} onClick={() => { setSent(false); setCode(''); setError(''); }}>غيّر البريد</button></div>}
      <a className="auth-back" href={destination}>ارجع للمساحة <ArrowLeft size={16} /></a>
    </section>
    <footer className="auth-footer">ابتكر · لجنة الابتكار · نادي تقنية المستقبل</footer>
  </main>;
}
