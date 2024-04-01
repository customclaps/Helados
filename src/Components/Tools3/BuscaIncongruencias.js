import * as math from 'mathjs';

export default function BuscaIncongruencias(Array, Matriz) {
    const ArrayCiclico = armaCiclo(Array, Matriz)

    let sum = 0
    ArrayCiclico.forEach(value => {
        if ('up' in value.next && 'down' in value.prev) {
            sum--
        }
        else if ('down' in value.next && 'up' in value.prev) {
            sum++
        }
    })




    if (!sum) {
        return true
    }
    AbrirCiclo(ArrayCiclico, Matriz)
    return false
}
function armaCiclo(Array, Matriz) {
    let madre = new Map()

    Array.forEach(algo => {
        madre.set(algo, { next: {}, prev: {}, index: null })
    })

    const rellaneMadre = (a, b) => {
        if (Matriz.get(a).up.includes(b)) {
            madre.get(a).next = { up: b }
        }
        else if (Matriz.get(a).down.includes(b)) {
            madre.get(a).next = { down: b }

        }
        else {
            console.log('problemas1')
        }

        if (Matriz.get(b).up.includes(a)) {
            madre.get(b).prev = { up: a }
        }
        else if (Matriz.get(b).down.includes(a)) {
            madre.get(b).prev = { down: a }

        }
        else {
            console.log('problemas2')
        }

        // madre.get(a).index = Matriz[a].index
        // madre.get(b).index = Matriz[b].index



    }

    for (let a = 0; a < Array.length; a++) {
        console.log(Array[a], Array[(a + 1) % Array.length])
        rellaneMadre(Array[a], Array[(a + 1) % Array.length])
    }
    return madre
}

function AbrirCiclo(ArrayCiclico, Matriz) {
    let maxKey = math.max(...ArrayCiclico.keys()) 

    const ant = ArrayCiclico.get(maxKey).prev.down
    const sig = ArrayCiclico.get(maxKey).next.down
    // miMap.get(1).down = miMap.get(1).down.filter(n => n !== 3);
    if (ant > sig) {
        Matriz.get(maxKey).down = Matriz.get(maxKey).down.filter(val => val !== sig)
        Matriz.get(sig).up = Matriz.get(sig).up.filter(val => val !== maxKey)
    }
    else {
        Matriz.get(maxKey).down = Matriz.get(maxKey).down.filter(val => val !== ant)
        Matriz.get(ant).up = Matriz.get(ant).up.filter(val => val !== maxKey)
    }


}