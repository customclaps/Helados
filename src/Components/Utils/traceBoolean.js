import { Line, Point, CurveLocation, Numerical, linkIntersections, Base, Path, Segment, Item } from 'paper'
import { Path as Path2, CompoundPath } from './Path2'
import { Curve } from './Objects'
var min = Math.min,
    max = Math.max,
    abs = Math.abs,
    operators = {
        unite: { '1': true, '2': true },
        intersect: { '2': true },
        subtract: { '1': true },
        exclude: { '1': true, '-1': true }
    };
function clipConvexHullPart(part, top, threshold) {
    var px = part[0][0],
        py = part[0][1];
    for (var i = 1, l = part.length; i < l; i++) {
        var qx = part[i][0],
            qy = part[i][1];
        if (top ? qy >= threshold : qy <= threshold) {
            return qy === threshold ? qx
                : px + (threshold - py) * (qx - px) / (qy - py);
        }
        px = qx;
        py = qy;
    }
    return null;
}
function clipConvexHull(hullTop, hullBottom, dMin, dMax) {
    if (hullTop[0][1] < dMin) {
        return clipConvexHullPart(hullTop, true, dMin);
    } else if (hullBottom[0][1] > dMax) {
        return clipConvexHullPart(hullBottom, false, dMax);
    } else {
        return hullTop[0][0];
    }
}
function addCurveIntersections(v1, v2, c1, c2, locations, include, flip,
    recursion, calls, tMin, tMax, uMin, uMax) {
    if (++calls >= 4096 || ++recursion >= 40)
        return calls;
    var fatLineEpsilon = 1e-9,
        q0x = v2[0], q0y = v2[1], q3x = v2[6], q3y = v2[7],
        getSignedDistance = Line.getSignedDistance,
        d1 = getSignedDistance(q0x, q0y, q3x, q3y, v2[2], v2[3]),
        d2 = getSignedDistance(q0x, q0y, q3x, q3y, v2[4], v2[5]),
        factor = d1 * d2 > 0 ? 3 / 4 : 4 / 9,
        dMin = factor * Math.min(0, d1, d2),
        dMax = factor * Math.max(0, d1, d2),
        dp0 = getSignedDistance(q0x, q0y, q3x, q3y, v1[0], v1[1]),
        dp1 = getSignedDistance(q0x, q0y, q3x, q3y, v1[2], v1[3]),
        dp2 = getSignedDistance(q0x, q0y, q3x, q3y, v1[4], v1[5]),
        dp3 = getSignedDistance(q0x, q0y, q3x, q3y, v1[6], v1[7]),
        hull = getConvexHull(dp0, dp1, dp2, dp3),
        top = hull[0],
        bottom = hull[1],
        tMinClip,
        tMaxClip;
    if (d1 === 0 && d2 === 0
        && dp0 === 0 && dp1 === 0 && dp2 === 0 && dp3 === 0
        || (tMinClip = clipConvexHull(top, bottom, dMin, dMax)) == null
        || (tMaxClip = clipConvexHull(top.reverse(), bottom.reverse(),
            dMin, dMax)) == null)
        return calls;
    var tMinNew = tMin + (tMax - tMin) * tMinClip,
        tMaxNew = tMin + (tMax - tMin) * tMaxClip;
    if (Math.max(uMax - uMin, tMaxNew - tMinNew) < fatLineEpsilon) {
        var t = (tMinNew + tMaxNew) / 2,
            u = (uMin + uMax) / 2;
        addLocation(locations, include,
            flip ? c2 : c1, flip ? u : t,
            flip ? c1 : c2, flip ? t : u);
    } else {
        v1 = Curve.getPart(v1, tMinClip, tMaxClip);
        var uDiff = uMax - uMin;
        if (tMaxClip - tMinClip > 0.8) {
            if (tMaxNew - tMinNew > uDiff) {
                var parts = Curve.subdivide(v1, 0.5),
                    t = (tMinNew + tMaxNew) / 2;
                calls = addCurveIntersections(
                    v2, parts[0], c2, c1, locations, include, !flip,
                    recursion, calls, uMin, uMax, tMinNew, t);
                calls = addCurveIntersections(
                    v2, parts[1], c2, c1, locations, include, !flip,
                    recursion, calls, uMin, uMax, t, tMaxNew);
            } else {
                var parts = Curve.subdivide(v2, 0.5),
                    u = (uMin + uMax) / 2;
                calls = addCurveIntersections(
                    parts[0], v1, c2, c1, locations, include, !flip,
                    recursion, calls, uMin, u, tMinNew, tMaxNew);
                calls = addCurveIntersections(
                    parts[1], v1, c2, c1, locations, include, !flip,
                    recursion, calls, u, uMax, tMinNew, tMaxNew);
            }
        } else {
            if (uDiff === 0 || uDiff >= fatLineEpsilon) {
                calls = addCurveIntersections(
                    v2, v1, c2, c1, locations, include, !flip,
                    recursion, calls, uMin, uMax, tMinNew, tMaxNew);
            } else {
                calls = addCurveIntersections(
                    v1, v2, c1, c2, locations, include, flip,
                    recursion, calls, tMinNew, tMaxNew, uMin, uMax);
            }
        }
    }
    return calls;
}
function getCurveLineIntersections(v, px, py, vx, vy) {
    var isZero = Numerical.isZero;
    if (isZero(vx) && isZero(vy)) {
        var t = Curve.getTimeOf(v, new Point(px, py));
        return t === null ? [] : [t];
    }
    var angle = Math.atan2(-vy, vx),
        sin = Math.sin(angle),
        cos = Math.cos(angle),
        rv = [],
        roots = [];
    for (var i = 0; i < 8; i += 2) {
        var x = v[i] - px,
            y = v[i + 1] - py;
        rv.push(
            x * cos - y * sin,
            x * sin + y * cos);
    }
    Curve.solveCubic(rv, 1, 0, roots, 0, 1);
    return roots;
}
function addCurveLineIntersections(v1, v2, c1, c2, locations, include,
    flip) {
    var x1 = v2[0], y1 = v2[1],
        x2 = v2[6], y2 = v2[7],
        roots = getCurveLineIntersections(v1, x1, y1, x2 - x1, y2 - y1);
    for (var i = 0, l = roots.length; i < l; i++) {
        var t1 = roots[i],
            p1 = Curve.getPoint(v1, t1),
            t2 = Curve.getTimeOf(v2, p1);
        if (t2 !== null) {
            addLocation(locations, include,
                flip ? c2 : c1, flip ? t2 : t1,
                flip ? c1 : c2, flip ? t1 : t2);
        }
    }
}
function addLineIntersection(v1, v2, c1, c2, locations, include) {
    var pt = Line.intersect(
        v1[0], v1[1], v1[6], v1[7],
        v2[0], v2[1], v2[6], v2[7]);
    if (pt) {
        addLocation(locations, include,
            c1, Curve.getTimeOf(v1, pt),
            c2, Curve.getTimeOf(v2, pt));
    }
}
function addLocation(locations, include, c1, t1, c2, t2, overlap) {
    var excludeStart = !overlap && c1.getPrevious() === c2,
        excludeEnd = !overlap && c1 !== c2 && c1.getNext() === c2,
        tMin = 1e-8,
        tMax = 1 - tMin;
    if (t1 !== null && t1 >= (excludeStart ? tMin : 0) &&
        t1 <= (excludeEnd ? tMax : 1)) {
        if (t2 !== null && t2 >= (excludeEnd ? tMin : 0) &&
            t2 <= (excludeStart ? tMax : 1)) {
            var loc1 = new CurveLocation(c1, t1, null, overlap),
                loc2 = new CurveLocation(c2, t2, null, overlap);
            loc1._intersection = loc2;
            loc2._intersection = loc1;
            if (!include || include(loc1)) {
                CurveLocation.insert(locations, loc1, true);
            }
        }
    }
}
function getIntersections(curves1, curves2, include, matrix1, matrix2,
    _returnFirst) {
    var epsilon = 1e-7,
        self = !curves2;
    if (self)
        curves2 = curves1;
    var length1 = curves1.length,
        length2 = curves2.length,
        values1 = new Array(length1),
        values2 = self ? values1 : new Array(length2),
        locations = [];

    for (var i = 0; i < length1; i++) {
        values1[i] = curves1[i].getValues(matrix1);
    }
    if (!self) {
        for (var i = 0; i < length2; i++) {
            values2[i] = curves2[i].getValues(matrix2);
        }
    }
    var boundsCollisions = CollisionDetection.findCurveBoundsCollisions(
        values1, values2, epsilon);
    for (var index1 = 0; index1 < length1; index1++) {
        var curve1 = curves1[index1],
            v1 = values1[index1];
        if (self) {
            getSelfIntersection(v1, curve1, locations, include);
        }
        var collisions1 = boundsCollisions[index1];
        if (collisions1) {
            for (var j = 0; j < collisions1.length; j++) {
                if (_returnFirst && locations.length)
                    return locations;
                var index2 = collisions1[j];
                if (!self || index2 > index1) {
                    var curve2 = curves2[index2],
                        v2 = values2[index2];
                    getCurveIntersections(
                        v1, v2, curve1, curve2, locations, include);
                }
            }
        }
    }
    return locations;
}
function getValues(segment1, segment2, matrix, straight) {
    var p1 = segment1._point,
        h1 = segment1._handleOut,
        h2 = segment2._handleIn,
        p2 = segment2._point,
        x1 = p1.x, y1 = p1.y,
        x2 = p2.x, y2 = p2.y,
        values = straight
            ? [x1, y1, x1, y1, x2, y2, x2, y2]
            : [
                x1, y1,
                x1 + h1._x, y1 + h1._y,
                x2 + h2._x, y2 + h2._y,
                x2, y2
            ];
    // if (matrix)
    //     matrix._transformCoordinates(values, values, 4);
    return values;
}
function findCurveBoundsCollisions(curves1, curves2, tolerance, bothAxis) {
    function getBounds(curves) {
        var min = Math.min,
            max = Math.max,
            bounds = new Array(curves.length);
        for (var i = 0; i < curves.length; i++) {
            var v = curves[i];
            bounds[i] = [
                min(v[0], v[2], v[4], v[6]),
                min(v[1], v[3], v[5], v[7]),
                max(v[0], v[2], v[4], v[6]),
                max(v[1], v[3], v[5], v[7])
            ];
        }
        return bounds;
    }

    var bounds1 = getBounds(curves1),
        bounds2 = !curves2 || curves2 === curves1
            ? bounds1
            : getBounds(curves2);
    if (bothAxis) {
        var hor = this.findBoundsCollisions(
            bounds1, bounds2, tolerance || 0, false, true),
            ver = this.findBoundsCollisions(
                bounds1, bounds2, tolerance || 0, true, true),
            list = [];
        for (var i = 0, l = hor.length; i < l; i++) {
            list[i] = { hor: hor[i], ver: ver[i] };
        }
        return list;
    }
    return this.findBoundsCollisions(bounds1, bounds2, tolerance || 0);
}
function findBoundsCollisions(boundsA, boundsB, tolerance,
    sweepVertical, onlySweepAxisCollisions) {
    var self = !boundsB || boundsA === boundsB,
        allBounds = self ? boundsA : boundsA.concat(boundsB),
        lengthA = boundsA.length,
        lengthAll = allBounds.length;

    function binarySearch(indices, coord, value) {
        var lo = 0,
            hi = indices.length;
        while (lo < hi) {
            var mid = (hi + lo) >>> 1;
            if (allBounds[indices[mid]][coord] < value) {
                lo = mid + 1;
            } else {
                hi = mid;
            }
        }
        return lo - 1;
    }

    var pri0 = sweepVertical ? 1 : 0,
        pri1 = pri0 + 2,
        sec0 = sweepVertical ? 0 : 1,
        sec1 = sec0 + 2;
    var allIndicesByPri0 = new Array(lengthAll);
    for (var i = 0; i < lengthAll; i++) {
        allIndicesByPri0[i] = i;
    }
    allIndicesByPri0.sort(function (i1, i2) {
        return allBounds[i1][pri0] - allBounds[i2][pri0];
    });
    var activeIndicesByPri1 = [],
        allCollisions = new Array(lengthA);
    for (var i = 0; i < lengthAll; i++) {
        var curIndex = allIndicesByPri0[i],
            curBounds = allBounds[curIndex],
            origIndex = self ? curIndex : curIndex - lengthA,
            isCurrentA = curIndex < lengthA,
            isCurrentB = self || !isCurrentA,
            curCollisions = isCurrentA ? [] : null;
        if (activeIndicesByPri1.length) {
            var pruneCount = binarySearch(activeIndicesByPri1, pri1,
                curBounds[pri0] - tolerance) + 1;
            activeIndicesByPri1.splice(0, pruneCount);
            if (self && onlySweepAxisCollisions) {
                curCollisions = curCollisions.concat(activeIndicesByPri1);
                for (var j = 0; j < activeIndicesByPri1.length; j++) {
                    var activeIndex = activeIndicesByPri1[j];
                    allCollisions[activeIndex].push(origIndex);
                }
            } else {
                var curSec1 = curBounds[sec1],
                    curSec0 = curBounds[sec0];
                for (var j = 0; j < activeIndicesByPri1.length; j++) {
                    var activeIndex = activeIndicesByPri1[j],
                        activeBounds = allBounds[activeIndex],
                        isActiveA = activeIndex < lengthA,
                        isActiveB = self || activeIndex >= lengthA;

                    if (
                        onlySweepAxisCollisions ||
                        (
                            isCurrentA && isActiveB ||
                            isCurrentB && isActiveA
                        ) && (
                            curSec1 >= activeBounds[sec0] - tolerance &&
                            curSec0 <= activeBounds[sec1] + tolerance
                        )
                    ) {
                        if (isCurrentA && isActiveB) {
                            curCollisions.push(
                                self ? activeIndex : activeIndex - lengthA);
                        }
                        if (isCurrentB && isActiveA) {
                            allCollisions[activeIndex].push(origIndex);
                        }
                    }
                }
            }
        }
        if (isCurrentA) {
            if (boundsA === boundsB) {
                curCollisions.push(curIndex);
            }
            allCollisions[curIndex] = curCollisions;
        }
        if (activeIndicesByPri1.length) {
            var curPri1 = curBounds[pri1],
                index = binarySearch(activeIndicesByPri1, pri1, curPri1);
            activeIndicesByPri1.splice(index + 1, 0, curIndex);
        } else {
            activeIndicesByPri1.push(curIndex);
        }
    }
    for (var i = 0; i < allCollisions.length; i++) {
        var collisions = allCollisions[i];
        if (collisions) {
            collisions.sort(function (i1, i2) { return i1 - i2; });
        }
    }
    return allCollisions;
}
function getSelfIntersection(v1, c1, locations, include) {
    // var info = Curve.classify(v1);
    // if (info.type === 'loop') {
    //     var roots = info.roots;
    //     addLocation(locations, include,
    //             c1, roots[0],
    //             c1, roots[1]);
    // }
    return locations;
}
function getOverlaps(v1, v2) {

    function getSquaredLineLength(v) {
        var x = v[6] - v[0],
            y = v[7] - v[1];
        return x * x + y * y;
    }

    var abs = Math.abs,
        getDistance = Line.getDistance,
        timeEpsilon = 1e-8,
        geomEpsilon = 1e-7,
        straight1 = Curve.isStraight(v1),
        straight2 = Curve.isStraight(v2),
        straightBoth = straight1 && straight2,
        flip = getSquaredLineLength(v1) < getSquaredLineLength(v2),
        l1 = flip ? v2 : v1,
        l2 = flip ? v1 : v2,
        px = l1[0], py = l1[1],
        vx = l1[6] - px, vy = l1[7] - py;
    if (getDistance(px, py, vx, vy, l2[0], l2[1], true) < geomEpsilon &&
        getDistance(px, py, vx, vy, l2[6], l2[7], true) < geomEpsilon) {
        if (!straightBoth &&
            getDistance(px, py, vx, vy, l1[2], l1[3], true) < geomEpsilon &&
            getDistance(px, py, vx, vy, l1[4], l1[5], true) < geomEpsilon &&
            getDistance(px, py, vx, vy, l2[2], l2[3], true) < geomEpsilon &&
            getDistance(px, py, vx, vy, l2[4], l2[5], true) < geomEpsilon) {
            straight1 = straight2 = straightBoth = true;
        }
    } else if (straightBoth) {
        return null;
    }
    if (straight1 ^ straight2) {
        return null;
    }

    var v = [v1, v2],
        pairs = [];
    for (var i = 0; i < 4 && pairs.length < 2; i++) {
        var i1 = i & 1,
            i2 = i1 ^ 1,
            t1 = i >> 1,
            t2 = Curve.getTimeOf(v[i1], new Point(
                v[i2][t1 ? 6 : 0],
                v[i2][t1 ? 7 : 1]));
        if (t2 != null) {
            var pair = i1 ? [t1, t2] : [t2, t1];
            if (!pairs.length ||
                abs(pair[0] - pairs[0][0]) > timeEpsilon &&
                abs(pair[1] - pairs[0][1]) > timeEpsilon) {
                pairs.push(pair);
            }
        }
        if (i > 2 && !pairs.length)
            break;
    }
    if (pairs.length !== 2) {
        pairs = null;
    } else if (!straightBoth) {
        var o1 = Curve.getPart(v1, pairs[0][0], pairs[1][0]),
            o2 = Curve.getPart(v2, pairs[0][1], pairs[1][1]);
        if (abs(o2[2] - o1[2]) > geomEpsilon ||
            abs(o2[3] - o1[3]) > geomEpsilon ||
            abs(o2[4] - o1[4]) > geomEpsilon ||
            abs(o2[5] - o1[5]) > geomEpsilon)
            pairs = null;
    }
    return pairs;
}
function getCurveIntersections(v1, v2, c1, c2, locations, include) {
    var epsilon = 1e-12,
        min = Math.min,
        max = Math.max;

    if (max(v1[0], v1[2], v1[4], v1[6]) + epsilon >
        min(v2[0], v2[2], v2[4], v2[6]) &&
        min(v1[0], v1[2], v1[4], v1[6]) - epsilon <
        max(v2[0], v2[2], v2[4], v2[6]) &&
        max(v1[1], v1[3], v1[5], v1[7]) + epsilon >
        min(v2[1], v2[3], v2[5], v2[7]) &&
        min(v1[1], v1[3], v1[5], v1[7]) - epsilon <
        max(v2[1], v2[3], v2[5], v2[7])) {
        var overlaps = getOverlaps(v1, v2);
        if (overlaps) {
            for (var i = 0; i < 2; i++) {
                var overlap = overlaps[i];
                addLocation(locations, include,
                    c1, overlap[0],
                    c2, overlap[1], true);
            }
        } else {
            var straight1 = Curve.isStraight(v1),
                straight2 = Curve.isStraight(v2),
                straight = straight1 && straight2,
                flip = straight1 && !straight2,
                before = locations.length;
            (straight
                ? addLineIntersection
                : straight1 || straight2
                    ? addCurveLineIntersections
                    : addCurveIntersections)(
                        flip ? v2 : v1, flip ? v1 : v2,
                        flip ? c2 : c1, flip ? c1 : c2,
                        locations, include, flip,
                        0, 0, 0, 1, 0, 1);
            if (!straight || locations.length === before) {
                for (var i = 0; i < 4; i++) {
                    var t1 = i >> 1,
                        t2 = i & 1,
                        i1 = t1 * 6,
                        i2 = t2 * 6,
                        p1 = new Point(v1[i1], v1[i1 + 1]),
                        p2 = new Point(v2[i2], v2[i2 + 1]);
                    if (p1.isClose(p2, epsilon)) {
                        addLocation(locations, include,
                            c1, t1,
                            c2, t2);
                    }
                }
            }
        }
    }
    return locations;
}
var CollisionDetection = {
    findItemBoundsCollisions: function (items1, items2, tolerance) {
        function getBounds(items) {
            var bounds = new Array(items.length);
            for (var i = 0; i < items.length; i++) {
                var rect = items[i].getBounds2();
                bounds[i] = [rect.left, rect.top, rect.right, rect.bottom];
            }
            return bounds;
        }

        var bounds1 = getBounds(items1),
            bounds2 = !items2 || items2 === items1
                ? bounds1
                : getBounds(items2);
        return this.findBoundsCollisions(bounds1, bounds2, tolerance || 0);
    },

    findCurveBoundsCollisions: function (curves1, curves2, tolerance, bothAxis) {
        function getBounds(curves) {
            var min = Math.min,
                max = Math.max,
                bounds = new Array(curves.length);
            for (var i = 0; i < curves.length; i++) {
                var v = curves[i];
                bounds[i] = [
                    min(v[0], v[2], v[4], v[6]),
                    min(v[1], v[3], v[5], v[7]),
                    max(v[0], v[2], v[4], v[6]),
                    max(v[1], v[3], v[5], v[7])
                ];
            }
            return bounds;
        }

        var bounds1 = getBounds(curves1),
            bounds2 = !curves2 || curves2 === curves1
                ? bounds1
                : getBounds(curves2);
        if (bothAxis) {
            var hor = this.findBoundsCollisions(
                bounds1, bounds2, tolerance || 0, false, true),
                ver = this.findBoundsCollisions(
                    bounds1, bounds2, tolerance || 0, true, true),
                list = [];
            for (var i = 0, l = hor.length; i < l; i++) {
                list[i] = { hor: hor[i], ver: ver[i] };
            }
            return list;
        }
        return this.findBoundsCollisions(bounds1, bounds2, tolerance || 0);
    },

    findBoundsCollisions: function (boundsA, boundsB, tolerance,
        sweepVertical, onlySweepAxisCollisions) {
        var self = !boundsB || boundsA === boundsB,
            allBounds = self ? boundsA : boundsA.concat(boundsB),
            lengthA = boundsA.length,
            lengthAll = allBounds.length;

        function binarySearch(indices, coord, value) {
            var lo = 0,
                hi = indices.length;
            while (lo < hi) {
                var mid = (hi + lo) >>> 1;
                if (allBounds[indices[mid]][coord] < value) {
                    lo = mid + 1;
                } else {
                    hi = mid;
                }
            }
            return lo - 1;
        }

        var pri0 = sweepVertical ? 1 : 0,
            pri1 = pri0 + 2,
            sec0 = sweepVertical ? 0 : 1,
            sec1 = sec0 + 2;
        var allIndicesByPri0 = new Array(lengthAll);
        for (var i = 0; i < lengthAll; i++) {
            allIndicesByPri0[i] = i;
        }
        allIndicesByPri0.sort(function (i1, i2) {
            return allBounds[i1][pri0] - allBounds[i2][pri0];
        });
        var activeIndicesByPri1 = [],
            allCollisions = new Array(lengthA);
        for (var i = 0; i < lengthAll; i++) {
            var curIndex = allIndicesByPri0[i],
                curBounds = allBounds[curIndex],
                origIndex = self ? curIndex : curIndex - lengthA,
                isCurrentA = curIndex < lengthA,
                isCurrentB = self || !isCurrentA,
                curCollisions = isCurrentA ? [] : null;
            if (activeIndicesByPri1.length) {
                var pruneCount = binarySearch(activeIndicesByPri1, pri1,
                    curBounds[pri0] - tolerance) + 1;
                activeIndicesByPri1.splice(0, pruneCount);
                if (self && onlySweepAxisCollisions) {
                    curCollisions = curCollisions.concat(activeIndicesByPri1);
                    for (var j = 0; j < activeIndicesByPri1.length; j++) {
                        var activeIndex = activeIndicesByPri1[j];
                        allCollisions[activeIndex].push(origIndex);
                    }
                } else {
                    var curSec1 = curBounds[sec1],
                        curSec0 = curBounds[sec0];
                    for (var j = 0; j < activeIndicesByPri1.length; j++) {
                        var activeIndex = activeIndicesByPri1[j],
                            activeBounds = allBounds[activeIndex],
                            isActiveA = activeIndex < lengthA,
                            isActiveB = self || activeIndex >= lengthA;

                        if (
                            onlySweepAxisCollisions ||
                            (
                                isCurrentA && isActiveB ||
                                isCurrentB && isActiveA
                            ) && (
                                curSec1 >= activeBounds[sec0] - tolerance &&
                                curSec0 <= activeBounds[sec1] + tolerance
                            )
                        ) {
                            if (isCurrentA && isActiveB) {
                                curCollisions.push(
                                    self ? activeIndex : activeIndex - lengthA);
                            }
                            if (isCurrentB && isActiveA) {
                                allCollisions[activeIndex].push(origIndex);
                            }
                        }
                    }
                }
            }
            if (isCurrentA) {
                if (boundsA === boundsB) {
                    curCollisions.push(curIndex);
                }
                allCollisions[curIndex] = curCollisions;
            }
            if (activeIndicesByPri1.length) {
                var curPri1 = curBounds[pri1],
                    index = binarySearch(activeIndicesByPri1, pri1, curPri1);
                activeIndicesByPri1.splice(index + 1, 0, curIndex);
            } else {
                activeIndicesByPri1.push(curIndex);
            }
        }
        for (var i = 0; i < allCollisions.length; i++) {
            var collisions = allCollisions[i];
            if (collisions) {
                collisions.sort(function (i1, i2) { return i1 - i2; });
            }
        }
        return allCollisions;
    }
};
function getConvexHull(dq0, dq1, dq2, dq3) {
    var p0 = [0, dq0],
        p1 = [1 / 3, dq1],
        p2 = [2 / 3, dq2],
        p3 = [1, dq3],
        dist1 = dq1 - (2 * dq0 + dq3) / 3,
        dist2 = dq2 - (dq0 + 2 * dq3) / 3,
        hull;
    if (dist1 * dist2 < 0) {
        hull = [[p0, p1, p3], [p0, p2, p3]];
    } else {
        var distRatio = dist1 / dist2;
        hull = [
            distRatio >= 2 ? [p0, p1, p3]
                : distRatio <= 0.5 ? [p0, p2, p3]
                    : [p0, p1, p2, p3],
            [p0, p3]
        ];
    }
    return (dist1 || dist2) < 0 ? hull.reverse() : hull;
}
function intersec(path0, path1) {
    const _path0 = path0.getCurves()
    const _path1 = path1.getCurves()
    // var _path1=[{point1:{x:9,y:40}},{point2:{x:95,y:40}}]
    return getIntersections(_path0, _path1)
}
function clearCurveHandles(curves) {
    for (var i = curves.length - 1; i >= 0; i--)
        curves[i].clearHandles();
}
function propagateWinding(segment, path1, path2, curveCollisionsMap,
    operator) {
    var chain = [],
        start = segment,
        totalLength = 0,
        winding;
    do {
        var curve = segment.getCurve();
        if (curve) {
            var length = curve.getLength();
            chain.push({ segment: segment, curve: curve, length: length });
            totalLength += length;
        }
        segment = segment.getNext();
    } while (segment && !segment._intersection && segment !== start);
    var offsets = [0.5, 0.25, 0.75],
        winding = { winding: 0, quality: -1 },
        tMin = 1e-3,
        tMax = 1 - tMin;
    for (var i = 0; i < offsets.length && winding.quality < 0.5; i++) {
        var length = totalLength * offsets[i];
        for (var j = 0, l = chain.length; j < l; j++) {
            var entry = chain[j],
                curveLength = entry.length;
            if (length <= curveLength) {
                var curve = entry.curve,
                    path = curve._path,
                    parent = path._parent,
                    operand =(parent && ('_children' in parent)) ? parent : path,
                    t = Numerical.clamp(curve.getTimeAt(length), tMin, tMax),
                    pt = curve.getPointAtTime(t),
                    dir = Math.abs(curve.getTangentAtTime(t).y) < Math.SQRT1_2;
                
                    var wind = null;
                if (operator.subtract && path2) {
                    var otherPath = operand === path1 ? path2 : path1,
                        pathWinding = otherPath._getWinding(pt, dir, true);
                    if (operand === path1 && pathWinding.winding ||
                        operand === path2 && !pathWinding.winding) {
                        if (pathWinding.quality < 1) {
                            continue;
                        } else {
                            wind = { winding: 0, quality: 1 };
                        }
                    }
                }
                wind = wind || getWinding(
                    pt, curveCollisionsMap[path._id][curve.getIndex()],
                    dir, true);
                if (wind.quality > winding.quality)
                    winding = wind;
                break;
            }
            length -= curveLength;
        }
    }
    for (var j = chain.length - 1; j >= 0; j--) {
        chain[j].segment._winding = winding;
    }
}
function divideLocations(locations, include, clearLater) {
    var results = include && [],
        tMin = 1e-8,
        tMax = 1 - tMin,
        clearHandles = false,
        clearCurves = clearLater || [],
        clearLookup = clearLater && {},
        renormalizeLocs,
        prevCurve,
        prevTime;

    function getId(curve) {
        return curve._path._id + '.' + curve._segment1._index;
    }

    for (var i = (clearLater && clearLater.length) - 1; i >= 0; i--) {
        var curve = clearLater[i];
        if (curve._path)
            clearLookup[getId(curve)] = true;
    }

    for (var i = locations.length - 1; i >= 0; i--) {
        var loc = locations[i],
            time = loc._time,
            origTime = time,
            exclude = include && !include(loc),
            curve = loc._curve,
            segment;
        if (curve) {
            if (curve !== prevCurve) {
                clearHandles = !curve.hasHandles()
                    || clearLookup && clearLookup[getId(curve)];
                renormalizeLocs = [];
                prevTime = null;
                prevCurve = curve;
            } else if (prevTime >= tMin) {
                time /= prevTime;
            }
        }
        if (exclude) {
            if (renormalizeLocs)
                renormalizeLocs.push(loc);
            continue;
        } else if (include) {
            results.unshift(loc);
        }
        prevTime = origTime;
        if (time < tMin) {
            segment = curve._segment1;
        } else if (time > tMax) {
            segment = curve._segment2;
        } else {
            var newCurve = curve.divideAtTime(time, true);
            if (clearHandles)
                clearCurves.push(curve, newCurve);
            segment = newCurve._segment1;
            for (var j = renormalizeLocs.length - 1; j >= 0; j--) {
                var l = renormalizeLocs[j];
                l._time = (l._time - time) / (1 - time);
            }
        }
        loc._setSegment(segment);
        var inter = segment._intersection,
            dest = loc._intersection;
        if (inter) {
            linkIntersections(inter, dest);
            var other = inter;
            while (other) {
                linkIntersections(other._intersection, inter);
                other = other._next;
            }
        } else {
            segment._intersection = dest;
        }
    }
    if (!clearLater)
        clearCurveHandles(clearCurves);
    return results || locations;
}
const ConvertP = (FPath) => {
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
function fastIntersect(path1, path2) {
    var _path1 = ConvertP(path1),
        _path2 = ConvertP(path2)
    const result = getIntersections(_path1.getCurves(), _path2.getCurves())
    if(result.length)
    {
        return true
    }
    else{
        return false
    }
    
}
function traceBoolean(path1, path2, operation, options) {

    // if (options && (options.trace == false || options.stroke) &&
    // 		/^(subtract|intersect)$/.test(operation))
    // 	return splitBoolean(path1, path2, operation);
    // const tt=path1._getBounds()

    // var _path1 = preparePath(ConvertP(path1), true),
    //     _path2 = preparePath(ConvertP(path2), true), aca
    

    var _path1 = preparePath((path1), true)
    var _path2 = path2 && path1 !== path2 && preparePath(path2, true)


    /* _path2 = path2 && path1 !== path2 && */
    var operator = operators[operation];
    operator[operation] = true;
    if (_path2 && (operator.subtract || operator.exclude)
        ^ (_path2.isClockwise() ^ _path1.isClockwise()))
        _path2.reverse();
    // var crossings = divideLocations(CurveLocation.expand(_path1.getIntersections(_path2, filterIntersection))),

    var crossings = divideLocations(CurveLocation.expand(getIntersections(_path1.getCurves(), _path2 &&
        _path2.getCurves(), filterIntersection))),


        paths1 = getPaths(_path1),
        paths2 = _path2 && getPaths(_path2),
        segments = [],
        curves = [],
        paths;
    // var operator={'intersect' : true,'2': true }

    function collectPaths(paths) {
        for (var i = 0, l = paths.length; i < l; i++) {
            var path = paths[i];
            Base.push(segments, path._segments);
            Base.push(curves, path.getCurves());
            path._overlapsOnly = true;
        }
    }

    function getCurves(indices) {
        var list = [];
        for (var i = 0, l = indices && indices.length; i < l; i++) {
            list.push(curves[indices[i]]);
        }
        return list;
    }
    if (crossings.length) {
        collectPaths(paths1);
        if (paths2)
            collectPaths(paths2);

        var curvesValues = new Array(curves.length);
        for (var i = 0, l = curves.length; i < l; i++) {
            curvesValues[i] = curves[i].getValues();
        }
        var curveCollisions = CollisionDetection.findCurveBoundsCollisions(
            curvesValues, curvesValues, 0, true);
        var curveCollisionsMap = {};
        for (var i = 0; i < curves.length; i++) {
            var curve = curves[i],
                id = curve._path._id,
                map = curveCollisionsMap[id] = curveCollisionsMap[id] || {};
            map[curve.getIndex()] = {
                hor: getCurves(curveCollisions[i].hor),
                ver: getCurves(curveCollisions[i].ver)
            };
        }

        for (var i = 0, l = crossings.length; i < l; i++) {
            propagateWinding(crossings[i]._segment, _path1, _path2,
                curveCollisionsMap, operator);
        }
        for (var i = 0, l = segments.length; i < l; i++) {
            var segment = segments[i],
                inter = segment._intersection;
            if (!segment._winding) {
                propagateWinding(segment, _path1, _path2,
                    curveCollisionsMap, operator);
            }
            if (!(inter && inter._overlap))
                segment._path._overlapsOnly = false;
        }
        paths = tracePaths(segments, operator);
    } else {
        paths = reorientPaths(
            paths2 ? paths1.concat(paths2) : paths1.slice(),
            function (w) {
                return !!operator[w];
            });
    }
    return createResult(paths, true, path1, path2, options);


    // return paths

}
function preparePath(path, resolve) {
    // var res = path
    //     .clone(false)
    //     .reduce({ simplify: true })
    //     .transform(null, true, true);
    path = path.reduce({ simplify: true })
    var res
    if (resolve) {
        var paths = getPaths(path);
        for (var i = 0, l = paths.length; i < l; i++) {
            var path2 = paths[i];
            if (!path2._closed && !path2.isEmpty()) {
                path2.closePath(1e-12);
                path2.getFirstSegment().setHandleIn(0, 0);
                path2.getLastSegment().setHandleOut(0, 0);
            }
        }

        res = path
            .resolveCrossings().reorient(true, true);

    }
    return res;
}
function getPaths(path) {
    return path._children || [path];
}
function getWinding(point, curves, dir, closed, dontFlip) {
    var curvesList = Array.isArray(curves)
        ? curves
        : curves[dir ? 'hor' : 'ver'];
    var ia = dir ? 1 : 0,
        io = ia ^ 1,
        pv = [point.x, point.y],
        pa = pv[ia],
        po = pv[io],
        windingEpsilon = 1e-9,
        qualityEpsilon = 1e-6,
        paL = pa - windingEpsilon,
        paR = pa + windingEpsilon,
        windingL = 0,
        windingR = 0,
        pathWindingL = 0,
        pathWindingR = 0,
        onPath = false,
        onAnyPath = false,
        quality = 1,
        roots = [],
        vPrev,
        vClose;

    function addWinding(v) {
        var o0 = v[io + 0],
            o3 = v[io + 6];
        if (po < min(o0, o3) || po > max(o0, o3)) {
            return;
        }
        var a0 = v[ia + 0],
            a1 = v[ia + 2],
            a2 = v[ia + 4],
            a3 = v[ia + 6];
        if (o0 === o3) {
            if (a0 < paR && a3 > paL || a3 < paR && a0 > paL) {
                onPath = true;
            }
            return;
        }
        var t = po === o0 ? 0
            : po === o3 ? 1
                : paL > max(a0, a1, a2, a3) || paR < min(a0, a1, a2, a3)
                    ? 1
                    : Curve.solveCubic(v, io, po, roots, 0, 1) > 0
                        ? roots[0]
                        : 1,
            a = t === 0 ? a0
                : t === 1 ? a3
                    : Curve.getPoint(v, t)[dir ? 'y' : 'x'],
            winding = o0 > o3 ? 1 : -1,
            windingPrev = vPrev[io] > vPrev[io + 6] ? 1 : -1,
            a3Prev = vPrev[ia + 6];
        if (po !== o0) {
            if (a < paL) {
                pathWindingL += winding;
            } else if (a > paR) {
                pathWindingR += winding;
            } else {
                onPath = true;
            }
            if (a > pa - qualityEpsilon && a < pa + qualityEpsilon)
                quality /= 2;
        } else {
            if (winding !== windingPrev) {
                if (a0 < paL) {
                    pathWindingL += winding;
                } else if (a0 > paR) {
                    pathWindingR += winding;
                }
            } else if (a0 != a3Prev) {
                if (a3Prev < paR && a > paR) {
                    pathWindingR += winding;
                    onPath = true;
                } else if (a3Prev > paL && a < paL) {
                    pathWindingL += winding;
                    onPath = true;
                }
            }
            quality /= 4;
        }
        vPrev = v;
        return !dontFlip && a > paL && a < paR
            && Curve.getTangent(v, t)[dir ? 'x' : 'y'] === 0
            && getWinding(point, curves, !dir, closed, true);
    }

    function handleCurve(v) {
        var o0 = v[io + 0],
            o1 = v[io + 2],
            o2 = v[io + 4],
            o3 = v[io + 6];
        if (po <= max(o0, o1, o2, o3) && po >= min(o0, o1, o2, o3)) {
            var a0 = v[ia + 0],
                a1 = v[ia + 2],
                a2 = v[ia + 4],
                a3 = v[ia + 6],
                monoCurves = paL > max(a0, a1, a2, a3) ||
                    paR < min(a0, a1, a2, a3)
                    ? [v] : Curve.getMonoCurves(v, dir),
                res;
            for (var i = 0, l = monoCurves.length; i < l; i++) {
                if (res = addWinding(monoCurves[i]))
                    return res;
            }
        }
    }

    for (var i = 0, l = curvesList.length; i < l; i++) {
        var curve = curvesList[i],
            path = curve._path,
            v = curve.getValues(),
            res;
        if (!i || curvesList[i - 1]._path !== path) {
            vPrev = null;
            if (!path._closed) {
                vClose = Curve.getValues(
                    path.getLastCurve().getSegment2(),
                    curve.getSegment1(),
                    null, !closed);
                if (vClose[io] !== vClose[io + 6]) {
                    vPrev = vClose;
                }
            }

            if (!vPrev) {
                vPrev = v;
                var prev = path.getLastCurve();
                while (prev && prev !== curve) {
                    var v2 = prev.getValues();
                    if (v2[io] !== v2[io + 6]) {
                        vPrev = v2;
                        break;
                    }
                    prev = prev.getPrevious();
                }
            }
        }

        if (res = handleCurve(v))
            return res;

        if (i + 1 === l || curvesList[i + 1]._path !== path) {
            if (vClose && (res = handleCurve(vClose)))
                return res;
            if (onPath && !pathWindingL && !pathWindingR) {
                pathWindingL = pathWindingR = path.isClockwise(closed) ^ dir
                    ? 1 : -1;
            }
            windingL += pathWindingL;
            windingR += pathWindingR;
            pathWindingL = pathWindingR = 0;
            if (onPath) {
                onAnyPath = true;
                onPath = false;
            }
            vClose = null;
        }
    }
    windingL = abs(windingL);
    windingR = abs(windingR);
    return {
        winding: max(windingL, windingR),
        windingL: windingL,
        windingR: windingR,
        quality: quality,
        onPath: onAnyPath
    };
}
function filterIntersection(inter) {
    return inter.hasOverlap() || inter.isCrossing();
}
function tracePaths(segments, operator) {
    var paths = [],
        starts;

    function isValid(seg) {
        var winding;
        return !!(seg && !seg._visited && (!operator
            || operator[(winding = seg._winding || {}).winding]
            && !(operator.unite && winding.winding === 2
                && winding.windingL && winding.windingR)));
    }

    function isStart(seg) {
        if (seg) {
            for (var i = 0, l = starts.length; i < l; i++) {
                if (seg === starts[i])
                    return true;
            }
        }
        return false;
    }

    function visitPath(path) {
        var segments = path._segments;
        for (var i = 0, l = segments.length; i < l; i++) {
            segments[i]._visited = true;
        }
    }

    function getCrossingSegments(segment, collectStarts) {
        var inter = segment._intersection,
            start = inter,
            crossings = [];
        if (collectStarts)
            starts = [segment];

        function collect(inter, end) {
            while (inter && inter !== end) {
                var other = inter._segment,
                    path = other && other._path;
                if (path) {
                    var next = other.getNext() || path.getFirstSegment(),
                        nextInter = next._intersection;
                    if (other !== segment && (isStart(other)
                        || isStart(next)
                        || next && (isValid(other) && (isValid(next)
                            || nextInter && isValid(nextInter._segment))))
                    ) {
                        crossings.push(other);
                    }
                    if (collectStarts)
                        starts.push(other);
                }
                inter = inter._next;
            }
        }

        if (inter) {
            collect(inter);
            while (inter && inter._previous)
                inter = inter._previous;
            collect(inter, start);
        }
        return crossings;
    }

    segments.sort(function (seg1, seg2) {
        var inter1 = seg1._intersection,
            inter2 = seg2._intersection,
            over1 = !!(inter1 && inter1._overlap),
            over2 = !!(inter2 && inter2._overlap),
            path1 = seg1._path,
            path2 = seg2._path;
        return over1 ^ over2
            ? over1 ? 1 : -1
            : !inter1 ^ !inter2
                ? inter1 ? 1 : -1
                : path1 !== path2
                    ? path1._id - path2._id
                    : seg1._index - seg2._index;
    });

    for (var i = 0, l = segments.length; i < l; i++) {
        var seg = segments[i],
            valid = isValid(seg),
            path = null,
            finished = false,
            closed = true,
            branches = [],
            branch,
            visited,
            handleIn;
        if (valid && seg._path._overlapsOnly) {
            var path1 = seg._path,
                path2 = seg._intersection._segment._path;
            if (path1.compare(path2)) {
                if (path1.getArea())
                    paths.push(path1.clone(false));
                visitPath(path1);
                visitPath(path2);
                valid = false;
            }
        }
        while (valid) {
            var first = !path,
                crossings = getCrossingSegments(seg, first),
                other = crossings.shift(),
                finished = !first && (isStart(seg) || isStart(other)),
                cross = !finished && other;
            if (first) {
                // path = new Path(Item.NO_INSERT);
                path = new Path2();
                branch = null;
            }
            if (finished) {
                if (seg.isFirst() || seg.isLast())
                    closed = seg._path._closed;
                seg._visited = true;
                break;
            }
            if (cross && branch) {
                branches.push(branch);
                branch = null;
            }
            if (!branch) {
                if (cross)
                    crossings.push(seg);
                branch = {
                    start: path._segments.length,
                    crossings: crossings,
                    visited: visited = [],
                    handleIn: handleIn
                };
            }
            if (cross)
                seg = other;
            if (!isValid(seg)) {
                path.removeSegments(branch.start);
                for (var j = 0, k = visited.length; j < k; j++) {
                    visited[j]._visited = false;
                }
                visited.length = 0;
                do {
                    seg = branch && branch.crossings.shift();
                    if (!seg || !seg._path) {
                        seg = null;
                        branch = branches.pop();
                        if (branch) {
                            visited = branch.visited;
                            handleIn = branch.handleIn;
                        }
                    }
                } while (branch && !isValid(seg));
                if (!seg)
                    break;
            }
            var next = seg.getNext();
            path.add(new Segment(seg._point, handleIn,
                next && seg._handleOut));
            seg._visited = true;
            visited.push(seg);
            seg = next || seg._path.getFirstSegment();
            handleIn = next && next._handleIn;
        }
        if (finished) {
            if (closed) {
                path.getFirstSegment().setHandleIn(handleIn);
                path.setClosed(closed);
            }
            if (path.getArea() !== 0) {
                paths.push(path);
            }
        }
    }
    return paths;
}
function createResult(paths, simplify, path1, path2, options) {
    if(paths.length===1)
    {
        return paths[0]
    }
    var result = new CompoundPath();
    result.addChildren(paths, true);
    // result = result.reduce({ simplify: simplify });
    // if (!(options && options.insert == false)) {
    //     result.insertAbove(path2 && path1.isSibling(path2)
    //         && path1.getIndex() < path2.getIndex() ? path2 : path1);
    // }
    // result.copyAttributes(path1, true);
    return result;
}
function reorientPaths(paths, isInside, clockwise) {
    var length = paths && paths.length;
    if (length) {
        var lookup = Base.each(paths, function (path, i) {
            this[path._id] = {
                container: null,
                winding: path.isClockwise() ? 1 : -1,
                index: i
            };
        }, {}),
            sorted = paths.slice().sort(function (a, b) {
                return abs(b.getArea()) - abs(a.getArea());
            }),
            first = sorted[0];
        var collisions = CollisionDetection.findItemBoundsCollisions(sorted,
            null, Numerical.GEOMETRIC_EPSILON);
        if (clockwise == null)
            clockwise = first.isClockwise();
        for (var i = 0; i < length; i++) {
            var path1 = sorted[i],
                entry1 = lookup[path1._id],
                containerWinding = 0,
                indices = collisions[i];
            if (indices) {
                var point = null;
                for (var j = indices.length - 1; j >= 0; j--) {
                    if (indices[j] < i) {
                        point = point || path1.getInteriorPoint();
                        var path2 = sorted[indices[j]];
                        if (path2.contains(point)) {
                            var entry2 = lookup[path2._id];
                            containerWinding = entry2.winding;
                            entry1.winding += containerWinding;
                            entry1.container = entry2.exclude
                                ? entry2.container : path2;
                            break;
                        }
                    }
                }
            }
            if (isInside(entry1.winding) === isInside(containerWinding)) {
                entry1.exclude = true;
                paths[entry1.index] = null;
            } else {
                var container = entry1.container;
                path1.setClockwise(
                    container ? !container.isClockwise() : clockwise);
            }
        }
    }
    return paths;
}
function reorient(paths, nonZero, clockwise) {
    var children = paths._children;
    if (children && children.length) {
        this.setChildren(reorientPaths(paths.removeChildren(),
            function (w) {
                return !!(nonZero ? w : w & 1);
            },
            clockwise));
    } else if (clockwise !== undefined) {
        this.setClockwise(clockwise);
    }
    return this;
}


export default traceBoolean
export { fastIntersect }