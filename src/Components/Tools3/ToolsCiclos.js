// function sonPermutacionesCircularesUnicas(array1, array2) {
//     if (array1.length !== array2.length) return false;
//     const concatenated = array1.concat(array1);
//     return concatenated.join(' ').includes(array2.join(' '));
//   }

// function filtrarUnicasPorRotacion(secuencias) {
//   const unicas = secuencias.filter((secuencia, index, self) => {
//     return !self.some((otraSecuencia, otraIndex) => {
//       return otraIndex < index && sonPermutacionesCircularesUnicas(secuencia, otraSecuencia);
//     });
//   });
//   return unicas;
// }




function EncuentraCiclos(ramas, MapObjetos) {
  let visitado = new Map();
  let ciclos = [];
  const dfs = (node, parent, path) => {
    // console.log(path)

    visitado.set(node, true);
    //   let adyacentes = this.adjList.get(node);
    let adyacentes = [...MapObjetos.get(node).up, ...MapObjetos.get(node).down];
    for (let ady of adyacentes) {
      if (ady === parent) {
        continue

      }; // Evita ir hacia el padre directo, ya que es un grafo no dirigido.
      if (!visitado.get(ady)) {
        dfs(ady, node, [...path, ady]);
      } else {
        console.log([...path, ady])

        // Encontramos un ciclo. Ahora, debemos verificar si es único.
        // let cicloActual = [...path, ady].slice(path.indexOf(ady));
        let cicloActual = [...path].slice(path.indexOf(ady));
        console.log(cicloActual, 'encontrado')
        //   if (!cicloYaRegistrado(ciclos, cicloActual)) {
        ciclos.push(cicloActual);

        //   }
      }
    }
    // console.log(path,any2)
    visitado.set(node, false); // Permite reutilizar este nodo para encontrar diferentes ciclos.
    return ciclos
  };

  // const cicloYaRegistrado = (ciclos, cicloActual) => {
  //   let cicloActualStr = cicloActual.join(",");
  //   return ciclos.some(ciclo => {
  //     let cicloStr = ciclo.join(",");
  //     return cicloStr.includes(cicloActualStr) || cicloStr.includes(cicloActualStr.split(",").reverse().join(","));
  //   });
  // };

  // this.adjList.forEach((_, vertice) => {
  //   dfs(vertice, null, [vertice]);
  // });
  let TodosCiclos = []
  ramas.forEach(rama => {
    const cicloEncontrado = dfs(rama[0], null, [rama[0]])
    if (cicloEncontrado.length) {
      TodosCiclos=[...TodosCiclos,...cicloEncontrado]
    }
  });

  // const CiclosUnicos=filtrarUnicasPorRotacion(ciclos)

  return TodosCiclos;
}
export default EncuentraCiclos