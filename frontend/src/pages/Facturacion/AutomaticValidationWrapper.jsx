import React, { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import AutomaticValidation from './AutomaticValidation'

const AutomaticValidationWrapper = () => {
    const { key } = useParams()
    const [title, setTitle] = useState("Cargando...")

    // We could fetch the full structure here to get the correct "name" or just derive it
    // For simplicity, let's just make a generic title or fetch the structure if strictly needed for the exact "a. Name"
    // But usually the key is enough for the component to function. The title is just cosmetic.

    // Let's try to fetch structure to get the nice name "a. Papelería..."
    useEffect(() => {
        const fetchTitle = async () => {
            try {
                const res = await fetch('/api/structure')
                const structure = await res.json()

                // Find deeply
                let foundName = key
                const find = (items) => {
                    for (let item of items) {
                        if (item.key === key) return item.name
                        if (item.subItems) {
                            const found = find(item.subItems)
                            if (found) return found
                        }
                    }
                    return null
                }

                const name = find(structure)
                if (name) setTitle(`Gastos de Oficina / ${name}`)
                else setTitle(`Gastos de Oficina / ${key}`)

            } catch (e) {
                console.error(e)
                setTitle(`Gastos de Oficina / ${key}`)
            }
        }
        fetchTitle()
    }, [key])

    // Force remount when key changes by using key as key prop
    return <AutomaticValidation key={key} categoria={key} title={title} />
}

export default AutomaticValidationWrapper
