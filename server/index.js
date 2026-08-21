import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { query } from './db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '..', '.env') });

const app = express();
const PORT = Number(process.env.PORT || 3001);

app.use(cors({ origin: ['http://localhost:5173', 'http://127.0.0.1:5173'] }));
app.use(express.json());

function getToken(req) {
  const header = req.headers.authorization || '';
  return header.startsWith('Bearer ') ? header.slice(7) : null;
}

async function requireAuth(req, res, next) {
  const userId = getToken(req);
  if (!userId) {
    return res.status(401).json({ error: { message: 'Sesión no válida. Inicia sesión de nuevo.' } });
  }

  const { rows } = await query(
    'SELECT * FROM public.perfiles_usuarios WHERE id = $1',
    [userId]
  );

  if (!rows[0]) {
    return res.status(401).json({ error: { message: 'Usuario no encontrado.' } });
  }

  req.userId = userId;
  req.profile = rows[0];
  next();
}

async function requireDocente(req, res, next) {
  if (!['docente', 'administrador'].includes(req.profile.rol)) {
    return res.status(403).json({ error: { message: 'Acceso solo para docentes.' } });
  }
  next();
}

app.get('/api/health', async (_req, res) => {
  try {
    await query('SELECT 1');
    res.json({ ok: true, database: 'connected' });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

app.post('/api/auth/signup', async (req, res) => {
  const { email: rawEmail, password, rol = 'estudiante', name } = req.body;
  const email = typeof rawEmail === 'string'
    ? rawEmail.trim().replace(/[\u200B-\u200D\uFEFF]/g, '').toLowerCase()
    : '';
  const emailValido = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  if (!email || !password) {
    return res.status(400).json({ error: { message: 'Correo y contraseña son obligatorios.' } });
  }

  if (!emailValido) {
    return res.status(400).json({ error: { message: 'Ingresa un correo electronico valido.' } });
  }

  try {
    const meta = { rol };
    if (name) meta.name = name;

    const { rows } = await query(
      `INSERT INTO auth.users (email, encrypted_password, raw_user_meta_data)
       VALUES ($1, crypt($2, gen_salt('bf')), $3::jsonb)
       RETURNING id, email`,
      [email, password, JSON.stringify(meta)]
    );

    const userId = rows[0].id;

    const profileResult = await query(
      'SELECT * FROM public.perfiles_usuarios WHERE id = $1',
      [userId]
    );

    res.status(201).json({
      data: { user: rows[0], profile: profileResult.rows[0] },
      error: null
    });
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: { message: 'El correo electrónico ya está registrado.' } });
    }
    console.error('signup error:', err);
    res.status(500).json({ error: { message: err.message || 'Error al registrar usuario.' } });
  }
});

app.post('/api/auth/signin', async (req, res) => {
  const { email: rawEmail, password } = req.body;
  const email = typeof rawEmail === 'string'
    ? rawEmail.trim().replace(/[\u200B-\u200D\uFEFF]/g, '').toLowerCase()
    : '';

  if (!email || !password) {
    return res.status(400).json({ error: { message: 'Correo y contraseña son obligatorios.' } });
  }

  try {
    const { rows } = await query(
      `SELECT u.id, u.email
       FROM auth.users u
       WHERE u.email = $1
         AND u.encrypted_password = crypt($2, u.encrypted_password)`,
      [email, password]
    );

    if (!rows[0]) {
      return res.status(401).json({ error: { message: 'Credenciales incorrectas o usuario no encontrado.' } });
    }

    const profileResult = await query(
      'SELECT * FROM public.perfiles_usuarios WHERE id = $1',
      [rows[0].id]
    );

    res.json({
      data: { user: rows[0], profile: profileResult.rows[0], token: rows[0].id },
      error: null
    });
  } catch (err) {
    console.error('signin error:', err);
    res.status(500).json({ error: { message: err.message || 'Error al iniciar sesión.' } });
  }
});

app.post('/api/auth/signout', (_req, res) => {
  res.json({ error: null });
});

app.get('/api/auth/me', requireAuth, (req, res) => {
  res.json(req.profile);
});

app.get('/api/profiles/:userId', requireAuth, async (req, res) => {
  const { userId } = req.params;
  const isDocente = ['docente', 'administrador'].includes(req.profile.rol);

  if (userId !== req.userId && !isDocente) {
    return res.status(403).json({ error: { message: 'No puedes ver este perfil.' } });
  }

  const { rows } = await query(
    'SELECT * FROM public.perfiles_usuarios WHERE id = $1',
    [userId]
  );

  if (!rows[0]) {
    return res.status(404).json({ error: { message: 'Perfil no encontrado.' } });
  }

  res.json(rows[0]);
});

app.patch('/api/profiles/:userId', requireAuth, async (req, res) => {
  const { userId } = req.params;

  if (userId !== req.userId) {
    return res.status(403).json({ error: { message: 'No puedes editar este perfil.' } });
  }

  const allowed = ['xp', 'nivel', 'racha', 'ultimo_entrenamiento'];
  const updates = Object.fromEntries(
    Object.entries(req.body).filter(([key]) => allowed.includes(key))
  );

  if (Object.keys(updates).length === 0) {
    return res.status(400).json({ error: { message: 'No hay campos válidos para actualizar.' } });
  }

  const setClause = Object.keys(updates)
    .map((key, i) => `${key} = $${i + 2}`)
    .join(', ');

  const { rows } = await query(
    `UPDATE public.perfiles_usuarios SET ${setClause} WHERE id = $1 RETURNING *`,
    [userId, ...Object.values(updates)]
  );

  res.json(rows[0]);
});

app.get('/api/sessions/:userId', requireAuth, async (req, res) => {
  const { userId } = req.params;
  const isDocente = ['docente', 'administrador'].includes(req.profile.rol);

  if (userId !== req.userId && !isDocente) {
    return res.status(403).json({ error: { message: 'Acceso denegado.' } });
  }

  const { rows } = await query(
    `SELECT * FROM public.sesiones_entrenamiento
     WHERE usuario_id = $1
     ORDER BY numero_sesion ASC`,
    [userId]
  );

  res.json(rows);
});

app.patch('/api/sessions/complete', requireAuth, async (req, res) => {
  const { numeroSesion } = req.body;

  if (!numeroSesion) {
    return res.status(400).json({ error: { message: 'numeroSesion es obligatorio.' } });
  }

  await query(
    `UPDATE public.sesiones_entrenamiento
     SET completada = true, fecha_completada = now()
     WHERE usuario_id = $1 AND numero_sesion = $2`,
    [req.userId, numeroSesion]
  );

  res.json({ ok: true });
});

app.post('/api/metrics', requireAuth, async (req, res) => {
  const metric = req.body;

  try {
    await query(
      `SELECT public.registrar_metrica_y_actualizar_perfil(
        $1::uuid, $2::uuid, $3::integer, $4::varchar,
        $5::integer, $6::integer, $7::integer, $8::numeric,
        $9::numeric, $10::integer, $11::integer, $12::integer, $13::integer
      )`,
      [
        req.userId,
        metric.sesion_id || null,
        metric.juego_id,
        metric.juego_nombre,
        metric.aciertos,
        metric.errores_omision,
        metric.errores_comision,
        metric.precision,
        metric.tiempo_reaccion_promedio_ms,
        metric.nivel_dificultad_alcanzado,
        metric.velocidad_estimulo_ms ?? null,
        metric.densidad_distractores,
        metric.xp_ganado
      ]
    );

    res.status(201).json({ ok: true });
  } catch (err) {
    console.error('save metric error:', err);
    res.status(500).json({ error: { message: err.message || 'Error guardando métrica.' } });
  }
});

app.get('/api/metrics/:userId', requireAuth, async (req, res) => {
  const { userId } = req.params;
  const isDocente = ['docente', 'administrador'].includes(req.profile.rol);

  if (userId !== req.userId && !isDocente) {
    return res.status(403).json({ error: { message: 'Acceso denegado.' } });
  }

  const { rows } = await query(
    `SELECT * FROM public.metricas_minijuegos
     WHERE usuario_id = $1
     ORDER BY created_at DESC`,
    [userId]
  );

  res.json(rows);
});

app.get('/api/evaluations/:studentId', requireAuth, async (req, res) => {
  const { studentId } = req.params;
  const isDocente = ['docente', 'administrador'].includes(req.profile.rol);

  if (studentId !== req.userId && !isDocente) {
    return res.status(403).json({ error: { message: 'Acceso denegado.' } });
  }

  const { rows } = await query(
    'SELECT * FROM public.evaluaciones_docente WHERE estudiante_id = $1',
    [studentId]
  );

  res.json(rows);
});

app.post('/api/evaluations', requireAuth, requireDocente, async (req, res) => {
  const evaluation = req.body;

  try {
    await query(
      `INSERT INTO public.evaluaciones_docente (
        estudiante_id, docente_id, tipo_evaluacion,
        atencion_sostenida_score, atencion_selectiva_score,
        control_inhibitorio_score, memoria_trabajo_score,
        atencion_dividida_score, tiempo_respuesta_general_ms, observaciones
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
      ON CONFLICT ON CONSTRAINT unique_estudiante_tipo_evaluacion
      DO UPDATE SET
        docente_id = EXCLUDED.docente_id,
        atencion_sostenida_score = EXCLUDED.atencion_sostenida_score,
        atencion_selectiva_score = EXCLUDED.atencion_selectiva_score,
        control_inhibitorio_score = EXCLUDED.control_inhibitorio_score,
        memoria_trabajo_score = EXCLUDED.memoria_trabajo_score,
        atencion_dividida_score = EXCLUDED.atencion_dividida_score,
        tiempo_respuesta_general_ms = EXCLUDED.tiempo_respuesta_general_ms,
        observaciones = EXCLUDED.observaciones,
        fecha_evaluacion = now(),
        updated_at = now()`,
      [
        evaluation.estudiante_id,
        req.userId,
        evaluation.tipo_evaluacion,
        evaluation.atencion_sostenida_score,
        evaluation.atencion_selectiva_score,
        evaluation.control_inhibitorio_score,
        evaluation.memoria_trabajo_score,
        evaluation.atencion_dividida_score,
        evaluation.tiempo_respuesta_general_ms,
        evaluation.observaciones || null
      ]
    );

    res.status(201).json({ ok: true });
  } catch (err) {
    console.error('save evaluation error:', err);
    res.status(500).json({ error: { message: err.message || 'Error guardando evaluación.' } });
  }
});

app.get('/api/students', requireAuth, requireDocente, async (_req, res) => {
  const { rows } = await query(
    `SELECT * FROM public.perfiles_usuarios WHERE rol = 'estudiante' ORDER BY pseudonimo`
  );
  res.json(rows);
});

app.get('/api/metrics', requireAuth, requireDocente, async (_req, res) => {
  const { rows } = await query(
    'SELECT * FROM public.metricas_minijuegos ORDER BY created_at DESC'
  );
  res.json(rows);
});

app.get('/api/evaluations', requireAuth, requireDocente, async (_req, res) => {
  const { rows } = await query(
    'SELECT * FROM public.evaluaciones_docente ORDER BY created_at DESC'
  );
  res.json(rows);
});

app.listen(PORT, async () => {
  try {
    await query('SELECT 1');
    console.log(`API Odisea Mental en http://localhost:${PORT}`);
    console.log(`Base de datos: ${process.env.PGDATABASE || 'odisea_mental'}@${process.env.PGHOST || 'localhost'}`);
  } catch (err) {
    console.error('No se pudo conectar a PostgreSQL:', err.message);
    console.error('Revisa el archivo .env en la raíz del proyecto.');
  }
});
