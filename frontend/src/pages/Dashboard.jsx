import React, { useState } from 'react'
import { DollarSign, FileText, PieChart } from 'lucide-react'

const Dashboard = () => {
    const [financialData, setFinancialData] = useState(null)
    const [loading, setLoading] = useState(false)
    const [structure, setStructure] = useState([])

    useEffect(() => {
        fetch('/api/structure')
            .then(res => res.json())
            .then(data => setStructure(data))
            .catch(err => console.error("Error loading structure", err))
    }, [])

    const fetchSummary = async () => {
        setLoading(true)
        try {
            const res = await fetch('/api/resumen')
            const data = await res.json()
            setFinancialData(data)
        } catch (error) {
            console.error("Error fetching summary", error)
        } finally {
            setLoading(false)
        }
    }

    const getData = (key) => {
        if (!financialData) return { total: 0, cantidad_facturas: 0, centrales: { total: 0, cantidad: 0 }, campo: { total: 0, cantidad: 0 } }
        const d = financialData.detalles.find(d => d.categoria === key)
        return d || { total: 0, cantidad_facturas: 0, centrales: { total: 0, cantidad: 0 }, campo: { total: 0, cantidad: 0 } }
    }

    const getGroupTotal = (group) => {
        return group.subItems.reduce((acc, item) => {
            const d = getData(item.key)
            return {
                total: acc.total + d.total,
                facturas: acc.facturas + d.cantidad_facturas,
                centrales: {
                    total: acc.centrales.total + (d.centrales?.total || 0),
                    cantidad: acc.centrales.cantidad + (d.centrales?.cantidad || 0)
                },
                campo: {
                    total: acc.campo.total + (d.campo?.total || 0),
                    cantidad: acc.campo.cantidad + (d.campo?.cantidad || 0)
                }
            }
        }, { total: 0, facturas: 0, centrales: { total: 0, cantidad: 0 }, campo: { total: 0, cantidad: 0 } })
    }

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <div>
                    <h1 style={{ fontSize: '1.875rem', fontWeight: 800, marginBottom: '0.5rem', color: 'var(--color-text-main)' }}>Dashboard Financiero</h1>
                    <p style={{ color: 'var(--color-text-secondary)' }}>Resumen general de gastos por categoría.</p>
                </div>
                <button
                    onClick={fetchSummary}
                    disabled={loading}
                    style={{
                        padding: '0.75rem 1.5rem',
                        background: '#4f46e5',
                        color: 'white',
                        border: 'none',
                        borderRadius: '0.5rem',
                        fontWeight: 600,
                        cursor: loading ? 'not-allowed' : 'pointer',
                        opacity: loading ? 0.7 : 1,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem'
                    }}
                >
                    <PieChart size={20} />
                    {loading ? 'Calculando...' : 'Generar Reporte Actualizado'}
                </button>
            </div>

            {financialData ? (
                <>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
                        <div style={{ background: 'white', padding: '1.5rem', borderRadius: '1rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', border: '1px solid var(--color-border)', borderLeft: '5px solid #10b981' }}>
                            <div style={{ color: 'var(--color-text-secondary)', fontSize: '0.875rem', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <DollarSign size={16} /> Gasto Total del Proyecto
                            </div>
                            <div style={{ fontSize: '2.5rem', fontWeight: 800, marginTop: '0.5rem', color: '#111827' }}>
                                ${financialData.gran_total.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                            </div>
                        </div>

                        <div style={{ background: 'white', padding: '1.5rem', borderRadius: '1rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', border: '1px solid var(--color-border)', borderLeft: '5px solid #6366f1' }}>
                            <div style={{ color: 'var(--color-text-secondary)', fontSize: '0.875rem', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <FileText size={16} /> Facturas Procesadas
                            </div>
                            <div style={{ fontSize: '2.5rem', fontWeight: 800, marginTop: '0.5rem', color: '#111827' }}>
                                {financialData.detalles.reduce((acc, curr) => acc + curr.cantidad_facturas, 0)}
                            </div>
                        </div>
                    </div>

                    <div style={{ background: 'white', borderRadius: '1rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', overflow: 'hidden', border: '1px solid var(--color-border)' }}>
                        <div style={{ padding: '1.5rem', borderBottom: '1px solid #e5e7eb', background: '#f9fafb' }}>
                            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#374151' }}>Desglose por Categoría</h3>
                        </div>
                        <div style={{ overflowX: 'auto' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '800px' }}>
                                <thead style={{ background: '#f8fafc' }}>
                                    <tr>
                                        <th style={{ textAlign: 'left', padding: '1rem 1.5rem', fontSize: '0.75rem', textTransform: 'uppercase', color: '#6b7280' }}>Categoría</th>
                                        <th style={{ textAlign: 'center', padding: '1rem 1.5rem', fontSize: '0.75rem', textTransform: 'uppercase', color: '#6b7280', width: '100px' }}>Docs</th>
                                        <th style={{ textAlign: 'right', padding: '1rem 1.5rem', fontSize: '0.75rem', textTransform: 'uppercase', color: '#4338ca', width: '150px', background: '#e0e7ff' }}>Centrales</th>
                                        <th style={{ textAlign: 'right', padding: '1rem 1.5rem', fontSize: '0.75rem', textTransform: 'uppercase', color: '#15803d', width: '150px', background: '#dcfce7' }}>Campo</th>
                                        <th style={{ textAlign: 'right', padding: '1rem 1.5rem', fontSize: '0.75rem', textTransform: 'uppercase', color: '#1f2937' }}>Total General</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {structure.map((item, idx) => {
                                        if (item.isGroup) {
                                            const groupStats = getGroupTotal(item)
                                            return (
                                                <React.Fragment key={idx}>
                                                    {/* Encabezado del Grupo */}
                                                    <tr style={{ background: '#eef2ff', fontWeight: 'bold' }}>
                                                        <td style={{ padding: '1rem 1.5rem', color: '#374151' }}>{item.name}</td>
                                                        <td style={{ padding: '1rem 1.5rem', textAlign: 'center', color: '#374151' }}>{groupStats.facturas}</td>
                                                        <td style={{ padding: '1rem 1.5rem', textAlign: 'right', color: '#4338ca', background: '#e0e7ff50' }}>
                                                            ${groupStats.centrales.total.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                                                        </td>
                                                        <td style={{ padding: '1rem 1.5rem', textAlign: 'right', color: '#15803d', background: '#dcfce750' }}>
                                                            ${groupStats.campo.total.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                                                        </td>
                                                        <td style={{ padding: '1rem 1.5rem', textAlign: 'right', color: '#374151' }}>
                                                            ${groupStats.total.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                                                        </td>
                                                    </tr>
                                                    {/* Sub-items */}
                                                    {item.subItems.map((sub, sIdx) => {
                                                        const d = getData(sub.key)
                                                        return (
                                                            <tr key={`${idx}-${sIdx}`} style={{ borderBottom: '1px solid #f3f4f6' }}>
                                                                <td style={{ padding: '0.75rem 1.5rem 0.75rem 3rem', color: '#4b5563', fontSize: '0.9rem' }}>{sub.name}</td>
                                                                <td style={{ padding: '0.75rem 1.5rem', textAlign: 'center', color: '#6b7280', fontSize: '0.9rem' }}>{d.cantidad_facturas}</td>
                                                                <td style={{ padding: '0.75rem 1.5rem', textAlign: 'right', color: '#6366f1', fontSize: '0.9rem', background: '#f5f7ff' }}>
                                                                    ${(d.centrales?.total || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                                                                </td>
                                                                <td style={{ padding: '0.75rem 1.5rem', textAlign: 'right', color: '#16a34a', fontSize: '0.9rem', background: '#f0fdf4' }}>
                                                                    ${(d.campo?.total || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                                                                </td>
                                                                <td style={{ padding: '0.75rem 1.5rem', textAlign: 'right', color: '#4b5563', fontSize: '0.9rem' }}>
                                                                    ${d.total.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                                                                </td>
                                                            </tr>
                                                        )
                                                    })}
                                                </React.Fragment>
                                            )
                                        } else {
                                            const d = getData(item.key)
                                            return (
                                                <tr key={idx} style={{ borderBottom: '1px solid #f3f4f6' }}>
                                                    <td style={{ padding: '1rem 1.5rem', fontWeight: 600, color: '#1f2937' }}>{item.name}</td>
                                                    <td style={{ padding: '1rem 1.5rem', textAlign: 'center', color: '#6b7280' }}>{d.cantidad_facturas}</td>
                                                    <td style={{ padding: '1rem 1.5rem', textAlign: 'right', color: '#6366f1', fontWeight: 500, background: '#f5f7ff' }}>
                                                        ${(d.centrales?.total || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                                                    </td>
                                                    <td style={{ padding: '1rem 1.5rem', textAlign: 'right', color: '#16a34a', fontWeight: 500, background: '#f0fdf4' }}>
                                                        ${(d.campo?.total || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                                                    </td>
                                                    <td style={{ padding: '1rem 1.5rem', textAlign: 'right', fontWeight: 600, color: '#1f2937' }}>
                                                        ${d.total.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                                                    </td>
                                                </tr>
                                            )
                                        }
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </>
            ) : (
                <div style={{ textAlign: 'center', padding: '4rem', background: '#f9fafb', borderRadius: '1rem', color: '#6b7280' }}>
                    <PieChart size={48} style={{ marginBottom: '1rem', opacity: 0.5 }} />
                    <p>Haz clic en "Generar Reporte" para calcular los totales de todos los archivos.</p>
                </div>
            )}
        </div>
    )
}

export default Dashboard
