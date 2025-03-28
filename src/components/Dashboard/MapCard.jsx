import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { firestore } from '../../config/firebase';
import '../../styles/Dashboard.css';

const MapCard = ({ map, onSelect }) => {
  const [projectCount, setProjectCount] = useState(0);

  useEffect(() => {
    const fetchProjectCount = async () => {
      try {
        const projectsRef = collection(firestore, 'projects');
        const q = query(projectsRef, where('mapName', '==', map.name));
        const querySnapshot = await getDocs(q);
        
        setProjectCount(querySnapshot.size);
      } catch (error) {
        console.error("Error fetching project count:", error);
      }
    };

    fetchProjectCount();
  }, [map.name]);

  return (
    <div className="map-card" onClick={onSelect}>
      <div className="map-card-content">
        <h3>{map.name}</h3>
        <p>{map.description}</p>
        <div className="project-count">
          {projectCount} {projectCount === 1 ? 'Entry' : 'Entries'}
        </div>
      </div>
    </div>
  );
};

export default MapCard;