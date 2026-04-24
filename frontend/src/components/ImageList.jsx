import { useState } from 'react';

export default function ImageList({ images, selectedImage, onSelectImage, onToggleCompleted }) {
  const [filter, setFilter] = useState('');
  const [filterMode, setFilterMode] = useState('all'); // all, incomplete, completed

  const filtered = images.filter((img) => {
    const matchesSearch = img.filename.toLowerCase().includes(filter.toLowerCase());
    if (!matchesSearch) return false;
    if (filterMode === 'completed') return img.completed;
    if (filterMode === 'incomplete') return !img.completed;
    return true;
  });

  const completedCount = images.filter((img) => img.completed).length;

  return (
    <div className="image-list">
      <div className="image-list-header">
        <h3>이미지 목록 ({images.length})</h3>
        <div className="image-list-stats">
          완료: {completedCount} / {images.length}
        </div>
        <input
          type="text"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="검색..."
          className="image-search"
        />
        <div className="filter-tabs">
          <button
            className={`filter-tab ${filterMode === 'all' ? 'active' : ''}`}
            onClick={() => setFilterMode('all')}
          >
            전체
          </button>
          <button
            className={`filter-tab ${filterMode === 'incomplete' ? 'active' : ''}`}
            onClick={() => setFilterMode('incomplete')}
          >
            미완료
          </button>
          <button
            className={`filter-tab ${filterMode === 'completed' ? 'active' : ''}`}
            onClick={() => setFilterMode('completed')}
          >
            완료
          </button>
        </div>
      </div>
      <ul>
        {filtered.map((img) => (
          <li
            key={img.filename}
            className={`image-item ${selectedImage === img.filename ? 'selected' : ''} ${img.hasLabel ? 'labeled' : 'unlabeled'}`}
            onClick={() => onSelectImage(img.filename)}
          >
            <input
              type="checkbox"
              className="completed-checkbox"
              checked={img.completed || false}
              onChange={(e) => {
                e.stopPropagation();
                onToggleCompleted(img.filename, e.target.checked);
              }}
              onClick={(e) => e.stopPropagation()}
              title="라벨링 완료"
            />
            <span className={`label-dot ${img.hasLabel ? 'has-label' : ''}`} />
            <span className="image-name" title={img.filename}>
              {img.filename}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
