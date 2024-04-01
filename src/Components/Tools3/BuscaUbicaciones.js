import EncuentraCiclos from './ToolsCiclos';
import filtrarUnicasConRotacionesYInversas from './EliminaSecuencia';
import BuscaIncongruencias from './BuscaIncongruencias';
import CalcularPosiciones from './CalculaPosiciones'
import BuscarRamas from './BuscarRamas'
import { fastIntersect } from '../Utils/traceBoolean';

export function CalculaMatriz(ArrayCanvas) {

    const MapObjetos = new Map()
    const Objetos = ArrayCanvas.filter(objeto => objeto.tipo === 'figura')
    Objetos.forEach((fila, indiceFila) => {

        const jsonVacio = { up: [], down: [] }
        // if (fila.tipo === 'figura') {
        Objetos.forEach((columna, indicieColumna) => {

            if (indiceFila !== indicieColumna) {

                const _fila = fila._objects.filter(o => o.nombre === 'out')[0]
                const _columna = columna._objects.filter(o => o.nombre === 'out')[0]

                if (fastIntersect(_fila, _columna)) {
                    if (indicieColumna < indiceFila) {
                        jsonVacio.down.push(indicieColumna)
                    }
                    else {
                        jsonVacio.up.push(indicieColumna)
                    }
                    MapObjetos.set(indiceFila, jsonVacio)
                }

            }
        })





    })
    return BuscaUbicaciones(MapObjetos)


}

export default function BuscaUbicaciones(MapObjetos) {
    let TodoOk
    do {
        TodoOk = true
        const ramas = BuscarRamas(MapObjetos)

        const CiclosSinFiltrar = EncuentraCiclos(ramas, MapObjetos)
        const Ciclos = filtrarUnicasConRotacionesYInversas(CiclosSinFiltrar)

        for (const Ciclo of Ciclos) {
            if (!BuscaIncongruencias(Ciclo, MapObjetos)) {
                TodoOk = false
                break
            }
        }

    } while (!TodoOk)

    return CalcularPosiciones(MapObjetos)
}