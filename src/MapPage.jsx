import React, { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import Chart from 'chart.js/auto';
import * as turf from '@turf/turf';
import io from 'socket.io-client';
import 'mapbox-gl/dist/mapbox-gl.css';
import './MapPage.css';
import { useLocation, useNavigate } from 'react-router-dom';

mapboxgl.accessToken = 'pk.eyJ1IjoieXZvbm5lMDIxOSIsImEiOiJjbHg0MmNwaHUweHluMmxxM2gxOHRxY3RmIn0.d-D92-Vj4tjgc3aQbvXfKQ';

const MapPage = ({ isAuthenticated,  setAuthenticated}) => {
  const mapContainer = useRef(null);
  const chartContainer = useRef(null);
  const [map, setMap] = useState(null);
  const [markers, setMarkers] = useState([]);
  const [chart, setChart] = useState(null);
  const socketRef = useRef(null);
  const location = useLocation();
  const navigate = useNavigate();
  const queryParams = new URLSearchParams(location.search);
  const userIdFromParams = queryParams.get('userId');
  const routeId = queryParams.get('routeId') || 1;
  const userIdFromState = location.state?.userId;
  const userId = userIdFromState || userIdFromParams;
  const room = `${userId}-${routeId}`;

  // 检查用户是否已登录
  useEffect(() => {
    const checkLoginStatus = async () => {
      try {
        // const response = await fetch('http://localhost:3000/check-login', {
        //   method: 'GET',
        //   credentials: 'include'
        // });
        const response = await fetch('/check-login', {
          method: 'GET',
          credentials: 'include'
        });
        const data = await response.json();
        if (!data.success) {
          navigate('/auth');
        } else {
          setAuthenticated(true);
        }
      } catch (error) {
        console.error('Error checking login status:', error);
      }
    };

    checkLoginStatus();
  }, [setAuthenticated, navigate]);

  useEffect(() => {
    if (isAuthenticated) {
      const initializeMap = async () => {
        const mapInstance = new mapboxgl.Map({
          container: mapContainer.current,
          style: 'mapbox://styles/mapbox/outdoors-v12',
          center: [121.5438, 25.19],
          zoom: 12
        });

        mapInstance.on('style.load', () => {
          mapInstance.addSource('mapbox-dem', {
            type: 'raster-dem',
            url: 'mapbox://mapbox.mapbox-terrain-dem-v1',
            tileSize: 512,
            maxzoom: 20
          });
          mapInstance.setTerrain({ source: 'mapbox-dem', exaggeration: 1 });

          mapInstance.on('sourcedata', async (e) => {
            if (e.sourceId === 'mapbox-dem' && e.isSourceLoaded) {
              console.log('Terrain data loaded');
              await new Promise(resolve => setTimeout(resolve, 500)); // 延迟 0.5 秒
              setMap(mapInstance);
              mapInstance.on('click', handleClick);
            }
          });
        });

        const handleClick = async (e) => {
          try {
            const response = await fetch(
              `https://api.mapbox.com/geocoding/v5/mapbox.places/${e.lngLat.lng},${e.lngLat.lat}.json?access_token=${mapboxgl.accessToken}&language=zh`
            );
            if (!response.ok) {
              throw new Error('Network response was not ok');
            }
            const data = await response.json();

            const popup = new mapboxgl.Popup({ offset: [0, -15], anchor: 'bottom' })
              .setLngLat(e.lngLat)
              .setHTML(
                `<div>
                  <p>placeName: ${data.features[0].place_name}</p>
                  <button id="add-button" class="add-button">新增</button>
                </div>`
              )
              .addTo(mapInstance);

            popup.getElement().querySelector('#add-button').addEventListener('click', () => {
              const markerData = { lng: e.lngLat.lng, lat: e.lngLat.lat, day: 1 };
              const marker = new mapboxgl.Marker()
                .setLngLat([e.lngLat.lng, e.lngLat.lat])
                .addTo(mapInstance);
              setMarkers((prevMarkers) => {
                const newMarkers = [...prevMarkers, marker];
                updatePath(newMarkers);
                return newMarkers;
              });
              popup.remove();
              createNewLabel(marker, data.features[0].place_name);

              socketRef.current.emit('new-marker', { room, userId, routeId: 1, lngLat: markerData });
            });
          } catch (error) {
            console.error('Error fetching geocoding data:', error);
          }
        };

        return () => {
          mapInstance.off('click', handleClick);
        };
      };

      initializeMap();
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (map && markers.length > 0) {
      console.log('updatePath !!!!');
      updatePath();
    }
  }, [map, markers]);

  useEffect(() => {
    if (map && isAuthenticated) {
      fetchInitialMarkers(userId, routeId);
      socketRef.current = io('', {
        withCredentials: true,
      });
      socketRef.current.emit('join-room', room);

      socketRef.current.on('new-marker', (newMarker) => {
        console.log('Received new-marker event:', newMarker);
        const marker = new mapboxgl.Marker()
          .setLngLat([newMarker.lngLat.lng, newMarker.lngLat.lat])
          .addTo(map);
        setMarkers((prevMarkers) => {
          const newMarkers = [...prevMarkers, marker];
          updatePath(newMarkers);
          return newMarkers;
        });
      });

      socketRef.current.on('delete-marker', (lngLat) => {
        console.log('Received delete-marker event:', lngLat);
        setMarkers((prevMarkers) => {
          const updatedMarkers = prevMarkers.filter((marker) => {
            const markerLngLat = marker.getLngLat();
            if (markerLngLat.lng === lngLat.lng && markerLngLat.lat === lngLat.lat) {
              marker.remove();
              return false;
            }
            return true;
          });
          updatePath(updatedMarkers);
          return updatedMarkers;
        });
      });

      socketRef.current.on('connect_error', (err) => {
        console.error('Connection error:', err);
      });

      return () => {
        socketRef.current.disconnect();
      };
    }
  }, [map, isAuthenticated]);

  const fetchInitialMarkers = async (userId, routeId) => {
    try {
      // const response = await fetch(`http://localhost:3000/markers/latest/${userId}/${routeId}`, {
      //   method: 'GET',
      //   headers: {
      //     'Content-Type': 'application/json'
      //   },
      //   credentials: 'include'
      // });
      const response = await fetch(`/markers/latest/${userId}/${routeId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include'
      });
      if (!response.ok) {
        throw new Error('Failed to fetch markers');
      }
      const latestMarkers = await response.json();
      console.log('Fetched markers:', latestMarkers);

      if (map && latestMarkers.length > 0) {
        const newMarkers = latestMarkers.map((marker) => {
          const marker1 = new mapboxgl.Marker()
            .setLngLat([marker.lng, marker.lat])
            .addTo(map);
          createNewLabel(marker1, '已存在的标记');
          return marker1;
        });
        setMarkers((prevMarkers) => {
          const updatedMarkers = [...prevMarkers, ...newMarkers];
          console.log('Updated markers:', updatedMarkers);
          return updatedMarkers;
        });
        updatePath();
      } else {
        console.log('No markers to load or map is not ready');
      }
    } catch (error) {
      console.error('Error fetching initial markers:', error);
    }
  };

  const updatePath = async (currentMarkers = markers) => {
    if (!map) {
      console.log('Map is not ready');
      return;
    }

    console.log('Updating path with markers:', currentMarkers);

    const points = currentMarkers.map((marker) => marker.getLngLat().toArray());
    const waypoints = points.map((point) => point.join(',')).join(';');

    if (currentMarkers.length <= 1) {
      if (map.getLayer('line-line-data')) {
        map.removeLayer('line-line-data');
      }
      updateElevationProfile([[0, 0], [0, 0]]);
      if (map.getSource('line-data')) {
        map.removeSource('line-data');
      }
      return;
    }

    try {
      const query = await fetch(
        `https://api.mapbox.com/directions/v5/mapbox/walking/${waypoints}?geometries=geojson&access_token=${mapboxgl.accessToken}`
      );
      const json = await query.json();

      if (json.routes && json.routes.length > 0) {
        const data = json.routes[0];
        const pathData = {
          type: 'Feature',
          geometry: data.geometry,
          properties: {}
        };

        if (map.getSource('line-data')) {
          map.getSource('line-data').setData(pathData);
        } else {
          map.addSource('line-data', {
            type: 'geojson',
            data: pathData
          });

          map.addLayer({
            id: 'line-line-data',
            type: 'line',
            source: 'line-data',
            paint: {
              'line-width': 4,
              'line-color': '#37a2eb'
            }
          });
        }

        updateElevationProfile(pathData.geometry.coordinates);
      }
    } catch (error) {
      console.error('Error fetching the walking route:', error);
      alert('Failed to retrieve walking route.');
    }
  };

  const updateElevationProfile = async (coordinates) => {
    if (!chartContainer.current) {
      return;
    }

    console.log('Coordinates:', coordinates);

    Object.keys(Chart.instances).forEach(key => {
      Chart.instances[key].destroy();
    });

    const newChart = new Chart(chartContainer.current, {
      type: 'line',
      data: {
        labels: [],
        datasets: [{ data: [], fill: false, tension: 0.4 }]
      },
      options: {
        plugins: {
          legend: { display: false },
          title: { display: true, align: 'start', text: 'Elevation (m)' }
        },
        maintainAspectRatio: false,
        responsive: true,
        scales: {
          x: { grid: { display: false } },
          y: { min: 0, grid: { display: false } }
        },
        elements: { point: { radius: 0 } },
        layout: { padding: { top: 6, right: 20, bottom: -10, left: 20 } }
      }
    });

    setChart(newChart);

    if (coordinates.length > 2) {
      console.log('Coordinates length is greater than 2, updating chart');

      const chunks = turf.lineChunk({ type: 'LineString', coordinates }, 1).features;
      console.log('Chunks:', chunks);

      const elevations = [
        ...chunks.map((feature) => {
          const elevation = map.queryTerrainElevation(feature.geometry.coordinates[0]);
          console.log('Elevation for', feature.geometry.coordinates[0], ':', elevation);
          return elevation;
        }),
        map.queryTerrainElevation(chunks[chunks.length - 1].geometry.coordinates[1])
      ];

      console.log('Elevations:', elevations);

      newChart.data.labels = elevations.map(() => '');
      newChart.data.datasets[0].data = elevations;
      newChart.update();
      console.log('finished update', newChart);
    } else {
      newChart.data.labels = [];
      newChart.data.datasets[0].data = [];
      newChart.update();
      console.log('cleared chart', newChart);
    }
  };

  const calculateTotalDistance = (currentMarkers) => {
    let totalDistance = 0;
    for (let i = 0; i < currentMarkers.length - 1; i++) {
      const start = currentMarkers[i].getLngLat();
      const end = currentMarkers[i + 1].getLngLat();
      const distance = turf.distance([start.lng, start.lat], [end.lng, end.lat], { units: 'kilometers' });
      totalDistance += distance;
    }
    return totalDistance;
  };

  const createNewLabel = (marker, placeName) => {
    const infoElementId = `marker${markers.length}-info`;

    const newLabel = document.createElement('div');
    newLabel.id = infoElementId;
    newLabel.innerHTML = `Coordinates: ${marker.getLngLat().lng.toFixed(5)}, ${marker.getLngLat().lat.toFixed(5)}<br>Place Name: ${placeName}`;
    const deleteButton = document.createElement('button');
    deleteButton.innerText = '刪除';
    deleteButton.onclick = () => {
      marker.remove();
      setMarkers((prevMarkers) => {
        const updatedMarkers = prevMarkers.filter((m) => m !== marker);
        updatePath(updatedMarkers);
        return updatedMarkers;
      });
      newLabel.innerHTML = '';
      if (socketRef.current) {
        console.log('send delete marker');
        socketRef.current.emit('delete-marker', { room, lngLat: { lng: marker.getLngLat().lng, lat: marker.getLngLat().lat } });
      }
    };

    newLabel.appendChild(deleteButton);
    document.getElementById('day-1').appendChild(newLabel);
  };

  const generateShareLink = () => {
    const shareLink = `${window.location.origin}/map?userId=${userId}&routeId=1`;
    alert(`分享此連結給朋友: ${shareLink}`);
  };

  return (
    <div className="map-page">
      <div id="other-info">
        <div className="form-container">
          <div>
            <label htmlFor="route-name">路線名稱</label>
            <input type="text" id="route-name" placeholder="輸入路線名稱" />
          </div>
          <div>
            <label htmlFor="start-date">開始日期</label>
            <input type="date" id="start-date" />
          </div>
        </div>
        <div id="day-1">
          <div>第1天</div>
          <div id="walking-time"></div>
        </div>
        <button onClick={generateShareLink}>生成分享連結</button>
      </div>
      <div id="main-info">
        <div ref={mapContainer} id="map"></div>
        <div id="chart-container">
          <canvas ref={chartContainer} id="chart-canvas"></canvas>
        </div>
      </div>
    </div>
  );
};

export default MapPage;
