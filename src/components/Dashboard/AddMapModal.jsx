import React, { useState } from 'react';
import { collection, addDoc } from 'firebase/firestore';
import { firestore } from '../../config/firebase';

const AddMapModal = ({ isOpen, onClose, onAddMap }) => {
  const [mapName, setMapName] = useState('');
  const [mapDescription, setMapDescription] = useState('');
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const lat = parseFloat(latitude);
      const lng = parseFloat(longitude);

      if (isNaN(lat) || isNaN(lng)) {
        throw new Error('Please enter valid latitude and longitude values');
      }

      if (lat < -90 || lat > 90) {
        throw new Error('Latitude must be between -90 and 90');
      }

      if (lng < -180 || lng > 180) {
        throw new Error('Longitude must be between -180 and 180');
      }

      const newMap = {
        name: mapName.trim(),
        description: mapDescription.trim(),
        centerLat: lat,
        centerLng: lng,
        createdAt: new Date()
      };

      await onAddMap(newMap);

      // Reset form
      setMapName('');
      setMapDescription('');
      setLatitude('');
      setLongitude('');
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
        <h2>Add New Map</h2>
        <div>
          <div className="form-group">
            <label htmlFor="mapName">Map Name</label>
            <input
              type="text"
              id="mapName"
              value={mapName}
              onChange={(e) => setMapName(e.target.value)}
              required
              placeholder="Enter map name"
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="mapDescription">Description</label>
            <input
              type="text"
              id="mapDescription"
              value={mapDescription}
              onChange={(e) => setMapDescription(e.target.value)}
              placeholder="Enter map description"
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="latitude">Latitude</label>
            <input
              type="number"
              id="latitude"
              value={latitude}
              onChange={(e) => setLatitude(e.target.value)}
              required
              step="any"
              placeholder="e.g., 44.6488"
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="longitude">Longitude</label>
            <input
              type="number"
              id="longitude"
              value={longitude}
              onChange={(e) => setLongitude(e.target.value)}
              required
              step="any"
              placeholder="e.g., -63.5752"
            />
          </div>
          
          {error && <div className="error-message">{error}</div>}
          
          <div className="modal-actions">
            <button type="button" onClick={onClose} className="cancel-button" disabled={isLoading}>
              Cancel
            </button>
            <button type="button" onClick={handleSubmit} className="update-button" disabled={isLoading}>
              {isLoading ? 'Adding...' : 'Add Map'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AddMapModal;