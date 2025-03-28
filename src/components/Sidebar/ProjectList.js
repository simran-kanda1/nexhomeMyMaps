//src/components/sidebar/ProjectList.js
import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { firestore } from '../../config/firebase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';
import ProjectMarker from './ProjectMarker';

const ProjectList = ({ selectedPipeline, onProjectSelect }) => {
  const [projects, setProjects] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProject, setSelectedProject] = useState(null);

  useEffect(() => {
    const fetchProjects = async () => {
      if (!selectedPipeline) return;

      try {
        const projectsRef = collection(firestore, 'projects');
        const q = query(
          projectsRef, 
          where('pipeline', '==', selectedPipeline)
        );

        const querySnapshot = await getDocs(q);
        const projectsData = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));

        setProjects(projectsData);
      } catch (error) {
        console.error("Error fetching projects:", error);
      }
    };

    fetchProjects();
  }, [selectedPipeline]);

  const filteredProjects = projects.filter(project => 
    project.clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    project.address.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleProjectSelect = (project) => {
    setSelectedProject(project);
    if (onProjectSelect) {
      onProjectSelect(project);
    }
  };

  return (
    <Card className="h-full flex flex-col">
      <CardHeader>
        <CardTitle>{selectedPipeline || 'Select a Pipeline'}</CardTitle>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <Input 
            placeholder="Search projects..." 
            className="pl-10"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </CardHeader>
      <CardContent className="overflow-y-auto flex-grow">
        {filteredProjects.length === 0 ? (
          <p className="text-center text-gray-500">No projects found</p>
        ) : (
          filteredProjects.map(project => (
            <ProjectMarker 
              key={project.id}
              project={project}
              onClick={handleProjectSelect}
              isSelected={selectedProject?.id === project.id}
            />
          ))
        )}
      </CardContent>
    </Card>
  );
};

export default ProjectList;