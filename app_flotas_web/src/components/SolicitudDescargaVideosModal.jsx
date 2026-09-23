import React, { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';

import { api } from '../services/api';
import { UiIcon } from './UiIcon';

const FORM_INICIAL = {
  operacion: '',
  placas: [],
  fecha_descarga: '',
  hora_inicio: '',
  hora_fin: '',
  motivo: ''
};

const inputStyle = {
  width: '100%',
  padding: '0.75rem',
  borderRadius: '0.5rem',
  backgroundColor: 'var(--bg-secondary)',
  border: '1px solid var(--border-color)',
  color: 'var(--text-primary)',
  outlineColor: 'var(--accent-color)'
};

const labelStyle = {
  display: 'block',
  marginBottom: '0.5rem',
  color: 'var(--text-secondary)',
  fontSize: '0.85rem',
  fontWeight: '600'
};

export function SolicitudDescargaVideosModal({
  open,
  onClose,
  usuario
}) {
  const [form, setForm] = useState(FORM_INICIAL);
  const [opciones, setOpciones] = useState({
    operaciones: [],
    vehiculos: [],
    operacionAsignada: null,
    nombreSolicitante: ''
  });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;

    let vigente = true;
    setLoading(true);

    api.getOpcionesSolicitudDescargaVideos()
      .then(data => {
        if (!vigente) return;

        const operacionAsignada =
          data?.operacionAsignada || null;

        setOpciones({
          operaciones: Array.isArray(data?.operaciones)
            ? data.operaciones
            : [],
          vehiculos: Array.isArray(data?.vehiculos)
            ? data.vehiculos
            : [],
          operacionAsignada,
          nombreSolicitante:
            data?.nombreSolicitante || ''
        });

        setForm({
          ...FORM_INICIAL,
          operacion: operacionAsignada || ''
        });
      })
      .catch(error => {
        if (vigente) {
          toast.error(
            error.message ||
            'No se pudieron cargar las opciones'
          );
        }
      })
      .finally(() => {
        if (vigente) setLoading(false);
      });

    return () => {
      vigente = false;
    };
  }, [open]);

  const vehiculosFiltrados = useMemo(
    () => opciones.vehiculos.filter(vehiculo =>
      String(vehiculo.operacion || '')
        .trim()
        .toLowerCase() ===
      form.operacion.trim().toLowerCase()
    ),
    [opciones.vehiculos, form.operacion]
  );

  if (!open) return null;

  const todasSeleccionadas =
    vehiculosFiltrados.length > 0 &&
    vehiculosFiltrados.every(vehiculo =>
      form.placas.includes(vehiculo.placa)
    );

  const alternarPlaca = placa => {
    setForm(actual => ({
      ...actual,
      placas: actual.placas.includes(placa)
        ? actual.placas.filter(item => item !== placa)
        : [...actual.placas, placa]
    }));
  };

  const guardar = async event => {
    event.preventDefault();

    if (
      !form.operacion ||
      form.placas.length === 0 ||
      !form.fecha_descarga ||
      !form.hora_inicio ||
      !form.hora_fin ||
      !form.motivo.trim()
    ) {
      return toast.error('Complete todos los campos');
    }

    if (form.hora_fin <= form.hora_inicio) {
      return toast.error(
        'La hora final debe ser posterior a la hora inicial'
      );
    }

    try {
      setSaving(true);

      await api.createSolicitudDescargaVideos({
        ...form,
        motivo: form.motivo.trim()
      });

      toast.success('Solicitud de descarga registrada');
      setForm(FORM_INICIAL);
      onClose();
    } catch (error) {
      toast.error(
        error.message ||
        'No se pudo registrar la solicitud'
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1250,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem',
        backgroundColor: 'rgba(16,27,51,0.45)',
        backdropFilter: 'blur(5px)'
      }}
    >
      <div
        onClick={event => event.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: '700px',
          maxHeight: '90vh',
          overflowY: 'auto',
          padding: '2rem',
          borderRadius: '1rem',
          backgroundColor: 'var(--bg-color)',
          border: '1px solid var(--border-color)',
          boxShadow: '0 20px 50px -14px rgba(16,27,51,0.28)'
        }}
      >
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          gap: '1rem',
          marginBottom: '1.5rem'
        }}>
          <div>
            <h2 style={{
              margin: 0,
              color: 'var(--text-primary)',
              fontSize: '1.5rem'
            }}>
              Solicitud de descarga de videos
            </h2>
            <p style={{
              margin: '0.35rem 0 0',
              color: 'var(--text-secondary)',
              fontSize: '0.9rem'
            }}>
              Seleccione las placas y el rango horario solicitado.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="ui-icon-button"
            aria-label="Cerrar"
          >
            <UiIcon name="close" />
          </button>
        </div>

        <form
          onSubmit={guardar}
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '1.1rem'
          }}
        >
          <div style={{
            display: 'grid',
            gridTemplateColumns:
              'repeat(auto-fit, minmax(220px, 1fr))',
            gap: '1rem'
          }}>
            <div>
              <label style={labelStyle}>Nombre del solicitante</label>
              <input
                type="text"
                readOnly
                value={
                  opciones.nombreSolicitante ||
                  usuario?.nombre_completo ||
                  usuario?.username ||
                  'Usuario actual'
                }
                style={inputStyle}
              />
            </div>

            <div>
              <label style={labelStyle}>Operación</label>
              <select
                required
                value={form.operacion}
                disabled={
                  loading || Boolean(opciones.operacionAsignada)
                }
                onChange={event => setForm(actual => ({
                  ...actual,
                  operacion: event.target.value,
                  placas: []
                }))}
                style={inputStyle}
              >
                <option value="">
                  {loading
                    ? 'Cargando...'
                    : 'Seleccione una operación'}
                </option>
                {opciones.operaciones.map(operacion => (
                  <option key={operacion} value={operacion}>
                    {operacion}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              gap: '1rem',
              marginBottom: '0.5rem'
            }}>
              <label style={{ ...labelStyle, marginBottom: 0 }}>
                Placas
              </label>
              <span style={{
                color: 'var(--text-secondary)',
                fontSize: '0.8rem'
              }}>
                {form.placas.length} seleccionada(s)
              </span>
            </div>

            <div style={{
              maxHeight: '210px',
              overflowY: 'auto',
              borderRadius: '0.65rem',
              backgroundColor: 'var(--bg-secondary)',
              border: '1px solid var(--border-color)'
            }}>
              {!form.operacion ? (
                <p style={{
                  padding: '1rem',
                  margin: 0,
                  color: 'var(--text-secondary)',
                  textAlign: 'center'
                }}>
                  Seleccione una operación para mostrar sus placas.
                </p>
              ) : vehiculosFiltrados.length === 0 ? (
                <p style={{
                  padding: '1rem',
                  margin: 0,
                  color: 'var(--text-secondary)',
                  textAlign: 'center'
                }}>
                  No existen placas para esta operación.
                </p>
              ) : (
                <>
                  <label style={{
                    display: 'flex',
                    gap: '0.6rem',
                    padding: '0.75rem',
                    fontWeight: '700',
                    color: 'var(--text-primary)',
                    borderBottom: '1px solid var(--border-color)',
                    cursor: 'pointer'
                  }}>
                    <input
                      type="checkbox"
                      checked={todasSeleccionadas}
                      onChange={() => setForm(actual => ({
                        ...actual,
                        placas: todasSeleccionadas
                          ? []
                          : vehiculosFiltrados.map(
                              vehiculo => vehiculo.placa
                            )
                      }))}
                    />
                    Seleccionar todas
                  </label>

                  <div style={{
                    display: 'grid',
                    gridTemplateColumns:
                      'repeat(auto-fit, minmax(130px, 1fr))'
                  }}>
                    {vehiculosFiltrados.map(vehiculo => (
                      <label
                        key={vehiculo.placa}
                        style={{
                          display: 'flex',
                          gap: '0.55rem',
                          padding: '0.7rem 0.75rem',
                          color: 'var(--text-primary)',
                          cursor: 'pointer'
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={form.placas.includes(vehiculo.placa)}
                          onChange={() => alternarPlaca(vehiculo.placa)}
                        />
                        {vehiculo.placa}
                      </label>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns:
              'repeat(auto-fit, minmax(160px, 1fr))',
            gap: '1rem'
          }}>
            <div>
              <label style={labelStyle}>Fecha de la descarga</label>
              <input
                type="date"
                required
                value={form.fecha_descarga}
                onChange={event => setForm({
                  ...form,
                  fecha_descarga: event.target.value
                })}
                style={inputStyle}
              />
            </div>

            <div>
              <label style={labelStyle}>Hora de inicio</label>
              <input
                type="time"
                required
                value={form.hora_inicio}
                onChange={event => setForm({
                  ...form,
                  hora_inicio: event.target.value
                })}
                style={inputStyle}
              />
            </div>

            <div>
              <label style={labelStyle}>Hora de fin</label>
              <input
                type="time"
                required
                value={form.hora_fin}
                onChange={event => setForm({
                  ...form,
                  hora_fin: event.target.value
                })}
                style={inputStyle}
              />
            </div>
          </div>

          <div>
            <label style={labelStyle}>Motivo</label>
            <textarea
              required
              rows="4"
              maxLength={1000}
              value={form.motivo}
              onChange={event => setForm({
                ...form,
                motivo: event.target.value
              })}
              placeholder="Explique el motivo de la descarga..."
              style={{ ...inputStyle, resize: 'vertical' }}
            />
          </div>

          <small style={{ color: 'var(--text-secondary)' }}>
            La fecha y hora de ingreso se registrarán automáticamente.
          </small>

          <div style={{
            display: 'flex',
            justifyContent: 'flex-end',
            gap: '1rem',
            flexWrap: 'wrap'
          }}>
            <button
              type="button"
              onClick={onClose}
              className="ui-button ui-button-secondary"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="ui-button ui-button-primary"
            >
              {saving ? 'Guardando...' : 'Guardar solicitud'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
