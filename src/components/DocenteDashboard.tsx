import React, { useEffect, useState } from 'react';
import { db } from '../supabaseClient';
import { PerfilUsuario, MetricaMinijuego, EvaluacionDocente } from '../types';
import { LogOut, Users, BarChart3, ClipboardEdit, FileSpreadsheet, Plus, AlertCircle, CheckCircle2 } from 'lucide-react';

interface DocenteDashboardProps {
  profile: PerfilUsuario;
  onLogout: () => void;
}

export const DocenteDashboard: React.FC<DocenteDashboardProps> = ({ profile, onLogout }) => {
  const [students, setStudents] = useState<PerfilUsuario[]>([]);
  const [metrics, setMetrics] = useState<MetricaMinijuego[]>([]);
  const [evaluations, setEvaluations] = useState<EvaluacionDocente[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'students' | 'evaluations' | 'metrics'>('students');

  // Estado para registrar nueva evaluación
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [evalType, setEvalType] = useState<'pre' | 'post'>('pre');
  const [scoreAtencionSostenida, setScoreAtencionSostenida] = useState(50);
  const [scoreAtencionSelectiva, setScoreAtencionSelectiva] = useState(50);
  const [scoreControlInhibitorio, setScoreControlInhibitorio] = useState(50);
  const [scoreMemoriaTrabajo, setScoreMemoriaTrabajo] = useState(50);
  const [scoreAtencionDividida, setScoreAtencionDividida] = useState(50);
  const [timeGeneral, setTimeGeneral] = useState(600);
  const [observaciones, setObservaciones] = useState('');

  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      const stds = await db.getAllStudents();
      const mtrc = await db.getAllMetricsForDocente();
      const evls = await db.getAllEvaluationsForDocente();
      
      setStudents(stds);
      setMetrics(mtrc);
      setEvaluations(evls);
    } catch (err) {
      console.error('Error cargando datos de docentes:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSaveEvaluation = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setFormSuccess(null);

    if (!selectedStudentId) {
      setFormError('Por favor, selecciona un estudiante.');
      return;
    }

    try {
      const evaluation: EvaluacionDocente = {
        estudiante_id: selectedStudentId,
        docente_id: profile.id,
        tipo_evaluacion: evalType,
        atencion_sostenida_score: scoreAtencionSostenida,
        atencion_selectiva_score: scoreAtencionSelectiva,
        control_inhibitorio_score: scoreControlInhibitorio,
        memoria_trabajo_score: scoreMemoriaTrabajo,
        atencion_dividida_score: scoreAtencionDividida,
        tiempo_respuesta_general_ms: timeGeneral,
        observaciones: observaciones
      };

      await db.saveEvaluation(evaluation);
      setFormSuccess(`Evaluación ${evalType.toUpperCase()}-TEST registrada correctamente.`);
      
      // Limpiar campos no estáticos
      setObservaciones('');
      loadData(); // Recargar datos
    } catch (err: any) {
      setFormError(err.message || 'Error guardando la evaluación.');
    }
  };

  // Helper para exportar a CSV
  const exportToCSV = (data: any[], headers: string[], filename: string) => {
    const csvContent = [
      headers.join(','),
      ...data.map(row => headers.map(header => {
        const val = row[header];
        if (val === null || val === undefined) return '';
        // Si tiene comas, envolver en comillas
        const strVal = String(val);
        return strVal.includes(',') ? `"${strVal}"` : strVal;
      }).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `${filename}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const downloadStudentsCSV = () => {
    const headers = ['id', 'correo', 'pseudonimo', 'xp', 'nivel', 'racha', 'ultimo_entrenamiento', 'created_at'];
    exportToCSV(students, headers, 'alumnos_odisea_mental');
  };

  const downloadMetricsCSV = () => {
    const formatted = metrics.map(m => {
      const std = students.find(s => s.id === m.usuario_id);
      return {
        id: m.id,
        alumno_pseudonimo: std ? std.pseudonimo : 'Desconocido',
        juego_nombre: m.juego_nombre,
        aciertos: m.aciertos,
        errores_omision: m.errores_omision,
        errores_comision: m.errores_comision,
        precision_porcentaje: m.precision,
        tiempo_reaccion_ms: m.tiempo_reaccion_promedio_ms,
        nivel_dificultad: m.nivel_dificultad_alcanzado,
        velocidad_estimulo_ms: m.velocidad_estimulo_ms || '',
        densidad_distractores: m.densidad_distractores,
        xp_ganado: m.xp_ganado,
        fecha: m.created_at || ''
      };
    });
    const headers = ['id', 'alumno_pseudonimo', 'juego_nombre', 'aciertos', 'errores_omision', 'errores_comision', 'precision_porcentaje', 'tiempo_reaccion_ms', 'nivel_dificultad', 'velocidad_estimulo_ms', 'densidad_distractores', 'xp_ganado', 'fecha'];
    exportToCSV(formatted, headers, 'metricas_detalladas_odisea_mental');
  };

  const downloadEvaluationsCSV = () => {
    const formatted = evaluations.map(e => {
      const std = students.find(s => s.id === e.estudiante_id);
      return {
        id: e.id,
        alumno_pseudonimo: std ? std.pseudonimo : 'Desconocido',
        tipo_evaluacion: e.tipo_evaluacion.toUpperCase(),
        atencion_sostenida: e.atencion_sostenida_score,
        atencion_selectiva: e.atencion_selectiva_score,
        control_inhibitorio: e.control_inhibitorio_score,
        memoria_trabajo: e.memoria_trabajo_score,
        atencion_dividida: e.atencion_dividida_score,
        tiempo_respuesta_ms: e.tiempo_respuesta_general_ms,
        observaciones: e.observaciones || '',
        fecha: e.created_at || ''
      };
    });
    const headers = ['id', 'alumno_pseudonimo', 'tipo_evaluacion', 'atencion_sostenida', 'atencion_selectiva', 'control_inhibitorio', 'memoria_trabajo', 'atencion_dividida', 'tiempo_respuesta_ms', 'observaciones', 'fecha'];
    exportToCSV(formatted, headers, 'evaluaciones_docente_odisea_mental');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center space-grid text-white">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-cyan mx-auto"></div>
          <p className="mt-4 text-sm tracking-wider text-gray-400">Accediendo a la base de datos de control...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen space-grid text-white p-4 md:p-8">
      {/* Header */}
      <header className="max-w-6xl mx-auto flex justify-between items-center bg-bg-space/85 backdrop-blur-md p-4 rounded-2xl border border-brand-violet/30 mb-8">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-brand-violet/20 flex items-center justify-center border border-brand-violet/40">
            <Users className="w-6 h-6 text-brand-cyan" />
          </div>
          <div>
            <h2 className="text-xl font-bold tracking-wider text-white">Consola de Control Docente</h2>
            <p className="text-xs text-brand-cyan font-bold">{profile.pseudonimo} (Docente)</p>
          </div>
        </div>
        <button
          onClick={onLogout}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-gray-400 hover:text-brand-red border border-transparent hover:border-brand-red/30 bg-bg-space/50 hover:bg-brand-red/10 transition-all duration-300"
        >
          <LogOut className="w-4 h-4" />
          <span>Salir</span>
        </button>
      </header>

      <main className="max-w-6xl mx-auto space-y-6">
        
        {/* Barra de Herramientas Docente */}
        <section className="flex flex-col md:flex-row justify-between gap-4 bg-bg-space/70 p-4 rounded-2xl border border-brand-violet/20">
          {/* Navegación Tabs */}
          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab('students')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all duration-200 ${
                activeTab === 'students'
                  ? 'bg-brand-violet text-white glow-violet'
                  : 'text-gray-400 hover:text-white hover:bg-bg-space'
              }`}
            >
              <Users className="w-4.5 h-4.5" />
              Estudiantes ({students.length})
            </button>
            <button
              onClick={() => setActiveTab('evaluations')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all duration-200 ${
                activeTab === 'evaluations'
                  ? 'bg-brand-violet text-white glow-violet'
                  : 'text-gray-400 hover:text-white hover:bg-bg-space'
              }`}
            >
              <ClipboardEdit className="w-4.5 h-4.5" />
              Evaluaciones Pre/Post
            </button>
            <button
              onClick={() => setActiveTab('metrics')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all duration-200 ${
                activeTab === 'metrics'
                  ? 'bg-brand-violet text-white glow-violet'
                  : 'text-gray-400 hover:text-white hover:bg-bg-space'
              }`}
            >
              <BarChart3 className="w-4.5 h-4.5" />
              Historial de Métricas ({metrics.length})
            </button>
          </div>

          {/* Exportación CSV */}
          <div className="flex flex-wrap gap-2">
            <button
              onClick={downloadStudentsCSV}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-bg-space hover:bg-brand-cyan hover:text-bg-space border border-brand-cyan/30 transition-all"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>Exportar Alumnos CSV</span>
            </button>
            <button
              onClick={downloadMetricsCSV}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-bg-space hover:bg-brand-cyan hover:text-bg-space border border-brand-cyan/30 transition-all"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>Exportar Métricas CSV</span>
            </button>
            <button
              onClick={downloadEvaluationsCSV}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-bg-space hover:bg-brand-cyan hover:text-bg-space border border-brand-cyan/30 transition-all"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>Exportar Evaluaciones CSV</span>
            </button>
          </div>
        </section>

        {/* CONTENIDOS DE PESTAÑAS */}

        {/* Tab 1: Listado de Alumnos */}
        {activeTab === 'students' && (
          <section className="glass-panel p-6 rounded-2xl border border-brand-violet/20">
            <h3 className="text-lg font-bold tracking-wider mb-4 flex items-center gap-2">
              <Users className="w-5 h-5 text-brand-cyan" />
              Estudiantes Registrados
            </h3>
            
            {students.length === 0 ? (
              <div className="text-center py-8 text-gray-500">No hay estudiantes registrados en la plataforma.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-brand-violet/20 text-xs font-bold text-gray-400 uppercase">
                      <th className="py-3 px-4">Seudónimo</th>
                      <th className="py-3 px-4">Correo</th>
                      <th className="py-3 px-4 text-center">Nivel</th>
                      <th className="py-3 px-4 text-center">XP Total</th>
                      <th className="py-3 px-4 text-center">Racha</th>
                      <th className="py-3 px-4">Última Conexión</th>
                      <th className="py-3 px-4">Evaluaciones Registradas</th>
                    </tr>
                  </thead>
                  <tbody className="text-sm divide-y divide-brand-violet/10">
                    {students.map((student) => {
                      const studentEvals = evaluations.filter(e => e.estudiante_id === student.id);
                      const hasPre = studentEvals.some(e => e.tipo_evaluacion === 'pre');
                      const hasPost = studentEvals.some(e => e.tipo_evaluacion === 'post');

                      return (
                        <tr key={student.id} className="hover:bg-bg-space/45 transition-colors">
                          <td className="py-4 px-4 font-black text-brand-cyan">{student.pseudonimo}</td>
                          <td className="py-4 px-4 text-gray-300">{student.correo}</td>
                          <td className="py-4 px-4 text-center"><span className="bg-brand-violet/20 text-brand-violet font-bold px-2 py-0.5 rounded border border-brand-violet/30">Nivel {student.nivel}</span></td>
                          <td className="py-4 px-4 text-center font-bold text-brand-yellow">{student.xp} XP</td>
                          <td className="py-4 px-4 text-center text-brand-red font-bold">{student.racha} días</td>
                          <td className="py-4 px-4 text-gray-400 text-xs">
                            {student.ultimo_entrenamiento 
                              ? new Date(student.ultimo_entrenamiento).toLocaleString()
                              : 'Sin actividad registrada'}
                          </td>
                          <td className="py-4 px-4 text-xs">
                            <div className="flex gap-2">
                              <span className={`px-2 py-0.5 rounded font-bold ${hasPre ? 'bg-brand-green/10 border border-brand-green/30 text-brand-green' : 'bg-gray-800 text-gray-500'}`}>
                                PRE-TEST
                              </span>
                              <span className={`px-2 py-0.5 rounded font-bold ${hasPost ? 'bg-brand-green/10 border border-brand-green/30 text-brand-green' : 'bg-gray-800 text-gray-500'}`}>
                                POST-TEST
                              </span>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        )}

        {/* Tab 2: Evaluaciones Pre/Post */}
        {activeTab === 'evaluations' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Formulario Registro */}
            <section className="glass-panel p-6 rounded-2xl border border-brand-violet/20 lg:col-span-1 h-fit">
              <h3 className="text-lg font-bold tracking-wider mb-4 flex items-center gap-2">
                <Plus className="w-5 h-5 text-brand-cyan" />
                Registrar Diagnóstico
              </h3>

              <form onSubmit={handleSaveEvaluation} className="space-y-4">
                {formError && (
                  <div className="flex items-center gap-2 p-3 bg-brand-red/10 border border-brand-red/30 rounded-xl text-brand-red text-xs">
                    <AlertCircle className="w-4.5 h-4.5 flex-shrink-0" />
                    <span>{formError}</span>
                  </div>
                )}
                {formSuccess && (
                  <div className="flex items-center gap-2 p-3 bg-brand-green/10 border border-brand-green/30 rounded-xl text-brand-green text-xs">
                    <CheckCircle2 className="w-4.5 h-4.5 flex-shrink-0" />
                    <span>{formSuccess}</span>
                  </div>
                )}

                {/* Seleccionar Alumno */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-400 uppercase">Estudiante</label>
                  <select
                    value={selectedStudentId}
                    onChange={(e) => setSelectedStudentId(e.target.value)}
                    className="w-full bg-bg-space border border-brand-violet/20 focus:border-brand-cyan focus:outline-none rounded-xl py-2 px-3 text-white text-sm"
                  >
                    <option value="">-- Seleccionar Alumno --</option>
                    {students.map(s => (
                      <option key={s.id} value={s.id}>{s.pseudonimo} ({s.correo})</option>
                    ))}
                  </select>
                </div>

                {/* Tipo de Evaluación */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-400 uppercase">Fase Evaluativa</label>
                  <div className="grid grid-cols-2 gap-2 bg-bg-space/80 p-0.5 rounded-xl border border-brand-violet/20">
                    <button
                      type="button"
                      onClick={() => setEvalType('pre')}
                      className={`py-1.5 rounded-lg text-xs font-bold ${evalType === 'pre' ? 'bg-brand-violet text-white' : 'text-gray-400'}`}
                    >
                      PRE-TEST
                    </button>
                    <button
                      type="button"
                      onClick={() => setEvalType('post')}
                      className={`py-1.5 rounded-lg text-xs font-bold ${evalType === 'post' ? 'bg-brand-violet text-white' : 'text-gray-400'}`}
                    >
                      POST-TEST
                    </button>
                  </div>
                </div>

                {/* Rango de puntuaciones */}
                {[
                  { label: 'Atención Sostenida (0-100)', val: scoreAtencionSostenida, set: setScoreAtencionSostenida },
                  { label: 'Atención Selectiva (0-100)', val: scoreAtencionSelectiva, set: setScoreAtencionSelectiva },
                  { label: 'Control Inhibitorio (0-100)', val: scoreControlInhibitorio, set: setScoreControlInhibitorio },
                  { label: 'Memoria de Trabajo (0-100)', val: scoreMemoriaTrabajo, set: setScoreMemoriaTrabajo },
                  { label: 'Atención Dividida (0-100)', val: scoreAtencionDividida, set: setScoreAtencionDividida }
                ].map((item, idx) => (
                  <div key={idx} className="space-y-1">
                    <div className="flex justify-between text-xs font-bold">
                      <span className="text-gray-400">{item.label}</span>
                      <span className="text-brand-cyan">{item.val}%</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={item.val}
                      onChange={(e) => item.set(Number(e.target.value))}
                      className="w-full accent-brand-cyan"
                    />
                  </div>
                ))}

                {/* Tiempo General de Respuesta */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-400 uppercase">Tiempo de Reacción General (ms)</label>
                  <input
                    type="number"
                    min="100"
                    max="5000"
                    required
                    value={timeGeneral}
                    onChange={(e) => setTimeGeneral(Number(e.target.value))}
                    className="w-full bg-bg-space border border-brand-violet/20 focus:border-brand-cyan focus:outline-none rounded-xl py-2 px-3 text-white text-sm"
                  />
                </div>

                {/* Observaciones */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-400 uppercase">Observaciones Clínicas / Escolares</label>
                  <textarea
                    rows={3}
                    placeholder="Escribe comentarios de apoyo o evolución..."
                    value={observaciones}
                    onChange={(e) => setObservaciones(e.target.value)}
                    className="w-full bg-bg-space border border-brand-violet/20 focus:border-brand-cyan focus:outline-none rounded-xl py-2 px-3 text-white text-sm"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 rounded-xl bg-brand-cyan hover:bg-white text-bg-space transition-colors font-bold uppercase text-xs tracking-wider"
                >
                  Registrar Evaluación
                </button>
              </form>
            </section>

            {/* Listado de Evaluaciones */}
            <section className="glass-panel p-6 rounded-2xl border border-brand-violet/20 lg:col-span-2">
              <h3 className="text-lg font-bold tracking-wider mb-4 flex items-center gap-2">
                <ClipboardEdit className="w-5 h-5 text-brand-cyan" />
                Historial de Diagnósticos
              </h3>

              {evaluations.length === 0 ? (
                <div className="text-center py-12 text-gray-500 text-sm">No se han registrado diagnósticos Pre-test o Post-test aún.</div>
              ) : (
                <div className="space-y-4 max-h-[600px] overflow-y-auto no-scrollbar">
                  {evaluations.map((ev) => {
                    const student = students.find(s => s.id === ev.estudiante_id);
                    
                    return (
                      <div key={ev.id} className="bg-bg-space/80 border border-brand-violet/20 p-4 rounded-xl space-y-3">
                        <div className="flex justify-between items-start">
                          <div>
                            <span className="text-xs text-gray-400 uppercase font-black">Estudiante</span>
                            <h4 className="text-base font-black text-brand-cyan">{student ? student.pseudonimo : 'Desconocido'}</h4>
                          </div>
                          <span className={`px-2 py-1 rounded text-xs font-extrabold ${
                            ev.tipo_evaluacion === 'pre' 
                              ? 'bg-brand-violet/10 border border-brand-violet/30 text-brand-violet' 
                              : 'bg-brand-green/10 border border-brand-green/30 text-brand-green'
                          }`}>
                            {ev.tipo_evaluacion.toUpperCase()}-TEST
                          </span>
                        </div>

                        {/* Gráfico de barras simples en SVG/CSS */}
                        <div className="grid grid-cols-5 gap-2 text-center pt-2">
                          {[
                            { label: 'Sostenida', val: ev.atencion_sostenida_score },
                            { label: 'Selectiva', val: ev.atencion_selectiva_score },
                            { label: 'Inhibición', val: ev.control_inhibitorio_score },
                            { label: 'Memoria', val: ev.memoria_trabajo_score },
                            { label: 'Dividida', val: ev.atencion_dividida_score }
                          ].map((dim, idx) => (
                            <div key={idx} className="space-y-1">
                              <span className="text-[9px] text-gray-400 font-bold block truncate">{dim.label}</span>
                              <div className="w-full bg-bg-space h-16 rounded-lg relative overflow-hidden border border-brand-violet/10 flex flex-col justify-end">
                                <div 
                                  className="w-full bg-gradient-to-t from-brand-violet to-brand-cyan rounded-b-md" 
                                  style={{ height: `${dim.val}%` }} 
                                />
                                <span className="absolute inset-0 flex items-center justify-center text-[10px] font-black">{dim.val}%</span>
                              </div>
                            </div>
                          ))}
                        </div>

                        <div className="text-xs space-y-1 pt-1 border-t border-brand-violet/10 text-gray-300">
                          <div><span className="font-bold text-gray-400">T. de Reacción Promedio:</span> {ev.tiempo_respuesta_general_ms} ms</div>
                          {ev.observaciones && <div><span className="font-bold text-gray-400">Observaciones:</span> {ev.observaciones}</div>}
                          <div className="text-[10px] text-gray-500 italic pt-1">
                            Evaluado el {new Date(ev.fecha_evaluacion || '').toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          </div>
        )}

        {/* Tab 3: Historial de Métricas */}
        {activeTab === 'metrics' && (
          <section className="glass-panel p-6 rounded-2xl border border-brand-violet/20">
            <h3 className="text-lg font-bold tracking-wider mb-4 flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-brand-cyan" />
              Métricas Detalladas de Entrenamiento
            </h3>

            {metrics.length === 0 ? (
              <div className="text-center py-8 text-gray-500">Ningún estudiante ha completado juegos todavía.</div>
            ) : (
              <div className="overflow-x-auto max-h-[600px] overflow-y-auto no-scrollbar">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-brand-violet/20 text-xs font-bold text-gray-400 uppercase">
                      <th className="py-3 px-4">Alumno</th>
                      <th className="py-3 px-4">Juego</th>
                      <th className="py-3 px-4 text-center">Aciertos</th>
                      <th className="py-3 px-4 text-center">Errores Omis.</th>
                      <th className="py-3 px-4 text-center">Errores Comis.</th>
                      <th className="py-3 px-4 text-center">Precisión</th>
                      <th className="py-3 px-4 text-center">Tiempo Promedio</th>
                      <th className="py-3 px-4 text-center">Dificultad</th>
                      <th className="py-3 px-4 text-center">XP Ganado</th>
                      <th className="py-3 px-4">Fecha Registro</th>
                    </tr>
                  </thead>
                  <tbody className="text-sm divide-y divide-brand-violet/10">
                    {metrics.map((m) => {
                      const student = students.find(s => s.id === m.usuario_id);
                      return (
                        <tr key={m.id} className="hover:bg-bg-space/45 transition-colors">
                          <td className="py-3 px-4 font-black text-brand-cyan">{student ? student.pseudonimo : 'Desconocido'}</td>
                          <td className="py-3 px-4 font-semibold text-white">{m.juego_nombre}</td>
                          <td className="py-3 px-4 text-center text-brand-green font-bold">{m.aciertos}</td>
                          <td className="py-3 px-4 text-center text-gray-400">{m.errores_omision}</td>
                          <td className="py-3 px-4 text-center text-brand-red">{m.errores_comision}</td>
                          <td className="py-3 px-4 text-center font-bold text-brand-cyan">{m.precision}%</td>
                          <td className="py-3 px-4 text-center font-semibold text-white">{m.tiempo_reaccion_promedio_ms} ms</td>
                          <td className="py-3 px-4 text-center"><span className="text-xs bg-bg-space px-2 py-0.5 border border-brand-violet/20 rounded font-bold">Niv. {m.nivel_dificultad_alcanzado}</span></td>
                          <td className="py-3 px-4 text-center font-bold text-brand-yellow">+{m.xp_ganado} XP</td>
                          <td className="py-3 px-4 text-gray-400 text-xs">{new Date(m.created_at || '').toLocaleString()}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        )}

      </main>
    </div>
  );
};
