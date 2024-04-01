import { Path as Path2, CompoundPath } from './Path2'
import { offsetPath } from './offset2'
import traceBoolean from './traceBoolean'

function ConvertP(FPath) {
    var l = 0
    FPath.path.forEach(element => {
        if (element[0] === 'z' || element[0] === 'Z') {
            l++
        }
    })

    if (l > 1) {
        return new CompoundPath(FPath)
    }
    if (l == 1) {
        return new Path2(FPath)
    }
}

function ConvertS(PathString) {
    var l = 0
    for(let element of PathString){
        if (element[0] === 'z' || element[0] === 'Z') {
            l++
        }
    }

    if (l > 1) {
        return new CompoundPath(PathString)
    }
    if (l == 1) {
        return new Path2(PathString)
    }
}
function offsetPathF(PathF, offset, type) {
    return offsetPath(ConvertP(PathF), offset, type, 10)
}

function traceBooleanF(PathF1, PathF2, operation) {
    return traceBoolean(ConvertP(PathF1), ConvertP(PathF2), operation)
}


export { offsetPathF, traceBooleanF, ConvertP ,ConvertS}
