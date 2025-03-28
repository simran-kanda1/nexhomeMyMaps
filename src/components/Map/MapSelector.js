import React, { useState, useEffect } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { firestore } from '../../config/firebase';
import '../../styles/Project.css';

const MapSelector = ({ onMapSelect }) => {
  const [maps, setMaps] = useState([]);
  const [selectedMap, setSelectedMap] = useState(null);

  useEffect(() => {
    const fetchMaps = async () => {
      try {
        const mapsRef = collection(firestore, 'maps');
        const querySnapshot = await getDocs(mapsRef);
        
        const mapsData = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        
        setMaps(mapsData);
      } catch (error) {
        console.error("Error fetching maps:", error);
      }
    };

    fetchMaps();
  }, []);

  const handleMapSelect = (map) => {
    setSelectedMap(map);
    onMapSelect(map);
  };

  return (
    <div className="sidebar">
      <div className="sidebar-header">
        <h2 className="sidebar-title">Select Your Map</h2>
        <input 
          type="text" 
          placeholder="Search maps..." 
          className="search-input"
        />
      </div>
      <div className="project-list">
        {maps.map(map => (
          <div 
            key={map.id} 
            className={`project-card ${selectedMap?.id === map.id ? 'selected' : ''}`}
            onClick={() => handleMapSelect(map)}
          >
            <div>
              <h3>{map.name}</h3>
              <p>{map.description}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default MapSelector;