import React, { useEffect } from 'react';
import { Canvas } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import GenerarObj3d from './objs3d/GenerarObj3d';

import Thing2 from './Thing2';

function ThreeObjects({propData}) {
    useEffect(()=>{
        console.log(propData)
    },[])
    return (
        <div className='Container' style={{width:'600px',height:'600px',background:'white'}}>
            <Canvas>
                <OrbitControls/>
                {GenerarObj3d(propData)}

            </Canvas>
        </div>
    );
}

export default ThreeObjects;