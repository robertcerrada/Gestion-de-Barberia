# ✂️ Gestión de Barbería

Aplicación web PWA para la gestión completa de una barbería. Control de ventas diarias, barberos, gastos, adelantos, socios, fondo de caja y panel de reportes mensuales.

> 100% local · Sin servidor · Sin base de datos en la nube · Funciona offline

---

## 🚀 Tecnologías

- [Next.js 15](https://nextjs.org) — Framework React con App Router
- [TypeScript](https://www.typescriptlang.org) — Tipado estático
- [Dexie.js](https://dexie.org) — Base de datos local (IndexedDB)
- [Tailwind CSS v4](https://tailwindcss.com) — Estilos
- [Recharts](https://recharts.org) — Gráficos
- [Google OAuth](https://developers.google.com/identity) — Login opcional
- [Google Drive API](https://developers.google.com/drive) — Backup en la nube (opcional)
- PWA con Service Worker — Instalable en móvil y escritorio

---

## 📋 Funcionalidades

- 📈 **Registro diario** de ventas, gastos y adelantos
- 💈 **Gestión de barberos** con comisiones configurables
- 🤝 **Gestión de socios** con distribución de utilidades
- 💰 **Fondo de caja** para control de cambio
- 📊 **Panel mensual** con resumen, cierre de mes y exportación
- ☁️ **Backup en Google Drive** (opcional)
- 🌙 **Tema oscuro / claro** y soporte multiidioma (ES, EN, PT, DE, FR, AR)
- 📱 Instalable como app en móvil (PWA)

---

## ⚙️ Instalación local

### 1. Clonar el repositorio

```bash
git clone https://github.com/TU_USUARIO/TU_REPO.git
cd TU_REPO
```

### 2. Instalar dependencias

```bash
npm install
```

### 3. Configurar variables de entorno

Crea un archivo `.env.local` en la raíz del proyecto:

```env
NEXT_PUBLIC_GOOGLE_CLIENT_ID=tu_google_client_id_aqui
```

> Si no tenés Google Client ID, la app funciona igual pero sin login con Google ni backup en Drive. Podés obtenerlo en [console.cloud.google.com](https://console.cloud.google.com).

### 4. Ejecutar en desarrollo

```bash
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000) en tu navegador.

### 5. Build para producción

```bash
npm run build
npm start
```

---

## ☁️ Despliegue en Vercel (recomendado)

1. Subí el repositorio a GitHub
2. Entrá a [vercel.com](https://vercel.com) y conectá tu repositorio
3. En **Environment Variables** agregá:
   ```
   NEXT_PUBLIC_GOOGLE_CLIENT_ID = tu_client_id
   ```
4. Vercel detecta Next.js automáticamente y despliega

---

## 🔐 Google OAuth (opcional)

Para habilitar el login con Google y el backup en Drive:

1. Ir a [console.cloud.google.com](https://console.cloud.google.com)
2. Crear un proyecto nuevo
3. Habilitar **Google Drive API**
4. Crear credenciales → **OAuth 2.0 Client ID** → tipo *Web application*
5. Agregar en *Authorized JavaScript origins*:
   - `http://localhost:3000` (desarrollo)
   - `https://tu-dominio.vercel.app` (producción)
6. Copiar el **Client ID** y pegarlo en `.env.local`

---

## 📁 Estructura del proyecto

```
src/
├── app/
│   ├── layout.tsx       # Layout principal con providers
│   ├── page.tsx         # Página principal con navegación
│   └── globals.css      # Estilos globales y variables CSS
├── components/
│   ├── PremiumNavBar.tsx # Barra de navegación inferior
│   └── screens/
│       ├── ScreenInicio.tsx    # Registro diario
│       ├── ScreenBarberos.tsx  # Gestión de barberos
│       ├── ScreenPanel.tsx     # Panel y reportes
│       ├── ScreenAjustes.tsx   # Configuración
│       └── ScreenLogin.tsx     # Pantalla de acceso
└── lib/
    ├── db.ts            # Base de datos Dexie (IndexedDB)
    ├── business.ts      # Lógica de negocio
    ├── auth.ts          # Autenticación
    ├── drive.ts         # Google Drive backup
    ├── useAppConfig.ts  # Tema e idioma (contexto global)
    └── useMoneda.ts     # Moneda configurable
```

---

## 🗒️ Notas importantes

- Los datos se guardan **localmente en el navegador** (IndexedDB). No se envían a ningún servidor.
- Al limpiar el caché del navegador o desinstalar la PWA, los datos locales se borran. Se recomienda hacer backups periódicos en Google Drive o exportar el JSON.
- El archivo `.env.local` **no se sube a GitHub** por seguridad (está en `.gitignore`).

---

## 📄 Licencia

Proyecto privado — todos los derechos reservados.
