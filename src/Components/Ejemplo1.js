import { offsetPathF, traceBooleanF, ConvertP, ConvertS } from './Utils/Convert';
import { CalculaMatriz } from './Tools3/BuscaUbicaciones';
import React, { useState } from 'react';
import { fabric } from 'fabric'
import { useFabricJSEditor, FabricJSCanvas } from 'fabricjs-react'
import { SVG2 } from './Utils/SVG'
import traceBoolean from './Utils/traceBoolean'
const Colores = ["red", "blue", "green", "yellow", "orange", "purple"];

function Ejemplo1(props) {
    const { onReady, editor } = useFabricJSEditor()
    const [sel, setSel] = useState(null)
    const [indice, setIndice] = useState(null)

    const handleSelection = (event) => {
        if (event.selected?.length === 1) {
            var selectedObject = event.selected[0];
            setSel(selectedObject)
            const objetos = event.selected[0].canvas.getObjects()
            setIndice(objetos.indexOf(selectedObject))
        }
        else {
            setIndice(null)
            setSel(null)
        }
    }
    const _onReady = (canvas) => {
        canvas.on('selection:created', (event) => {
            handleSelection(event);
        });

        canvas.on('selection:cleared', (event) => {
            handleSelection(event)
        })
        // Evento que se dispara cuando la selección actual se actualiza (por ejemplo, agregando más objetos a la selección)
        canvas.on('selection:updated', (event) => {
            handleSelection(event);
        });

        canvas.setDimensions({ width: 600, height: 300, preserveObjectStacking: true })
        let Colors = Colores.slice(0, 5)
        Colors.forEach((Color, index) => {
            const obj = new fabric.Path(SVG2, { fill: Color, left: index * 50 })
            const result1 = offsetPathF(obj, 4, 'miter')
            const local = new fabric.Path(result1.getPathData(), { fill: 'white', stroke: 'black' })

            obj.set({ nombre: 'in' })
            local.set({ nombre: 'out' })
            const contornoText = traceBooleanF(local, obj, 'subtract')
            const contorno = new fabric.Path(contornoText.getPathData(), { fill: 'white', stroke: 'black' })
            contorno.set({ nombre: 'contorno' })

            const group = new fabric.Group([local, obj, contorno], { tipo: 'figura' });


            canvas.add(group)
        })
        canvas.renderAll()
        onReady(canvas)
    }
    const Calcula = () => {
        const Ma = CalculaMatriz(editor.canvas.getObjects())
        const Objetos = editor.canvas.getObjects()

        Ma.forEach((objeto, index) => {
            let jsonFormas = {}
            const _contorno = ConvertP(Objetos[index]._objects.filter(o => o.nombre === 'contorno')[0])

            if (objeto.down.length && objeto.up.length) {
                let etapa2 = _contorno
                objeto.up.forEach(obj => {
                    const _out = ConvertP(Objetos[obj]._objects.filter(o => o.nombre === 'out')[0])
                    etapa2 = traceBoolean(etapa2, _out, 'subtract')
                })


                let etapa1 = etapa2

                objeto.down.forEach(obj => {
                    const _in = ConvertP(Objetos[obj]._objects.filter(o => o.nombre === 'in')[0])
                    etapa1 = traceBoolean(etapa1, _in, 'subtract')
                })
                console.log(etapa1)
                jsonFormas = { tipo: 1, etapas: [_contorno.getPathData(), etapa1.getPathData(), etapa2.getPathData()] }
            }
            else if (!objeto.down.length && objeto.up.length) {
                let etapa1 = _contorno
                objeto.up.forEach(obj => {
                    const _out = ConvertP(Objetos[obj]._objects.filter(o => o.nombre === 'out')[0])
                    etapa1 = traceBoolean(etapa1, _out, 'subtract')
                })

                // console.log(resul)
                jsonFormas = { tipo: 0, etapas: [_contorno.getPathData(), etapa1.getPathData()] }
                
            }
            else if (objeto.down.length && !objeto.up.length) {
                let etapa1 = _contorno
                objeto.down.forEach(obj => {
                    const _in = ConvertP(Objetos[obj]._objects.filter(o => o.nombre === 'in')[0])
                    etapa1 = traceBoolean(etapa1, _in, 'subtract')
                })
                jsonFormas = { tipo: 2, etapas: [_contorno.getPathData(), etapa1.getPathData()] }

            }

            else{
                jsonFormas = { tipo: 3, etapas: [_contorno.getPathData()] }

            }
        
        objeto.formas=jsonFormas
        
        })
        console.log(Ma)
    }
    const Top = () => {
        sel.bringToFront()
    }
    const Down = () => {
        sel.sendToBack()
    }
    const MasUno = () => {
        sel.bringForward()
    }
    const MenosUno = () => {
        sel.sendBackwards()
    }
    const Grabar = () => {
        var json = editor.canvas.toJSON();
        var jsonAsString = JSON.stringify(json);

        // Guardar la cadena JSON en localStorage
        localStorage.setItem('canvasState', jsonAsString);
    }
    return (
        <div>
            <FabricJSCanvas onReady={_onReady} />
            <p>{indice}</p>
            <button onClick={Top} disabled={!(!!sel)}>Top</button>
            <button onClick={MasUno} disabled={!(!!sel)}>+1</button>
            <button onClick={MenosUno} disabled={!(!!sel)}>-1</button>
            <button onClick={Down} disabled={!(!!sel)}>Down</button>
            <button onClick={Calcula}>CALCULA</button>
            <button onClick={Grabar}>GRABAR</button>
        </div>
    );
}

export default Ejemplo1;