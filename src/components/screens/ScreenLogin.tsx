'use client';

import { useState, useEffect } from 'react';
import { GoogleLogin } from '@react-oauth/google';
import { Lock, Eye, EyeOff, ShieldCheck, AlertCircle } from 'lucide-react';
import { getConfig } from '@/lib/db';
import { setGoogleToken, setGoogleUser, verifyPin } from '@/lib/auth';

const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '';

interface ScreenLoginProps {
  nombreBarberia?: string;
  logoSrc?: string;
  onLoginSuccess: (token: string, email?: string) => void;
}

async function verifyGoogleIdToken(token: string): Promise<{ email?: string; name?: string; picture?: string } | null> {
  try {
    const res = await fetch(
      `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(token)}`
    );
    if (!res.ok) return null;
    const data = await res.json();
    if (
      data.aud !== GOOGLE_CLIENT_ID ||
      !['accounts.google.com', 'https://accounts.google.com'].includes(data.iss) ||
      Number(data.exp) * 1000 < Date.now() ||
      !(data.email_verified === 'true' || data.email_verified === true)
    ) {
      return null;
    }
    return {
      email: data.email,
      name: data.name,
      picture: data.picture,
    };
  } catch {
    return null;
  }
}

export default function ScreenLogin({ nombreBarberia = 'Gestión de Barberia', logoSrc, onLoginSuccess }: ScreenLoginProps) {
  const [googleActivo, setGoogleActivo] = useState(false);
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [mostrar, setMostrar] = useState(false);
  const [cargando, setCargando] = useState(false);

  const logoReal = logoSrc || '/Logo.jpg';
  const googleConfigurado = !!(GOOGLE_CLIENT_ID && !GOOGLE_CLIENT_ID.includes('PON_TU_CLIENT_ID'));

  useEffect(() => {
    if (googleConfigurado) setGoogleActivo(true);
  }, []);

  async function handleGoogleSuccess(credentialResponse: { credential?: string }) {
    const token = credentialResponse.credential;
    if (!token) { setError('No se recibió token de Google.'); return; }
    setCargando(true);

    const payload = await verifyGoogleIdToken(token);
    const email = payload?.email?.toLowerCase() || '';

    const emailsConfig = await getConfig('emails_autorizados');
    const emailsAutorizados = emailsConfig
      ? emailsConfig.split(',').map(e => e.trim().toLowerCase()).filter(Boolean)
      : [];

    if (!payload || !email) {
      setCargando(false);
      setError('Token de Google inválido o caducado. Intentá de nuevo.');
      return;
    }

    if (emailsAutorizados.length > 0 && !emailsAutorizados.includes(email)) {
      setCargando(false);
      setError(`❌ El email ${email} no tiene acceso. Contactá al administrador.`);
      return;
    }

    if (payload.name || payload.picture || payload.email) {
      setGoogleUser({
        email,
        name: payload.name,
        picture: payload.picture,
      });
    }

    setGoogleToken(token);
    setCargando(false);
    onLoginSuccess(token, email);
  }

  async function verificarPin() {
    setCargando(true);
    const correcto = await verifyPin(pin);
    setCargando(false);

    if (correcto) {
      onLoginSuccess('pin_auth_token');
    } else {
      setError('PIN incorrecto. Intentá de nuevo.');
      setPin('');
    }
  }

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', minHeight: '100dvh',
      position: 'relative', zIndex: 1, padding: 20,
    }}>
      {/* Logo + Nombre */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14, marginBottom: 28 }}>
        <div style={{
          width: 80, height: 80, borderRadius: '50%', overflow: 'hidden',
          boxShadow: '0 0 40px rgba(212,175,55,0.35)',
          border: '2px solid rgba(212,175,55,0.4)',
        }}>
          <img src={logoReal} alt="Logo"
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
          />
        </div>
        <div style={{ textAlign: 'center' }}>
          <p style={{ fontFamily: 'var(--font-display)', fontSize: 26, color: 'var(--gold)', fontWeight: 700 }}>
            {nombreBarberia}
          </p>
          <p style={{ fontSize: 13, color: 'var(--gray-muted)', marginTop: 4 }}>Acceso restringido al personal</p>
        </div>
      </div>

      <div className="card" style={{ width: '100%', maxWidth: 340, padding: 24 }}>

        {/* Tabs Google / PIN — solo si Google está configurado */}
        {googleConfigurado && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 22 }}>
            <button onClick={() => { setGoogleActivo(true); setError(''); }} style={{
              padding: '9px', borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: 'pointer',
              border: `2px solid ${googleActivo ? 'var(--gold)' : 'var(--black-border)'}`,
              background: googleActivo ? 'rgba(212,175,55,0.1)' : 'transparent',
              color: googleActivo ? 'var(--gold)' : 'var(--gray-muted)',
              fontFamily: 'var(--font-body)',
            }}>🔐 Google</button>
            <button onClick={() => { setGoogleActivo(false); setError(''); }} style={{
              padding: '9px', borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: 'pointer',
              border: `2px solid ${!googleActivo ? 'rgba(255,255,255,0.2)' : 'var(--black-border)'}`,
              background: !googleActivo ? 'rgba(255,255,255,0.04)' : 'transparent',
              color: !googleActivo ? 'var(--white-soft)' : 'var(--gray-muted)',
              fontFamily: 'var(--font-body)',
            }}>🔢 PIN</button>
          </div>
        )}

        {/* ── LOGIN GOOGLE ── */}
        {googleActivo && googleConfigurado && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
            <div style={{
              width: 48, height: 48, borderRadius: '50%',
              background: 'rgba(212,175,55,0.08)', border: '1px solid rgba(212,175,55,0.25)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <ShieldCheck size={22} color="var(--gold)" />
            </div>
            <p style={{ fontSize: 14, color: 'var(--white-soft)', fontWeight: 500, textAlign: 'center' }}>
              Iniciá sesión con tu cuenta de Google
            </p>

            {cargando ? (
              <div style={{ padding: '16px 0', color: 'var(--gold)', fontSize: 13 }}>Verificando acceso...</div>
            ) : (
              <GoogleLogin
                onSuccess={handleGoogleSuccess}
                onError={() => setError('No se pudo conectar con Google. Verificá tu conexión.')}
                theme="filled_black"
                shape="pill"
                text="signin_with"
                size="large"
                locale="es"
              />
            )}

            {error && (
              <div style={{
                display: 'flex', gap: 8, alignItems: 'flex-start',
                padding: '10px 14px', borderRadius: 10, width: '100%',
                background: 'rgba(224,82,82,0.1)', border: '1px solid rgba(224,82,82,0.3)',
                color: 'var(--danger)', fontSize: 12, lineHeight: 1.5,
              }}>
                <AlertCircle size={14} style={{ flexShrink: 0, marginTop: 1 }} />
                {error}
              </div>
            )}

            <p style={{ fontSize: 11, color: 'var(--gray-muted)', textAlign: 'center', lineHeight: 1.5 }}>
              Solo los emails autorizados por el administrador pueden acceder.
            </p>
          </div>
        )}

        {/* ── LOGIN PIN ── */}
        {!googleActivo && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
            <div style={{
              width: 48, height: 48, borderRadius: '50%',
              background: 'rgba(212,175,55,0.08)', border: '1px solid rgba(212,175,55,0.25)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Lock size={22} color="var(--gold)" />
            </div>

            <p style={{ fontSize: 14, color: 'var(--white-soft)', fontWeight: 500 }}>Ingresá tu PIN de acceso</p>

            <div style={{ width: '100%', position: 'relative' }}>
              <input className="input-dark"
                type={mostrar ? 'text' : 'password'}
                inputMode="numeric" maxLength={8} value={pin}
                onChange={e => { setPin(e.target.value.replace(/\D/g, '')); setError(''); }}
                onKeyDown={e => { if (e.key === 'Enter') verificarPin(); }}
                placeholder="••••"
                style={{ textAlign: 'center', fontSize: 26, letterSpacing: 10, paddingRight: 44 }}
                autoFocus
              />
              <button onClick={() => setMostrar(!mostrar)} style={{
                position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                background: 'none', border: 'none', cursor: 'pointer', color: 'var(--gray-muted)', display: 'flex',
              }}>
                {mostrar ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, width: '100%' }}>
              {[1,2,3,4,5,6,7,8,9,'',0,'⌫'].map((n, i) => (
                <button key={i} onClick={() => {
                  if (n === '⌫') { setPin(p => p.slice(0, -1)); setError(''); }
                  else if (n !== '') { setPin(p => (p + String(n)).slice(0, 8)); setError(''); }
                }} style={{
                  padding: '13px 0', borderRadius: 12, fontSize: 20, fontWeight: 600,
                  background: n === '' ? 'transparent' : 'rgba(255,255,255,0.04)',
                  border: n === '' ? 'none' : '1px solid rgba(255,255,255,0.07)',
                  color: n === '⌫' ? 'var(--danger)' : 'var(--white-soft)',
                  cursor: n === '' ? 'default' : 'pointer',
                  fontFamily: 'var(--font-body)',
                }}>{n}</button>
              ))}
            </div>

            {error && <p style={{ fontSize: 13, color: 'var(--danger)', textAlign: 'center' }}>{error}</p>}

            <button className="btn-gold" style={{ width: '100%', fontSize: 15 }}
              disabled={pin.length < 1} onClick={verificarPin}>
              Entrar
            </button>

            {!googleConfigurado && (
              <p style={{ fontSize: 11, color: 'var(--gray-muted)', textAlign: 'center' }}>
                PIN por defecto: <strong style={{ color: 'var(--gold)' }}>1234</strong> — cambiálo desde Ajustes
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
