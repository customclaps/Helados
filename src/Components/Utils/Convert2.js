import { Path as Path2, CompoundPath } from './Path2'
import { offsetPath } from './offset2'
function ConvertP (FPath) {
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
function offsetPathF(PathF,offset,type){
return offsetPath(ConvertP(PathF),offset,type,10)
} 

export default offsetPathF
