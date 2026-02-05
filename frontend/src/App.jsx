import { Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/Layout/Layout'
import Dashboard from './pages/Dashboard'
import AutomaticValidation from './pages/Facturacion/AutomaticValidation'
import AutomaticValidationWrapper from './pages/Facturacion/AutomaticValidationWrapper'
import CargaArchivos from './pages/Facturacion/CargaArchivos'
import AdminPanel from './pages/Admin/AdminPanel'

import ErrorBoundary from './components/ErrorBoundary'

function App() {
    return (
        <Routes>
            <Route path="/" element={<Layout />}>
                <Route index element={
                    <ErrorBoundary>
                        <Dashboard />
                    </ErrorBoundary>
                } />
                <Route path="admin" element={<AdminPanel />} />
                <Route path="facturacion/carga" element={<CargaArchivos />} />

                {/* Categorías de Gastos */}
                <Route path="facturacion/honorarios" element={<AutomaticValidation categoria="Honorarios" />} />
                <Route path="facturacion/depreciacion" element={<AutomaticValidation categoria="Depreciación" />} />
                <Route path="facturacion/servicios" element={<AutomaticValidation categoria="Servicios" />} />
                <Route path="facturacion/fletes" element={<AutomaticValidation categoria="Fletes" />} />

                {/* V. Gastos de Oficina (Subcategorías) */}
                {/* Rutas Legacy (podrían ser reemplazadas por la dinámica si el sidebar usa links dinámicos) */}
                <Route path="facturacion/oficina-papeleria" element={<AutomaticValidation categoria="Papelería y Útiles" title="Gastos de Oficina / Papelería y Útiles" />} />
                <Route path="facturacion/oficina-comunicaciones" element={<AutomaticValidation categoria="Comunicaciones y Radios" title="Gastos de Oficina / Comunicaciones" />} />
                <Route path="facturacion/oficina-computo" element={<AutomaticValidation categoria="Equipo de Cómputo" title="Gastos de Oficina / Equipo de Cómputo" />} />
                <Route path="facturacion/oficina-mas" element={<AutomaticValidation categoria="Otros Gastos de Oficina" title="Gastos de Oficina / Otros" />} />

                {/* RUTA DINÁMICA PARA NUEVAS SUBCATEGORÍAS */}
                <Route path="facturacion/dinamica/:key" element={<AutomaticValidationWrapper />} />

                <Route path="facturacion/capacitacion" element={<AutomaticValidation categoria="Capacitación" />} />
                <Route path="facturacion/seguridad" element={<AutomaticValidation categoria="Seguridad" />} />
                <Route path="facturacion/seguros" element={<AutomaticValidation categoria="Seguros" />} />
                <Route path="facturacion/trabajos" element={<AutomaticValidation categoria="Trabajos Previos" />} />

                <Route path="*" element={<Navigate to="/" replace />} />
            </Route>
        </Routes>
    )
}

export default App
