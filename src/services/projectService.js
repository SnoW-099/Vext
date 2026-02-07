const STORAGE_KEY = 'vext_projects_v1';

export const projectService = {
    // Get all projects
    getAll: () => {
        try {
            const data = localStorage.getItem(STORAGE_KEY);
            return data ? JSON.parse(data) : [];
        } catch (e) {
            console.error('Failed to load projects:', e);
            return [];
        }
    },

    // Get single project by ID
    getById: (id) => {
        const projects = projectService.getAll();
        return projects.find(p => p.id === id) || null;
    },

    // Save project (create or update)
    save: (project) => {
        try {
            const projects = projectService.getAll();
            const existingIndex = projects.findIndex(p => p.id === project.id);

            const timestamp = new Date().toISOString();
            const projectToSave = {
                ...project,
                updatedAt: timestamp,
                createdAt: project.createdAt || timestamp,
                id: project.id || crypto.randomUUID()
            };

            if (existingIndex >= 0) {
                projects[existingIndex] = projectToSave;
            } else {
                projects.unshift(projectToSave); // Add to top
            }

            localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
            return projectToSave;
        } catch (e) {
            console.error('Failed to save project:', e);
            throw new Error('Save failed');
        }
    },

    // Delete project
    delete: (id) => {
        try {
            const projects = projectService.getAll().filter(p => p.id !== id);
            localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
        } catch (e) {
            console.error('Failed to delete project:', e);
        }
    }
};
