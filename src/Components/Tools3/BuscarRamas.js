
function dfs(inicio,MapObjetos) {
    const visitados = new Set(); // Conjunto para llevar registro de los nodos visitados

    const dfsRecursivo = (nodo) => {
        console.log(nodo); // Procesamiento del nodo (puede ser adaptado según necesidad)
        visitados.add(nodo); // Marcar el nodo como visitado
        const vecinos=[...MapObjetos.get(nodo).up,...MapObjetos.get(nodo).down]
        // const vecinos = [...Matriz[nodo].up,...Matriz[nodo].down]; // Obtener los nodos adyacentes
        for (let vecino of vecinos) {
            if (!visitados.has(vecino)) { // Si el vecino no ha sido visitado, hacer una llamada recursiva
                dfsRecursivo(vecino);
            }
        }
    };

    dfsRecursivo(inicio); // Iniciar DFS desde el nodo de inicio
    return [...visitados]
}

export default function BuscarRamas(MapObjetos){

    const miSet = new Set(MapObjetos.keys())

    const ramas=[]
    miSet.forEach(todo=>{
        const result=dfs(todo,MapObjetos)
        ramas.push(result)
        result.forEach(element => {
            miSet.delete(element)
        });
    })
    return ramas
}