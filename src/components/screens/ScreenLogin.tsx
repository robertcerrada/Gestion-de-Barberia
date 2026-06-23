/* eslint-disable @next/next/no-img-element */
'use client';

import { useState, useEffect, useReducer } from 'react';
import { GoogleLogin } from '@react-oauth/google';
import { Lock, Eye, EyeOff, ShieldCheck, AlertCircle } from 'lucide-react';
import { createAppSessionToken, getAuthorizedEmails, isPinConfigured, savePin, setGoogleToken, setGoogleUser, verifyPin } from '@/lib/auth';

const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '';
const PIN_KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', null, '0', 'backspace'] as const;

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
  const [showLogo, setShowLogo] = useState(true);
  const [pinConfigurado, setPinConfigurado] = useState(() => isPinConfigured());
  const [pinInicial, setPinInicial] = useState<string | null>(null);

  type FormState = { pin: string; error: string; mostrar: boolean; cargando: boolean };
  type FormAction =
    | { type: 'setPinChar'; char: string }
    | { type: 'backspace' }
    | { type: 'clearPin' }
    | { type: 'toggleMostrar' }
    | { type: 'setError'; error: string }
    | { type: 'startCargando' }
    | { type: 'stopCargando' }
    | { type: 'resetForm' };

  const [form, dispatch] = useReducer(
    (state: FormState, action: FormAction): FormState => {
      switch (action.type) {
        case 'setPinChar':  return { ...state, pin: (state.pin + action.char).slice(0, 8), error: '' };
        case 'backspace':   return { ...state, pin: state.pin.slice(0, -1), error: '' };
        case 'clearPin':    return { ...state, pin: '', error: '' };
        case 'toggleMostrar': return { ...state, mostrar: !state.mostrar };
        case 'setError':    return { ...state, error: action.error };
        case 'startCargando': return { ...state, cargando: true };
        case 'stopCargando':  return { ...state, cargando: false };
        case 'resetForm':   return { pin: '', error: '', mostrar: false, cargando: false };
        default: return state;
      }
    },
    { pin: '', error: '', mostrar: false, cargando: false }
  );
  const { pin, error, mostrar, cargando } = form;

  const logoReal = logoSrc || '/Logo.jpg';
  const googleConfigurado = !!(GOOGLE_CLIENT_ID && !GOOGLE_CLIENT_ID.includes('PON_TU_CLIENT_ID'));

  useEffect(() => {
    const cancelled = { current: false };
    const t = setTimeout(() => {
      if (!cancelled.current && googleConfigurado && pinConfigurado) {
        requestAnimationFrame(() => {
          if (!cancelled.current) setGoogleActivo(true);
        });
      }
    }, 0);
    return () => { 
      cancelled.current = true; 
      clearTimeout(t); 
    };
  }, [googleConfigurado, pinConfigurado]);

  async function handleGoogleSuccess(credentialResponse: { credential?: string }) {
    const token = credentialResponse.credential;
    if (!token) { dispatch({ type: 'setError', error: 'No se recibió token de Google.' }); return; }
    dispatch({ type: 'startCargando' });

    const payload = await verifyGoogleIdToken(token);
    const email = payload?.email?.toLowerCase() || '';

    const emailsAutorizados = await getAuthorizedEmails();

    if (!payload || !email) {
      dispatch({ type: 'stopCargando' });
      dispatch({ type: 'setError', error: 'Token de Google inválido o caducado. Intentá de nuevo.' });
      return;
    }

    if (emailsAutorizados.length === 0) {
      dispatch({ type: 'stopCargando' });
      dispatch({ type: 'setError', error: 'No hay emails autorizados configurados. Entra con PIN y agrega al menos un email en Ajustes.' });
      return;
    }

    if (!emailsAutorizados.includes(email)) {
      dispatch({ type: 'stopCargando' });
      dispatch({ type: 'setError', error: `❌ El email ${email} no tiene acceso. Contactá al administrador.` });
      return;
    }

    if (payload.name || payload.picture || payload.email) {
      setGoogleUser({
        email,
        name: payload.name ?? '',
        picture: payload.picture ?? '',
      });
    }

    setGoogleToken(token);
    dispatch({ type: 'stopCargando' });
    onLoginSuccess(createAppSessionToken('google'), email);
  }

  async function configurarPinInicial() {
    if (pin.length < 4) {
      dispatch({ type: 'setError', error: 'El PIN debe tener al menos 4 digitos.' });
      return;
    }

    if (!pinInicial) {
      setPinInicial(pin);
      dispatch({ type: 'clearPin' });
      dispatch({ type: 'setError', error: '' });
      return;
    }

    if (pin !== pinInicial) {
      setPinInicial(null);
      dispatch({ type: 'clearPin' });
      dispatch({ type: 'setError', error: 'Los PIN no coinciden. Crea el PIN inicial de nuevo.' });
      return;
    }

    dispatch({ type: 'startCargando' });
    try {
      await savePin(pin);
      setPinConfigurado(true);
      dispatch({ type: 'stopCargando' });
      onLoginSuccess(createAppSessionToken('pin'));
    } catch {
      dispatch({ type: 'stopCargando' });
      dispatch({ type: 'setError', error: 'No se pudo guardar el PIN inicial. Intenta de nuevo.' });
    }
  }

  async function verificarPin() {
    if (!pinConfigurado) {
      await configurarPinInicial();
      return;
    }

    dispatch({ type: 'startCargando' });
    let correcto = false;
    try {
      correcto = await verifyPin(pin);
    } catch (err) {
      dispatch({ type: 'stopCargando' });
      dispatch({ type: 'setError', error: err instanceof Error ? err.message : 'PIN bloqueado temporalmente.' });
      dispatch({ type: 'clearPin' });
      return;
    }
    dispatch({ type: 'stopCargando' });

    if (correcto) {
      onLoginSuccess(createAppSessionToken('pin'));
    } else {
      dispatch({ type: 'setError', error: 'PIN incorrecto. Intentá de nuevo.' });
      dispatch({ type: 'clearPin' });
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
          border: '2px solid rgba(212,175,55,0.4)', position: 'relative'
        }}>
          {showLogo && (
            <img
              src={logoReal}
              alt="Logo"
              style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
              onError={() => setShowLogo(false)}
            />
          )}
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
        {googleConfigurado && pinConfigurado && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 22 }}>
            <button type="button" onClick={() => { setGoogleActivo(true); dispatch({ type: 'setError', error: '' }); }} style={{
              padding: '9px', borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: 'pointer',
              border: `2px solid ${googleActivo ? 'var(--gold)' : 'var(--black-border)'}`,
              background: googleActivo ? 'rgba(212,175,55,0.1)' : 'transparent',
              color: googleActivo ? 'var(--gold)' : 'var(--gray-muted)',
              fontFamily: 'var(--font-body)',
            }}>🔐 Google</button>
            <button type="button" onClick={() => { setGoogleActivo(false); dispatch({ type: 'setError', error: '' }); }} style={{
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
                onError={() => dispatch({ type: 'setError', error: 'No se pudo conectar con Google. Verificá tu conexión.' })}
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
                aria-label="PIN de acceso"
                inputMode="numeric" maxLength={8} value={pin}
                onChange={e => { dispatch({ type: 'setPinChar', char: e.target.value.replace(/\D/g, '').slice(-1) }); }}
                onKeyDown={e => { if (e.key === 'Enter') verificarPin(); }}
                placeholder="••••"
                style={{ textAlign: 'center', fontSize: 26, letterSpacing: 10, paddingRight: 44 }}
              />
              <button type="button" onClick={() => dispatch({ type: 'toggleMostrar' })} aria-label={mostrar ? 'Ocultar PIN' : 'Mostrar PIN'} style={{
                position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                background: 'none', border: 'none', cursor: 'pointer', color: 'var(--gray-muted)', display: 'flex',
              }}>
                {mostrar ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, width: '100%' }}>
              {PIN_KEYS.map((key) => {
                if (key === null) {
                  return <span key="pin-spacer" aria-hidden="true" />;
                }

                const isBackspace = key === 'backspace';
                return (
                  <button type="button" key={key} aria-label={isBackspace ? 'Borrar numero del PIN' : `Numero ${key}`} onClick={() => {
                    if (isBackspace) { dispatch({ type: 'backspace' }); }
                    else { dispatch({ type: 'setPinChar', char: key }); }
                  }} style={{
                    padding: '13px 0', borderRadius: 12, fontSize: 20, fontWeight: 600,
                    background: 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(255,255,255,0.07)',
                    color: isBackspace ? 'var(--danger)' : 'var(--white-soft)',
                    cursor: 'pointer',
                    fontFamily: 'var(--font-body)',
                  }}>{isBackspace ? 'Del' : key}</button>
                );
              })}
            </div>

            {error && <p style={{ fontSize: 13, color: 'var(--danger)', textAlign: 'center' }}>{error}</p>}

            <button type="button" className="btn-gold" style={{ width: '100%', fontSize: 15 }}
              disabled={pin.length < (pinConfigurado ? 1 : 4) || cargando} onClick={verificarPin}>
              {cargando
                ? 'Guardando...'
                : pinConfigurado
                  ? 'Entrar'
                  : pinInicial
                    ? 'Confirmar PIN'
                    : 'Crear PIN'}
            </button>

            {!pinConfigurado && (
              <p style={{ fontSize: 11, color: 'var(--gray-muted)', textAlign: 'center', lineHeight: 1.5 }}>
                Este PIN abre la app por primera vez. Despues agrega los emails autorizados en Ajustes para habilitar Google.
              </p>
            )}

            {pinConfigurado && !googleConfigurado && (
              <p style={{ fontSize: 11, color: 'var(--gray-muted)', textAlign: 'center' }}>
                Configurá tu PIN desde Ajustes antes de usar la app
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
