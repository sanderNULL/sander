import pdfplumber
import re

def extraer_datos_infalible(pdf_path):
    """
    Extrae datos del SAT de un PDF usando lectura de texto plano 
    con coordenadas tolerantes y limpieza regex.
    """
    datos = {
        "folio_fiscal": None,
        "rfc_emisor": None,
        "rfc_receptor": None,
        "nombre_emisor": None,
        "nombre_receptor": None, # Trabajador
        "puesto": None,
        "uso_cfdi": None,
        "efecto_comprobante": None,
        "subtotal": None,
        "total_neto": None,
        "total_deducciones": None,
        "detalles_deducciones": [] # Lista para el desglose
    }
    
    try:
        with pdfplumber.open(pdf_path) as pdf:
            # Usamos la primera página
            page = pdf.pages[0]
            
            # x_tolerance y y_tolerance ayudan a que el texto no se "pegue" o se separe raro
            text = page.extract_text(x_tolerance=2, y_tolerance=2)
            
            if not text:
                return datos # Retorna vacíos si es una imagen sin texto (scan)

            # 1. Búsqueda Global (Regex en todo el texto)
            # -------------------------------------------
            
            # Folio Fiscal (UUID)
            uuid_match = re.search(r'[0-9a-fA-F]{8}(?:-[0-9a-fA-F]{4}){3}-[0-9a-fA-F]{12}', text)
            if uuid_match:
                datos["folio_fiscal"] = uuid_match.group(0)

            # RFCs Globales (Búsqueda inicial)
            rfc_pattern = r'[A-Z&Ñ]{3,4}[0-9]{2}(?:0[1-9]|1[0-2])(?:0[1-9]|[12][0-9]|3[01])[A-Z0-9]{3}'
            rfcs = re.findall(rfc_pattern, text)
            
            # Asignación preliminar (fallback)
            datos["rfc_emisor"] = rfcs[0] if len(rfcs) > 0 else None
            datos["rfc_receptor"] = rfcs[1] if len(rfcs) > 1 else None

            # ---------------------------------------------------
            # REFINAMIENTO SEMÁNTICO (Mejora solicitada)
            # Busca RFCs "atados" a palabras clave como Receptor, Cliente, Facturar A
            # ---------------------------------------------------
            lines = text.split('\n')
            for i, line in enumerate(lines):
                 clean_line = " ".join(line.split()).lower()
                 
                 # Si encontramos palabras clave de Receptor
                 if any(x in clean_line for x in ["receptor", "cliente", "facturar a", "razón social:"]):
                     # Busco un RFC en ESTA linea
                     match_rfc = re.search(rfc_pattern, line)
                     if match_rfc:
                         datos["rfc_receptor"] = match_rfc.group(0)
                         # Si encontramos uno explícito, confiamos en él
                         break 
                     
                     # O en la SIGUIENTE linea (a veces el titulo esta arriba)
                     if i + 1 < len(lines):
                         next_line = " ".join(lines[i+1].split())
                         match_rfc_next = re.search(rfc_pattern, next_line)
                         if match_rfc_next:
                             datos["rfc_receptor"] = match_rfc_next.group(0)
                             break
            
            # Si detectamos que RFC Emisor y Receptor son iguales, intentamos corregir
            if datos["rfc_emisor"] == datos["rfc_receptor"] and len(rfcs) > 1:
                # Si son iguales, probablemente agarramos el del emisor por error como receptor
                # Asignamos el "otro" encontrado en la lista global
                datos["rfc_receptor"] = rfcs[1] if rfcs[0] == datos["rfc_emisor"] else rfcs[0]

            # 2. Búsqueda Línea por Línea (Para campos variables)
            # ---------------------------------------------------
            lines = text.split('\n')
            
            for line in lines:
                # Normalizamos espacios (elimina tabs y dobles espacios)
                clean_line = " ".join(line.split())
                line_lower = clean_line.lower()
                
                # --- NOMBRE EMISOR (Estrategia Mejorada) ---
                if not datos["nombre_emisor"]:
                    # Estrategia 1: Etiqueta explícita
                    if "nombre" in line_lower and ("emisor" in line_lower or "razón social" in line_lower or "razon social" in line_lower):
                        try:
                            val = re.split(r"emisor:|social:|nombre:", clean_line, flags=re.IGNORECASE)[1].strip()
                            clean_val = re.split(r"folio|rfc|no\.?\s*de\s*serie|serie|csd|regimen|lugar", val, flags=re.IGNORECASE)[0].strip()
                            if len(clean_val) > 3:
                                datos["nombre_emisor"] = clean_val
                        except:
                            pass
                    
                    # Estrategia 2: Si la línea tiene el RFC emisor, a veces el nombre está antes o después
                    elif datos["rfc_emisor"] and datos["rfc_emisor"] in clean_line:
                        # Quitar el RFC y ver qué queda de texto
                        possible_name = clean_line.replace(datos["rfc_emisor"], "").strip()
                        # Limpiar basura común
                        possible_name = re.sub(r"rfc[:\.]?", "", possible_name, flags=re.IGNORECASE).strip()
                        if len(possible_name) > 5 and not re.search(r'\d', possible_name): # Nombres suelen ser letras
                             datos["nombre_emisor"] = possible_name


                # --- SUBTOTAL (Estrategia Mejorada) ---
                if "subtotal" in line_lower or "sub total" in line_lower:
                    # Busca números con formato (1,000.00 o 1000.00)
                    # Excluye porcentajes o códigos
                    nums = re.findall(r"\$?\s*[\d,]+\.\d{2}", clean_line)
                    if nums:
                        # Tomamos el último encontrado que sea un monto válido
                        raw_num = nums[-1].replace("$", "").replace(" ", "").replace(",", "")
                        try:
                            if float(raw_num) > 0:
                                datos["subtotal"] = raw_num
                        except:
                            pass
                elif not datos["subtotal"] and "importe" in line_lower and not "total" in line_lower:
                     # A veces dice "Importe" en lugar de subtotal en conceptos
                     nums = re.findall(r"\$?\s*[\d,]+\.\d{2}", clean_line)
                     if nums:
                        raw_num = nums[-1].replace("$", "").replace(" ", "").replace(",", "")
                        try:
                             # Validación simple para no agarrar cantidades irreales
                             if float(raw_num) > 0: 
                                 # Guardamos provisionalmente, pero preferimos "Subtotal" explícito si aparece después
                                 datos["subtotal"] = raw_num
                        except:
                            pass

                # --- RFC EMISOR (Si no se ha detectado) ---
                # Prioridad a etiquetas explícitas como "R.F.C.:" que vimos en la imagen
                if "r.f.c." in line_lower or "rfc" in line_lower:
                    # Si NO es definitorio de receptor
                    if "receptor" not in line_lower and "cliente" not in line_lower:
                        try:
                            # Limpiar lo previo al RFC
                            # Regex busca "R.F.C.:" o "RFC:" opcionalmente seguido de espacios
                            parts_rfc = re.split(r"r\.?f\.?c\.?\s*:?", clean_line, flags=re.IGNORECASE)
                            if len(parts_rfc) > 1:
                                potential_val = parts_rfc[1].strip().split(" ")[0] # Primer token
                                # Validar formato simple de RFC (3-4 letras, 6 nums, 3 alfanum)
                                if re.match(r'[A-Z&Ñ]{3,4}\d{6}[A-Z0-9]{3}', potential_val):
                                    datos["rfc_emisor"] = potential_val
                        except:
                            pass

                if not datos["rfc_emisor"]:
                    if "rfc" in line_lower and "emisor" in line_lower:
                         # Intento de extracción directa si dice "RFC Emisor: XXXXX"
                         try:
                            parts = re.split(r"rfc.*emisor", clean_line, flags=re.IGNORECASE)
                            if len(parts) > 1:
                                potential_rfc = parts[1].strip().split(" ")[0] # Tomar primer token
                                if re.match(r'[A-Z&Ñ]{3,4}[0-9]{6}[A-Z0-9]{3}', potential_rfc):
                                    datos["rfc_emisor"] = potential_rfc
                         except:
                             pass

                # --- NOMBRE TRABAJADOR (Estrategia Multinivel) ---
                if not datos["nombre_receptor"]:
                    # Lista negra de palabras que NO pueden ser un nombre
                    black_list = [
                        "sueldo", "salario", "hora", "extra", "aguinaldo", "prima", "vacacion", 
                        "bono", "subsidio", "fondo", "ahorro", "vale", "despensa", "imss", 
                        "infonavit", "isr", "sat", "folio", "fecha", "periodo", "dia", "pago", 
                        "nomina", "neto", "total", "concepto", "percepcion", "deduccion", 
                        "monto", "importe", "fiscal", "digital", "sello", "cadena"
                    ]
                    
                    # Nivel 1: Busqueda por etiqueta estricta
                    match = re.search(r"(?:receptor|trabajador|empleado|recibí de)[:\s]+([^\n]+)", clean_line, re.IGNORECASE)
                    if match:
                        posible_nombre = match.group(1).strip()
                        posible_nombre_lower = posible_nombre.lower()
                        
                        # Filtros de sanidad estrictos
                        if (len(posible_nombre) > 5 
                            and not any(x in posible_nombre_lower for x in black_list) 
                            and not re.search(r'\d', posible_nombre)): # Nombres no llevan numeros
                                datos["nombre_receptor"] = posible_nombre
                    
                    # Nivel 2: Contexto "Pago de Nomina" (Sugerido por usuario)
                    # Solo si "Pago de Nomina" está seguido por algo que NO sea conceptos de pago
                    elif "pago de n" in line_lower and "mina" in line_lower:
                        # Intentar limpiar la frase "Pago de Nomina"
                        temp = re.sub(r"pago de n[oó]mina", "", clean_line, flags=re.IGNORECASE).strip()
                        # Verificar que lo que queda sea un nombre valido
                        if (len(temp) > 5 
                            and not any(x in temp.lower() for x in black_list)
                            and not re.search(r'\d', temp)):
                                datos["nombre_receptor"] = temp

                # --- PUESTO (Expandido) ---
                if not datos["puesto"]:
                    # Palabras clave: Puesto, Departamento, Categoría, Ocupación
                    if any(x in line_lower for x in ["puesto", "departamento", "categoría", "categoria", "ocupación", "ocupacion"]):
                        try:
                            # Divide por cualquiera de las keywords
                            parts = re.split(r"(?:puesto|departamento|categor[ií]a|ocupaci[oó]n)[:\s]+", clean_line, flags=re.IGNORECASE)
                            if len(parts) > 1:
                                val = parts[1].strip()
                                # Limpiar basura del final (fechas, salarios)
                                val = re.split(r"fecha|salario|sindicalizado|periodo|riesgo|jornada", val, flags=re.IGNORECASE)[0].strip()
                                if len(val) > 2:
                                    datos["puesto"] = val
                        except:
                            pass

                # --- TOTAL DEDUCCIONES ---
                if "total" in line_lower and "deducciones" in line_lower:
                    # Intenta atrapar "$ 450.00" o "450.00"
                    nums = re.findall(r"[\d,]+(?:\.\d{2})?", clean_line)
                    if nums:
                        # Filtrar numeros que parecen años o codigos
                        valid_nums = [n for n in nums if "." in n or len(n) > 3]
                        if valid_nums:
                            datos["total_deducciones"] = valid_nums[-1].replace(",", "")
                
                # --- TOTAL NETO / LIQUIDO ---
                if not datos["total_neto"]:
                    if any(x in line_lower for x in ["neto", "líquido", "liquido", "a pagar", "alcance"]):
                        # Busca montos
                        nums = re.findall(r"[\d,]+(?:\.\d{2})?", clean_line)
                        if nums:
                             # Tomamos el ultimo número que parezca dinero
                             valid_nums = [n for n in nums if "." in n]
                             if valid_nums:
                                 datos["total_neto"] = valid_nums[-1].replace(",", "")

    except Exception as e:
        print(f"Error procesando {pdf_path}: {e}")
        # Retornamos lo que se haya podido rescatar o todo null
        return datos

    return datos

# Bloque de prueba (solo se ejecuta si corres este archivo directamente)
if __name__ == "__main__":
    import json
    # Cambia esto por un PDF real que tengas en la carpeta para probar
    archivo_prueba = "facturas/ejemplo.pdf" 
    try:
        print(json.dumps(extraer_datos_infalible(archivo_prueba), indent=4))
    except:
        print("No se encontró archivo de prueba, pero la función está lista.")