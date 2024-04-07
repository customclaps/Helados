import * as THREE from 'three'
import { CSGToBuffers } from './CSGToBuffers'
import buffersToObject3D from './BuffersToObject3D'
import { deserializers, serializers } from '@jscad/io'
import { Object3D } from 'three'

export function path2Jscad(path) {
const  svgText = `   <svg><path d="${path}"/></svg>`
    const svg = deserializers.svg({ output: "geometry", target: "geom" }, svgText)
    // concatenate all sides together
    const fixed = {
        ...svg[0],
        sides: svg.reduce((acc, obj) => acc.concat(obj.sides), [])
    }
    return fixed
}
export function jscad2Obj3d(obj) {

    const buffers = CSGToBuffers(obj)
    const object3d = buffersToObject3D(buffers)
    object3d.material = new THREE.MeshNormalMaterial() // Usando MeshBasicMaterial
    object3d.material.flatShading = true
    return object3d
}

// module.exports ={ jscad2Obj3d, path2Jscad}