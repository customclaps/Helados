import * as math from 'mathjs';

export default function CalcularPosiciones(Matriz) {
    const matriz = []
    const b = []
    Matriz.forEach((element, index) => {
        const result = calcRenglon(element, index, Matriz.size)
        matriz.push(result.array)
        b.push(result.b)
    })

    const x = math.lusolve(matriz, b);
    let posX = 0
    Matriz.forEach((element, key) => {
        Matriz.set(key, { ...Matriz.get(key), pos: x[posX] })
        posX++
    })
    return Matriz
}

function calcRenglon(json, index, size) {
    const valores = (json.up).concat(json.down)
    const array = new Array(size).fill(0);
    valores.forEach((element) => {
        array[element] = 1
    });
    array[index] = -(json.up.length + json.down.length)
    const b = (json.up.length - json.down.length)
    const result = { array: array, b: b }

    return result
}
