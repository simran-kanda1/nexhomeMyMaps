import React, { useState, useEffect, useCallback } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { LoadScript } from '@react-google-maps/api';
import { firestore } from '../../config/firebase';
import MapCard from './MapCard';
import MapDetailView from './MapDetailView';
import '../../styles/Dashboard.css';
import '../../styles/Project.css';
import logo from '../Auth/logo.png';

// Define libraries outside of the component
const LIBRARIES = ['places'];

const Dashboard = ({ onLogout }) => {
  const [maps, setMaps] = useState([]);
  const [selectedMap, setSelectedMap] = useState(null);
  const [isMapScriptLoaded, setIsMapScriptLoaded] = useState(false);
  const [scriptKey, setScriptKey] = useState(Date.now());

  useEffect(() => {
    const fetchMaps = async () => {
      try {
        const mapsRef = collection(firestore, 'Maps');
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
  };

  const handleBack = () => {
    setSelectedMap(null);
  };

  const handleMapScriptLoad = () => {
    setIsMapScriptLoaded(true);
  };

  const handleMapScriptError = (error) => {
    console.error("Error loading Google Maps script:", error);
  };

  const handleLogout = useCallback(() => {
    // Preserve CSS before logout
    const styleTags = document.getElementsByTagName('link');
    const cssHrefs = [];
    for (let i = 0; i < styleTags.length; i++) {
      if (styleTags[i].rel === 'stylesheet') {
        cssHrefs.push(styleTags[i].href);
      }
    }

    // Remove any existing Google Maps script elements
    const existingScripts = document.querySelectorAll('script[src*="maps.googleapis.com"]');
    existingScripts.forEach(script => script.remove());

    // Remove custom Google Maps web components
    const customElementNames = [
      'gmp-internal-element-support-verification',
      'gmp-internal-use-place-details',
      'gmp-map',
      'gmp-internal-dialog'
    ];
    
    customElementNames.forEach(elementName => {
      try {
        // Remove any existing elements of this type from the DOM
        const existingElements = document.getElementsByTagName(elementName);
        Array.from(existingElements).forEach(el => el.remove());
      } catch (error) {
        console.warn(`Error removing ${elementName} elements:`, error);
      }
    });

    // Force reload of Google Maps script by changing its key
    setScriptKey(Date.now());

    // Perform logout
    onLogout();

    // Reapply stylesheets after logout
    cssHrefs.forEach(href => {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = href;
      document.head.appendChild(link);
    });
  }, [onLogout]);

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <div className="header-left">
          <img src={logo} alt="Company Logo" className="dashboard-logo" />
        </div>
        <div className="header-center">
          <h2 className="dashboard-title">Nexhome myMaps</h2>
        </div>
        <div className="header-right">
          <button className="logout-button" onClick={handleLogout}>Logout</button>
        </div>
      </div>
      <LoadScript
        key={scriptKey}
        googleMapsApiKey={process.env.REACT_APP_GOOGLE_MAPS_API_KEY}
        libraries={LIBRARIES}
        onLoad={handleMapScriptLoad}
        onError={handleMapScriptError}
      >
        {!selectedMap ? (
          <div className="maps-grid">
            {maps.map(map => (
              <MapCard
                key={map.id}
                map={map}
                onSelect={() => handleMapSelect(map)}
              />
            ))}
          </div>
        ) : (
          <MapDetailView
            map={selectedMap}
            onBack={handleBack}
          />
        )}
      </LoadScript>
    </div>
  );
};

export default Dashboard;