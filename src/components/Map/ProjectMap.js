//src/components/Map/ProjectMap.js
import React, { useState, useEffect } from 'react';
import { GoogleMap, Marker, InfoWindow, LoadScript } from '@react-google-maps/api';
import { collection, query, where, getDocs, addDoc } from 'firebase/firestore';
import { firestore } from '../../config/firebase';
import '../../styles/Project.css';

const mapContainerStyle = {
  width: '100%',
  height: '100vh'
};

const mapOptions = {
  disableDefaultUI: true,
  zoomControl: true,
  streetViewControl: true,
  mapTypeControl: true
};

const ProjectMap = ({ selectedMap }) => {
  const [mapCenter, setMapCenter] = useState({ lat: 37.7749, lng: -122.4194 });
  const [projects, setProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState(null);
  const [newProjectMode, setNewProjectMode] = useState(false);

  useEffect(() => {
    const fetchProjects = async () => {
      if (!selectedMap) return;
      
      try {
        const projectsRef = collection(firestore, 'projects');
        const q = query(projectsRef, where('mapName', '==', selectedMap));
        const querySnapshot = await getDocs(q);
        
        const projectsData = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        
        setProjects(projectsData);
        
        // Center map on first project if exists
        if (projectsData.length > 0) {
          setMapCenter({
            lat: projectsData[0].latitude,
            lng: projectsData[0].longitude
          });
        }
      } catch (error) {
        console.error("Error fetching projects:", error);
      }
    };

    fetchProjects();
  }, [selectedMap]);

  const handleMapClick = async (event) => {
    if (newProjectMode) {
      const newProject = {
        mapName: selectedMap,
        latitude: event.latLng.lat(),
        longitude: event.latLng.lng(),
        clientName: 'New Project',
        // Add other default fields
      };

      try {
        const docRef = await addDoc(collection(firestore, 'projects'), newProject);
        setProjects([...projects, { ...newProject, id: docRef.id }]);
        setNewProjectMode(false);
      } catch (error) {
        console.error("Error adding project:", error);
      }
    }
  };

  return (
    <div className="map-container">
      <LoadScript googleMapsApiKey={process.env.REACT_APP_GOOGLE_MAPS_API_KEY}>
        <GoogleMap
          mapContainerStyle={mapContainerStyle}
          zoom={10}
          center={mapCenter}
          options={mapOptions}
          onClick={handleMapClick}
        >
          {projects.map((project) => (
            <Marker
              key={project.id}
              position={{
                lat: project.latitude,
                lng: project.longitude
              }}
              onClick={() => setSelectedProject(project)}
            />
          ))}

          {selectedProject && (
            <InfoWindow
              position={{
                lat: selectedProject.latitude,
                lng: selectedProject.longitude
              }}
              onCloseClick={() => setSelectedProject(null)}
            >
              <div>
                <h3>{selectedProject.clientName}</h3>
                <p>{selectedProject.address}</p>
              </div>
            </InfoWindow>
          )}
        </GoogleMap>
      </LoadScript>
    </div>
  );
};

export default ProjectMap;