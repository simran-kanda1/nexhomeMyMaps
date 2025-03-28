//src/components/Map/ProjectMarker.js
import React from 'react';
import { MapPin } from 'lucide-react';

const ProjectMarker = ({ project, onClick, isSelected }) => {
  return (
    <div 
      className={`flex items-center p-2 cursor-pointer 
        ${isSelected ? 'bg-blue-100' : 'hover:bg-gray-100'}
        rounded-lg transition-colors duration-200`}
      onClick={() => onClick(project)}
    >
      <MapPin 
        className={`mr-3 
          ${project.status === 'Completed' ? 'text-green-500' : 
            project.status === 'In Progress' ? 'text-blue-500' : 
            'text-red-500'}`} 
      />
      <div>
        <h3 className="font-semibold text-sm">{project.clientName}</h3>
        <p className="text-xs text-gray-600">{project.address}</p>
        <span className="text-xs badge bg-gray-200 rounded-full px-2">
          {project.pipeline}
        </span>
      </div>
    </div>
  );
};

export default ProjectMarker;