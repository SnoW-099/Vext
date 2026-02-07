import { useState, useEffect } from 'react';
import { Plus, Trash2, Calendar, ArrowRight } from 'lucide-react';
import { projectService } from '../services/projectService';
import './Dashboard.css';

function Dashboard({ onNewProject, onLoadProject }) {
    const [projects, setProjects] = useState([]);
    const [activeCategory, setActiveCategory] = useState('TODOS');
    const [bootText, setBootText] = useState('');
    const fullBootText = "> VEXT_SYSTEM_BOOT: READY...\n> WAITING_FOR_HYPOTHESIS..._";

    const CATEGORIES = ['TODOS', 'SAAS', 'E-COMMERCE', 'APP MÓVIL', 'MARKETPLACE'];

    useEffect(() => {
        const loadProjects = () => {
            setProjects(projectService.getAll());
        };
        loadProjects();
    }, []);

    // ... (rest of useEffect for boot text remains same) ...

    const filteredProjects = activeCategory === 'TODOS'
        ? projects
        : projects.filter(p => getProjectCategory(p.id) === activeCategory);

    // ... (format functions remain same) ...

    const CategoryTabs = () => (
        <div className="category-tabs-container">
            <div className="category-tabs">
                {CATEGORIES.map(cat => (
                    <button
                        key={cat}
                        className={`category-tab ${activeCategory === cat ? 'active' : ''}`}
                        onClick={() => setActiveCategory(cat)}
                    >
                        <span className="tab-text mono">{cat}</span>
                        {activeCategory === cat && <div className="tab-indicator" />}
                    </button>
                ))}
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
                    <>
                        <CategoryTabs />
                        <div className="projects-grid">
                            {/* New Project CTA - Only in 'TODOS' or every tab? User said "each section has its tab", let's keep CTA in 'TODOS' */}
                            {activeCategory === 'TODOS' && (
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
                            )}

                            {/* Content Cards (Filtered Projects) */}
                            {filteredProjects.map((project, index) => (
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
                    </>
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
