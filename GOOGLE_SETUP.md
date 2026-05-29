# Configuración de Google Login y Google Drive

## Estado: ✅ Completado

La aplicación ya tiene integración con:
- ✅ Google OAuth Login (en ScreenLogin)
- ✅ Google Drive API (para backup/restore)
- ✅ Gestoría de acceso por email
- ✅ UI mejorada para conectar Google Drive

## Paso 1: Obtener Google Client ID

1. Ve a [Google Cloud Console](https://console.cloud.google.com/)
2. Crea un nuevo proyecto (o selecciona uno existente)
3. Habilita las APIs:
   - **Google+ API**
   - **Google Drive API**
4. Ve a **Credenciales** → **Crear credenciales** → **ID de cliente de OAuth**
5. Tipo de aplicación: **Aplicación web**
6. URIs autorizados:
   - `http://localhost:3000`
   - `http://localhost` (para desarrollo local)
   - `https://tu-dominio.com` (para producción)
7. Copia el **Client ID**

## Paso 2: Configurar en `.env.local`

Edita el archivo `.env.local` en la raíz del proyecto:

```env
NEXT_PUBLIC_GOOGLE_CLIENT_ID=tu_client_id_aqui.apps.googleusercontent.com
```

**Importante**: Este ID comienza con números y termina en `.apps.googleusercontent.com`

## Paso 3: Usar en la App

### Login con Gmail
En la pantalla de login (ScreenLogin), verás dos opciones:
1. **🔐 Google** - Inicia sesión con tu cuenta de Gmail
2. **🔢 PIN** - Acceso con PIN numérico

### Conectar Google Drive
En **Ajustes** → **Seguridad y Acceso** → pestaña **☁️ Drive**:

1. Haz clic en **"Conectar Google Drive"**
2. Autoriza el acceso a Google Drive
3. Verás un indicador verde cuando esté conectado

### Hacer Backup
Con Drive conectado, puedes:
- **Hacer copia ahora** - Subir respaldo instantáneo
- **Restaurar desde Drive** - Descargar y restaurar un backup
- **Desconectar Drive** - Revocar acceso

## Configurar Emails Autorizados

En **Ajustes** → **Seguridad y Acceso** → pestaña **📧 Emails**:

Agrega los emails de Gmail que pueden acceder:
```
usuario1@gmail.com
usuario2@gmail.com
```

Si está vacío, cualquier Gmail puede acceder.

## Scopes Configurados

- `drive.file` - Acceso a archivos de Google Drive (solo archivos creados por esta app)
- Se auto-solicitan al conectar desde Ajustes

## Archivos Modificados

1. **src/lib/drive.ts**
   - Función `isDriveConnected()` - verifica si Drive está conectado
   - Función `getLastBackupInfo()` - obtiene fecha y tamaño del último backup

2. **src/components/screens/ScreenAjustes.tsx**
   - Mejorada TabDrive con indicador de último backup
   - Estado `lastBackup` que muestra fecha y tamaño

3. **src/app/layout.tsx** ✅
   - GoogleOAuthProvider ya está configurado

4. **src/components/screens/ScreenLogin.tsx** ✅
   - Ya tiene Google OAuth login integrado

## Testing en Localhost

```bash
npm run dev
```

Luego ve a `http://localhost:3000` y verás:
- Login con Gmail habilitado
- Opción de conectar Drive en Ajustes

## Troubleshooting

### "Google no está configurado"
- Verifica que `.env.local` tiene `NEXT_PUBLIC_GOOGLE_CLIENT_ID`
- No debe contener `PON_TU_CLIENT_ID_AQUI`
- Reinicia el servidor dev

### "Error al conectar con Google"
- Verifica que los URIs autorizados en Google Cloud Console incluyen `localhost:3000`
- Limpia el localStorage en DevTools
- Recarga la página

### Google Drive no funciona
- Asegúrate de tener habilitada la API de Google Drive en Google Cloud Console
- El scope debe ser `https://www.googleapis.com/auth/drive.file`

## Backup Automático (Futuro)

Se puede configurar para hacer backup automático al:
- Cerrar un mes (línea en `cerrarMes()` en business.ts)
- Hacer cambios importantes

## Seguridad

- Los tokens de Google se guardan en `localStorage` con la clave `google_access_token`
- Se usa `drive.file` scope para acceso limitado
- Los respaldos en Drive son `application/json`
- Se recomienda sincronizar regularmente
