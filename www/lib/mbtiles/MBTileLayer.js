// inspired by: https://github.com/coomsie/topomap.co.nz/blob/master/Resources/leaflet/TileLayer.DB.js
L.TileLayer.MBTiles = L.TileLayer.extend({
  //db: SQLitePlugin
  mbTilesDB: null,

  initialize: function(url, options, db) {
    this.mbTilesDB = db;

    L.Util.setOptions(this, options);
  },
  getTileUrl: function (tilePoint, zoom, tile) {
    var z = this._getZoomForUrl(zoom);
    var x = tilePoint.x;
    var y = tilePoint.y;
    var base64Prefix = 'data:image/jpg;base64,';
    //console.log("~~~~[ z, x, y: ", z, x, y);


    // FROM tiles **INNER JOIN map ON tiles.tile_id = map.tile_id** WHERE zoom_level
    this.mbTilesDB.transaction(function(tx){
      tx.executeSql("SELECT tile_data FROM tiles WHERE zoom_level=? AND tile_column=? AND tile_row=?;", [z, x, y],
        function (tx, res) {
          //console.log("~~~~[ res.rows.length: ", res.rows.length);
          if (res.rows.length > 0) {
            //console.log("~~~~[ yoyo!");
            //console.log("Found Tile in MbTile, zxy: ", z, x, y);
            //console.log("Found data: ", res);
            tile.src = base64Prefix + res.rows.item(0).tile_data;
          }
        }, function (er) {
          console.log('error with executeSql', er);
        });
    });
  },
  _loadTile: function (tile, tilePoint, zoom) {
    tile._layer = this;
    tile.onload = this._tileOnLoad;
    tile.onerror = this._tileOnError;
    this.getTileUrl(tilePoint, zoom, tile);
  }
});