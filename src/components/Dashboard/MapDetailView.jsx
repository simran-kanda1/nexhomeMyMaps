//MapDetailView.jsx
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
import { Edit2, ArrowLeft } from 'lucide-react';
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

const EditProjectModal = ({ 
    isOpen, 
    onClose, 
    project, 
    onUpdateProject, 
    onDeleteProject 
  }) => {
    const [clientName, setClientName] = useState('');
    const [address, setAddress] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  
    // Populate form when project is selected
    useEffect(() => {
      if (project) {
        setClientName(project.clientName || '');
        setAddress(project.address || '');
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
          point: point
        };
  
        // Update project in Firestore
        await onUpdateProject({
            ...project,
            clientName: clientName.trim(),
            address: address.trim()
          });
  
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
        point: point
      };

      // Add project to Firestore
      await onAddProject(newProject);

      // Reset form and close modal
      setClientName('');
      setAddress('');
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
          {error && <div className="error-message">{error}</div>}
          <div className="modal-actions">
            <button type="button" onClick={onClose} disabled={isLoading}>
              Cancel
            </button>
            <button type="submit" disabled={isLoading}>
              {isLoading ? 'Adding...' : 'Submit'}
            </button>
          </div>
        </form>
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
          ...doc.data()
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
          Add New Entry
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
                  <h3>{project.clientName}</h3>
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
        >
          {projects
            .filter(project => project.point)
            .map(project => (
              <Marker
                key={project.id}
                position={{ 
                  lat: Number(project.point[0]), 
                  lng: Number(project.point[1]) 
                }}
                onClick={() => {
                  setSelectedProject(project);
                  setMapCenter({
                    lat: Number(project.point[0]),
                    lng: Number(project.point[1])
                  });
                }}
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
              <div>
                <h3>{selectedProject.clientName}</h3>
                <p>{selectedProject.address || 'No address provided'}</p>
              </div>
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
      {/* Edit Project Modal */}
      <EditProjectModal
        isOpen={isEditProjectModalOpen}
        onClose={() => setIsEditProjectModalOpen(false)}
        project={selectedProject}
        onUpdateProject={handleUpdateProject}
        onDeleteProject={handleDeleteProject}
      />
    </div>
  );
};

export default MapDetailView;