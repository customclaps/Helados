// Created by Davor Hrg http://hrg.hr
// From: http://3d.hrg.hr/jscad/three/CSG2Object3D.js
// Via: https://openjscad.nodebb.com/topic/308/embedding-a-design-in-a-website?_=1633726553442&lang=en-GB
import * as THREE from 'three'

const flatShading = true
const materials = {
  mesh: {
    def: new THREE.MeshPhongMaterial({ color: 0x0084d1, flatShading }),
    make: (params) => new THREE.MeshPhongMaterial({ flatShading, ...params })
  },
  line: {
    def: new THREE.LineBasicMaterial({ color: 0x0000ff }),
    make: ({ color, opacity, transparent }) => new THREE.LineBasicMaterial({ color, opacity, transparent })
  },
  lines: null
}
materials.lines = materials.line

function CSG2Object3D(obj) {
  const { vertices, indices, color, transforms } = obj

  let materialDef = materials[obj.type]
  let material = materialDef.def
  let isInstanced = obj.type == 'instances'
  if (color && !isInstanced) {
    let c = color
    material = materialDef.make({
      color: CSG2Object3D.makeColor(color),
      flatShading,
      opacity: c[3] === void 0 ? 1 : c[3],
      transparent: c[3] != 1 && c[3] !== void 0
    })
  }

  var geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.BufferAttribute(vertices, 3))

  var mesh
  switch (obj.type) {
    case 'mesh':
      geo.setIndex(new THREE.BufferAttribute(indices, 1))
      mesh = new THREE.Mesh(geo, material)
      break
    case 'instances':
      geo.setIndex(new THREE.BufferAttribute(indices, 1))
      mesh = new THREE.InstancedMesh(geo, materials.mesh.make({ color: 0x0084d1 }))
      transforms = null
      break
    case 'line':
      mesh = new THREE.Line(geo, material)
      break
    case 'lines':
      mesh = new THREE.LineSegments(geo, material)
      break
  }
  if (transforms && !isInstanced) mesh.applyMatrix4({ elements: transforms })
  return mesh
}

CSG2Object3D.makeColor = (c) => new THREE.Color(c[0], c[1], c[2])
// CSG2Object3D.materials = materials

// module.exports = CSG2Object3D
export default  CSG2Object3D
