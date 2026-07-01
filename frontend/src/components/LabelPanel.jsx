import { useState } from 'react';
import { getClassColor } from '../utils/yolo';

// 일괄 작업 대상 범위 선택 (전체 프로젝트 / 선택한 이미지)
function ScopeSelector({ idPrefix, images, selectedImage, scope, onScopeChange, selected, onSelectedChange }) {
  const toggle = (filename) => {
    const next = new Set(selected);
    if (next.has(filename)) {
      next.delete(filename);
    } else {
      next.add(filename);
    }
    onSelectedChange(next);
  };

  return (
    <div className="scope-selector">
      <div className="scope-radios">
        <label>
          <input
            type="radio"
            name={`${idPrefix}-scope`}
            checked={scope === 'all'}
            onChange={() => onScopeChange('all')}
          />
          전체 프로젝트
        </label>
        <label>
          <input
            type="radio"
            name={`${idPrefix}-scope`}
            checked={scope === 'selected'}
            onChange={() => onScopeChange('selected')}
          />
          선택한 이미지
        </label>
      </div>

      {scope === 'selected' && (
        <div className="scope-picker">
          <div className="scope-picker-actions">
            <button type="button" onClick={() => onSelectedChange(new Set(images.map((i) => i.filename)))}>
              전체선택
            </button>
            <button type="button" onClick={() => onSelectedChange(new Set())}>
              해제
            </button>
            {selectedImage && (
              <button type="button" onClick={() => onSelectedChange(new Set([selectedImage]))}>
                현재 이미지만
              </button>
            )}
          </div>
          <div className="scope-picker-count">{selected.size}개 선택됨</div>
          <ul className="scope-picker-list">
            {images.map((img) => (
              <li key={img.filename}>
                <label className={selected.has(img.filename) ? 'checked' : ''}>
                  <input
                    type="checkbox"
                    checked={selected.has(img.filename)}
                    onChange={() => toggle(img.filename)}
                  />
                  <span className="scope-picker-name">{img.filename}</span>
                </label>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export default function LabelPanel({
  classes,
  currentClass,
  onClassChange,
  images = [],
  selectedImage,
  boxes,
  selectedBoxIndex,
  onSelectBox,
  onDeleteBox,
  onChangeBoxClass,
  onBatchReplace,
}) {
  const [showBatchReplace, setShowBatchReplace] = useState(false);
  const [fromClass, setFromClass] = useState(0);
  const [toClass, setToClass] = useState(0);
  const [batchResult, setBatchResult] = useState(null);
  const [batchLoading, setBatchLoading] = useState(false);
  const [replaceScope, setReplaceScope] = useState('all');
  const [replaceSelected, setReplaceSelected] = useState(new Set());

  const [showBatchDelete, setShowBatchDelete] = useState(false);
  const [deleteClass, setDeleteClass] = useState(0);
  const [deleteResult, setDeleteResult] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteScope, setDeleteScope] = useState('all');
  const [deleteSelected, setDeleteSelected] = useState(new Set());

  const handleBatchDelete = async () => {
    if (deleteScope === 'selected' && deleteSelected.size === 0) {
      setDeleteResult({ error: '대상 이미지를 1개 이상 선택하세요.' });
      return;
    }
    const name = classes[deleteClass] || `Class ${deleteClass}`;
    const scopeText =
      deleteScope === 'selected'
        ? `선택한 ${deleteSelected.size}개 이미지`
        : '프로젝트 전체';
    if (!confirm(`${scopeText}에서 "${name}" 라벨을 모두 제거합니다.\n(이미지 파일은 유지되고, 라벨링만 삭제됩니다.)\n이 작업은 되돌릴 수 없습니다. 계속하시겠습니까?`)) {
      return;
    }

    setDeleteLoading(true);
    setDeleteResult(null);
    try {
      const res = await fetch('/api/labels/batch-delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          classId: deleteClass,
          filenames: deleteScope === 'selected' ? [...deleteSelected] : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setDeleteResult({ error: data.error });
      } else {
        setDeleteResult({
          success: `${data.modifiedFiles}개 파일, ${data.deletedBoxes}개 박스 제거 완료`,
        });
        if (onBatchReplace) onBatchReplace();
      }
    } catch (err) {
      setDeleteResult({ error: '서버 오류: ' + err.message });
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleBatchReplace = async () => {
    if (fromClass === toClass) {
      setBatchResult({ error: '같은 클래스로는 변경할 수 없습니다.' });
      return;
    }
    if (replaceScope === 'selected' && replaceSelected.size === 0) {
      setBatchResult({ error: '대상 이미지를 1개 이상 선택하세요.' });
      return;
    }
    const fromName = classes[fromClass] || `Class ${fromClass}`;
    const toName = classes[toClass] || `Class ${toClass}`;
    const scopeText =
      replaceScope === 'selected'
        ? `선택한 ${replaceSelected.size}개 이미지`
        : '프로젝트 전체';
    if (!confirm(`${scopeText}에서 "${fromName}" → "${toName}"(으)로 일괄 변경합니다.\n이 작업은 되돌릴 수 없습니다. 계속하시겠습니까?`)) {
      return;
    }

    setBatchLoading(true);
    setBatchResult(null);
    try {
      const res = await fetch('/api/labels/batch-replace', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fromClass,
          toClass,
          filenames: replaceScope === 'selected' ? [...replaceSelected] : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setBatchResult({ error: data.error });
      } else {
        setBatchResult({
          success: `${data.modifiedFiles}개 파일, ${data.modifiedBoxes}개 박스 변경 완료`,
        });
        if (onBatchReplace) onBatchReplace();
      }
    } catch (err) {
      setBatchResult({ error: '서버 오류: ' + err.message });
    } finally {
      setBatchLoading(false);
    }
  };

  return (
    <div className="label-panel">
      <div className="panel-section">
        <h3>클래스 선택</h3>
        <ul className="class-list">
          {classes.map((cls, idx) => (
            <li
              key={idx}
              className={`class-item ${currentClass === idx ? 'active' : ''}`}
              onClick={() => onClassChange(idx)}
            >
              <span
                className="class-color"
                style={{ backgroundColor: getClassColor(idx) }}
              />
              <span className="class-label">{idx}: {cls}</span>
            </li>
          ))}
        </ul>
        <button
          className="batch-replace-toggle"
          onClick={() => {
            setShowBatchReplace(!showBatchReplace);
            setBatchResult(null);
          }}
        >
          {showBatchReplace ? '▲ 일괄 변경 닫기' : '▼ 라벨 일괄 변경'}
        </button>

        {showBatchReplace && (
          <div className="batch-replace">
            <div className="batch-row">
              <select
                value={fromClass}
                onChange={(e) => setFromClass(parseInt(e.target.value))}
                className="batch-select"
              >
                {classes.map((cls, idx) => (
                  <option key={idx} value={idx}>{idx}: {cls}</option>
                ))}
              </select>
              <span className="batch-arrow">→</span>
              <select
                value={toClass}
                onChange={(e) => setToClass(parseInt(e.target.value))}
                className="batch-select"
              >
                {classes.map((cls, idx) => (
                  <option key={idx} value={idx}>{idx}: {cls}</option>
                ))}
              </select>
            </div>
            <ScopeSelector
              idPrefix="replace"
              images={images}
              selectedImage={selectedImage}
              scope={replaceScope}
              onScopeChange={setReplaceScope}
              selected={replaceSelected}
              onSelectedChange={setReplaceSelected}
            />
            <button
              className="batch-apply-btn"
              onClick={handleBatchReplace}
              disabled={batchLoading || fromClass === toClass}
            >
              {batchLoading
                ? '처리 중...'
                : replaceScope === 'selected'
                ? '선택 이미지 일괄 변경'
                : '전체 일괄 변경'}
            </button>
            {batchResult?.error && (
              <div className="batch-error">{batchResult.error}</div>
            )}
            {batchResult?.success && (
              <div className="batch-success">{batchResult.success}</div>
            )}
          </div>
        )}

        <button
          className="batch-replace-toggle"
          onClick={() => {
            setShowBatchDelete(!showBatchDelete);
            setDeleteResult(null);
          }}
        >
          {showBatchDelete ? '▲ 라벨 일괄 삭제 닫기' : '▼ 특정 라벨 일괄 삭제'}
        </button>

        {showBatchDelete && (
          <div className="batch-replace">
            <div className="batch-row">
              <select
                value={deleteClass}
                onChange={(e) => setDeleteClass(parseInt(e.target.value))}
                className="batch-select"
              >
                {classes.map((cls, idx) => (
                  <option key={idx} value={idx}>{idx}: {cls}</option>
                ))}
              </select>
            </div>
            <ScopeSelector
              idPrefix="delete"
              images={images}
              selectedImage={selectedImage}
              scope={deleteScope}
              onScopeChange={setDeleteScope}
              selected={deleteSelected}
              onSelectedChange={setDeleteSelected}
            />
            <button
              className="batch-apply-btn batch-delete-btn"
              onClick={handleBatchDelete}
              disabled={deleteLoading}
            >
              {deleteLoading
                ? '처리 중...'
                : deleteScope === 'selected'
                ? '선택 이미지 라벨 제거'
                : '해당 라벨 전체 제거'}
            </button>
            {deleteResult?.error && (
              <div className="batch-error">{deleteResult.error}</div>
            )}
            {deleteResult?.success && (
              <div className="batch-success">{deleteResult.success}</div>
            )}
          </div>
        )}
      </div>

      <div className="panel-section">
        <h3>박스 목록 ({boxes.length})</h3>
        <ul className="box-list">
          {boxes.map((box, idx) => (
            <li
              key={idx}
              className={`box-item ${selectedBoxIndex === idx ? 'selected' : ''}`}
              onClick={() => onSelectBox(idx)}
            >
              <span
                className="class-color"
                style={{ backgroundColor: getClassColor(box.classId) }}
              />
              <span className="box-label">
                {classes[box.classId] || `Class ${box.classId}`}
              </span>
              <select
                value={box.classId}
                onChange={(e) => {
                  e.stopPropagation();
                  onChangeBoxClass(idx, parseInt(e.target.value));
                }}
                onClick={(e) => e.stopPropagation()}
                className="box-class-select"
              >
                {classes.map((cls, cIdx) => (
                  <option key={cIdx} value={cIdx}>{cIdx}: {cls}</option>
                ))}
              </select>
              <button
                className="box-delete-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  onDeleteBox(idx);
                }}
                title="삭제"
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
