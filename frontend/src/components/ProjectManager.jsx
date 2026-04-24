import { useState, useEffect } from 'react';

export default function ProjectManager({ onProjectSelect }) {
  const [projects, setProjects] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({ name: '', description: '', path: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchProjects = async () => {
    try {
      const res = await fetch('/api/projects');
      const data = await res.json();
      setProjects(data);
    } catch {
      setError('서버 연결 실패');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  const resetForm = () => {
    setForm({ name: '', description: '', path: '' });
    setShowForm(false);
    setEditingId(null);
    setError('');
  };

  const handleSubmit = async () => {
    if (!form.name.trim() || !form.path.trim()) {
      setError('이름과 경로는 필수입니다.');
      return;
    }
    setError('');

    try {
      const url = editingId
        ? `/api/projects/${editingId}`
        : '/api/projects';
      const method = editingId ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || '저장 실패');
        return;
      }

      resetForm();
      fetchProjects();
    } catch (err) {
      setError('서버 오류: ' + err.message);
    }
  };

  const handleEdit = (project) => {
    setForm({
      name: project.name,
      description: project.description || '',
      path: project.path,
    });
    setEditingId(project.id);
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!confirm('프로젝트를 삭제하시겠습니까?')) return;
    await fetch(`/api/projects/${id}`, { method: 'DELETE' });
    fetchProjects();
  };

  const handleOpen = (project) => {
    onProjectSelect(project);
  };

  if (loading) {
    return (
      <div className="project-manager">
        <div className="pm-loading">로딩 중...</div>
      </div>
    );
  }

  return (
    <div className="project-manager">
      <div className="pm-header">
        <h2>프로젝트 목록</h2>
        <button
          className="pm-add-btn"
          onClick={() => {
            resetForm();
            setShowForm(true);
          }}
        >
          + 프로젝트 추가
        </button>
      </div>

      {showForm && (
        <div className="pm-form">
          <h3>{editingId ? '프로젝트 수정' : '새 프로젝트'}</h3>
          <div className="pm-field">
            <label>이름 *</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="예: 신분증 데이터셋 v1"
            />
          </div>
          <div className="pm-field">
            <label>설명</label>
            <input
              type="text"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="예: 2025년 7월 수집 데이터"
            />
          </div>
          <div className="pm-field">
            <label>데이터셋 경로 *</label>
            <input
              type="text"
              value={form.path}
              onChange={(e) => setForm({ ...form, path: e.target.value })}
              placeholder="예: C:/datasets_20250703"
            />
          </div>
          {error && <div className="pm-error">{error}</div>}
          <div className="pm-form-actions">
            <button className="pm-save-btn" onClick={handleSubmit}>
              {editingId ? '수정' : '추가'}
            </button>
            <button className="pm-cancel-btn" onClick={resetForm}>
              취소
            </button>
          </div>
        </div>
      )}

      {projects.length === 0 && !showForm ? (
        <div className="pm-empty">
          등록된 프로젝트가 없습니다. 프로젝트를 추가해주세요.
        </div>
      ) : (
        <div className="pm-list">
          {projects.map((project) => (
            <div key={project.id} className="pm-card">
              <div className="pm-card-body" onClick={() => handleOpen(project)}>
                <div className="pm-card-name">{project.name}</div>
                {project.description && (
                  <div className="pm-card-desc">{project.description}</div>
                )}
                <div className="pm-card-path">{project.path}</div>
              </div>
              <div className="pm-card-actions">
                <button
                  className="pm-edit-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleEdit(project);
                  }}
                  title="수정"
                >
                  edit
                </button>
                <button
                  className="pm-delete-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete(project.id);
                  }}
                  title="삭제"
                >
                  del
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
