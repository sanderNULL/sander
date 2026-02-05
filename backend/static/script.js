let currentPage = 1;
const limit = 10;
let totalFiles = 0;
let currentBatchData = []; // Almacenamos los datos actuales para el modal

document.addEventListener('DOMContentLoaded', async () => {
    await actualizarTotal();
    
    document.getElementById('btnLoad').addEventListener('click', cargarDatos);
    document.getElementById('btnPrev').addEventListener('click', prevPage);
    document.getElementById('btnNext').addEventListener('click', nextPage);
    document.getElementById('fileInput').addEventListener('change', subirArchivos);
});

async function actualizarTotal() {
    try {
        const res = await fetch('/api/total');
        const data = await res.json();
        totalFiles = data.total;
        document.getElementById('totalFiles').innerText = `${totalFiles} Archivos en Cola`;
        
        if (totalFiles > 0 && document.getElementById('tablaCuerpo').children.length === 0) {
            cargarDatos();
        }
    } catch (error) {
        console.error("Error conectando al servidor:", error);
        document.getElementById('totalFiles').innerText = "Desconectado";
        document.getElementById('totalFiles').classList.add('bg-red-100', 'text-red-800');
    }
}

async function subirArchivos(event) {
    const files = event.target.files;
    if (files.length === 0) return;

    const formData = new FormData();
    for (let i = 0; i < files.length; i++) {
        formData.append('files', files[i]);
    }

    const btnUpload = document.querySelector('button[onclick*="fileInput"] span');
    const originalText = btnUpload.innerText;
    btnUpload.innerText = "Subiendo...";

    try {
        const response = await fetch('/api/subir', {
            method: 'POST',
            body: formData
        });
        
        if (response.ok) {
            const result = await response.json();
            alert(`✅ ¡Éxito! Se subieron ${result.count} archivos.`);
            await actualizarTotal();
            cargarDatos(); 
        } else {
            alert("❌ Hubo un error al subir los archivos.");
        }
    } catch (error) {
        console.error(error);
        alert("Error de conexión al subir archivos.");
    } finally {
        btnUpload.innerText = originalText;
        event.target.value = ""; 
    }
}

async function cargarDatos() {
    const tbody = document.getElementById('tablaCuerpo');
    const loader = document.getElementById('loading');
    const pageIndicator = document.getElementById('pageIndicator');

    tbody.innerHTML = '';
    loader.classList.remove('hidden');

    try {
        const response = await fetch(`/api/procesar?page=${currentPage}&limit=${limit}`);
        currentBatchData = await response.json(); // Guardamos los datos en memoria

        loader.classList.add('hidden');

        if (currentBatchData.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" class="px-5 py-5 border-b border-gray-200 text-sm text-center text-gray-500">No hay archivos en la carpeta "facturas". ¡Sube algunos!</td></tr>';
            return;
        }

        // Renderizamos la fila usando el índice (i) para referenciar el botón de detalles
        currentBatchData.forEach((dato, index) => {
            const row = document.createElement('tr');
            row.className = 'fade-in hover:bg-gray-50';

            const isError = dato.status === 'error';
            const colorClass = isError ? 'text-red-500' : 'text-gray-900';
            
            const estadoBadge = isError 
                ? `<span class="relative inline-block px-3 py-1 font-semibold text-red-900 leading-tight"><span class="absolute inset-0 bg-red-200 opacity-50 rounded-full"></span><span class="relative">Error</span></span>`
                : `<span class="relative inline-block px-3 py-1 font-semibold text-green-900 leading-tight"><span class="absolute inset-0 bg-green-200 opacity-50 rounded-full"></span><span class="relative">OK</span></span>`;

            row.innerHTML = `
                <td class="px-5 py-5 border-b border-gray-200 text-sm"><p class="${colorClass} whitespace-no-wrap text-xs">${dato.folio_fiscal || '---'}</p></td>
                <td class="px-5 py-5 border-b border-gray-200 text-sm"><p class="${colorClass} whitespace-no-wrap font-mono">${dato.rfc_emisor || '---'}</p></td>
                <td class="px-5 py-5 border-b border-gray-200 text-sm"><p class="${colorClass} whitespace-no-wrap font-mono">${dato.rfc_receptor || '---'}</p></td>
                <td class="px-5 py-5 border-b border-gray-200 text-sm"><p class="${colorClass} whitespace-no-wrap truncate w-32" title="${dato.nombre_emisor}">${dato.nombre_emisor || '---'}</p></td>
                <td class="px-5 py-5 border-b border-gray-200 text-sm font-bold"><p class="${colorClass} whitespace-no-wrap">$ ${dato.subtotal || '0.00'}</p></td>
                <td class="px-5 py-5 border-b border-gray-200 text-sm">${estadoBadge}</td>
                <td class="px-5 py-5 border-b border-gray-200 text-sm text-center">
                    <button onclick="verDetalles(${index})" class="bg-indigo-100 hover:bg-indigo-200 text-indigo-700 font-semibold py-1 px-3 rounded text-xs transition">
                        Ver
                    </button>
                </td>
            `;
            tbody.appendChild(row);
        });

        pageIndicator.innerText = currentPage;
        actualizarBotones();

    } catch (error) {
        console.error('Error:', error);
        loader.classList.add('hidden');
    }
}

// --- FUNCIONES DEL MODAL ---

function verDetalles(index) {
    const data = currentBatchData[index];
    const contenedor = document.getElementById('contenidoModal');
    
    // Generamos el HTML del detalle
    contenedor.innerHTML = `
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div class="col-span-2 bg-gray-50 p-3 rounded border">
                <span class="font-bold text-gray-500 block text-xs">Archivo Origen:</span>
                <span class="break-all font-mono">${data.archivo}</span>
            </div>
            
            <div>
                <span class="font-bold text-gray-500 block text-xs">Folio Fiscal (UUID):</span>
                <span class="font-mono text-indigo-600">${data.folio_fiscal || 'No detectado'}</span>
            </div>
             <div>
                <span class="font-bold text-gray-500 block text-xs">Subtotal:</span>
                <span class="font-bold text-green-600 text-lg">$ ${data.subtotal || '0.00'}</span>
            </div>

            <div>
                <span class="font-bold text-gray-500 block text-xs">RFC Emisor:</span>
                <span>${data.rfc_emisor || '---'}</span>
            </div>
            <div>
                <span class="font-bold text-gray-500 block text-xs">RFC Receptor:</span>
                <span>${data.rfc_receptor || '---'}</span>
            </div>

            <div class="col-span-2">
                <span class="font-bold text-gray-500 block text-xs">Nombre Emisor:</span>
                <span>${data.nombre_emisor || '---'}</span>
            </div>
            
            <div class="col-span-2 border-t pt-2 mt-2">
                <h4 class="font-bold text-gray-700 mb-2">Datos Adicionales</h4>
            </div>

            <div>
                <span class="font-bold text-gray-500 block text-xs">Uso de CFDI:</span>
                <span>${data.uso_cfdi || '---'}</span>
            </div>
            <div>
                <span class="font-bold text-gray-500 block text-xs">Efecto de Comprobante:</span>
                <span>${data.efecto_comprobante || '---'}</span>
            </div>
        </div>
    `;

    // Mostrar modal
    document.getElementById('modalDetalles').classList.remove('hidden');
}

function cerrarModal() {
    document.getElementById('modalDetalles').classList.add('hidden');
}

function nextPage() {
    if ((currentPage * limit) < totalFiles) {
        currentPage++;
        cargarDatos();
    }
}

function prevPage() {
    if (currentPage > 1) {
        currentPage--;
        cargarDatos();
    }
}

function actualizarBotones() {
    document.getElementById('btnPrev').disabled = currentPage === 1;
    document.getElementById('btnNext').disabled = (currentPage * limit) >= totalFiles;
}