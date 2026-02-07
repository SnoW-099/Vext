import { useState, useEffect } from 'react';
import { Plus, Trash2, Calendar, ArrowRight } from 'lucide-react';
import { projectService } from '../services/projectService';
import './Dashboard.css';

function Dashboard({ onNewProject, onLoadProject }) {
    const [projects, setProjects] = useState([]);
    const [bootText, setBootText] = useState('');
    const fullBootText = "> VEXT_SYSTEM_BOOT: READY...\n> WAITING_FOR_HYPOTHESIS..._";

    useEffect(() => {
        const loadProjects = () => {
            setProjects(projectService.getAll());
        };
        loadProjects();
    }, []);

    useEffect(() => {
        if (projects.length === 0) {
            let i = 0;
            const interval = setInterval(() => {
                setBootText(fullBootText.slice(0, i));
                i++;
                if (i > fullBootText.length) clearInterval(interval);
            }, 50);
            return () => clearInterval(interval);
        }
    }, [projects.length]);

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

    const SystemStatusFooter = () => (
        <div className="system-status-footer mono">
            <span>ENGINE_STATUS: [ OPTIMIZED ]</span>
            <span>LATENCY: 14ms</span>
            <span>ACTIVE_MODEL: GEMINI_1.5_PRO</span>
            <span>UPLOADS_RESTRICTED: FALSE</span>
            <span>ENCRYPTION: AES-256</span>
        </div>
    );

    return (
        <div className="dashboard">
            <header className="dashboard-header">
                <div className="header-brand-column">
                    <div className="brand-row">
                        <span className="logo-mark mono">VEXT</span>
                        <span className="logo-text mono">PROYECTOS</span>
                    </div>
                    {projects.length > 0 && (
                        <p className="header-subtitle">Crea y gestiona los análisis de tus ideas de negocio</p>
                    )}
                </div>
            </header>

            <main className="dashboard-content">
                {projects.length > 0 ? (
                    <div className="projects-grid">
                        {/* New Project CTA - High Visibility (Grid Version) */}
                        <div className="project-card new-project-cta" onClick={onNewProject}>
                            <div className="cta-icon-wrapper">
                                <Plus size={32} />
                            </div>
                            <div className="cta-content">
                                <h3>Nuevo Análisis</h3>
                                <p>Validar nueva idea</p>
                            </div>
                        </div>

                        {/* Content Cards (User Projects) */}
                        {projects.map((project) => (
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
                                    <div className="open-indicator">
                                        <ArrowRight size={16} />
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="empty-boot-screen">
                        <div className="terminal-text mono">
                            {bootText}
                        </div>
                        <button className="big-cta-btn" onClick={onNewProject}>
                            <Plus size={24} />
                            <span>INICIAR NUEVO ANÁLISIS</span>
                        </button>
                    </div>
                )}
            </main>

            <SystemStatusFooter />
        </div>
    );
}

export default Dashboard;
