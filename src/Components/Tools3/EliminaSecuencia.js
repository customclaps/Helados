function esRotacionOInversaIncluyendoInversos(secuenciaOriginal, secuenciaCandidata) {
    if (secuenciaOriginal.length !== secuenciaCandidata.length) return false;
    const longitud = secuenciaOriginal.length;
    const secuenciaInversa = [...secuenciaOriginal].reverse(); // Crear la inversa de la secuencia original

    for (let i = 0; i < longitud; i++) {
        // Rotación directa de la secuencia candidata
        const rotacionDirecta = secuenciaCandidata.slice(i).concat(secuenciaCandidata.slice(0, i));
        // Rotación de la secuencia candidata pero partiendo de su forma inversa
        const rotacionInversa = secuenciaCandidata.slice(-i).concat(secuenciaCandidata.slice(0, -i)).reverse();

        if (rotacionDirecta.every((elemento, index) => elemento === secuenciaOriginal[index]) ||
            rotacionInversa.every((elemento, index) => elemento === secuenciaOriginal[index]) ||
            rotacionDirecta.every((elemento, index) => elemento === secuenciaInversa[index]) || // Comparar con la secuencia inversa original
            rotacionInversa.every((elemento, index) => elemento === secuenciaInversa[index])) {
            return true; // La secuencia candidata es una rotación o inversa (o ambas) de la secuencia original.
        }
    }
    return false;
}

function filtrarUnicasConRotacionesYInversas(secuencias) {
    const unicas = [];
    for (const secuencia of secuencias) {
        let esUnica = true;
        for (const unica of unicas) {
            if (esRotacionOInversaIncluyendoInversos(unica, secuencia)) {
                esUnica = false;
                break;
            }
        }
        if (esUnica) {
            unicas.push(secuencia);
        }
    }
    return unicas;
}
export default filtrarUnicasConRotacionesYInversas