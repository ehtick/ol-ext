import ol_source_Vector from "ol/source/Vector.js";
import ol_Feature from "ol/Feature.js";
import ol_geom_MultiPolygon from "ol/geom/MultiPolygon.js";

/** Contour source
 * Code by KingLL2000
 * Generate contour polygons from grid data using d3-contour.
 * Coordinates are assumed to be in EPSG:4326.
 *
 * Main input is a regular grid:
 * `{ x:number[][], y:number[][], z:number[][] }`.
 *
 * - `x`: longitude/easting matrix
 * - `y`: latitude/northing matrix
 * - `z`: value matrix (`null` / `undefined` treated as no-data)
 *
 * @remarks
 * This source only accepts grid data. You must pass `options.data` and `options.thresholds`.
 * It does not compute min/max, does not normalize values, and does not perform coordinate transforms.
 * Style the result in a vector layer using the feature `value` attribute.
 * Thresholds can be set via the class property source.thresholds. Use a number of levels; it is passed directly to d3-contour.
 *
 * @constructor
 * @extends {ol/source/Vector}
 * @param {*} [options] extend ol/source/Vector options
 *  @param {Object} [options.data] grid data {x,y,z}
 *  @param {number} options.thresholds contour thresholds
 * @example
 * var data = {
 *   x: [[8.475, 8.5, 8.525], [8.475, 8.5, 8.525]],
 *   y: [[47.42, 47.42, 47.42], [47.4, 47.4, 47.4]],
 *   z: [[null, 2, null], [2, 5, 2]]
 * };
 * var source = new ol.source.Contour({
 *   data: data,
 *   thresholds: 6 // number of levels
 * });
 *
 * var layer = new ol.layer.Vector({
 *   source: source,
 *   style: function (f) {
 *     var v = Number(f.get("value")) || 0;
 *     return new ol.style.Style({
 *       fill: new ol.style.Fill({ color: v > 12 ? "#67001f" : "#eaf1f5" }),
 *       stroke: new ol.style.Stroke({ color: "#053061", width: 1 })
 *     });
 *   }
 * });
 */
var ol_source_Contour = class olsourceContour extends ol_source_Vector {
  constructor(options) {
    options = options || {};
    var data = options.data;
    delete options.data;
    super(options);

    this._grid = null;
    this.set("thresholds", options.thresholds);

    if (data) {
      this.setData(data);
    } else {
      this.calculateContours();
    }
  }
  /** Set grid data
   * @param {{x:number[][],y:number[][],z:number[][]}} data
   */
  setData(data) {
    this._grid = this._normalizeGridData(data);
    this.calculateContours();
  }

  /** Get contour thresholds
   * @returns {number|undefined}
   */
  get thresholds() {
    return this.get("thresholds");
  }
  /** Set contour thresholds
   * @param {number} value
   */
  set thresholds(value) {
    this.set("thresholds", value);
    this.calculateContours();
  }
  /** Recompute contour polygons
   */
  calculateContours() {
    this.clear();

    var contourFactory = this._getContourFactory();
    if (!contourFactory) {
      console.error("[ol/source/Contour] d3-contour is not available.");
      return;
    }

    var grid = this._grid;
    if (!grid) return;

    var thresholds = this.get("thresholds");
    if (typeof thresholds === "undefined" || thresholds === null) return;

    var contour = contourFactory()
      .size([grid.width, grid.height])
      .thresholds(thresholds);

    var polygons = contour(grid.values);
    polygons.forEach(function (g) {
      if (!g.coordinates || !g.coordinates.length) return;
      var geom = new ol_geom_MultiPolygon(this._gridToMapCoordinates(g.coordinates, grid));
      var feature = new ol_Feature(geom);
      feature.set("value", g.value);
      this.addFeature(feature);
    }.bind(this));
  }
  /** Get contour factory in module/browser contexts
   * @returns {function|null}
   * @private
   */
  _getContourFactory() {
    // if (typeof contours === "function") return d3.contours;
    if (typeof d3 !== "undefined" && typeof d3.contours === "function")
      return d3.contours;
    return null;
  }
  /** Normalize grid data (lightweight validation only)
   * @param {{x:number[][],y:number[][],z:number[][]}} data
   * @returns {*}
   * @private
   */
  _normalizeGridData(data) {
    if (
      !data ||
      !Array.isArray(data.x) ||
      !Array.isArray(data.y) ||
      !Array.isArray(data.z)
    ) {
      throw new Error(
        "[ol/source/Contour] Invalid grid data, expected {x:number[][], y:number[][], z:number[][]}.",
      );
    }

    var h = data.z.length;
    if (!h) throw new Error("[ol/source/Contour] Empty z grid.");
    var w = Array.isArray(data.z[0]) ? data.z[0].length : 0;
    if (!w) throw new Error("[ol/source/Contour] Invalid z grid width.");

    for (var j = 0; j < h; j++) {
      if (
        !Array.isArray(data.x[j]) ||
        !Array.isArray(data.y[j]) ||
        !Array.isArray(data.z[j]) ||
        data.x[j].length !== w ||
        data.y[j].length !== w ||
        data.z[j].length !== w
      ) {
        throw new Error(
          "[ol/source/Contour] x/y/z grids must have identical rectangular shape.",
        );
      }
    }

    var values = new Array(w * h);
    for (var jj = 0; jj < h; jj++) {
      for (var ii = 0; ii < w; ii++) {
        var zv = data.z[jj][ii];
        values[jj * w + ii] = (zv === null || typeof zv === "undefined") ? NaN : Number(zv);
      }
    }

    return {
      raw: data,
      width: w,
      height: h,
      x: data.x,
      y: data.y,
      values: values,
    };
  }
  /** Convert contour grid coordinates into map coordinates
   * @param {Array} coordinates
   * @param {*} grid
   * @returns {Array}
   * @private
   */
  _gridToMapCoordinates(coordinates, grid) {
    return coordinates.map(
      function (poly) {
        return poly.map(
          function (ring) {
            var r = ring.map(
              function (pt) {
                return this._unitToGeographic(grid.x, grid.y, pt[1], pt[0]);
              }.bind(this),
            );
            if (
              r.length &&
              (r[0][0] !== r[r.length - 1][0] || r[0][1] !== r[r.length - 1][1])
            ) {
              r.push(r[0]);
            }
            return r;
          }.bind(this),
        );
      }.bind(this),
    );
  }
  /** Convert unit grid coordinates into geographic coordinates (leaflet-contour style)
   * @param {Array<Array<number>>} gridx
   * @param {Array<Array<number>>} gridy
   * @param {number} i
   * @param {number} j
   * @returns {Array<number>}
   * @private
   */
  _unitToGeographic(gridx, gridy, i, j) {
    var ii = Math.floor(i);
    var jj = Math.floor(j);
    var x, y;
    if (
      gridx[ii][jj] !== null &&
      gridx[ii][jj + 1] !== null &&
      gridx[ii + 1][jj] !== null &&
      gridx[ii + 1][jj + 1] !== null
    ) {
      x =
        ((gridx[ii + 1][jj + 1] - gridx[ii + 1][jj]) * (j - jj) +
          gridx[ii + 1][jj] +
          ((gridx[ii][jj + 1] - gridx[ii][jj]) * (j - jj) + gridx[ii][jj])) /
        2;
      y =
        ((gridy[ii + 1][jj] - gridy[ii][jj]) * (i - ii) +
          gridy[ii][jj] +
          ((gridy[ii + 1][jj + 1] - gridy[ii][jj + 1]) * (i - ii) +
            gridy[ii][jj + 1])) /
        2;
    } else {
      x = gridx[ii][jj];
      y = gridy[ii][jj];
    }

    return [x, y];
  }
};

export default ol_source_Contour;












