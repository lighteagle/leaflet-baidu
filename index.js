/**
 * Projection class for Baidu Spherical Mercator
 *
 * @class BaiduSphericalMercator
 */
 L.Projection.BaiduSphericalMercator = {
  /**
   * Project latLng to point coordinate
   *
   * @method project
   * @param {Object} latLng coordinate for a point on earth
   * @return {Object} leafletPoint point coordinate of L.Point
   */
  project: function (latLng) {
    const bpoint = BaiduMercator.forward([latLng.lng, latLng.lat]);

    return L.point(bpoint[0], bpoint[1]);
  },

  /**
   * unproject point coordinate to latLng
   *
   * @method unproject
   * @param {Object} bpoint baidu point coordinate
   * @return {Object} latitude and longitude
   */
  unproject: function (bpoint) {
    const blatlng = BaiduMercator.inverse([bpoint.x, bpoint.y]);

    return L.latLng(blatlng[1], blatlng[0]);
  },

  /**
   * Don't know how it used currently.
   *
   * However, I guess this is the range of coordinate.
   * Range of pixel coordinate is gotten from
   * BMap.MercatorProjection.lngLatToPoint(180, -90) and (180, 90)
   * After getting max min value of pixel coordinate, use
   * pointToLngLat() get the max lat and Lng.
   */
  bounds: (function () {
    var MAX_X = 20037726.37;
    var MIN_Y = -11708041.66;
    var MAX_Y = 12474104.17;
    var bounds = L.bounds(
      [-MAX_X, MIN_Y], //-180, -71.988531
      [MAX_X, MAX_Y]  //180, 74.000022
    );
    var MAX = 33554432;
    bounds = new L.Bounds(
      [-MAX, -MAX],
      [MAX, MAX]
    );
    return bounds;
  })()
};

/**
 * Coordinate system for Baidu EPSG3857
 *
 * @class BEPSG3857
 */
L.CRS.BEPSG3857 = L.extend({}, L.CRS, {
  code: 'EPSG:3857',
  projection: L.Projection.BaiduSphericalMercator,

  transformation: (function () {
    var z = -18 - 8;
    var scale = Math.pow(2, z);
    return new L.Transformation(scale, 0.5, -scale, 0.5);
  }())
});

/**
 * Tile layer for Baidu Map
 *
 * @class Baidu
 */
L.TileLayer.Baidu = L.TileLayer.extend({
  statics: {
    attribution: '© 2016 Baidu - GS(2016)1069号&nbsp;- Data © 长地万方 &amp; ' +
      '<a target="_blank" href="http://www.navinfo.com/">NavInfo</a> &amp; ' +
      '<a target="_blank" href="http://www.openstreetmap.org/">OpenStreetMap</a> &amp; ' +
      '<a target="_blank" href="http://corporate.navteq.com/supplier_terms.html">HERE</a>&nbsp;&nbsp;|&nbsp;&nbsp;' +
      '<a target="_blank" href="//www.baidu.com">百度首页</a>&nbsp;&nbsp;|&nbsp;&nbsp;' +
      '<a target="_blank" href="http://lbsyun.baidu.com">地图开放平台</a>&nbsp;&nbsp;|&nbsp;&nbsp;' +
      '<a target="_blank" href="http://biaozhu.baidu.com/?from=mapbottom">商户免费标注</a>&nbsp;&nbsp;|&nbsp;&nbsp;' +
      '<a target="_blank" href="http://qingting.baidu.com/index?pid=24">意见建议</a>'
  },

  options: {
    minZoom: 3,
    maxZoom: 19
  },

  initialize: function (type, options) {
    var desc = L.TileLayer.Baidu.desc;
    type = type || 'Normal.Map';
    var parts = type.split('.');
    var mapName = parts[0],
      mapType = parts[1];
    var url = desc[mapName][mapType];
    options = options || {};
    options.subdomains = desc.subdomains;
    options.attribution = L.TileLayer.Baidu.attribution;
    L.TileLayer.prototype.initialize.call(this, url, options);
  },

  getTileUrl: function (coords) {
    var offset = Math.pow(2, coords.z - 1),
      x = coords.x - offset,
      y = offset - coords.y - 1,
      baiduCoords = L.point(x, y);
    baiduCoords.z = coords.z;
    return L.TileLayer.prototype.getTileUrl.call(this, baiduCoords);
  }
});

L.TileLayer.Baidu.desc = {
  Normal: {
    Map: 'http://online{s}.map.bdimg.com/tile/?qt=tile&x={x}&y={y}&z={z}&styles=pl'
  },
  Satellite: {
    Map: 'http://shangetu{s}.map.bdimg.com/it/u=x={x};y={y};z={z};v=009;type=sate&fm=46',
    Road: 'http://online{s}.map.bdimg.com/tile/?qt=tile&x={x}&y={y}&z={z}&styles=sl'
  },
  subdomains: '0123456789'
};

L.tileLayer.baidu = function (type, options) {
  return new L.TileLayer.Baidu(type, options);
};

L.BaiduMap = L.Map.extend({
  options: {
    crs: L.CRS.BEPSG3857
  }
});

L.baiduMap = function (id, options) {
  return new L.BaiduMap(id, options);
};

const transformBounds = {
  wgs2bd: bounds => {
    const wgsNe = bounds.getNorthEast();
    const wgsSw = bounds.getSouthWest();

    const bdNe = wgs2bd(wgsNe.lat, wgsNe.lng);
    const bdSw = wgs2bd(wgsSw.lat, wgsSw.lng);

    return L.latLngBounds(
      [bdSw.lat, bdSw.lng],
      [bdNe.lat, bdNe.lng]
    );
  },
  bd2wgs: bounds => {
    const bdNe = bounds.getNorthEast();
    const bdSw = bounds.getSouthWest();

    const wgsNe = bd2wgs(bdNe.lat, bdNe.lng);
    const wgsSw = bd2wgs(bdSw.lat, bdSw.lng);
    // const wgsNe = gcj2wgs(bdNe.lat, bdNe.lng);
    // const wgsSw = gcj2wgs(bdSw.lat, bdSw.lng);

    return L.latLngBounds(
      [wgsNe.lat, wgsNe.lng],
      [wgsSw.lat, wgsSw.lng]
    );
  }
};




const BaiduMercator = {
  MCBAND: [12890594.86, 8362377.87, 5591021, 3481989.83, 1678043.12, 0],

  LLBAND: [75, 60, 45, 30, 15, 0],

  MC2LL: [
      [1.410526172116255e-8, 0.00000898305509648872, -1.9939833816331,
          200.9824383106796, -187.2403703815547, 91.6087516669843,
          -23.38765649603339, 2.57121317296198, -0.03801003308653,
          17337981.2],
      [-7.435856389565537e-9, 0.000008983055097726239,
          -0.78625201886289, 96.32687599759846, -1.85204757529826,
          -59.36935905485877, 47.40033549296737, -16.50741931063887,
          2.28786674699375, 10260144.86],
      [-3.030883460898826e-8, 0.00000898305509983578, 0.30071316287616,
          59.74293618442277, 7.357984074871, -25.38371002664745,
          13.45380521110908, -3.29883767235584, 0.32710905363475,
          6856817.37],
      [-1.981981304930552e-8, 0.000008983055099779535, 0.03278182852591,
          40.31678527705744, 0.65659298677277, -4.44255534477492,
          0.85341911805263, 0.12923347998204, -0.04625736007561,
          4482777.06],
      [3.09191371068437e-9, 0.000008983055096812155, 0.00006995724062,
          23.10934304144901, -0.00023663490511, -0.6321817810242,
          -0.00663494467273, 0.03430082397953, -0.00466043876332,
          2555164.4],
      [2.890871144776878e-9, 0.000008983055095805407, -3.068298e-8,
          7.47137025468032, -0.00000353937994, -0.02145144861037,
          -0.00001234426596, 0.00010322952773, -0.00000323890364,
          826088.5]],

  LL2MC: [
      [-0.0015702102444, 111320.7020616939, 1704480524535203,
          -10338987376042340, 26112667856603880,
          -35149669176653700, 26595700718403920,
          -10725012454188240, 1800819912950474, 82.5],
      [0.0008277824516172526, 111320.7020463578, 647795574.6671607,
          -4082003173.641316, 10774905663.51142, -15171875531.51559,
          12053065338.62167, -5124939663.577472, 913311935.9512032,
          67.5],
      [0.00337398766765, 111320.7020202162, 4481351.045890365,
          -23393751.19931662, 79682215.47186455, -115964993.2797253,
          97236711.15602145, -43661946.33752821, 8477230.501135234,
          52.5],
      [0.00220636496208, 111320.7020209128, 51751.86112841131,
          3796837.749470245, 992013.7397791013, -1221952.21711287,
          1340652.697009075, -620943.6990984312, 144416.9293806241,
          37.5],
      [-0.0003441963504368392, 111320.7020576856, 278.2353980772752,
          2485758.690035394, 6070.750963243378, 54821.18345352118,
          9540.606633304236, -2710.55326746645, 1405.483844121726,
          22.5],
      [-0.0003218135878613132, 111320.7020701615, 0.00369383431289,
          823725.6402795718, 0.46104986909093, 2351.343141331292,
          1.58060784298199, 8.77738589078284, 0.37238884252424, 7.45]],


  getRange: (v, min, max) => {
    v = Math.max(v, min);
    v = Math.min(v, max);

    return v;
  },

  getLoop: (v, min, max) => {
    var d = max - min;
    while (v > max) {
      v -= d;
    }
    while (v < min) {
      v += d;
    }

    return v;
  },

  convertor: (input, table) => {
    var px = input[0];
    var py = input[1];
    var x = table[0] + table[1] * Math.abs(px);
    var d = Math.abs(py) / table[9];
    var y = table[2]
        + table[3]
        * d
        + table[4]
        * d
        * d
        + table[5]
        * d
        * d
        * d
        + table[6]
        * d
        * d
        * d
        * d
        + table[7]
        * d
        * d
        * d
        * d
        * d
        + table[8]
        * d
        * d
        * d
        * d
        * d
        * d;

    return [
      x * (px < 0 ? -1 : 1),
      y * (py < 0 ? -1 : 1)
    ];
  },

  forward: input => {
    var lng = BaiduMercator.getLoop(input[0], -180, 180);
    var lat = BaiduMercator.getRange(input[1], -74, 74);

    var table = null;
    var j;
    for (j = 0; j < BaiduMercator.LLBAND.length; ++j) {
      if (lat >= BaiduMercator.LLBAND[j]) {
        table = BaiduMercator.LL2MC[j];
        break;
      }
    }
    if (table === null) {
      for (j = BaiduMercator.LLBAND.length - 1; j >= 0; --j) {
        if (lat <= -BaiduMercator.LLBAND[j]) {
          table = BaiduMercator.LL2MC[j];
          break;
        }
      }
    }

    return BaiduMercator.convertor([lng, lat], table);
  },

  inverse: input => {
    var y_abs = Math.abs(input[1]);

    var table = null;
    for (var j = 0; j < BaiduMercator.MCBAND.length; j++) {
      if (y_abs >= BaiduMercator.MCBAND[j]) {
        table = BaiduMercator.MC2LL[j];
        break;
      }
    }

    return BaiduMercator.convertor(input, table);
  }
};


let center = L.latLng([39.9075, 116.3913]); // always set WGS value by default
let zoom = 17;

let map;

let currentLayer;
const defaultLayer = 'baidu';

const mapOptions = {
  mapbox: {},
  baidu: {},
  baidusat: {},
  tianditu: {},
  tianditusat: {},
  gaode: {},
  gaodesat: {},
  geoq: {},
  googlecn: {}
};

const layers = {
  mapbox: L.tileLayer('https://api.tiles.mapbox.com/v4/{id}/{z}/{x}/{y}.png?access_token={accessToken}', {
    id: 'indooratlas.k4e5o551',
    accessToken: 'pk.eyJ1IjoiaW5kb29yYXRsYXMiLCJhIjoiYmU1YjNiZmQ4MzNiNDYwMTRiNDEzMDMxOWUwMjk2ZTYifQ.gXOMtDENS3b8i7aJ6qsjSA',
    maxZoom: 23,
    detectRetina: true
  }),

  mapboxsat: L.tileLayer('https://api.tiles.mapbox.com/v4/{id}/{z}/{x}/{y}.png?access_token={accessToken}', {
    id: 'indooratlas.map-uhlzu7ye',
    accessToken: 'pk.eyJ1IjoiaW5kb29yYXRsYXMiLCJhIjoiYmU1YjNiZmQ4MzNiNDYwMTRiNDEzMDMxOWUwMjk2ZTYifQ.gXOMtDENS3b8i7aJ6qsjSA',
    maxZoom: 23,
    detectRetina: true
  }),

  baidu: L.tileLayer.baidu(),

  baidusat: L.tileLayer.baidu('Satellite.Map'),

  tianditu: L.tileLayer.chinaProvider('TianDiTu.Normal.Map', {}),

  tianditusat: L.tileLayer.chinaProvider('TianDiTu.Satellite.Map', {}),

  gaode: L.tileLayer.chinaProvider('GaoDe.Normal.Map', {}),

  gaodesat: L.tileLayer.chinaProvider('GaoDe.Satellite.Map', {}),

  geoq: L.tileLayer.chinaProvider('Geoq.Normal.Color', {}),

  googlecn: L.tileLayer.chinaProvider('Google.Normal.Map', {})
};

const layerButtons = Array.prototype.map.call(document.querySelectorAll('.layer-select'), btn => btn);

const toggleMap = layer => {
  if (currentLayer && layers[currentLayer]) {
    center = map.getCenter();
    zoom = map.getZoom();
    map.remove();
    layerButtons.filter(btn => btn.value === currentLayer).forEach(btn => btn.classList.remove('active'));
  }

  layerButtons.filter(btn => btn.value === layer).forEach(btn => btn.classList.add('active'));

  const mapFn = layer.startsWith('baidu') ? 'baiduMap' : 'map';

  // move center point
  let transformedCenter = center;

  const layerUsesWgs = lr => lr.startsWith('mapbox') || lr.startsWith('tianditu');
  const layerUsesBd = lr => lr.startsWith('baidu');
  const layerUsesGcj = lr => lr.startsWith('gaode') || lr.startsWith('geoq') || lr.startsWith('googlecn');

  let transformFn;
  if (!currentLayer) {
    if (layerUsesBd(defaultLayer)) {
      transformFn = wgs2bd;
    } else if (layerUsesGcj(defaultLayer)) {
      transformFn = wgs2gcj;
    }
  } else if (layerUsesWgs(currentLayer)) {
    if (layerUsesBd(layer)) {
      transformFn = wgs2bd;
    } else if (layerUsesGcj(layer)) {
      transformFn = wgs2gcj;
    }
  } else if (layerUsesBd(currentLayer)) {
    if (layerUsesWgs(layer)) {
      transformFn = bd2wgs;
    } else if (layerUsesGcj(layer)) {
      transformFn = bd2gcj;
    }
  } else if (layerUsesGcj(currentLayer)) {
    if (layerUsesWgs(layer)) {
      transformFn = gcj2wgs;
    } else if (layerUsesBd(layer)) {
      transformFn = gcj2bd;
    }
  }

  if (transformFn) {
    transformedCenter = transformFn(center.lat, center.lng);
  }

  if (currentLayer) {
    if (layer.startsWith('baidu') && !currentLayer.startsWith('baidu')) {
      zoom = zoom + 1;
    }
    if (!layer.startsWith('baidu') && currentLayer.startsWith('baidu')) {
      zoom = zoom - 1;
    }
  }

  const opts = Object.assign({}, mapOptions[layer], {
    center: transformedCenter,
    zoom,
    scrollWheelZoom: true
  });

  map = L[mapFn]('map', opts);

  layers[layer].addTo(map);

  currentLayer = layer;
};

layerButtons.forEach(btn => {
  btn.addEventListener('click', evt => {
    toggleMap(evt.target.value);
  });
});

toggleMap(defaultLayer);

const icon = L.divIcon({
	className: 'marker',
  iconSize: [16, 16],
  iconAnchor: [8, 8]
});

L.marker([22.311517285385072, 113.93344720759232], { icon }).addTo(map);
