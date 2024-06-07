// Objeto mapa
var mapa = L.map("mapaid", {
  center: [9.5, -84],
  zoom: 7,
});

// Capa base Positron de Carto
positromap = L.tileLayer(
  "https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}{r}.png",
  {
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
    subdomains: "abcd",
    maxZoom: 20,
  }
).addTo(mapa);

// Capa base de OSM
osm = L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
  maxZoom: 19,
  attribution:
    '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>',
});

// Capa base de ESRI World Imagery
esriworld = L.tileLayer(
  "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
  {
    attribution:
      "Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community",
  }
);

// Capas base
var mapasbase = {
  "Carto Positron": positromap,
  OpenStreetMap: osm,
};

//Control de capas
control_capas = L.control
  .layers(mapasbase, null, { collapsed: false })
  .addTo(mapa);

// Capa vectorial de polígonos en formato GeoJSON
$.getJSON("datos/cantones.geojson", function (geodata) {
  var capa_cantones = L.geoJson(geodata, {
    style: function (feature) {
      return { color: "black", weight: 1.5, fillOpacity: 0.0 };
    },
    onEachFeature: function (feature, layer) {
      var popupText =
        "<strong>cod_canton</strong>: " +
        feature.properties.cod_canton +
        "<br>" +
        "<strong>nom_canton</strong>: " +
        feature.properties.nom_canton;
      layer.bindPopup(popupText);
    },
  }).addTo(mapa);

  control_capas.addOverlay(capa_cantones, "Cantones de Costa Rica");
});

// Capa vectorial de puntos en formato GeoJSON
$.getJSON("datos/cd_suelo.geojson", function (geodata) {
  var treeIcon = L.divIcon({
    html: '<i class="fas fa-tree" style="color: brown; font-size: 11px;"></i>',
    iconSize: [20, 20], // Dimensiones del ícono
    iconAnchor: [10, 10], // Punto central del ícono
    className: "myDivIcon", // Clase personalizada para más estilos si es necesario
  });

  var cadmio_suelo = L.geoJson(geodata, {
    pointToLayer: function (feature, latlng) {
      return L.marker(latlng, { icon: treeIcon });
    },
    style: function (feature) {
      return { color: "#013220", weight: 2.5 };
    },
    onEachFeature: function (feature, layer) {
      var popupText =
        "<strong>region</strong>: " +
        feature.properties.region +
        "<br>" +
        "<strong>Cd_suelo</strong>: " +
        feature.properties.s_cd_inta +
        "<br>" +
        "<strong>pH_suelo</strong>: " +
        feature.properties.pH_suelo;
      layer.bindPopup(popupText);
    },
  }).addTo(mapa);

  // Capa de puntos agrupados
  var cadmio_suelo_grupo = L.markerClusterGroup({
    spiderfyOnMaxZoom: true,
  });
  cadmio_suelo_grupo.addLayer(cadmio_suelo);

  // Capa de calor (heatmap)
  coordenadas = geodata.features.map((feat) =>
    feat.geometry.coordinates.reverse()
  );
  var cadmio_calor = L.heatLayer(coordenadas, { radius: 30, blur: 1 });

  // Se añaden la capas al mapa y al control de capas
  cadmio_calor.addTo(mapa);
  control_capas.addOverlay(
    cadmio_calor,
    "Capa de calor de contenido de Cd en suelo"
  );

  cadmio_suelo_grupo.addTo(mapa);
  control_capas.addOverlay(cadmio_suelo_grupo, "Registros agrupados de Cd");
  control_capas.addOverlay(cadmio_suelo, "Concentración de Cd en suelo (ppm)");
});

//capa raster
var url_to_geotiff_file = "datos/precipita.tif";

fetch(url_to_geotiff_file)
  .then((response) => response.arrayBuffer())
  .then((arrayBuffer) => {
    parseGeoraster(arrayBuffer).then((georaster) => {
      console.log("georaster:", georaster);

      var layer = new GeoRasterLayer({
        georaster: georaster,
        opacity: 0.8,
        pixelValuesToColorFn: function (value) {
          if (value == -9999) {
            return "rgba(255, 255, 255, 0.0)";
          } else if (value == "0") {
            return "rgba(255, 255, 255, 0.0)";
          } else if (value <= "1500") {
            return "rgb(147, 213, 182)";
          } else if (value <= "2000") {
            return "rgb(174, 223, 183)";
          } else if (value <= "3000") {
            return "rgb(92, 192, 191)";
          } else if (value <= "4000") {
            return "rgb(59, 166, 193)";
          } else if (value <= "5000") {
            return "rgb(37, 52, 148)";
          } else {
            return "red";
          }
        },
        resolution: 512, // optional parameter for adjusting display resolution
      });

      //agregar capa al mapa
      layer.addTo(mapa);

      // agregar capa al control de capas
      control_capas.addOverlay(layer, "Precipitación promedio anual 1960-2013");

      mapa.fitBounds(layer.getBounds());

      // evento on click
      mapa.on("click", function (event) {
        console.log(event, "event");

        var lat = event.latlng.lat;
        var lng = event.latlng.lng;
        var value = geoblaze.identify(georaster, [lng, lat]);

        // Borrar marcadores previos
        mapa.eachLayer(function (layer) {
          if (layer instanceof L.Marker) {
            mapa.removeLayer(layer);
          }
        });

        //Marcador con ventana popup
        var marcador = L.marker([lat, lng])
          .addTo(mapa)
          .bindPopup("Precipitación promedio anual:" + (value) + " mm")
          .openPopup();
      });
    });
  });
