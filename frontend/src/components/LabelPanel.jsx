import { useState } from 'react';
import { getClassColor } from '../utils/yolo';

export default function LabelPanel({
  classes,
  currentClass,
  onClassChange,
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

  const handleBatchReplace = async () => {
    if (fromClass === toClass) {
      setBatchResult({ error: '같은 클래스로는 변경할 수 없습니다.' });
      return;
    }
    const fromName = classes[fromClass] || `Class ${fromClass}`;
    const toName = classes[toClass] || `Class ${toClass}`;
    if (!confirm(`프로젝트 전체에서 "${fromName}" → "${toName}"(으)로 일괄 변경합니다.\n이 작업은 되돌릴 수 없습니다. 계속하시겠습니까?`)) {
      return;
    }

    setBatchLoading(true);
    setBatchResult(null);
    try {
      const res = await fetch('/api/labels/batch-replace', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fromClass, toClass }),
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
            <button
              className="batch-apply-btn"
              onClick={handleBatchReplace}
              disabled={batchLoading || fromClass === toClass}
            >
              {batchLoading ? '처리 중...' : '전체 일괄 변경'}
            </button>
            {batchResult?.error && (
              <div className="batch-error">{batchResult.error}</div>
            )}
            {batchResult?.success && (
              <div className="batch-success">{batchResult.success}</div>
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
