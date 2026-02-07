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

    const formatProjectId = (id) => {
        if (!id) return 'ID_000';
        const num = id.toString().replace(/\D/g, '').slice(0, 3).padEnd(3, '0');
        return `ID_${num}`;
    };

    const getProjectGradeLabel = (grade) => {
        if (!grade) return 'PENDIENTE';
        return `GRADO ${grade}`;
    };

    const getProjectCategory = (id) => {
        // Mock category for visual variety until available in backend
        const categories = ['SAAS', 'E-COMMERCE', 'APP MÓVIL', 'MARKETPLACE'];
        const charCode = id.toString().charCodeAt(0) || 0;
        return categories[(charCode + 1) % categories.length];
    };

    // Calculate Success Rate based on Grade A or B
    const successRate = projects.length > 0
        ? Math.round((projects.filter(p => p.grade === 'A' || p.grade === 'B').length / projects.length) * 100)
        : 0;

    const StatsBar = () => (
        <div className="stats-bar animate-slide-down">
            <div className="stat-item">
                <span className="stat-label">PROYECTOS ACTIVOS</span>
                <span className="stat-value">{projects.length}</span>
            </div>
            <div className="stat-item">
                <span className="stat-label">TASA DE ÉXITO</span>
                <span className="stat-value">{successRate}%</span>
            </div>
            <div className="stat-item">
                <span className="stat-label">ESTADO IA</span>
                <div className="status-indicator">
                    <div className="status-dot"></div>
                    <span className="stat-value-text">ONLINE</span>
                </div>
            </div>
        </div>
    );

    return (
        <div className="dashboard">
            <header className="dashboard-header animate-fade-in">
                <div className="header-brand-column">
                    <div className="brand-row">
                        <img src="/favicon/favicon.svg" alt="VEXT" className="logo-icon" />
                        <span className="logo-text mono">PROYECTOS</span>
                    </div>
                </div>
                {projects.length > 0 && <StatsBar />}
            </header>

            <main className="dashboard-content">
                {projects.length > 0 ? (
                    <div className="projects-grid">
                        {/* New Project CTA - High Visibility (Grid Version) */}
                        <div
                            className="project-card new-project-cta animate-scale-in"
                            onClick={onNewProject}
                        >
                            <div className="cta-icon-wrapper">
                                <Plus size={32} />
                            </div>
                            <div className="cta-content">
                                <h3>Nuevo Análisis</h3>
                                <p>Validar nueva idea</p>
                            </div>
                        </div>

                        {/* Content Cards (User Projects) */}
                        {projects.map((project, index) => (
                            <div
                                key={project.id}
                                className="project-card animate-slide-up"
                                style={{ animationDelay: `${(index + 1) * 100}ms` }}
                                onClick={() => onLoadProject(project)}
                            >
                                <div className="card-top">
                                    <div className="card-header-left">
                                        <span className="id-badge mono">
                                            {formatProjectId(project.id)}
                                        </span>
                                        <span className={`status-chip mono grade-${project.grade || 'C'}`}>
                                            {getProjectGradeLabel(project.grade)}
                                        </span>
                                    </div>
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
                                    <span className="category-tag mono">
                                        {getProjectCategory(project.id)}
                                    </span>
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
        </div>
    );
}

export default Dashboard;
