import React, { useState, useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
    PieChart,
    FileText,
    ChevronDown,
    Settings,
    Briefcase,
    Plus,
    X,
    Trash2
} from 'lucide-react'
import styles from './Sidebar.module.css'

const Sidebar = () => {
    const location = useLocation()
    const [isFacturacionOpen, setIsFacturacionOpen] = useState(false)
    // Removed specific isOficinaOpen, using generic state map
    const [openCategories, setOpenCategories] = useState({})
    const [structure, setStructure] = useState([])
    const [loading, setLoading] = useState(true)

    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [newCategoryName, setNewCategoryName] = useState("")
    const [nextPrefix, setNextPrefix] = useState("a.")
    const [currentParentKey, setCurrentParentKey] = useState(null)

    const fetchStructure = async () => {
        try {
            const res = await fetch('/api/structure')
            const data = await res.json()
            setStructure(data)
            setLoading(false)
        } catch (error) {
            console.error("Error loading structure", error)
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchStructure()
    }, [])

    // Auto-open if visiting a submenu link
    useEffect(() => {
        if (location.pathname.includes('/facturacion')) {
            setIsFacturacionOpen(true)
        }
    }, [location.pathname])

    const toggleCategory = (key) => {
        setOpenCategories(prev => ({ ...prev, [key]: !prev[key] }))
    }

    const handleOpenModal = (parentKey, parentName, subItems = []) => {
        setCurrentParentKey(parentKey)

        // Calculate next prefix
        // Filter out "Otros" or system items if any
        const letteredItems = subItems.filter(i => !i.key.includes("Otros") && !i.key.includes("Agregar"))
        const nextChar = String.fromCharCode(97 + letteredItems.length) // 97 is 'a'
        setNextPrefix(`${nextChar}.`)

        setNewCategoryName("")
        setIsModalOpen(true)
    }

    const handleAddCategory = async (e) => {
        e.preventDefault()
        if (!newCategoryName.trim()) return

        const fullName = `${nextPrefix} ${newCategoryName}`
        const key = newCategoryName.trim()

        try {
            const res = await fetch('/api/categories/add', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: fullName,
                    key: key,
                    parent_key: currentParentKey
                })
            })
            const data = await res.json()
            if (data.status === 'success') {
                await fetchStructure() // Refresh menu
                setIsModalOpen(false)
                // Auto open the category we just added to
                if (currentParentKey) {
                    setOpenCategories(prev => ({ ...prev, [currentParentKey]: true }))
                }
            } else {
                alert("Error: " + data.message)
            }
        } catch (error) {
            alert("Error de conexión")
        }
    }

    const handleDeleteCategory = async (parentKey, subKey, subName) => {
        if (!confirm(`¿Estás seguro de eliminar el apartado "${subName}"?\nLos archivos existentes no se borrarán, pero dejarán de ser visibles en esta categoría.`)) return

        try {
            const res = await fetch('/api/categories/delete', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ key: subKey, parent_key: parentKey })
            })
            const data = await res.json()
            if (data.status === 'success') {
                await fetchStructure()
                alert("Eliminado correctamente")
            } else {
                alert("Error: " + data.message)
            }
        } catch (e) {
            alert("Error de conexión al eliminar")
        }
    }

    const [isRenameModalOpen, setIsRenameModalOpen] = useState(false)
    const [renameData, setRenameData] = useState({ parentKey: '', key: '', oldName: '', newName: '' })

    const handleOpenRenameModal = (parentKey, subKey, subName) => {
        // Strip prefix "a. " from name for editing
        const cleanName = subName.replace(/^[a-z]\.\s*/, '')
        setRenameData({ parentKey, key: subKey, oldName: subName, newName: cleanName })
        setIsRenameModalOpen(true)
    }

    const handleRenameCategory = async (e) => {
        e.preventDefault()
        if (!renameData.newName.trim()) return

        // Reconstruct full name with prefix
        const prefix = renameData.oldName.match(/^[a-z]\.\s*/)
        const fullNewName = (prefix ? prefix[0] : '') + renameData.newName.trim()
        const newKey = renameData.newName.trim() // Assuming key follows name pattern

        try {
            const res = await fetch('/api/categories/rename', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    parent_key: renameData.parentKey,
                    key: renameData.key,
                    new_name: fullNewName,
                    new_key: newKey
                })
            })
            const data = await res.json()
            if (data.status === 'success') {
                await fetchStructure()
                setIsRenameModalOpen(false)
                alert("Renombrado correctamente")
            } else {
                alert("Error: " + data.message)
            }
        } catch (e) {
            alert("Error de conexión al renombrar")
        }
    }

    // Helper to determine link path
    const getLinkPath = (item) => {
        // Legacy fix map or dynamic logic
        // If we use dynamic route for everything it's easier, but we have existing hardcoded routes in App.jsx
        // Let's try to map known keys to hardcoded routes, else dynamic
        const map = {
            "Honorarios": "/facturacion/honorarios",
            "Depreciación": "/facturacion/depreciacion",
            "Servicios": "/facturacion/servicios",
            "Fletes": "/facturacion/fletes",
            "Capacitación": "/facturacion/capacitacion",
            "Seguridad": "/facturacion/seguridad",
            "Seguros": "/facturacion/seguros",
            "Trabajos Previos": "/facturacion/trabajos",

            // Subitems legacy
            "Papelería y Útiles": "/facturacion/oficina-papeleria",
            "Comunicaciones y Radios": "/facturacion/oficina-comunicaciones",
            "Equipo de Cómputo": "/facturacion/oficina-computo",
            "Otros Gastos de Oficina": "/facturacion/oficina-mas"
        }

        if (map[item.key]) return map[item.key]

        // Dynamic fallback
        return `/facturacion/dinamica/${item.key}`
    }

    return (
        <>
            <nav className={styles.sidebar}>
                <div className={styles.logo}>
                    <Briefcase size={28} color="var(--color-primary)" />
                    <span>Contabilidad</span>
                </div>

                {loading ? (
                    <div style={{ padding: '2rem', color: '#aaa' }}>Cargando menú...</div>
                ) : (
                    <ul className={styles.menu}>
                        {/* Dashboard */}
                        <li>
                            <Link to="/" style={{ textDecoration: 'none' }}>
                                <button className={`${styles.menuItemButton} ${location.pathname === '/' ? styles.active : ''}`}>
                                    <span className={styles.menuItemContent}>
                                        <PieChart className={styles.icon} />
                                        <span>Dashboard</span>
                                    </span>
                                </button>
                            </Link>
                        </li>

                        {/* Facturación */}
                        <li>
                            <button
                                className={`${styles.menuItemButton} ${location.pathname.includes('facturacion') ? styles.active : ''}`}
                                onClick={() => setIsFacturacionOpen(!isFacturacionOpen)}
                            >
                                <span className={styles.menuItemContent}>
                                    <FileText className={styles.icon} />
                                    <span>Gastos Generales</span>
                                </span>
                                <ChevronDown className={`${styles.chevron} ${isFacturacionOpen ? styles.rotate : ''}`} />
                            </button>

                            <AnimatePresence>
                                {isFacturacionOpen && (
                                    <motion.div
                                        className={styles.submenu}
                                        initial={{ height: 0, opacity: 0 }}
                                        animate={{ height: 'auto', opacity: 1 }}
                                        exit={{ height: 0, opacity: 0 }}
                                        transition={{ duration: 0.3, ease: [0.04, 0.62, 0.23, 0.98] }}
                                    >
                                        <div className={styles.submenuContainer}>
                                            {structure.map((item, idx) => {
                                                const isOpen = openCategories[item.key] || false
                                                const hasSubItems = item.subItems && item.subItems.length > 0

                                                // Always render as expandable button
                                                return (
                                                    <div key={idx}>
                                                        <button
                                                            className={styles.submenuItem}
                                                            onClick={() => toggleCategory(item.key)}
                                                            style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', border: 'none', background: 'transparent', textAlign: 'left', cursor: 'pointer' }}
                                                        >
                                                            {item.name}
                                                            <ChevronDown size={14} className={isOpen ? styles.rotate : ''} />
                                                        </button>
                                                        <AnimatePresence>
                                                            {isOpen && (
                                                                <motion.div
                                                                    initial={{ height: 0, opacity: 0 }}
                                                                    animate={{ height: 'auto', opacity: 1 }}
                                                                    exit={{ height: 0, opacity: 0 }}
                                                                    style={{ overflow: 'hidden' }}
                                                                >
                                                                    <div style={{ display: 'flex', flexDirection: 'column', paddingLeft: '0.5rem' }}>
                                                                        {hasSubItems && item.subItems.map((sub, sIdx) => {
                                                                            return (
                                                                                <div key={sIdx} style={{ position: 'relative' }}>
                                                                                    <Link
                                                                                        to={getLinkPath(sub)}
                                                                                        className={`${styles.submenuItem} ${location.pathname === getLinkPath(sub) ? styles.active : ''}`}
                                                                                        style={{ fontSize: '0.8rem', paddingRight: '3.5rem' }}
                                                                                    >
                                                                                        {sub.name}
                                                                                    </Link>
                                                                                    {/* Edit Button */}
                                                                                    <button
                                                                                        onClick={(e) => {
                                                                                            e.preventDefault()
                                                                                            e.stopPropagation()
                                                                                            handleOpenRenameModal(item.key, sub.key, sub.name)
                                                                                        }}
                                                                                        style={{
                                                                                            position: 'absolute',
                                                                                            right: '25px',
                                                                                            top: '50%',
                                                                                            transform: 'translateY(-50%)',
                                                                                            border: 'none',
                                                                                            background: 'transparent',
                                                                                            cursor: 'pointer',
                                                                                            color: '#6366f1',
                                                                                            padding: '4px',
                                                                                            display: 'flex',
                                                                                            alignItems: 'center',
                                                                                            justifyContent: 'center',
                                                                                            opacity: 0.6
                                                                                        }}
                                                                                        onMouseEnter={(e) => e.currentTarget.style.opacity = '1'}
                                                                                        onMouseLeave={(e) => e.currentTarget.style.opacity = '0.6'}
                                                                                        title="Renombrar apartado"
                                                                                    >
                                                                                        <Settings size={12} />
                                                                                    </button>
                                                                                    {/* Delete Button */}
                                                                                    <button
                                                                                        onClick={(e) => {
                                                                                            e.preventDefault()
                                                                                            e.stopPropagation()
                                                                                            handleDeleteCategory(item.key, sub.key, sub.name)
                                                                                        }}
                                                                                        style={{
                                                                                            position: 'absolute',
                                                                                            right: '5px',
                                                                                            top: '50%',
                                                                                            transform: 'translateY(-50%)',
                                                                                            border: 'none',
                                                                                            background: 'transparent',
                                                                                            cursor: 'pointer',
                                                                                            color: '#ef4444',
                                                                                            padding: '4px',
                                                                                            display: 'flex',
                                                                                            alignItems: 'center',
                                                                                            justifyContent: 'center',
                                                                                            opacity: 0.6
                                                                                        }}
                                                                                        onMouseEnter={(e) => e.currentTarget.style.opacity = '1'}
                                                                                        onMouseLeave={(e) => e.currentTarget.style.opacity = '0.6'}
                                                                                        title="Eliminar apartado"
                                                                                    >
                                                                                        <Trash2 size={12} />
                                                                                    </button>
                                                                                </div>
                                                                            )
                                                                        })}

                                                                        {/* Botón Agregar Más */}
                                                                        <button
                                                                            onClick={() => handleOpenModal(item.key, item.name, item.subItems)}
                                                                            className={styles.submenuItem}
                                                                            style={{ fontSize: '0.8rem', color: '#6366f1', textAlign: 'left', background: 'transparent', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                                                                        >
                                                                            <Plus size={14} /> Agregar más
                                                                        </button>
                                                                    </div>
                                                                </motion.div>
                                                            )}
                                                        </AnimatePresence>
                                                    </div>
                                                )
                                            })}
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </li>

                        {/* Settings */}
                        <li style={{ marginTop: 'auto' }}>
                            <button className={styles.menuItemButton}>
                                <span className={styles.menuItemContent}>
                                    <Settings className={styles.icon} />
                                    <span>Configuración</span>
                                </span>
                            </button>
                        </li>
                    </ul>
                )}
            </nav>

            {/* Modal Agregar Categoría */}
            {isModalOpen && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: 'rgba(0,0,0,0.5)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 1000
                }}>
                    <div style={{ background: 'white', padding: '2rem', borderRadius: '0.5rem', width: '400px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
                        <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '1.5rem', color: '#1f2937' }}>Agregar Nueva Categoría</h2>
                        <form onSubmit={handleAddCategory}>
                            <div style={{ marginBottom: '1rem' }}>
                                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: '#374151', marginBottom: '0.5rem' }}>Nombre del Apartado</label>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <span style={{ fontWeight: 600, color: '#6b7280' }}>{nextPrefix}</span>
                                    <input
                                        type="text"
                                        value={newCategoryName}
                                        onChange={(e) => setNewCategoryName(e.target.value)}
                                        placeholder="Ej. Limpieza"
                                        style={{ flex: 1, padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '0.375rem' }}
                                        autoFocus
                                    />
                                </div>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '2rem' }}>
                                <button
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                    style={{ padding: '0.5rem 1rem', border: '1px solid #d1d5db', borderRadius: '0.375rem', background: 'white', color: '#374151', cursor: 'pointer' }}
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    style={{ padding: '0.5rem 1rem', background: '#4f46e5', color: 'white', border: 'none', borderRadius: '0.375rem', cursor: 'pointer' }}
                                >
                                    Guardar
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal Renombrar Categoría */}
            {isRenameModalOpen && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: 'rgba(0,0,0,0.5)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 1000
                }}>
                    <div style={{ background: 'white', padding: '2rem', borderRadius: '0.5rem', width: '400px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
                        <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '1.5rem', color: '#1f2937' }}>Renombrar Categoría</h2>
                        <form onSubmit={handleRenameCategory}>
                            <div style={{ marginBottom: '1rem' }}>
                                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: '#374151', marginBottom: '0.5rem' }}>Nuevo Nombre</label>
                                <input
                                    type="text"
                                    value={renameData.newName}
                                    onChange={(e) => setRenameData({ ...renameData, newName: e.target.value })}
                                    style={{ width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '0.375rem' }}
                                    autoFocus
                                />
                                <p style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '0.5rem' }}>
                                    Nota: Esto también renombrará la carpeta de archivos.
                                </p>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '2rem' }}>
                                <button
                                    type="button"
                                    onClick={() => setIsRenameModalOpen(false)}
                                    style={{ padding: '0.5rem 1rem', border: '1px solid #d1d5db', borderRadius: '0.375rem', background: 'white', color: '#374151', cursor: 'pointer' }}
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    style={{ padding: '0.5rem 1rem', background: '#4f46e5', color: 'white', border: 'none', borderRadius: '0.375rem', cursor: 'pointer' }}
                                >
                                    Guardar Cambios
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </>
    )
}

export default Sidebar
