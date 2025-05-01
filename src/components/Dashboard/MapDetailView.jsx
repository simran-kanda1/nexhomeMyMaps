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
import { GoogleMap, Marker, InfoWindow } from '@react-google-maps/api';
import { firestore } from '../../config/firebase';
import { Edit2, ArrowLeft, MapPin, Trash2 } from 'lucide-react';
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

// Define marker color options - Modern color palette
const markerColors = {
  red: '#F44336',     // Material Design Red
  orange: '#FF9800',  // Material Design Orange
  green: '#4CAF50',   // Material Design Green
  blue: '#2196F3',    // Material Design Blue
  purple: '#9C27B0'   // Material Design Purple
};

// Custom Modern Map Pin Component
const CustomMarker = ({ position, color = 'red', onClick }) => {
  // Modern SVG pin design with centered dot
  const svgMarker = {
    path: "M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z",
    fillColor: markerColors[color] || markerColors.red,
    fillOpacity: 1,
    strokeWeight: 1.5,
    strokeColor: '#FFFFFF',
    rotation: 0,
    scale: 2,
    anchor: new window.google.maps.Point(12, 22),
    labelOrigin: new window.google.maps.Point(12, 9)
  };

  return (
    <Marker
      position={position}
      icon={svgMarker}
      onClick={onClick}
      animation={window.google.maps.Animation.DROP}
    />
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
    const [markerColor, setMarkerColor] = useState('red');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  
    // Populate form when project is selected
    useEffect(() => {
      if (project) {
        setClientName(project.clientName || '');
        setAddress(project.address || '');
        setMarkerColor(project.markerColor || 'red');
      }
    }, [project]);
  
    const handleSubmit = async (e) => {
      e.preventDefault();
      setIsLoading(true);
      setError(null);
  
      try {
        // Geocode the address
        const point = await geocodeAddress(address);
  
        // Prepare updated project data
        const updatedProject = {
          ...project,
          clientName: clientName.trim(),
          address: address.trim(),
          markerColor: markerColor,
          point: point
        };
  
        // Update project in Firestore
        await onUpdateProject(updatedProject);
  
        // Reset and close
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
            <form onSubmit={handleSubmit}>
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
                  type="submit" 
                  className="update-button"
                  disabled={isLoading}
                >
                  {isLoading ? 'Updating...' : 'Update'}
                </button>
              </div>
            </form>
          </div>
  
          {/* Custom Confirmation Dialog */}
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
  const [markerColor, setMarkerColor] = useState('red');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      // Geocode the address
      const point = await geocodeAddress(address);

      // Prepare project data
      const newProject = {
        mapName: mapName,
        clientName: clientName.trim(),
        address: address.trim(),
        markerColor: markerColor,
        point: point
      };

      // Add project to Firestore
      await onAddProject(newProject);

      // Reset form and close modal
      setClientName('');
      setAddress('');
      setMarkerColor('red');
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
        <form onSubmit={handleSubmit}>
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
            <button type="submit" className="update-button" disabled={isLoading}>
              {isLoading ? 'Adding...' : 'Submit'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Info Window Edit Component - Modernized
const InfoWindowContent = ({ project, onEdit, onDelete }) => {
  return (
    <div className="info-window-content">
      <h3>{project.clientName}</h3>
      <p>{project.address || 'No address provided'}</p>
      
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
  const [selectedProject, setSelectedProject] = useState(null);
  const [isNewProjectModalOpen, setIsNewProjectModalOpen] = useState(false);
  const [isEditProjectModalOpen, setIsEditProjectModalOpen] = useState(false);
  const [mapCenter, setMapCenter] = useState({ lat: 44.6488, lng: -63.5752 }); // Default to Halifax
  const [isLoading, setIsLoading] = useState(true);
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState(null);

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
    setMapCenter({ lat: 44.6488, lng: -63.5752 });
  }, [map]);

  useEffect(() => {
    const fetchProjects = async () => {
      setIsLoading(true);
      try {
        const projectsRef = collection(firestore, 'projects');
        const q = query(projectsRef, where('mapName', '==', map.name));
        const querySnapshot = await getDocs(q);
        
        // Convert snapshot to array of projects
        const projectsData = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          markerColor: doc.data().markerColor || 'red' // Set default color if not present
        }));

        // Troubleshoot missing points
        const processedProjects = await troubleshootProjectPoints(projectsData);

        // Process and set projects
        const formattedProjects = processedProjects.map(project => ({
          ...project,
          point: project.point 
            ? [
                Number(project.point[0] || 44.6488), 
                Number(project.point[1] || -63.5752)
              ]
            : null
        }));

        setProjects(formattedProjects);

        // Center map on first project with valid coordinates
        const validProjects = formattedProjects.filter(p => p.point);
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
        markerColor: updatedProject.markerColor,
        point: updatedProject.point
      });

      // Update local state
      setProjects(projects.map(p => 
        p.id === updatedProject.id ? updatedProject : p
      ));

      // Update map center if needed
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

  // Delete project from Firestore
  const handleDeleteProject = async (projectId) => {
    try {
      const projectRef = doc(firestore, 'projects', projectId);
      await deleteDoc(projectRef);

      // Remove from local state
      const updatedProjects = projects.filter(p => p.id !== projectId);
      setProjects(updatedProjects);

      // Reset selected project and map center
      setSelectedProject(null);
      
      // Recenter map if there are remaining projects
      const validProjects = updatedProjects.filter(p => p.point);
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
      setProjects([...projects, { ...newProject, id: docRef.id }]);
      setMapCenter({
        lat: newProject.point[0],
        lng: newProject.point[1]
      });
    } catch (error) {
      console.error("Error adding project:", error);
    }
  };

  // Function to handle marker click on the map
  const handleMarkerClick = (project) => {
    setSelectedProject(project);
    setMapCenter({
      lat: Number(project.point[0]),
      lng: Number(project.point[1])
    });
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
        <button
          onClick={() => setIsNewProjectModalOpen(true)}
          className="add-project-button"
        >
          <MapPin size={16} /> Add New Entry
        </button>
        <div className="project-list">
          {isLoading ? (
            <div className="loading-indicator">Loading projects...</div>
          ) : (
            projects.map(project => (
              <div
                key={project.id}
                className={`project-item-container ${project.noAddress ? 'no-address' : ''} ${project.geocodingError ? 'geocoding-error' : ''}`}
              >
                <div 
                  className="project-item-name"
                  onClick={() => handleProjectClick(project)}
                >
                  <div className="project-item-header">
                    <div className="marker-dot" style={{ backgroundColor: markerColors[project.markerColor || 'red'] }}></div>
                    <h3>{project.clientName}</h3>
                  </div>
                  {project.noAddress ? (
                    <p className="warning">No Address Found</p>
                  ) : (
                    <p>{project.address || 'No address provided'}</p>
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
          {projects
            .filter(project => project.point)
            .map(project => (
              <CustomMarker
                key={project.id}
                position={{ 
                  lat: Number(project.point[0]), 
                  lng: Number(project.point[1]) 
                }}
                color={project.markerColor || 'red'}
                onClick={() => handleMarkerClick(project)}
              />
            ))}
          {selectedProject && selectedProject.point && (
            <InfoWindow
              position={{ 
                lat: Number(selectedProject.point[0]), 
                lng: Number(selectedProject.point[1]) 
              }}
              onCloseClick={() => setSelectedProject(null)}
            >
              <InfoWindowContent
                project={selectedProject}
                onEdit={() => setIsEditProjectModalOpen(true)}
                onDelete={() => confirmDelete(selectedProject)}
              />
            </InfoWindow>
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