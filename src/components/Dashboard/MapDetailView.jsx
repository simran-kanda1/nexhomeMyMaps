import React, { useState, useEffect } from 'react';
import { 
    collection, 
    query, 
    where, 
    getDocs, 
    updateDoc, 
    doc, 
    addDoc, 
    deleteDoc 
  } from 'firebase/firestore';
import { GoogleMap, Marker, InfoWindow, Circle, Polyline } from '@react-google-maps/api';
import { firestore } from '../../config/firebase';
import { Edit2, ArrowLeft, MapPin, Trash2, Search, Route, X, Navigation } from 'lucide-react';
import '../../styles/Dashboard.css';

// Geocoding utility function
const geocodeAddress = async (address) => {
  return new Promise((resolve, reject) => {
    if (!window.google || !window.google.maps) {
      reject(new Error('Google Maps API not loaded'));
      return;
    }

    const geocoder = new window.google.maps.Geocoder();
    geocoder.geocode({ address: address }, (results, status) => {
      if (status === 'OK' && results[0]) {
        const { lat, lng } = results[0].geometry.location;
        resolve([lat(), lng()]);
      } else {
        reject(new Error(`Geocoding failed: ${status}`));
      }
    });
  });
};

// Function to calculate distance between two points in meters
const calculateDistance = (lat1, lng1, lat2, lng2) => {
  const R = 6371000; // Earth's radius in meters
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng/2) * Math.sin(dLng/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
};

// Check if a point is within technician service areas
const checkServiceArea = (project, technicians) => {
  const serviceRadius = 80467; // 50 miles in meters
  
  if (!project.point) return false;
  
  for (const technician of technicians) {
    if (!technician.point) continue;
    
    const distance = calculateDistance(
      project.point[0], project.point[1],
      technician.point[0], technician.point[1]
    );
    
    if (distance <= serviceRadius) {
      return true;
    }
  }
  
  return false;
};

// Define marker color options
const markerColors = {
  red: '#F44336',
  orange: '#FF9800',
  green: '#4CAF50',
  blue: '#2196F3',
  purple: '#9C27B0'
};

// Custom Marker Component with selection styling
const CustomMarker = ({ 
  position, 
  color = 'red', 
  onClick, 
  isTechnician = false, 
  isSelected = false,
  isInRoute = false 
}) => {
  const svgMarker = {
    path: "M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z",
    fillColor: markerColors[color] || markerColors.red,
    fillOpacity: isSelected || isInRoute ? 0.9 : 1,
    strokeWeight: isSelected || isInRoute ? 3 : 1.5,
    strokeColor: isSelected ? '#FFD700' : (isInRoute ? '#FF6B35' : '#FFFFFF'),
    rotation: 0,
    scale: isSelected || isInRoute ? 2.5 : 2,
    anchor: new window.google.maps.Point(12, 22),
    labelOrigin: new window.google.maps.Point(12, 9)
  };

  return (
    <>
      <Marker
        position={position}
        icon={svgMarker}
        onClick={onClick}
        animation={isSelected ? window.google.maps.Animation.BOUNCE : null}
      />
      {isTechnician && color === 'blue' && (
        <Circle
          center={position}
          radius={80467} // 50 miles in meters
          options={{
            fillColor: '#2196F3',
            fillOpacity: 0.08,
            strokeColor: '#2196F3',
            strokeOpacity: 0.3,
            strokeWeight: 2
          }}
        />
      )}
    </>
  );
};

// Route Planning Panel Component
const RoutePlanningPanel = ({ 
  isOpen, 
  routeWaypoints, 
  onClearRoute, 
  onRemoveWaypoint, 
  routeInfo,
  onOptimizeRoute,
  isOptimizing 
}) => {
  if (!isOpen) return null;

  return (
    <div className="route-planning-panel">
      <div className="route-header">
        <h3>Route Planning</h3>
        <button onClick={onClearRoute} className="clear-route-btn">
          <X size={16} /> Clear Route
        </button>
      </div>
      
      <div className="route-waypoints">
        {routeWaypoints.map((waypoint, index) => (
          <div key={waypoint.id} className="waypoint-item">
            <span className="waypoint-number">{index + 1}</span>
            <div className="waypoint-info">
              <h4>{waypoint.clientName}</h4>
              <p>{waypoint.address}</p>
            </div>
            <button 
              onClick={() => onRemoveWaypoint(waypoint.id)}
              className="remove-waypoint-btn"
            >
              <X size={14} />
            </button>
          </div>
        ))}
      </div>
      
      {routeWaypoints.length > 1 && (
        <div className="route-actions">
          <button 
            onClick={onOptimizeRoute} 
            className="optimize-route-btn"
            disabled={isOptimizing}
          >
            {isOptimizing ? (
              <>
                <div className="loading-spinner"></div>
                Optimizing...
              </>
            ) : (
              <>
                <Navigation size={16} /> Optimize Route
              </>
            )}
          </button>
          {routeInfo && (
            <div className="route-summary">
              <p><strong>Total Distance:</strong> {routeInfo.distance}</p>
              <p><strong>Total Time:</strong> {routeInfo.duration}</p>
              <p className="route-note">🚗 Optimized for fastest route</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const EditProjectModal = ({ 
    isOpen, 
    onClose, 
    project, 
    onUpdateProject, 
    onDeleteProject 
  }) => {
    const [clientName, setClientName] = useState('');
    const [address, setAddress] = useState('');
    const [phoneNumber, setPhoneNumber] = useState('');
    const [markerColor, setMarkerColor] = useState('red');
    const [isTechnician, setIsTechnician] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  
    useEffect(() => {
      if (project) {
        setClientName(project.clientName || '');
        setAddress(project.address || '');
        setPhoneNumber(project.phoneNumber || '');
        setMarkerColor(project.markerColor || 'red');
        setIsTechnician(project.isTechnician || false);
      }
    }, [project]);
  
    const handleSubmit = async () => {
      setIsLoading(true);
      setError(null);
  
      try {
        const point = await geocodeAddress(address);
  
        const updatedProject = {
          ...project,
          clientName: clientName.trim(),
          address: address.trim(),
          phoneNumber: phoneNumber.trim(),
          markerColor: markerColor,
          isTechnician: isTechnician,
          point: point
        };
  
        await onUpdateProject(updatedProject);
        onClose();
      } catch (err) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };
  
    const handleDelete = async () => {
        try {
          await onDeleteProject(project.id);
          onClose();
        } catch (err) {
          setError(err.message);
        }
      };
  
    if (!isOpen) return null;
  
    return (
        <div className="modal-overlay">
          <div className="modal-content">
            <h2>Edit Information</h2>
            <div>
              <div className="form-group">
                <label htmlFor="clientName">Client Name</label>
                <input
                  type="text"
                  id="clientName"
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  required
                />
              </div>
              <div className="form-group">
                <label htmlFor="address">Address</label>
                <input
                  type="text"
                  id="address"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  required
                />
              </div>
              <div className="form-group">
                <label htmlFor="phoneNumber">Phone Number</label>
                <input
                  type="tel"
                  id="phoneNumber"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="(555) 123-4567"
                />
              </div>
              <div className="form-group">
                <label>
                  <input
                    type="checkbox"
                    checked={isTechnician}
                    onChange={(e) => setIsTechnician(e.target.checked)}
                  />
                  Is Technician (50-mile service radius)
                </label>
              </div>
              <div className="form-group">
                <label htmlFor="markerColor">Marker Color</label>
                <div className="color-selector">
                  {Object.keys(markerColors).map(color => (
                    <div 
                      key={color} 
                      className={`color-option ${markerColor === color ? 'selected' : ''}`}
                      style={{ backgroundColor: markerColors[color] }}
                      onClick={() => setMarkerColor(color)}
                    >
                      {markerColor === color && <span className="checkmark">✓</span>}
                    </div>
                  ))}
                </div>
              </div>
              {error && <div className="error-message">{error}</div>}
              <div className="modal-actions">
                <button 
                  type="button" 
                  onClick={() => setShowDeleteConfirmation(true)} 
                  className="delete-button"
                  disabled={isLoading}
                >
                  Delete
                </button>
                <button 
                  type="button" 
                  onClick={onClose} 
                  className="cancel-button"
                  disabled={isLoading}
                >
                  Cancel
                </button>
                <button 
                  type="button" 
                  onClick={handleSubmit}
                  className="update-button"
                  disabled={isLoading}
                >
                  {isLoading ? 'Updating...' : 'Update'}
                </button>
              </div>
            </div>
          </div>
  
          {showDeleteConfirmation && (
            <div className="modal-overlay">
              <div className="modal-content">
                <h2>Confirm Deletion</h2>
                <p>Are you sure you want to delete this project? This action cannot be undone.</p>
                <div className="modal-actions">
                  <button 
                    type="button" 
                    onClick={() => setShowDeleteConfirmation(false)} 
                    className="cancel-button"
                  >
                    No, Cancel
                  </button>
                  <button 
                    type="button" 
                    onClick={handleDelete} 
                    className="delete-button"
                  >
                    Yes, Delete
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      );
    };

const NewProjectModal = ({ isOpen, onClose, onAddProject, mapName }) => {
  const [clientName, setClientName] = useState('');
  const [address, setAddress] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [markerColor, setMarkerColor] = useState('red');
  const [isTechnician, setIsTechnician] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const point = await geocodeAddress(address);

      const newProject = {
        mapName: mapName,
        clientName: clientName.trim(),
        address: address.trim(),
        phoneNumber: phoneNumber.trim(),
        markerColor: markerColor,
        isTechnician: isTechnician,
        point: point
      };

      await onAddProject(newProject);

      setClientName('');
      setAddress('');
      setPhoneNumber('');
      setMarkerColor('red');
      setIsTechnician(false);
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <h2>Add New Entry</h2>
        <div>
          <div className="form-group">
            <label htmlFor="clientName">Client Name</label>
            <input
              type="text"
              id="clientName"
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
              required
            />
          </div>
          <div className="form-group">
            <label htmlFor="address">Address</label>
            <input
              type="text"
              id="address"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              required
            />
          </div>
          <div className="form-group">
            <label htmlFor="phoneNumber">Phone Number</label>
            <input
              type="tel"
              id="phoneNumber"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              placeholder="(555) 123-4567"
            />
          </div>
          <div className="form-group">
            <label>
              <input
                type="checkbox"
                checked={isTechnician}
                onChange={(e) => setIsTechnician(e.target.checked)}
              />
              Is Technician (50-mile service radius)
            </label>
          </div>
          <div className="form-group">
            <label htmlFor="markerColor">Marker Color</label>
            <div className="color-selector">
              {Object.keys(markerColors).map(color => (
                <div 
                  key={color} 
                  className={`color-option ${markerColor === color ? 'selected' : ''}`}
                  style={{ backgroundColor: markerColors[color] }}
                  onClick={() => setMarkerColor(color)}
                >
                  {markerColor === color && <span className="checkmark">✓</span>}
                </div>
              ))}
            </div>
          </div>
          {error && <div className="error-message">{error}</div>}
          <div className="modal-actions">
            <button type="button" onClick={onClose} className="cancel-button" disabled={isLoading}>
              Cancel
            </button>
            <button type="button" onClick={handleSubmit} className="update-button" disabled={isLoading}>
              {isLoading ? 'Adding...' : 'Submit'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Enhanced Info Window Content with out-of-area indicator
const InfoWindowContent = ({ project, onEdit, onDelete, isOutOfArea }) => {
  return (
    <div className="info-window-content">
      <h3>{project.clientName}</h3>
      <p>{project.address || 'No address provided'}</p>
      {project.phoneNumber && <p>📞 {project.phoneNumber}</p>}
      {project.isTechnician && <p style={{color: '#2196F3', fontWeight: 'bold'}}>🔧 Technician</p>}
      {isOutOfArea && !project.isTechnician && (
        <p className="out-of-area-indicator">⚠️ Out of Service Area</p>
      )}
      
      <div className="info-window-actions">
        <button 
          className="info-window-button edit-button"
          onClick={onEdit}
        >
          <Edit2 size={16} /> Edit
        </button>
        <button 
          className="info-window-button delete-button"
          onClick={onDelete}
        >
          <Trash2 size={16} /> Delete
        </button>
      </div>
    </div>
  );
};

const MapDetailView = ({ map, onBack }) => {
  const [projects, setProjects] = useState([]);
  const [filteredProjects, setFilteredProjects] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProject, setSelectedProject] = useState(null);
  const [isNewProjectModalOpen, setIsNewProjectModalOpen] = useState(false);
  const [isEditProjectModalOpen, setIsEditProjectModalOpen] = useState(false);
  const [mapCenter, setMapCenter] = useState({ 
    lat: map.centerLat || 44.6488, 
    lng: map.centerLng || -63.5752 
  });
  const [isLoading, setIsLoading] = useState(true);
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState(null);
  
  // Route planning state
  const [isRoutePlanningMode, setIsRoutePlanningMode] = useState(false);
  const [routeWaypoints, setRouteWaypoints] = useState([]);
  const [routePath, setRoutePath] = useState([]);
  const [routeInfo, setRouteInfo] = useState(null);
  const [isOptimizing, setIsOptimizing] = useState(false);

  // Calculate service area coverage for all projects
  const calculateServiceAreaCoverage = (allProjects) => {
    const technicians = allProjects.filter(p => p.isTechnician && p.point);
    
    return allProjects.map(project => ({
      ...project,
      isOutOfArea: !project.isTechnician && !checkServiceArea(project, technicians)
    }));
  };

  // Troubleshooting function to handle missing point values
  const troubleshootProjectPoints = async (projectsData) => {
    const troubleshootedProjects = await Promise.all(
      projectsData.map(async (project) => {
        // If point is missing or invalid
        if (!project.point || project.point.length !== 2 || 
            isNaN(Number(project.point[0])) || isNaN(Number(project.point[1]))) {
          
          // Try to geocode if address exists
          if (project.address && project.address.trim() !== '') {
            try {
              const [lat, lng] = await geocodeAddress(project.address);
              
              // Update Firestore document with new point
              const projectRef = doc(firestore, 'projects', project.id);
              await updateDoc(projectRef, { point: [lat, lng] });
              
              return {
                ...project,
                point: [lat, lng]
              };
            } catch (geocodeError) {
              console.warn(`Geocoding failed for project ${project.id}:`, geocodeError);
              // Return project with a flag for no coordinates
              return {
                ...project,
                point: null,
                geocodingError: true
              };
            }
          } else {
            // No address to geocode
            return {
              ...project,
              point: null,
              noAddress: true
            };
          }
        }
        
        // If point is valid, return project as-is
        return project;
      })
    );

    return troubleshootedProjects;
  };

  // Reset state when map changes
  useEffect(() => {
    setProjects([]);
    setSelectedProject(null);
    setIsNewProjectModalOpen(false);
    setMapCenter({ 
      lat: map.centerLat || 44.6488, 
      lng: map.centerLng || -63.5752 
    });
  }, [map]);

  useEffect(() => {
    const fetchProjects = async () => {
      setIsLoading(true);
      try {
        const projectsRef = collection(firestore, 'projects');
        const q = query(projectsRef, where('mapName', '==', map.name));
        const querySnapshot = await getDocs(q);
        
        const projectsData = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          markerColor: doc.data().markerColor || 'red',
          phoneNumber: doc.data().phoneNumber || '',
          isTechnician: doc.data().isTechnician || false
        }));

        // Troubleshoot missing points
        const processedProjects = await troubleshootProjectPoints(projectsData);

        const formattedProjects = processedProjects.map(project => ({
          ...project,
          point: project.point 
            ? [Number(project.point[0] || 44.6488), Number(project.point[1] || -63.5752)]
            : null
        }));

        // Calculate service area coverage
        const projectsWithCoverage = calculateServiceAreaCoverage(formattedProjects);
        
        // Update out-of-area status in Firebase
        projectsWithCoverage.forEach(async (project) => {
          if (project.isOutOfArea !== project.wasOutOfArea) {
            try {
              const projectRef = doc(firestore, 'projects', project.id);
              await updateDoc(projectRef, { isOutOfArea: project.isOutOfArea });
            } catch (error) {
              console.warn('Could not update out-of-area status:', error);
            }
          }
        });

        setProjects(projectsWithCoverage);

        const validProjects = projectsWithCoverage.filter(p => p.point);
        if (validProjects.length > 0) {
          setMapCenter({
            lat: Number(validProjects[0].point[0]),
            lng: Number(validProjects[0].point[1])
          });
        }
      } catch (error) {
        console.error("Error fetching projects:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchProjects();
  }, [map]);

  // Filter and sort projects
  useEffect(() => {
    let filtered = projects.filter(project =>
      project.clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (project.address && project.address.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (project.phoneNumber && project.phoneNumber.includes(searchTerm))
    );

    filtered.sort((a, b) => a.clientName.localeCompare(b.clientName));
    setFilteredProjects(filtered);
  }, [projects, searchTerm]);

  // Route planning functions
  const handleMarkerClick = (project) => {
    if (isRoutePlanningMode) {
      // Add to route if not already included
      if (!routeWaypoints.find(wp => wp.id === project.id)) {
        setRouteWaypoints([...routeWaypoints, project]);
      }
    } else {
      setSelectedProject(project);
      setMapCenter({
        lat: Number(project.point[0]),
        lng: Number(project.point[1])
      });
    }
  };

  const optimizeRoute = async () => {
    if (routeWaypoints.length < 2) return;
    
    setIsOptimizing(true);

    try {
      if (routeWaypoints.length === 2) {
        // For 2 waypoints, just get the direct route
        await getDirectRoute(routeWaypoints);
      } else {
        // For 3+ waypoints, use Route Matrix to optimize
        await optimizeRouteWithMatrix(routeWaypoints);
      }
    } catch (error) {
      console.error('Route optimization error:', error);
      console.log('Falling back to basic route display...');
      createBasicRoute();
    } finally {
      setIsOptimizing(false);
    }
  };

  // Use Route Matrix API to find optimal route order
  const optimizeRouteWithMatrix = async (waypoints) => {
    console.log('Computing route matrix for optimization...');
    
    // Prepare origins and destinations (all waypoints) - correct format for Route Matrix API
    const locations = waypoints.map(wp => ({
      waypoint: {
        location: {
          latLng: {
            latitude: wp.point[0],
            longitude: wp.point[1]
          }
        }
      }
    }));

    const matrixRequest = {
      origins: locations,
      destinations: locations,
      travelMode: 'DRIVE',
      routingPreference: 'TRAFFIC_AWARE_OPTIMAL',
      languageCode: 'en-US',
      units: 'METRIC'
    };

    console.log('Matrix request:', JSON.stringify(matrixRequest, null, 2));

    const matrixResponse = await fetch('https://routes.googleapis.com/distanceMatrix/v2:computeRouteMatrix', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': process.env.REACT_APP_GOOGLE_MAPS_API_KEY,
        'X-Goog-FieldMask': 'originIndex,destinationIndex,duration,distanceMeters,status'
      },
      body: JSON.stringify(matrixRequest)
    });

    if (!matrixResponse.ok) {
      const errorText = await matrixResponse.text();
      console.error('Route Matrix API Error:', errorText);
      throw new Error(`Route Matrix API error: ${matrixResponse.status}`);
    }

    const matrixData = await matrixResponse.json();
    console.log('Route Matrix Response:', matrixData);
    console.log('Response type:', typeof matrixData);
    console.log('Is array:', Array.isArray(matrixData));
    console.log('Response keys:', Object.keys(matrixData));
    
    // Debug: Let's see what one element looks like in detail
    if (Array.isArray(matrixData) && matrixData.length > 0) {
      console.log('First element detailed:', JSON.stringify(matrixData[0], null, 2));
      console.log('Element with duration example:', matrixData.find(el => el.duration));
    }

    // Build distance/time matrix
    const matrix = [];
    const size = waypoints.length;
    
    // Initialize matrix with infinity
    for (let i = 0; i < size; i++) {
      matrix[i] = new Array(size).fill(Infinity);
      matrix[i][i] = 0; // Distance from point to itself is 0
    }

    // Parse the matrix response correctly
    if (Array.isArray(matrixData)) {
      console.log('Processing matrix elements...');
      
      matrixData.forEach((element, index) => {
        console.log(`Element ${index}:`, JSON.stringify(element, null, 2));
        
        // Check if element has the required data
        if (element && typeof element.originIndex === 'number' && typeof element.destinationIndex === 'number') {
          const origin = element.originIndex;
          const dest = element.destinationIndex;
          
          // Check if we have duration data (regardless of status)
          if (element.duration) {
            const durationStr = element.duration.toString();
            const duration = durationStr.includes('s') ? parseInt(durationStr.replace('s', '')) : parseInt(durationStr);
            console.log(`Matrix[${origin}][${dest}] = ${duration} seconds (${Math.round(duration/60)} min)`);
            matrix[origin][dest] = duration;
          } else if (element.distanceMeters) {
            // If we have distance but no duration, estimate based on average speed
            const distance = element.distanceMeters;
            const estimatedDuration = (distance / 1000) / 50 * 3600; // 50 km/h average speed
            console.log(`Matrix[${origin}][${dest}] = ${Math.round(estimatedDuration)} seconds (${Math.round(estimatedDuration/60)} min) - estimated from distance`);
            matrix[origin][dest] = estimatedDuration;
          } else if (origin === dest) {
            // Same location
            matrix[origin][dest] = 0;
          } else {
            // No route data available, estimate using direct distance
            const directDistance = calculateDistance(
              waypoints[origin].point[0], waypoints[origin].point[1],
              waypoints[dest].point[0], waypoints[dest].point[1]
            );
            const estimatedTime = (directDistance / 1000) / 50 * 3600; // 50 km/h average speed
            console.log(`Matrix[${origin}][${dest}] = ${Math.round(estimatedTime)} seconds (${Math.round(estimatedTime/60)} min) - estimated from direct distance (${(directDistance/1000).toFixed(1)} km)`);
            matrix[origin][dest] = estimatedTime;
          }
        } else {
          console.log('Invalid element format:', element);
        }
      });
      
      // Fill in any remaining missing routes with distance estimates
      console.log('Filling in missing routes with distance estimates...');
      for (let i = 0; i < size; i++) {
        for (let j = 0; j < size; j++) {
          if (matrix[i][j] === Infinity && i !== j) {
            const directDistance = calculateDistance(
              waypoints[i].point[0], waypoints[i].point[1],
              waypoints[j].point[0], waypoints[j].point[1]
            );
            const estimatedTime = (directDistance / 1000) / 50 * 3600; // 50 km/h average speed
            console.log(`Filling Matrix[${i}][${j}] = ${Math.round(estimatedTime)} seconds (${Math.round(estimatedTime/60)} min) - direct distance estimate`);
            matrix[i][j] = estimatedTime;
          }
        }
      }
    } else {
      console.error('Unexpected matrix response format:', matrixData);
      console.log('Trying to parse as alternative format...');
      
      // Try alternative parsing in case the response structure is different
      if (matrixData.elements) {
        console.log('Found elements property, processing...');
        matrixData.elements.forEach((element, index) => {
          console.log(`Alt Element ${index}:`, JSON.stringify(element, null, 2));
          // Apply same parsing logic as above
        });
      } else {
        console.log('Falling back to basic route calculation using direct distances');
        
        // Calculate straight-line distances as fallback
        for (let i = 0; i < size; i++) {
          for (let j = 0; j < size; j++) {
            if (i !== j) {
              const distance = calculateDistance(
                waypoints[i].point[0], waypoints[i].point[1],
                waypoints[j].point[0], waypoints[j].point[1]
              );
              // Rough estimate: 50 km/h average speed
              const estimatedTime = (distance / 1000) / 50 * 3600; // seconds
              matrix[i][j] = estimatedTime;
              console.log(`Estimated Matrix[${i}][${j}] = ${Math.round(estimatedTime/60)} minutes (${(distance/1000).toFixed(1)} km)`);
            }
          }
        }
      }
    }

    console.log('Final distance matrix (in minutes):');
    for (let i = 0; i < size; i++) {
      const row = matrix[i].map(val => val === Infinity ? '∞' : Math.round(val/60));
      console.log(`From waypoint ${i} (${waypoints[i].clientName}):`, row);
    }

    // Validate matrix has valid data (including estimated routes)
    let hasValidRoutes = false;
    for (let i = 0; i < size; i++) {
      for (let j = 0; j < size; j++) {
        if (i !== j && matrix[i][j] !== Infinity && matrix[i][j] > 0) {
          hasValidRoutes = true;
          break;
        }
      }
      if (hasValidRoutes) break;
    }

    if (!hasValidRoutes) {
      console.error('No valid routes found in matrix, creating basic distance estimates');
      // Create a complete matrix using distance estimates
      for (let i = 0; i < size; i++) {
        for (let j = 0; j < size; j++) {
          if (i === j) {
            matrix[i][j] = 0;
          } else {
            const directDistance = calculateDistance(
              waypoints[i].point[0], waypoints[i].point[1],
              waypoints[j].point[0], waypoints[j].point[1]
            );
            const estimatedTime = (directDistance / 1000) / 50 * 3600; // 50 km/h average speed
            matrix[i][j] = estimatedTime;
          }
        }
      }
      console.log('Created complete matrix using distance estimates');
    }

    // Find optimal route using nearest neighbor heuristic
    const optimalOrder = findOptimalRoute(matrix, 0); // Start from first waypoint
    
    // Reorder waypoints based on optimal route
    const optimizedWaypoints = optimalOrder.map(index => waypoints[index]);
    
    console.log('Optimal route order:', optimizedWaypoints.map((wp, i) => `${i+1}. ${wp.clientName}`));
    
    // Get the actual route path for the optimized order
    await getOptimizedRoutePath(optimizedWaypoints);
    
    // Update waypoints with optimized order
    setRouteWaypoints(optimizedWaypoints);
  };

  // Traveling Salesman Problem solver using nearest neighbor heuristic
  const findOptimalRoute = (matrix, startIndex = 0) => {
    const size = matrix.length;
    
    if (size <= 1) {
      console.log('Single waypoint, no optimization needed');
      return [0];
    }
    
    if (size === 2) {
      console.log('Two waypoints, optimal order is: [0, 1]');
      return [0, 1];
    }
    
    const visited = new Array(size).fill(false);
    const route = [startIndex];
    visited[startIndex] = true;
    
    let currentIndex = startIndex;
    let totalTime = 0;
    
    console.log(`Starting TSP from waypoint ${startIndex}`);
    
    // Greedy nearest neighbor approach
    for (let step = 1; step < size; step++) {
      let nearestIndex = -1;
      let nearestTime = Infinity;
      
      console.log(`Step ${step}: Current position: ${currentIndex}`);
      console.log(`Available times from ${currentIndex}:`, matrix[currentIndex].map((time, i) => 
        visited[i] ? 'visited' : (time === Infinity ? '∞' : Math.round(time/60) + 'min')
      ));
      
      // Find nearest unvisited waypoint
      for (let i = 0; i < size; i++) {
        if (!visited[i] && matrix[currentIndex][i] < nearestTime && matrix[currentIndex][i] !== Infinity) {
          nearestTime = matrix[currentIndex][i];
          nearestIndex = i;
        }
      }
      
      if (nearestIndex !== -1) {
        route.push(nearestIndex);
        visited[nearestIndex] = true;
        totalTime += nearestTime;
        console.log(`  → Going to waypoint ${nearestIndex} (${Math.round(nearestTime/60)} minutes)`);
        currentIndex = nearestIndex;
      } else {
        console.log(`  → No valid routes found from ${currentIndex}, adding remaining unvisited waypoints`);
        // Add any remaining unvisited waypoints (fallback)
        for (let i = 0; i < size; i++) {
          if (!visited[i]) {
            route.push(i);
            visited[i] = true;
            console.log(`  → Adding waypoint ${i} (no route data)`);
          }
        }
        break;
      }
    }
    
    console.log('TSP Result:');
    console.log('  Route indices:', route);
    console.log('  Total time:', Math.round(totalTime / 60), 'minutes');
    console.log('  Route length:', route.length, 'waypoints');
    
    return route;
  };

  // Get the route path for optimized waypoints
  const getOptimizedRoutePath = async (optimizedWaypoints) => {
    const origin = {
      location: {
        latLng: {
          latitude: optimizedWaypoints[0].point[0],
          longitude: optimizedWaypoints[0].point[1]
        }
      }
    };

    const destination = {
      location: {
        latLng: {
          latitude: optimizedWaypoints[optimizedWaypoints.length - 1].point[0],
          longitude: optimizedWaypoints[optimizedWaypoints.length - 1].point[1]
        }
      }
    };

    const intermediates = optimizedWaypoints.slice(1, -1).map(wp => ({
      location: {
        latLng: {
          latitude: wp.point[0],
          longitude: wp.point[1]
        }
      }
    }));

    const routeRequest = {
      origin: origin,
      destination: destination,
      intermediates: intermediates,
      travelMode: 'DRIVE',
      routingPreference: 'TRAFFIC_AWARE_OPTIMAL',
      routeModifiers: {
        avoidTolls: false,
        avoidHighways: false,
        avoidFerries: false
      },
      languageCode: 'en-US',
      units: 'METRIC'
    };

    console.log('Getting optimized route path...');
    
    const routeResponse = await fetch('https://routes.googleapis.com/directions/v2:computeRoutes', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': process.env.REACT_APP_GOOGLE_MAPS_API_KEY,
        'X-Goog-FieldMask': 'routes.duration,routes.distanceMeters,routes.polyline.encodedPolyline'
      },
      body: JSON.stringify(routeRequest)
    });

    if (!routeResponse.ok) {
      throw new Error(`Route API error: ${routeResponse.status}`);
    }

    const routeData = await routeResponse.json();
    
    if (routeData.routes && routeData.routes.length > 0) {
      const route = routeData.routes[0];
      
      // Decode polyline
      let decodedPath = [];
      if (route.polyline && route.polyline.encodedPolyline) {
        decodedPath = decodePolyline(route.polyline.encodedPolyline);
      } else {
        // Fallback to straight lines
        decodedPath = optimizedWaypoints.map(wp => ({
          lat: wp.point[0],
          lng: wp.point[1]
        }));
      }

      setRoutePath(decodedPath);
      
      // Calculate totals
      const totalDistance = route.distanceMeters || 0;
      const totalDuration = route.duration ? parseInt(route.duration.replace('s', '')) : 0;
      
      setRouteInfo({
        distance: (totalDistance / 1000).toFixed(1) + ' km',
        duration: Math.round(totalDuration / 60) + ' minutes (optimized with traffic)'
      });
    }
  };

  // Simple direct route for 2 waypoints
  const getDirectRoute = async (waypoints) => {
    const routeRequest = {
      origin: {
        location: {
          latLng: {
            latitude: waypoints[0].point[0],
            longitude: waypoints[0].point[1]
          }
        }
      },
      destination: {
        location: {
          latLng: {
            latitude: waypoints[1].point[0],
            longitude: waypoints[1].point[1]
          }
        }
      },
      travelMode: 'DRIVE',
      routingPreference: 'TRAFFIC_AWARE_OPTIMAL',
      languageCode: 'en-US',
      units: 'METRIC'
    };

    const response = await fetch('https://routes.googleapis.com/directions/v2:computeRoutes', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': process.env.REACT_APP_GOOGLE_MAPS_API_KEY,
        'X-Goog-FieldMask': 'routes.duration,routes.distanceMeters,routes.polyline.encodedPolyline'
      },
      body: JSON.stringify(routeRequest)
    });

    if (!response.ok) {
      throw new Error(`Route API error: ${response.status}`);
    }

    const data = await response.json();
    
    if (data.routes && data.routes.length > 0) {
      const route = data.routes[0];
      
      let decodedPath = [];
      if (route.polyline && route.polyline.encodedPolyline) {
        decodedPath = decodePolyline(route.polyline.encodedPolyline);
      } else {
        decodedPath = waypoints.map(wp => ({ lat: wp.point[0], lng: wp.point[1] }));
      }

      setRoutePath(decodedPath);
      
      const totalDistance = route.distanceMeters || 0;
      const totalDuration = route.duration ? parseInt(route.duration.replace('s', '')) : 0;
      
      setRouteInfo({
        distance: (totalDistance / 1000).toFixed(1) + ' km',
        duration: Math.round(totalDuration / 60) + ' minutes (with traffic)'
      });
    }
  };

  // Polyline decoder function
  const decodePolyline = (encoded) => {
    const points = [];
    let index = 0, len = encoded.length;
    let lat = 0, lng = 0;

    while (index < len) {
      let b, shift = 0, result = 0;
      do {
        b = encoded.charCodeAt(index++) - 63;
        result |= (b & 0x1f) << shift;
        shift += 5;
      } while (b >= 0x20);
      const dlat = ((result & 1) !== 0 ? ~(result >> 1) : (result >> 1));
      lat += dlat;

      shift = 0;
      result = 0;
      do {
        b = encoded.charCodeAt(index++) - 63;
        result |= (b & 0x1f) << shift;
        shift += 5;
      } while (b >= 0x20);
      const dlng = ((result & 1) !== 0 ? ~(result >> 1) : (result >> 1));
      lng += dlng;

      points.push({ lat: lat / 1e5, lng: lng / 1e5 });
    }
    return points;
  };

  // Fallback function for basic route display
  const createBasicRoute = () => {
    // Create a simple path connecting all waypoints
    const simplePath = routeWaypoints.map(wp => ({
      lat: wp.point[0],
      lng: wp.point[1]
    }));

    setRoutePath(simplePath);

    // Calculate approximate distance and time
    let totalDistance = 0;
    for (let i = 0; i < routeWaypoints.length - 1; i++) {
      const distance = calculateDistance(
        routeWaypoints[i].point[0], routeWaypoints[i].point[1],
        routeWaypoints[i + 1].point[0], routeWaypoints[i + 1].point[1]
      );
      totalDistance += distance;
    }

    // Rough estimate: 50 km/h average speed
    const estimatedTime = (totalDistance / 1000) / 50 * 60; // minutes

    setRouteInfo({
      distance: (totalDistance / 1000).toFixed(1) + ' km',
      duration: Math.round(estimatedTime) + ' minutes (estimated)'
    });
  };

  const clearRoute = () => {
    setRouteWaypoints([]);
    setRoutePath([]);
    setRouteInfo(null);
    setIsOptimizing(false);
  };

  const removeWaypoint = (projectId) => {
    setRouteWaypoints(routeWaypoints.filter(wp => wp.id !== projectId));
  };

  const handleProjectClick = (project) => {
    if (project.point) {
      setMapCenter({
        lat: Number(project.point[0]),
        lng: Number(project.point[1])
      });
      setSelectedProject(project);
    }
  };

  const handleUpdateProject = async (updatedProject) => {
    try {
      const projectRef = doc(firestore, 'projects', updatedProject.id);
      await updateDoc(projectRef, {
        clientName: updatedProject.clientName,
        address: updatedProject.address,
        phoneNumber: updatedProject.phoneNumber,
        markerColor: updatedProject.markerColor,
        isTechnician: updatedProject.isTechnician,
        point: updatedProject.point
      });

      const updatedProjects = projects.map(p => 
        p.id === updatedProject.id ? updatedProject : p
      );
      
      // Recalculate service area coverage
      const projectsWithCoverage = calculateServiceAreaCoverage(updatedProjects);
      setProjects(projectsWithCoverage);

      setMapCenter({
        lat: updatedProject.point[0],
        lng: updatedProject.point[1]
      });

      setSelectedProject(updatedProject);
      setIsEditProjectModalOpen(false);
    } catch (error) {
      console.error("Error updating project:", error);
      throw error;
    }
  };

  const handleDeleteProject = async (projectId) => {
    try {
      const projectRef = doc(firestore, 'projects', projectId);
      await deleteDoc(projectRef);

      const updatedProjects = projects.filter(p => p.id !== projectId);
      
      // Recalculate service area coverage
      const projectsWithCoverage = calculateServiceAreaCoverage(updatedProjects);
      setProjects(projectsWithCoverage);

      setSelectedProject(null);
      
      const validProjects = projectsWithCoverage.filter(p => p.point);
      if (validProjects.length > 0) {
        setMapCenter({
          lat: Number(validProjects[0].point[0]),
          lng: Number(validProjects[0].point[1])
        });
      }
    } catch (error) {
      console.error("Error deleting project:", error);
      throw error;
    }
  };

  const handleAddProject = async (newProject) => {
    try {
      const docRef = await addDoc(collection(firestore, 'projects'), newProject);
      const projectWithId = { ...newProject, id: docRef.id };
      
      const updatedProjects = [...projects, projectWithId];
      
      // Recalculate service area coverage
      const projectsWithCoverage = calculateServiceAreaCoverage(updatedProjects);
      setProjects(projectsWithCoverage);
      
      setMapCenter({
        lat: newProject.point[0],
        lng: newProject.point[1]
      });
    } catch (error) {
      console.error("Error adding project:", error);
    }
  };

  // Function to confirm deletion from info window
  const confirmDelete = (project) => {
    setProjectToDelete(project);
    setShowDeleteConfirmation(true);
  };

  return (
    <div className="map-detail-container">
      <div className="map-detail-sidebar">
        <div className="map-detail-header">
          <button onClick={onBack} className="back-button">
            <ArrowLeft size={24} />
          </button>
          <h2 className="map-name">{map.name}</h2>
        </div>
        
        <div className="search-container">
          <div className="search-input-container">
            <Search size={20} className="search-icon" />
            <input
              type="text"
              placeholder="Search deals..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            />
          </div>
        </div>
        
        <div className="action-buttons">
          <button
            onClick={() => setIsNewProjectModalOpen(true)}
            className="add-project-button"
          >
            <MapPin size={16} /> Add New Entry
          </button>
          
          <button
            onClick={() => setIsRoutePlanningMode(!isRoutePlanningMode)}
            className={`route-planning-button ${isRoutePlanningMode ? 'active' : ''}`}
          >
            <Route size={16} /> {isRoutePlanningMode ? 'Exit Route Mode' : 'Plan Route'}
          </button>
        </div>
        
        <RoutePlanningPanel
          isOpen={isRoutePlanningMode}
          routeWaypoints={routeWaypoints}
          onClearRoute={clearRoute}
          onRemoveWaypoint={removeWaypoint}
          routeInfo={routeInfo}
          onOptimizeRoute={optimizeRoute}
          isOptimizing={isOptimizing}
        />
        
        <div className="project-list">
          {isLoading ? (
            <div className="loading-indicator">Loading projects...</div>
          ) : (
            filteredProjects.map(project => (
              <div
                key={project.id}
                className={`project-item-container ${project.isOutOfArea ? 'out-of-area' : ''} ${project.noAddress ? 'no-address' : ''} ${project.geocodingError ? 'geocoding-error' : ''}`}
              >
                <div 
                  className="project-item-name"
                  onClick={() => handleProjectClick(project)}
                >
                  <div className="project-item-header">
                    <div className="marker-dot" style={{ backgroundColor: markerColors[project.markerColor || 'red'] }}></div>
                    <h3>{project.clientName}</h3>
                    {project.isTechnician && <span className="technician-badge">🔧</span>}
                  </div>
                  {project.noAddress ? (
                    <p className="warning">No Address Found</p>
                  ) : (
                    <p>{project.address || 'No address provided'}</p>
                  )}
                  {project.phoneNumber && <p className="phone-number">📞 {project.phoneNumber}</p>}
                  {project.isOutOfArea && !project.isTechnician && (
                    <p className="out-of-area-text">⚠️ Out of Service Area</p>
                  )}
                  {project.geocodingError && (
                    <p className="error">Geocoding Failed</p>
                  )}
                </div>
                <button 
                  className="edit-project-button"
                  onClick={() => {
                    setSelectedProject(project);
                    setIsEditProjectModalOpen(true);
                  }}
                >
                  <Edit2 size={20} strokeWidth={2} />
                </button>
              </div>
            ))
          )}
        </div>
      </div>
      
      <div className="map-container">
        <GoogleMap
          mapContainerClassName="google-map"
          center={mapCenter}
          zoom={10}
          options={{
            styles: [
              {
                featureType: "poi",
                elementType: "labels",
                stylers: [{ visibility: "off" }]
              }
            ],
            mapTypeControl: false,
            streetViewControl: false,
            fullscreenControl: true
          }}
        >
          {filteredProjects
            .filter(project => project.point)
            .map(project => (
              <CustomMarker
                key={project.id}
                position={{ 
                  lat: Number(project.point[0]), 
                  lng: Number(project.point[1]) 
                }}
                color={project.markerColor || 'red'}
                isTechnician={project.isTechnician}
                isSelected={selectedProject?.id === project.id}
                isInRoute={routeWaypoints.some(wp => wp.id === project.id)}
                onClick={() => handleMarkerClick(project)}
              />
            ))}
          
          {selectedProject && selectedProject.point && !isRoutePlanningMode && (
            <InfoWindow
              position={{ 
                lat: Number(selectedProject.point[0]), 
                lng: Number(selectedProject.point[1]) 
              }}
              onCloseClick={() => setSelectedProject(null)}
            >
              <InfoWindowContent
                project={selectedProject}
                isOutOfArea={selectedProject.isOutOfArea}
                onEdit={() => setIsEditProjectModalOpen(true)}
                onDelete={() => confirmDelete(selectedProject)}
              />
            </InfoWindow>
          )}
          
          {routePath.length > 0 && (
            <Polyline
              path={routePath}
              options={{
                strokeColor: '#FF6B35',
                strokeWeight: 4,
                strokeOpacity: 0.8
              }}
            />
          )}
        </GoogleMap>
      </div>

      <NewProjectModal
        isOpen={isNewProjectModalOpen}
        onClose={() => setIsNewProjectModalOpen(false)}
        onAddProject={handleAddProject}
        mapName={map.name}
      />
      
      <EditProjectModal
        isOpen={isEditProjectModalOpen}
        onClose={() => setIsEditProjectModalOpen(false)}
        project={selectedProject}
        onUpdateProject={handleUpdateProject}
        onDeleteProject={handleDeleteProject}
      />

      {/* Delete Confirmation Modal */}
      {showDeleteConfirmation && (
        <div className="modal-overlay">
          <div className="modal-content confirmation-modal">
            <h2>Confirm Deletion</h2>
            <p>Are you sure you want to delete {projectToDelete?.clientName}? This action cannot be undone.</p>
            <div className="modal-actions">
              <button 
                className="cancel-button" 
                onClick={() => setShowDeleteConfirmation(false)}
              >
                Cancel
              </button>
              <button 
                className="delete-button" 
                onClick={() => {
                  handleDeleteProject(projectToDelete.id);
                  setShowDeleteConfirmation(false);
                }}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MapDetailView;