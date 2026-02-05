import React, { useState, useEffect, useRef } from 'react'
import { Upload, Play, ChevronLeft, ChevronRight, Eye, Plus, Trash2, Edit2, Save, X } from 'lucide-react'
import styles from './AutomaticValidation.module.css'

const AutomaticValidation = ({ categoria, title }) => {
    const [fileCount, setFileCount] = useState(0)
    const [isProcessing, setIsProcessing] = useState(false)
    const [data, setData] = useState([])
    const [page, setPage] = useState(1)
    const [selectedItem, setSelectedItem] = useState(null)
    const [origen, setOrigen] = useState("Centrales") // Estado para el origen (default para subida, aunque oculto en UI)
    const [filterOrigen, setFilterOrigen] = useState("Todos") // Nuevo estado para filtrar visualización
    const [isManualModalOpen, setIsManualModalOpen] = useState(false)

    // Edit Mode State
    const [isEditing, setIsEditing] = useState(false)
    const [editForm, setEditForm] = useState({})

    const [manualForm, setManualForm] = useState({
        folio_fiscal: '',
        rfc_emisor: '',
        rfc_receptor: '',
        nombre_emisor: '',
        nombre_receptor: '',
        puesto: '',
        subtotal: '',
        total_deducciones: '',
        total_neto: '',
        origen: 'Centrales'
    })

    const fileInputRef = useRef(null)

    // Reset state when category changes
    useEffect(() => {
        setFileCount(0)
        setData([])
        setPage(1)
        setSelectedItem(null)
        setIsEditing(false) // Reset edit mode
        setOrigen("Centrales")
        setFilterOrigen("Todos") // Reset de filtro
        fetchTotal()
    }, [categoria])

    // Reset page when filter changes
    useEffect(() => {
        setPage(1)
        handleProcess(1) // Always fetch when filter changes
    }, [filterOrigen])

    const fetchTotal = async () => {
        const catParam = encodeURIComponent(categoria || "General")
        try {
            const res = await fetch(`/api/total?categoria=${catParam}`)
            const json = await res.json()
            setFileCount(json.total)
        } catch (e) {
            console.error(e)
        }
    }

    const handleUpload = async (e) => {
        const files = e.target.files
        if (!files || !files.length) return

        const formData = new FormData()
        for (let i = 0; i < files.length; i++) {
            formData.append('files', files[i])
        }

        const catParam = encodeURIComponent(categoria || "General")
        try {
            await fetch(`/api/subir?categoria=${catParam}&origen=${origen}`, {
                method: 'POST',
                body: formData
            })
            await fetchTotal() // update count
        } catch (e) {
            console.error(e)
        }

        // Clear input
        if (fileInputRef.current) {
            fileInputRef.current.value = ''
        }
    }

    const handleProcess = async (pageNum = 1) => {
        setIsProcessing(true)
        const catParam = encodeURIComponent(categoria || "General")
        try {
            const res = await fetch(`/api/procesar?categoria=${catParam}&page=1&limit=1000&filtro_origen=${filterOrigen}`)
            const json = await res.json()
            setData(json)
        } catch (e) {
            console.error(e)
        } finally {
            setIsProcessing(false)
        }
    }

    // Reload data when page changes if we already have data (browsing mode)
    useEffect(() => {
        if (data.length > 0 || page > 1) {
            handleProcess(page)
        }
    }, [page])

    const handleDelete = async (item) => {
        if (!confirm(`¿Estás seguro de eliminar la factura: ${item.folio_fiscal || item.archivo}?`)) return

        try {
            const res = await fetch('/api/eliminar', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    filename: item.archivo,
                    categoria: categoria || "General"
                })
            })
            const json = await res.json()

            if (json.status === 'success') {
                // Remove from local state immediately
                setData(data.filter(d => d.archivo !== item.archivo))
                if (selectedItem && selectedItem.archivo === item.archivo) {
                    setSelectedItem(null) // Close modal if open
                }
                alert("Eliminado correctamente")
                fetchTotal()
            } else {
                alert("Error al eliminar: " + json.message)
            }
        } catch (e) {
            console.error(e)
            alert("Error de conexión al eliminar")
        }
    }

    const startEditing = (item) => {
        setEditForm({
            filename: item.archivo,
            folio_fiscal: item.folio_fiscal || '',
            rfc_emisor: item.rfc_emisor || '',
            rfc_receptor: item.rfc_receptor || '',
            nombre_emisor: item.nombre_emisor || '',
            nombre_receptor: item.nombre_receptor || '',
            puesto: item.puesto || '',
            subtotal: item.subtotal ? item.subtotal.toString().replace(/[$,]/g, '').trim() : '',
            total_deducciones: item.total_deducciones ? item.total_deducciones.toString().replace(/[$,-]/g, '').trim() : '',
            total_neto: item.total_neto ? item.total_neto.toString().replace(/[$,]/g, '').trim() : '',
            origen: item.origen || 'Centrales',
            categoria: categoria || "General"
        })
        setIsEditing(true)
    }

    const handleEditSubmit = async () => {
        try {
            const res = await fetch('/api/editar', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(editForm)
            })
            const json = await res.json()

            if (json.status === 'success') {
                alert("Factura actualizada correctamente")
                setIsEditing(false)
                setSelectedItem(null)
                fetchTotal()
                handleProcess(page) // Refresh list
            } else {
                alert("Error al actualizar: " + json.message)
            }
        } catch (e) {
            console.error(e)
            alert("Error de conexión al guardar cambios")
        }
    }

    const handleManualSubmit = async (e) => {
        e.preventDefault()
        try {
            const payload = {
                ...manualForm,
                categoria: categoria || "General",
                origen: manualForm.origen
            }

            const res = await fetch('/api/manual', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            })
            const json = await res.json()

            if (json.status === 'success') {
                setIsManualModalOpen(false)
                setManualForm({
                    folio_fiscal: '',
                    rfc_emisor: '',
                    rfc_receptor: '',
                    nombre_emisor: '',
                    nombre_receptor: '',
                    puesto: '',
                    subtotal: '',
                    total_deducciones: '',
                    total_neto: '',
                    origen: 'Centrales'
                })
                alert('Factura manual agregada con éxito')
                fetchTotal()
                handleProcess(page)
            } else {
                alert('Error al guardar: ' + json.message)
            }
        } catch (e) {
            console.error(e)
            alert('Error de conexión')
        }
    }

    return (
        <div className={styles.container}>
            {isManualModalOpen && (
                <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }} onClick={() => setIsManualModalOpen(false)}>
                    <div style={{ background: 'white', padding: '2rem', borderRadius: '0.5rem', width: '600px', maxWidth: '90%', maxHeight: '90vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
                        <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '1.5rem', color: '#111827' }}>Agregar Factura Manualmente</h2>
                        <form onSubmit={handleManualSubmit} style={{ display: 'grid', gap: '1rem', gridTemplateColumns: 'repeat(2, 1fr)' }}>
                            <div style={{ gridColumn: 'span 2' }}>
                                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: '#374151', marginBottom: '0.25rem' }}>Folio Fiscal (UUID)</label>
                                <input
                                    type="text"
                                    required
                                    style={{ width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '0.375rem' }}
                                    value={manualForm.folio_fiscal}
                                    onChange={e => setManualForm({ ...manualForm, folio_fiscal: e.target.value })}
                                />
                            </div>

                            <div style={{ gridColumn: 'span 2' }}>
                                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: '#374151', marginBottom: '0.25rem' }}>Origen</label>
                                <select
                                    style={{ width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '0.375rem' }}
                                    value={manualForm.origen}
                                    onChange={e => setManualForm({ ...manualForm, origen: e.target.value })}
                                >
                                    <option value="Centrales">Centrales</option>
                                    <option value="Campo">Campo</option>
                                </select>
                            </div>

                            <div>
                                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: '#374151', marginBottom: '0.25rem' }}>RFC Emisor</label>
                                <input
                                    type="text"
                                    style={{ width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '0.375rem' }}
                                    value={manualForm.rfc_emisor}
                                    onChange={e => setManualForm({ ...manualForm, rfc_emisor: e.target.value })}
                                />
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: '#374151', marginBottom: '0.25rem' }}>Nombre Emisor</label>
                                <input
                                    type="text"
                                    style={{ width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '0.375rem' }}
                                    value={manualForm.nombre_emisor}
                                    onChange={e => setManualForm({ ...manualForm, nombre_emisor: e.target.value })}
                                />
                            </div>

                            <div>
                                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: '#374151', marginBottom: '0.25rem' }}>RFC Receptor (Trabajador)</label>
                                <input
                                    type="text"
                                    style={{ width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '0.375rem' }}
                                    value={manualForm.rfc_receptor}
                                    onChange={e => setManualForm({ ...manualForm, rfc_receptor: e.target.value })}
                                />
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: '#374151', marginBottom: '0.25rem' }}>Nombre Receptor</label>
                                <input
                                    type="text"
                                    style={{ width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '0.375rem' }}
                                    value={manualForm.nombre_receptor}
                                    onChange={e => setManualForm({ ...manualForm, nombre_receptor: e.target.value })}
                                />
                            </div>

                            <div style={{ gridColumn: 'span 2' }}>
                                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: '#374151', marginBottom: '0.25rem' }}>Puesto / Concepto</label>
                                <input
                                    type="text"
                                    style={{ width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '0.375rem' }}
                                    value={manualForm.puesto}
                                    onChange={e => setManualForm({ ...manualForm, puesto: e.target.value })}
                                />
                            </div>

                            <div>
                                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: '#374151', marginBottom: '0.25rem' }}>Subtotal</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    style={{ width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '0.375rem' }}
                                    value={manualForm.subtotal}
                                    onChange={e => setManualForm({ ...manualForm, subtotal: e.target.value })}
                                />
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: '#374151', marginBottom: '0.25rem' }}>Total Deducciones</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    style={{ width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '0.375rem' }}
                                    value={manualForm.total_deducciones}
                                    onChange={e => setManualForm({ ...manualForm, total_deducciones: e.target.value })}
                                />
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: '#374151', marginBottom: '0.25rem' }}>Total Neto</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    style={{ width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '0.375rem' }}
                                    value={manualForm.total_neto}
                                    onChange={e => setManualForm({ ...manualForm, total_neto: e.target.value })}
                                />
                            </div>

                            <div style={{ gridColumn: 'span 2', display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1rem' }}>
                                <button type="button" onClick={() => setIsManualModalOpen(false)} style={{ padding: '0.625rem 1.25rem', border: '1px solid #d1d5db', background: 'white', color: '#374151', borderRadius: '0.375rem', cursor: 'pointer' }}>
                                    Cancelar
                                </button>
                                <button type="submit" style={{ padding: '0.625rem 1.25rem', background: '#4f46e5', color: 'white', border: 'none', borderRadius: '0.375rem', fontWeight: 500, cursor: 'pointer' }}>
                                    Guardar
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {selectedItem && (
                <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }} onClick={() => { setSelectedItem(null); setIsEditing(false); }}>
                    <div style={{ background: 'white', padding: '2rem', borderRadius: '0.5rem', width: '600px', maxWidth: '90%', maxHeight: '85vh', overflowY: 'auto', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }} onClick={e => e.stopPropagation()}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem', borderBottom: '1px solid #e5e7eb', paddingBottom: '1rem', alignItems: 'center' }}>
                            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#111827' }}>
                                {isEditing ? 'Editar Factura' : 'Detalle de Factura'}
                            </h2>
                            <div style={{ display: 'flex', gap: '8px' }}>
                                {!isEditing && (
                                    <button
                                        onClick={() => startEditing(selectedItem)}
                                        style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '4px 8px', border: '1px solid #d1d5db', borderRadius: '4px', cursor: 'pointer', background: 'white', color: '#4b5563' }}
                                    >
                                        <Edit2 size={16} /> Editar
                                    </button>
                                )}
                                <button onClick={() => { setSelectedItem(null); setIsEditing(false); }} style={{ border: 'none', background: 'transparent', cursor: 'pointer', fontSize: '1.5rem', color: '#6b7280', display: 'flex', alignItems: 'center' }}><X size={24} /></button>
                            </div>
                        </div>

                        <div style={{ display: 'grid', gap: '0.75rem', gridTemplateColumns: 'repeat(2, 1fr)' }}>
                            {isEditing ? (
                                <>
                                    <div style={{ gridColumn: 'span 2' }}>
                                        <label style={{ display: 'block', fontSize: '0.7rem', textTransform: 'uppercase', color: '#6b7280', marginBottom: '4px' }}>Folio Fiscal</label>
                                        <input
                                            value={editForm.folio_fiscal}
                                            onChange={e => setEditForm({ ...editForm, folio_fiscal: e.target.value })}
                                            style={{ width: '100%', padding: '8px', border: '1px solid #d1d5db', borderRadius: '4px' }}
                                        />
                                    </div>

                                    <div style={{ gridColumn: 'span 2' }}>
                                        <label style={{ display: 'block', fontSize: '0.7rem', textTransform: 'uppercase', color: '#6b7280', marginBottom: '4px' }}>Origen</label>
                                        <select
                                            value={editForm.origen}
                                            onChange={e => setEditForm({ ...editForm, origen: e.target.value })}
                                            style={{ width: '100%', padding: '8px', border: '1px solid #d1d5db', borderRadius: '4px' }}
                                        >
                                            <option value="Centrales">Centrales</option>
                                            <option value="Campo">Campo</option>
                                        </select>
                                    </div>

                                    <div>
                                        <label style={{ display: 'block', fontSize: '0.7rem', textTransform: 'uppercase', color: '#6b7280', marginBottom: '4px' }}>RFC Emisor</label>
                                        <input value={editForm.rfc_emisor} onChange={e => setEditForm({ ...editForm, rfc_emisor: e.target.value })} style={{ width: '100%', padding: '6px', border: '1px solid #d1d5db', borderRadius: '4px' }} />
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '0.7rem', textTransform: 'uppercase', color: '#6b7280', marginBottom: '4px' }}>Nombre Emisor</label>
                                        <input value={editForm.nombre_emisor} onChange={e => setEditForm({ ...editForm, nombre_emisor: e.target.value })} style={{ width: '100%', padding: '6px', border: '1px solid #d1d5db', borderRadius: '4px' }} />
                                    </div>

                                    <div>
                                        <label style={{ display: 'block', fontSize: '0.7rem', textTransform: 'uppercase', color: '#6b7280', marginBottom: '4px' }}>RFC Receptor</label>
                                        <input value={editForm.rfc_receptor} onChange={e => setEditForm({ ...editForm, rfc_receptor: e.target.value })} style={{ width: '100%', padding: '6px', border: '1px solid #d1d5db', borderRadius: '4px' }} />
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '0.7rem', textTransform: 'uppercase', color: '#6b7280', marginBottom: '4px' }}>Nombre Receptor</label>
                                        <input value={editForm.nombre_receptor} onChange={e => setEditForm({ ...editForm, nombre_receptor: e.target.value })} style={{ width: '100%', padding: '6px', border: '1px solid #d1d5db', borderRadius: '4px' }} />
                                    </div>

                                    <div style={{ gridColumn: 'span 2' }}>
                                        <label style={{ display: 'block', fontSize: '0.7rem', textTransform: 'uppercase', color: '#6b7280', marginBottom: '4px' }}>Puesto</label>
                                        <input value={editForm.puesto} onChange={e => setEditForm({ ...editForm, puesto: e.target.value })} style={{ width: '100%', padding: '6px', border: '1px solid #d1d5db', borderRadius: '4px' }} />
                                    </div>

                                    <div>
                                        <label style={{ display: 'block', fontSize: '0.7rem', textTransform: 'uppercase', color: '#6b7280', marginBottom: '4px' }}>Subtotal</label>
                                        <input type="number" step="0.01" value={editForm.subtotal} onChange={e => setEditForm({ ...editForm, subtotal: e.target.value })} style={{ width: '100%', padding: '6px', border: '1px solid #d1d5db', borderRadius: '4px' }} />
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '0.7rem', textTransform: 'uppercase', color: '#6b7280', marginBottom: '4px' }}>Deducciones</label>
                                        <input type="number" step="0.01" value={editForm.total_deducciones} onChange={e => setEditForm({ ...editForm, total_deducciones: e.target.value })} style={{ width: '100%', padding: '6px', border: '1px solid #d1d5db', borderRadius: '4px' }} />
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '0.7rem', textTransform: 'uppercase', color: '#6b7280', marginBottom: '4px' }}>Total Neto</label>
                                        <input type="number" step="0.01" value={editForm.total_neto} onChange={e => setEditForm({ ...editForm, total_neto: e.target.value })} style={{ width: '100%', padding: '6px', border: '1px solid #d1d5db', borderRadius: '4px' }} />
                                    </div>
                                </>
                            ) : (
                                <>
                                    {Object.entries(selectedItem).map(([k, v]) => {
                                        if (['detalles_deducciones', 'status', 'archivo', 'origen'].includes(k)) return null
                                        return (
                                            <div key={k} style={{ borderBottom: '1px solid #f3f4f6', paddingBottom: '0.5rem', gridColumn: k.length > 20 ? 'span 2' : 'auto' }}>
                                                <strong style={{ display: 'block', fontSize: '0.7rem', textTransform: 'uppercase', color: '#6b7280', marginBottom: '0.25rem' }}>{k.replace(/_/g, ' ')}</strong>
                                                <span style={{ fontSize: '0.9rem', color: '#1f2937', fontWeight: 500, wordBreak: 'break-word' }}>{v?.toString() || '-'}</span>
                                            </div>
                                        )
                                    })}
                                    <div style={{ borderBottom: '1px solid #f3f4f6', paddingBottom: '0.5rem' }}>
                                        <strong style={{ display: 'block', fontSize: '0.7rem', textTransform: 'uppercase', color: '#6b7280', marginBottom: '0.25rem' }}>ORIGEN</strong>
                                        <span
                                            style={{
                                                padding: '4px 12px',
                                                borderRadius: '4px',
                                                fontSize: '0.9rem',
                                                fontWeight: 600,
                                                display: 'inline-block',
                                                backgroundColor: selectedItem.origen === 'Centrales' ? '#e0e7ff' : '#dcfce7',
                                                color: selectedItem.origen === 'Centrales' ? '#4338ca' : '#15803d'
                                            }}
                                        >
                                            {selectedItem.origen || 'Desconocido'}
                                        </span>
                                    </div>
                                </>
                            )}
                        </div>

                        <div style={{ marginTop: '1.5rem', textAlign: 'right', paddingTop: '1rem', borderTop: '1px solid #e5e7eb', display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
                            {isEditing ? (
                                <>
                                    <button onClick={() => setIsEditing(false)} style={{ padding: '0.625rem 1.25rem', border: '1px solid #d1d5db', background: 'white', color: '#374151', borderRadius: '0.375rem', cursor: 'pointer' }}>
                                        Cancelar
                                    </button>
                                    <button onClick={handleEditSubmit} style={{ padding: '0.625rem 1.25rem', background: '#4f46e5', color: 'white', border: 'none', borderRadius: '0.375rem', fontWeight: 500, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <Save size={18} /> Guardar Cambios
                                    </button>
                                </>
                            ) : (
                                <button onClick={() => setSelectedItem(null)} style={{ padding: '0.625rem 1.25rem', background: '#4f46e5', color: 'white', border: 'none', borderRadius: '0.375rem', fontWeight: 500, cursor: 'pointer' }}>Cerrar</button>
                            )}
                        </div>
                    </div>
                </div>
            )}

            <div className={styles.header}>
                <h1 className={styles.title}>{title || categoria || 'Gestión de Facturas SAT'}</h1>

                <div className={styles.controls}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginRight: '1rem' }}>
                        <span style={{ fontSize: '0.875rem', color: '#374151', fontWeight: 500 }}>Ver:</span>
                        <select
                            value={filterOrigen}
                            onChange={(e) => setFilterOrigen(e.target.value)}
                            style={{
                                padding: '0.375rem 0.75rem',
                                borderRadius: '0.375rem',
                                border: '1px solid #d1d5db',
                                backgroundColor: 'white',
                                fontSize: '0.875rem',
                                cursor: 'pointer',
                                outline: 'none',
                                color: '#1f2937'
                            }}
                        >
                            <option value="Todos">Todos</option>
                            <option value="Centrales">Solo Centrales</option>
                            <option value="Campo">Solo Campo</option>
                        </select>
                    </div>

                    <input
                        type="file"
                        multiple
                        accept=".pdf"
                        ref={fileInputRef}
                        style={{ display: 'none' }}
                        onChange={handleUpload}
                    />
                    <button className={`${styles.button} ${styles.uploadButton}`} onClick={() => setIsManualModalOpen(true)}>
                        <Plus size={18} style={{ marginRight: '0.5rem' }} />
                        Manual
                    </button>

                    <button className={`${styles.button} ${styles.uploadButton}`} onClick={() => fileInputRef.current.click()}>
                        <Upload size={18} style={{ marginRight: '0.5rem' }} />
                        Subir PDFs
                        <span className={styles.badgeCount}>{fileCount}</span>
                    </button>

                    <button className={`${styles.button} ${styles.processButton}`} onClick={() => handleProcess(1)} disabled={isProcessing}>
                        <Play size={18} style={{ marginRight: '0.5rem', fill: 'currentColor' }} />
                        {isProcessing ? 'Procesando...' : 'Procesar Lote Actual'}
                    </button>
                </div>
            </div>

            <div className={styles.contentCard}>
                <div className={styles.paginationBar} style={{ justifyContent: 'flex-end' }}>
                    <span style={{ fontSize: '0.875rem', color: '#6b7280', fontWeight: 500 }}>
                        Mostrando {data.length} registros
                    </span>
                </div>

                <div className={styles.tableContainer}>
                    <table className={styles.table}>
                        <thead>
                            <tr>
                                <th>Origen</th>
                                <th>Folio Fiscal</th>
                                <th>RFC Emisor</th>
                                <th>Nombre Emisor</th>
                                <th>RFC Receptor</th>
                                <th>Nombre Receptor</th>
                                <th>Puesto</th>
                                <th>Subtotal</th>
                                <th>Total Deducciones</th>
                                <th>Total Neto</th>
                                <th>Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {data.map((item) => (
                                <tr key={item.archivo}>
                                    <td>
                                        <span
                                            style={{
                                                padding: '2px 8px',
                                                borderRadius: '4px',
                                                fontSize: '0.75rem',
                                                fontWeight: 600,
                                                display: 'inline-block',
                                                backgroundColor: item.origen === 'Centrales' ? '#e0e7ff' : '#dcfce7',
                                                color: item.origen === 'Centrales' ? '#4338ca' : '#15803d'
                                            }}
                                        >
                                            {item.origen || '-'}
                                        </span>
                                    </td>

                                    <td title={item.folio_fiscal} style={{ maxWidth: '140px', overflow: 'hidden', textOverflow: 'ellipsis', color: '#6b7280' }}>
                                        {item.folio_fiscal || 'No detectado'}
                                    </td>
                                    <td>{item.rfc_emisor || '-'}</td>
                                    <td style={{ fontWeight: 500 }}>{item.nombre_emisor || '-'}</td>
                                    <td>{item.rfc_receptor || '-'}</td>
                                    <td>{item.nombre_receptor || '-'}</td>
                                    <td>{item.puesto || '-'}</td>

                                    <td className={styles.amount}>
                                        {item.subtotal ? `$${item.subtotal}` : '-'}
                                    </td>
                                    <td className={styles.amount} style={{ color: '#ef4444' }}>
                                        {item.total_deducciones ? `-$${item.total_deducciones}` : '-'}
                                    </td>
                                    <td className={styles.amount} style={{ color: '#10b981' }}>
                                        {item.total_neto ? `$${item.total_neto}` : '-'}
                                    </td>

                                    <td>
                                        <button
                                            style={{ background: 'transparent', border: 'none', color: '#818cf8', cursor: 'pointer', padding: '4px' }}
                                            onClick={() => setSelectedItem(item)}
                                            title="Ver detalles"
                                        >
                                            <Eye size={18} />
                                        </button>
                                        <button
                                            style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '4px', marginLeft: '0.5rem' }}
                                            onClick={() => handleDelete(item)}
                                            title="Eliminar registro"
                                        >
                                            <Trash2 size={18} />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                            {data.length === 0 && !isProcessing && (
                                <tr>
                                    <td colSpan="11" style={{ textAlign: 'center', padding: '4rem 2rem', color: '#9ca3af' }}>
                                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
                                            <Upload size={48} color="#e5e7eb" />
                                            <span>No hay datos visualizados. <br />Sube archivos o ajusta el filtro "{filterOrigen}".</span>
                                        </div>
                                    </td>
                                </tr>
                            )}
                            {isProcessing && data.length === 0 && (
                                <tr>
                                    <td colSpan="11" style={{ textAlign: 'center', padding: '4rem 2rem', color: '#6366f1' }}>
                                        Cargando datos...
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
            {/* Totals Summary Section */}
            {data.length > 0 && (
                <div style={{ marginTop: '2rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem' }}>
                    {/* Calculation Logic */}
                    {(() => {
                        const totals = data.reduce((acc, item) => {
                            const sub = parseFloat(item.subtotal?.toString().replace(/[$,]/g, '') || 0);
                            const net = parseFloat(item.total_neto?.toString().replace(/[$,]/g, '') || 0);
                            const origen = item.origen === 'Campo' ? 'Campo' : 'Centrales';

                            acc[origen].subtotal += sub;
                            acc[origen].neto += net;
                            acc.Global.subtotal += sub;
                            acc.Global.neto += net;
                            return acc;
                        }, {
                            Centrales: { subtotal: 0, neto: 0 },
                            Campo: { subtotal: 0, neto: 0 },
                            Global: { subtotal: 0, neto: 0 }
                        });

                        const formatCurrency = (amount) => {
                            return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(amount);
                        };

                        return (
                            <>
                                {/* Centrales Card */}
                                <div style={{ background: 'white', padding: '1.5rem', borderRadius: '0.5rem', border: '1px solid #e5e7eb', borderLeft: '4px solid #4338ca', boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)' }}>
                                    <h3 style={{ fontSize: '1rem', fontWeight: 600, color: '#4338ca', marginBottom: '1rem', textTransform: 'uppercase' }}>Total Centrales</h3>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                                        <span style={{ color: '#6b7280', fontSize: '0.875rem' }}>Subtotal:</span>
                                        <span style={{ fontWeight: 600, color: '#1f2937' }}>{formatCurrency(totals.Centrales.subtotal)}</span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #f3f4f6', paddingTop: '0.5rem' }}>
                                        <span style={{ color: '#6b7280', fontSize: '0.875rem' }}>Total Neto:</span>
                                        <span style={{ fontWeight: 700, color: '#1f2937', fontSize: '1.1rem' }}>{formatCurrency(totals.Centrales.neto)}</span>
                                    </div>
                                </div>

                                {/* Campo Card */}
                                <div style={{ background: 'white', padding: '1.5rem', borderRadius: '0.5rem', border: '1px solid #e5e7eb', borderLeft: '4px solid #15803d', boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)' }}>
                                    <h3 style={{ fontSize: '1rem', fontWeight: 600, color: '#15803d', marginBottom: '1rem', textTransform: 'uppercase' }}>Total Campo</h3>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                                        <span style={{ color: '#6b7280', fontSize: '0.875rem' }}>Subtotal:</span>
                                        <span style={{ fontWeight: 600, color: '#1f2937' }}>{formatCurrency(totals.Campo.subtotal)}</span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #f3f4f6', paddingTop: '0.5rem' }}>
                                        <span style={{ color: '#6b7280', fontSize: '0.875rem' }}>Total Neto:</span>
                                        <span style={{ fontWeight: 700, color: '#1f2937', fontSize: '1.1rem' }}>{formatCurrency(totals.Campo.neto)}</span>
                                    </div>
                                </div>

                                {/* Global Card */}
                                <div style={{ background: 'linear-gradient(to right, #4f46e5, #7c3aed)', padding: '1.5rem', borderRadius: '0.5rem', color: 'white', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)' }}>
                                    <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '1rem', textTransform: 'uppercase', opacity: 0.9 }}>Gran Total</h3>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                                        <span style={{ opacity: 0.8, fontSize: '0.875rem' }}>Subtotal:</span>
                                        <span style={{ fontWeight: 600 }}>{formatCurrency(totals.Global.subtotal)}</span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid rgba(255,255,255,0.2)', paddingTop: '0.5rem' }}>
                                        <span style={{ opacity: 0.8, fontSize: '0.875rem' }}>Total Neto:</span>
                                        <span style={{ fontWeight: 800, fontSize: '1.25rem' }}>{formatCurrency(totals.Global.neto)}</span>
                                    </div>
                                </div>
                            </>
                        );
                    })()}
                </div>
            )}
        </div >
    )
}

export default AutomaticValidation
