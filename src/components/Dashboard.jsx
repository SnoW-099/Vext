import { useState, useEffect } from 'react';
import { Plus, Trash2, Calendar, ArrowRight } from 'lucide-react';
import { projectService } from '../services/projectService';
import './Dashboard.css';

function Dashboard({ onNewProject, onLoadProject }) {
    const [projects, setProjects] = useState([]);

    useEffect(() => {
        const loadProjects = () => {
            setProjects(projectService.getAll());
        };
        loadProjects();
    }, []);

    const handleDelete = (e, id) => {
        e.stopPropagation();
        if (confirm('Delete this project?')) {
            projectService.delete(id);
            setProjects(prev => prev.filter(p => p.id !== id));
        }
    };

    const formatDate = (isoString) => {
        return new Date(isoString).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    return (
        <div className="dashboard">
            <header className="dashboard-header">
                <div className="header-brand">
                    <span className="logo-mark mono">VEXT</span>
                    <span className="logo-text mono">PROJECTS</span>
                </div>
                <button className="new-project-btn" onClick={onNewProject}>
                    <Plus size={18} />
                    <span className="mono">NEW SCAN</span>
                </button>
            </header>

            <main className="projects-grid">
                {/* Empty State */}
                {projects.length === 0 && (
                    <div className="empty-state">
                        <span className="empty-icon">📂</span>
                        <h3>No Projects Found</h3>
                        <p>Start a new scan to analyze your first hypothesis.</p>
                        <button className="cta-btn" onClick={onNewProject}>
                            Start Analysis
                        </button>
                    </div>
                )}

                {/* Project Cards */}
                {projects.map(project => (
                    <div
                        key={project.id}
                        className="project-card"
                        onClick={() => onLoadProject(project)}
                    >
                        <div className="card-top">
                            <span className={`grade-badge grade-${project.grade || 'C'}`}>
                                {project.grade || 'C'}
                            </span>
                            <button
                                className="delete-btn"
                                onClick={(e) => handleDelete(e, project.id)}
                            >
                                <Trash2 size={16} />
                            </button>
                        </div>

                        <div className="card-content">
                            <h3 className="project-title">
                                {project.websitePreview?.title || project.hypothesis?.slice(0, 40) || 'Untitled Project'}
                            </h3>
                            <p className="project-tagline">
                                {project.websitePreview?.tagline || 'No tagline generated'}
                            </p>
                        </div>

                        <div className="card-footer">
                            <div className="meta-info">
                                <Calendar size={14} />
                                <span>{formatDate(project.updatedAt)}</span>
                            </div>
                            <div className="open-indicator">
                                <ArrowRight size={16} />
                            </div>
                        </div>
                    </div>
                ))}
            </main>
        </div>
    );
}

export default Dashboard;
