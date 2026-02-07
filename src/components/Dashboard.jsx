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
        if (confirm('¿Borrar este proyecto?')) {
            projectService.delete(id);
            setProjects(prev => prev.filter(p => p.id !== id));
        }
    };

    const formatDate = (isoString) => {
        return new Date(isoString).toLocaleDateString('es-ES', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    return (
        <div className="dashboard">
            const DEMO_PROJECTS = [
            {
                id: 'demo-1',
            isDemo: true,
            grade: 'A',
            hypothesis: 'Plataforma de alquiler de ropa de bebé por suscripción',
            updatedAt: new Date().toISOString(),
            websitePreview: {
                title: 'BabyLife Loop',
            tagline: 'Ropa premium para tu bebé, sin comprarla.'
            }
        },
            {
                id: 'demo-2',
            isDemo: true,
            grade: 'B',
            hypothesis: 'Consultoría de ciberseguridad para PYMES remota',
            updatedAt: new Date(Date.now() - 86400000).toISOString(),
            websitePreview: {
                title: 'SecureSmall Remote',
            tagline: 'Protege tu negocio desde cualquier lugar.'
            }
        }
            ];

    const displayProjects = projects.length > 0 ? projects : DEMO_PROJECTS;

            return (
            <div className="dashboard">
                <header className="dashboard-header">
                    <div className="header-brand-column">
                        <div className="brand-row">
                            <span className="logo-mark mono">VEXT</span>
                            <span className="logo-text mono">PROYECTOS</span>
                        </div>
                        <p className="header-subtitle">Crea y gestiona los análisis de tus ideas de negocio</p>
                    </div>
                </header>

                <main className="dashboard-content">
                    <div className="projects-grid">
                        {/* New Project CTA - High Visibility */}
                        <div className="project-card new-project-cta" onClick={onNewProject}>
                            <div className="cta-icon-wrapper">
                                <Plus size={32} />
                            </div>
                            <div className="cta-content">
                                <h3>Nuevo Análisis</h3>
                                <p>Validar nueva idea</p>
                            </div>
                        </div>

                        {/* Content Cards (User Projects or Demos) */}
                        {displayProjects.map((project) => (
                            <div
                                key={project.id}
                                className={`project-card ${project.isDemo ? 'demo-card' : ''}`}
                                onClick={() => !project.isDemo && onLoadProject(project)}
                                style={project.isDemo ? { cursor: 'default' } : {}}
                            >
                                <div className="card-top">
                                    <span className={`grade-badge grade-${project.grade || 'C'}`}>
                                        {project.grade || 'C'}
                                    </span>
                                    {project.isDemo && <span className="demo-badge">EJEMPLO</span>}
                                    {!project.isDemo && (
                                        <button
                                            className="delete-btn"
                                            onClick={(e) => handleDelete(e, project.id)}
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    )}
                                </div>

                                <div className="card-content">
                                    <h3 className="project-title">
                                        {project.websitePreview?.title || project.hypothesis?.slice(0, 40) || 'Sin Título'}
                                    </h3>
                                    <p className="project-tagline">
                                        {project.websitePreview?.tagline || 'Sin descripción'}
                                    </p>
                                </div>

                                <div className="card-footer">
                                    <div className="meta-info">
                                        <Calendar size={14} />
                                        <span>{formatDate(project.updatedAt)}</span>
                                    </div>
                                    {!project.isDemo && (
                                        <div className="open-indicator">
                                            <ArrowRight size={16} />
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </main>
            </div>
            );
}

            export default Dashboard;
