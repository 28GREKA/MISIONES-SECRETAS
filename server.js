const express = require('express');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = 3000;

const SECRETO_JWT = 'secreto-super-secreto-2026';
const SECRETO_REFRESH = 'refresh-secreto-2026';

let refreshTokens = [];

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

const agentes = [
  { codigo: 'AGENTE-001', nombre: 'Shadow', nivel: 3 },
  { codigo: 'AGENTE-002', nombre: 'Phoenix', nivel: 5 },
  { codigo: 'AGENTE-003', nombre: 'Viper', nivel: 2 },
  { codigo: 'AGENTE-004', nombre: 'Ghost', nivel: 7 },
  { codigo: 'AGENTE-005', nombre: 'Nova', nivel: 4 }
];

const misiones = [
  { id: 1, titulo: 'Operación Nocturna', descripcion: 'Infiltra la base enemiga y recupera los documentos clasificados.', dificultad: 'Fácil', puntos: 100, nivelRequerido: 1 },
  { id: 2, titulo: 'Código Enigma', descripcion: 'Descifra el mensaje interceptado antes del amanecer.', dificultad: 'Media', puntos: 250, nivelRequerido: 2 },
  { id: 3, titulo: 'Doble Agente', descripcion: 'Identifica al topo dentro de nuestra organización.', dificultad: 'Media', puntos: 300, nivelRequerido: 3 },
  { id: 4, titulo: 'Protocolo Fantasma', descripcion: 'Desactiva el sistema de seguridad sin dejar rastro.', dificultad: 'Difícil', puntos: 500, nivelRequerido: 5 },
  { id: 5, titulo: 'Misión Imposible', descripcion: 'La misión más peligrosa. Solo para agentes de élite.', dificultad: 'Extrema', puntos: 1000, nivelRequerido: 7 }
];

function generarAccessToken(agente) {
  return jwt.sign(
    { codigo: agente.codigo, nombre: agente.nombre, nivel: agente.nivel },
    SECRETO_JWT,
    { expiresIn: '30s' }
  );
}

function generarRefreshToken(agente) {
  return jwt.sign(
    { codigo: agente.codigo },
    SECRETO_REFRESH,
    { expiresIn: '5m' }
  );
}

function verificarToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Acceso denegado. Se requiere token de acceso.' });
  }

  jwt.verify(token, SECRETO_JWT, (err, agente) => {
    if (err) {
      return res.status(403).json({ error: 'Token inválido o expirado.', expirado: true });
    }
    req.agente = agente;
    next();
  });
}

app.post('/login', (req, res) => {
  const { codigo } = req.body;
  const agente = agentes.find(a => a.codigo === codigo);

  if (!agente) {
    return res.status(401).json({ error: 'Código de agente no válido.' });
  }

  const accessToken = generarAccessToken(agente);
  const refreshToken = generarRefreshToken(agente);
  refreshTokens.push(refreshToken);

  res.json({
    mensaje: `Bienvenido, Agente ${agente.nombre}`,
    accessToken,
    refreshToken,
    expiraEn: 30
  });
});

app.post('/refresh', (req, res) => {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    return res.status(401).json({ error: 'Se requiere refresh token.' });
  }

  if (!refreshTokens.includes(refreshToken)) {
    return res.status(403).json({ error: 'Refresh token inválido.' });
  }

  jwt.verify(refreshToken, SECRETO_REFRESH, (err, data) => {
    if (err) {
      return res.status(403).json({ error: 'Refresh token expirado.' });
    }

    const agente = agentes.find(a => a.codigo === data.codigo);
    const nuevoAccessToken = generarAccessToken(agente);

    res.json({
      accessToken: nuevoAccessToken,
      expiraEn: 30
    });
  });
});

app.get('/misiones', verificarToken, (req, res) => {
  const nivelAgente = req.agente.nivel;
  const misionesDisponibles = misiones.filter(m => m.nivelRequerido <= nivelAgente);
  const misionesBloqueadas = misiones.filter(m => m.nivelRequerido > nivelAgente);

  res.json({
    agente: req.agente.nombre,
    nivel: nivelAgente,
    misionesDisponibles,
    misionesBloqueadas: misionesBloqueadas.map(m => ({ ...m, descripcion: '???' }))
  });
});

app.post('/completar-mision', verificarToken, (req, res) => {
  const { misionId } = req.body;
  const mision = misiones.find(m => m.id === misionId);

  if (!mision) {
    return res.status(404).json({ error: 'Misión no encontrada.' });
  }

  if (mision.nivelRequerido > req.agente.nivel) {
    return res.status(403).json({ error: 'Nivel insuficiente para esta misión.' });
  }

  res.json({
    mensaje: `Misión "${mision.titulo}" completada`,
    puntosGanados: mision.puntos,
    agente: req.agente.nombre
  });
});

app.get('/perfil', verificarToken, (req, res) => {
  res.json({
    codigo: req.agente.codigo,
    nombre: req.agente.nombre,
    nivel: req.agente.nivel,
    rango: req.agente.nivel >= 7 ? 'Agente Élite' : req.agente.nivel >= 4 ? 'Agente Senior' : 'Agente Junior'
  });
});

app.listen(PORT, () => {
  console.log(`Servidor de misiones secretas corriendo en http://localhost:${PORT}`);
});
