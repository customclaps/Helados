import { extrusions, transforms } from '@jscad/modeling'
import { jscad2Obj3d, path2Jscad } from './objs3d'
import { deserializers } from '@jscad/io'
import * as THREE from 'three'
import { union } from '@jscad/modeling/src/operations/booleans';

const hueco = 4
const base = 2
const Herradura = 8
function extrTrans(pos, extr, path) {
    const svgText = `
    <svg>
      <path d="${path}" fill="#000"/>
    </svg>`
    const svg = deserializers.svg({ output: "geometry", target: "geom2" }, svgText)

    const fixed3 = {
        ...svg[0],
        sides: svg.reduce((acc, obj) => acc.concat(obj.sides), [])
    }
    const extrude = extrusions.extrudeLinear({ height: extr }, fixed3)
    var trans = transforms.translate([0, 0, pos], extrude)

    return trans
}

let Objs = []
function GenerarObj3d(propsData) {
    propsData.forEach((obj, key) => {
        switch (obj.formas.tipo) {
            case 0: {
                const etapa0 = extrTrans(0, base, obj.formas.etapas[0])
                const etapa1 = extrTrans(base, Herradura, obj.formas.etapas[1])
                const unionEtapa01 = union(etapa0, etapa1)
                const etapas = jscad2Obj3d(unionEtapa01)
                Objs.push(<primitive object={etapas} position={[0, 0, base * obj.pos]} key={key} />)

            }
                break
            case 1:
                {
                    const etapa0 = extrTrans(0, base, obj.formas.etapas[0])
                    const etapa1 = extrTrans(base, hueco, obj.formas.etapas[1])
                    const etapa2 = extrTrans(base + hueco, Herradura - base - hueco, obj.formas.etapas[2])
                    const unionEtapa012 = union(etapa0, etapa1, etapa2)
                    const etapas = jscad2Obj3d(unionEtapa012)
                    Objs.push(<primitive object={etapas} position={[0, 0, base * obj.pos]} key={key} />)
                }
                break;
            case 2: {
                const etapa0 = extrTrans(0, base, obj.formas.etapas[0])
                const etapa1 = extrTrans(base, hueco, obj.formas.etapas[1])
                const etapa2 = extrTrans(base + hueco, Herradura - base - hueco, obj.formas.etapas[2])
                const unionEtapa012 = union(etapa0, etapa1, etapa2)
                const etapas = jscad2Obj3d(unionEtapa012)
                Objs.push(<primitive object={etapas} position={[0, 0, base * obj.pos]} key={key} />)
            }

                break;



        }
    })
    return (
        <>

            {Objs}
        </>
    )

}
export default GenerarObj3d;