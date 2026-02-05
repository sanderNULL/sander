# server.py
from fastapi import FastAPI, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from typing import List
import os
import shutil
from extractor import extraer_datos_infalible
import json
import uuid
from pydantic import BaseModel

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.mount("/static", StaticFiles(directory="static"), name="static")

# --- LÓGICA DE CARPETA SEGURA ---
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
CARPETA_FACTURAS = os.path.join(BASE_DIR, 'facturas')

# --- DATABASE SETUP (REMOVED) ---
# --- ENDPOINTS AUTH (REMOVED) ---


# --- LÓGICA DE CARPETAS (Dinámica) ---
STRUCTURE_FILE = os.path.join(BASE_DIR, 'categories_config.json')

DEFAULT_STRUCTURE = [
    { "name": "I. Honorarios, Sueldos y Prestaciones", "key": "Honorarios" },
    { "name": "II. Depreciación, Mantenimiento y Rentas", "key": "Depreciación" },
    { "name": "III. Servicios", "key": "Servicios" },
    { "name": "IV. Fletes y Acarreos", "key": "Fletes" },
    {
        "name": "V. Gastos de Oficina",
        "isGroup": True,
        "subItems": [
            { "name": "a. Papelería y Útiles", "key": "Papelería y Útiles" },
            { "name": "b. Comunicaciones, Fax...", "key": "Comunicaciones y Radios" },
            { "name": "c. Equipo de Cómputo", "key": "Equipo de Cómputo" }
        ]
    },
    { "name": "VI. Gastos de Capacitación y Adiestramiento", "key": "Capacitación" },
    { "name": "VII. Seguridad e Higiene", "key": "Seguridad" },
    { "name": "VIII. Seguros y Fianzas", "key": "Seguros" },
    { "name": "IX. Trabajos Previos y Auxiliares", "key": "Trabajos Previos" }
]

def load_structure():
    if not os.path.exists(STRUCTURE_FILE):
        save_structure(DEFAULT_STRUCTURE)
        return DEFAULT_STRUCTURE
    try:
        with open(STRUCTURE_FILE, 'r', encoding='utf-8') as f:
            return json.load(f)
    except:
        return DEFAULT_STRUCTURE

def save_structure(structure):
    with open(STRUCTURE_FILE, 'w', encoding='utf-8') as f:
        json.dump(structure, f, indent=2, ensure_ascii=False)

# Ensure folders exist based on structure
def ensure_folders_from_structure():
    structure = load_structure()
    
    def check_item(item):
        if item.get("isGroup"):
            for sub in item.get("subItems", []):
                check_item(sub)
        else:
            path = os.path.join(CARPETA_FACTURAS, item["key"])
            if not os.path.exists(path):
                os.makedirs(path)

    for item in structure:
        check_item(item)

# Initialize folders on startup
ensure_folders_from_structure()

# Flatten categories for legacy compatibility if needed
def get_all_categories_flat():
    structure = load_structure()
    cats = []
    def extract(item):
        if item.get("isGroup"):
            for sub in item.get("subItems", []):
                extract(sub)
        else:
            cats.append(item["key"])
    for item in structure:
        extract(item)
    return cats

CATEGORIAS = get_all_categories_flat()

@app.get("/api/structure")
def get_structure():
    return load_structure()

class AddCategoryRequest(BaseModel):
    name: str # The display name (e.g. "d. Nuevo Gasto")
    key: str # The folder name (e.g. "Nuevo Gasto")
    parent_key: str # The key of the parent category (e.g. "Honorarios")

@app.post("/api/categories/add")
def add_subcategory(req: AddCategoryRequest):
    structure = load_structure()
    
    # Find parent category
    parent = None
    for item in structure:
        if item["key"] == req.parent_key:
            parent = item
            break
            
    if not parent:
         return {"status": "error", "message": "Categoría padre no encontrada"}
    
    # Ensure it's a group
    if not parent.get("isGroup"):
        parent["isGroup"] = True
        parent["subItems"] = []
    
    # Validation
    for sub in parent["subItems"]:
        if sub["key"] == req.key:
            return {"status": "error", "message": "Categoría ya existe"}

    new_item = { "name": req.name, "key": req.key }
    
    # Add new item
    parent["subItems"].append(new_item)
    
    # Sort subitems by name to ensure order (a., b., c., ...)
    parent["subItems"].sort(key=lambda x: x["name"])
         
    save_structure(structure)
    ensure_folders_from_structure()
    
    return {"status": "success", "structure": structure}

@app.get("/")
def read_index():
    return FileResponse('index.html')

@app.get("/api/total")
def get_total(categoria: str = "General"):
    carpeta_destino = os.path.join(CARPETA_FACTURAS, categoria)
    if not os.path.exists(carpeta_destino):
        return {"total": 0}
    archivos = [f for f in os.listdir(carpeta_destino) if f.lower().endswith('.pdf') or f.lower().endswith('.json')]
    return {"total": len(archivos)}

@app.post("/api/subir")
async def subir_archivos(files: List[UploadFile] = File(...), categoria: str = "General", origen: str = "Centrales"):
    carpeta_destino = os.path.join(CARPETA_FACTURAS, categoria)
    if not os.path.exists(carpeta_destino):
        os.makedirs(carpeta_destino)
    
    saved_files = []
    for file in files:
        if file.filename.lower().endswith('.pdf'):
            # Limpiar nombre de archivo de etiquetas anteriores si existen
            import re
            clean_name = re.sub(r'^\[.*?\]\s*', '', file.filename)
            
            # Añadir etiqueta de origen
            new_filename = f"[{origen}] {clean_name}"
            
            ruta_completa = os.path.join(carpeta_destino, new_filename)
            with open(ruta_completa, "wb") as buffer:
                shutil.copyfileobj(file.file, buffer)
            saved_files.append(new_filename)
        
    return {"message": f"{len(saved_files)} archivos subidos", "files": saved_files}

@app.get("/api/procesar")
def procesar_lote(categoria: str = "General", page: int = 1, limit: int = 10, filtro_origen: str = "Todos"):
    carpeta_destino = os.path.join(CARPETA_FACTURAS, categoria)
    if not os.path.exists(carpeta_destino):
        return []

    # Sort by clean name to ensure stability when changing tags
    import re
    def get_sort_key(f):
        # Sort primarily by clean name, secondarily by full name to ensure complete determinism
        clean = re.sub(r'^\[.*?\]\s*', '', f).lower()
        return (clean, f.lower())

    all_files = sorted([f for f in os.listdir(carpeta_destino) if f.lower().endswith('.pdf') or f.lower().endswith('.json')], key=get_sort_key)
    
    # Aplicar filtro si no es "Todos"
    if filtro_origen != "Todos":
        filtered_files = []
        for f in all_files:
            match = re.match(r'^\[(.*?)\]', f)
            origen = match.group(1) if match else "Desconocido"
            if origen == filtro_origen:
                filtered_files.append(f)
        archivos = filtered_files
    else:
        archivos = all_files
    
    inicio = (page - 1) * limit
    fin = inicio + limit
    lote_archivos = archivos[inicio:fin]
    
    resultados = []
    
    # Importar re dentro de la funcion o asegurar que esta arriba (ya esta usado arriba)
    import re
    
    for filename in lote_archivos:
        ruta = os.path.join(carpeta_destino, filename)
        
        # Extraer origen del nombre de archivo
        origen_match = re.match(r'^\[(.*?)\]', filename)
        origen = origen_match.group(1) if origen_match else "Desconocido"

        try:
            if filename.lower().endswith('.json'):
                # Cargar datos manuales directamente
                with open(ruta, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                # Asegurar campos minimos
                data["archivo"] = filename
                if "origen" not in data:
                    data["origen"] = origen
                data["status"] = "success"
                resultados.append(data)
            else:
                # Es PDF, usar extractor
                data = extraer_datos_infalible(ruta)
                data["archivo"] = filename
                data["origen"] = origen  # Añadimos el dato al objeto
                data["status"] = "success"
                resultados.append(data)
        except Exception as e:
            resultados.append({"archivo": filename, "origen": origen, "status": "error", "error_msg": str(e)})
            
    return resultados

@app.get("/api/resumen")
def obtener_resumen_financiero():
    resumen = []
    gran_total = 0.0
    
    # Global accumulators if needed, but per-category is primary
    
    for categoria in CATEGORIAS:
        carpeta_cat = os.path.join(CARPETA_FACTURAS, categoria)
        
        # Totales por Categoria
        total_cat = 0.0
        count_cat = 0
        
        # Desglose
        total_centrales = 0.0
        count_centrales = 0
        total_campo = 0.0
        count_campo = 0
        
        if os.path.exists(carpeta_cat):
            archivos = [f for f in os.listdir(carpeta_cat) if f.lower().endswith('.pdf') or f.lower().endswith('.json')]
            count_cat = len(archivos)
            
            for archivo in archivos:
                ruta_completa = os.path.join(carpeta_cat, archivo)
                try:
                    # Determinamos Origen
                    es_campo = False
                    if "[Campo]" in archivo:
                        es_campo = True
                    
                    # Extraemos datos
                    datos = {}
                    if archivo.lower().endswith('.json'):
                        with open(ruta_completa, 'r', encoding='utf-8') as f:
                            datos = json.load(f)
                            # Confiar en el JSON si existe el campo, sino fallback al nombre
                            if datos.get("origen") == "Campo":
                                es_campo = True
                            elif datos.get("origen") == "Centrales":
                                es_campo = False
                    else:
                        datos = extraer_datos_infalible(ruta_completa)
                    
                    # Determinamos monto
                    monto_str = datos.get("subtotal")
                    # Fallback a total_neto si subtotal no existe (nómina etc)
                    if not monto_str:
                        monto_str = datos.get("total_neto")

                    monto_val = 0.0
                    if monto_str:
                        clean_num = monto_str.replace("$", "").replace(",", "").strip()
                        try:
                            monto_val = float(clean_num)
                        except:
                            monto_val = 0.0
                    
                    # Acumulamos
                    if es_campo:
                        total_campo += monto_val
                        count_campo += 1
                    else:
                        total_centrales += monto_val
                        count_centrales += 1
                        
                    total_cat += monto_val
                    
                except Exception as e:
                    print(f"Error procesando monto de {archivo}: {e}")
        
        gran_total += total_cat
        resumen.append({
            "categoria": categoria,
            "cantidad_facturas": count_cat,
            "total": round(total_cat, 2),
            "centrales": {
                "cantidad": count_centrales,
                "total": round(total_centrales, 2)
            },
            "campo": {
                "cantidad": count_campo,
                "total": round(total_campo, 2)
            }
        })

    return {
        "detalles": resumen,
        "gran_total": round(gran_total, 2)
    }

class ManualInvoiceRequest(BaseModel):
    folio_fiscal: str = None
    rfc_emisor: str = None
    rfc_receptor: str = None
    nombre_emisor: str = None
    nombre_receptor: str = None
    puesto: str = None
    subtotal: str = "0.00"
    total_deducciones: str = "0.00"
    total_neto: str = "0.00"
    categoria: str = "General"
    origen: str = "Centrales"

@app.post("/api/manual")
def crear_factura_manual(req: ManualInvoiceRequest):
    carpeta_destino = os.path.join(CARPETA_FACTURAS, req.categoria)
    if not os.path.exists(carpeta_destino):
        os.makedirs(carpeta_destino)
    
    # Generar un nombre de archivo único pero descriptivo
    # [Origen] Manual - UUID.json
    ui_uuid = str(uuid.uuid4())[:8]
    filename = f"[{req.origen}] Manual - {ui_uuid}.json"
    ruta_completa = os.path.join(carpeta_destino, filename)
    
    # Preparar objeto de datos compatible con el extractor
    datos = req.dict()
    # Limpiamos campos extras que no van en el JSON de almacenamiento puro si quisieramos,
    # pero guardarlo todo está bien.
    
    try:
        with open(ruta_completa, 'w', encoding='utf-8') as f:
            json.dump(datos, f, ensure_ascii=False, indent=2)
        return {"status": "success", "archivo": filename, "data": datos}
    except Exception as e:
        return {"status": "error", "message": str(e)}



class UpdateOrigenRequest(BaseModel):
    filename: str
    categoria: str
    new_origen: str

@app.post("/api/actualizar_origen")
def actualizar_origen(req: UpdateOrigenRequest):
    carpeta_cat = os.path.join(CARPETA_FACTURAS, req.categoria)
    ruta_old = os.path.join(carpeta_cat, req.filename)
    
    # Check if file exists
    if not os.path.exists(ruta_old):
        # Fallback: Maybe it doesn't have the tag yet? Or tag mismatch?
        # Try finding the file by ignoring tag in directory
        import re
        try:
            target_clean = re.sub(r'^\[.*?\]\s*', '', req.filename)
            candidates = [f for f in os.listdir(carpeta_cat) if re.sub(r'^\[.*?\]\s*', '', f) == target_clean]
            if candidates:
                ruta_old = os.path.join(carpeta_cat, candidates[0])
                req.filename = candidates[0] # Update for renaming logic
            else:
                return {"status": "error", "message": f"Archivo no encontrado: {req.filename}"}
        except Exception:
             return {"status": "error", "message": f"Archivo no encontrado: {req.filename}"}
        
    # Crear nuevo nombre
    import re
    clean_name = re.sub(r'^\[.*?\]\s*', '', req.filename)
    new_filename = f"[{req.new_origen}] {clean_name}"
    ruta_new = os.path.join(carpeta_cat, new_filename)
    
    # Si el nombre es el mismo, no hacemos nada
    if ruta_old == ruta_new:
         return {"status": "success", "new_filename": new_filename}

    try:
        os.rename(ruta_old, ruta_new)
        return {"status": "success", "new_filename": new_filename}
    except Exception as e:
        return {"status": "error", "message": str(e)}

class DeleteFileRequest(BaseModel):
    filename: str
    categoria: str

@app.post("/api/eliminar")
def eliminar_factura(req: DeleteFileRequest):
    carpeta_cat = os.path.join(CARPETA_FACTURAS, req.categoria)
    ruta_archivo = os.path.join(carpeta_cat, req.filename)
    
    if not os.path.exists(ruta_archivo):
         # Try finding by clean name similarity in case of race/rename?
         # For deletion, better be strict or it's dangerous.
         return {"status": "error", "message": "Archivo no encontrado"}

    try:
        os.remove(ruta_archivo)
        return {"status": "success", "message": f"Archivo {req.filename} eliminado"}
    except Exception as e:
        return {"status": "error", "message": str(e)}

class EditInvoiceRequest(ManualInvoiceRequest):
    filename: str # The original filename to replace/update

@app.post("/api/editar")
def editar_factura(req: EditInvoiceRequest):
    carpeta_cat = os.path.join(CARPETA_FACTURAS, req.categoria)
    ruta_old = os.path.join(carpeta_cat, req.filename)
    
    # 1. Check existence
    if not os.path.exists(ruta_old):
         return {"status": "error", "message": "Archivo original no encontrado"}

    # 2. Determine new filename (JSON)
    # If it was PDF, we are effectively converting it to Manual (JSON)
    # If it was already JSON, we just overwrite (or rename if origin changed)
    
    import re
    is_json = req.filename.lower().endswith('.json')
    
    if is_json:
        # Regex to strip [Tag]
        rest_of_name = re.sub(r'^\[.*?\]\s*', '', req.filename)
        new_filename = f"[{req.origen}] {rest_of_name}"
        ruta_new = os.path.join(carpeta_cat, new_filename)
        
        # Update content
        datos = req.dict()
        del datos['filename'] # Don't store this in the file content
        
        try:
            with open(ruta_new, 'w', encoding='utf-8') as f:
                json.dump(datos, f, ensure_ascii=False, indent=2)
                
            if ruta_old != ruta_new:
                os.remove(ruta_old)
                
            return {"status": "success", "archivo": new_filename}
            
        except Exception as e:
            return {"status": "error", "message": str(e)}

    else:
        # It's a PDF (or other). We are "Converting" to Manual JSON.
        clean_name_no_ext = os.path.splitext(re.sub(r'^\[.*?\]\s*', '', req.filename))[0]
        new_filename = f"[{req.origen}] {clean_name_no_ext}.json"
        ruta_new = os.path.join(carpeta_cat, new_filename)
        
        datos = req.dict()
        del datos['filename']
        
        try:
            with open(ruta_new, 'w', encoding='utf-8') as f:
                json.dump(datos, f, ensure_ascii=False, indent=2)
            
            # Remove original PDF
            os.remove(ruta_old)
            
            return {"status": "success", "archivo": new_filename}
        except Exception as e:
             return {"status": "error", "message": str(e)}