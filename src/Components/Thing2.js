import { extrusions, booleans, transforms } from '@jscad/modeling'
import React, { useEffect, useRef } from 'react';
import { jscad2Obj3d, path2Jscad } from './objs3d/objs3d'
import { deserializers } from '@jscad/io'
import * as THREE from 'three'
import { union } from '@jscad/modeling/src/operations/booleans';
let object3d, center
function Thing2({ propData }) {
  const svgText3 = `
  <svg>
    <path d="${propData.get(1).formas.etapas[0]}" fill="#000"/>
  </svg>`
  const svg3 = deserializers.svg({ output: "geometry", target: "geom2" }, svgText3)

  const fixed3 = {
    ...svg3[0],
    sides: svg3.reduce((acc, obj) => acc.concat(obj.sides), [])
  }
  const etapa0 = extrusions.extrudeLinear({ height: 1 }, fixed3)
  // var obj3trans = transforms.translate([0, 0, 30], obj3);


  const svgText1 = `
    <svg>
      <path d="${propData.get(1).formas.etapas[1]}" fill="#000"/>
    </svg>`
  const svg = deserializers.svg({ output: "geometry", target: "geom2" }, svgText1)

  // concatenate all sides together
  const fixed1 = {
    ...svg[0],
    sides: svg.reduce((acc, obj) => acc.concat(obj.sides), [])
  }

  // extrude
  const etapa1 = extrusions.extrudeLinear({ height: 2 }, fixed1)
  var etapa1Trans = transforms.translate([0, 0, 1], etapa1)

  const svgText2 = `
  <svg>
  <path d="${propData.get(1).formas.etapas[2]}" fill="#000"/>
  </svg>`
  const svg2 = deserializers.svg({ output: "geometry", target: "geom2" }, svgText2).reverse()

  // concatenate all sides together
  const fixed2 = {
    ...svg2[0],
    sides: svg2.reduce((acc, obj) => acc.concat(obj.sides), [])
  }

  // extrude
  const etapa2 = extrusions.extrudeLinear({ height: 3 }, fixed2)
  //  const unionObj=union(obj3,obj1result,obj2)
  var etapa2Trans = transforms.translate([0, 0, 3], etapa2)

  const unionEtapa012 = union(etapa0, etapa1Trans, etapa2Trans)

  // const object3d = jscad2Obj3d(obj3trans)
  // const etapa03d = jscad2Obj3d(etapa0)
  // const object3d3 = jscad2Obj3d(obj2)
  const etapas = jscad2Obj3d(unionEtapa012)

  // Calcula el centro de la geometría extruida
  // const bbox = new THREE.Box3().setFromObject(object3d);
  // const center = new THREE.Vector3();




  // bbox.getCenter(center);
  // object3d.position.x = -center.x;
  // object3d.position.y = -center.y;
  // object3d.position.z = -center.z;


  return (
    <>
      <axesHelper args={[50]} />
      <gridHelper args={[10, 10, 'hotpink', 'gray']} />
      <primitive object={etapas} />
      {/* <primitive object={etapa03d} /> */}
      {/* <primitive object={object3d3} /> */}

    </>
  );
}

export default Thing2;